<?php

namespace Tests\Feature\Analytics;

use App\Enums\PriorityType;
use App\Enums\QueueStatus;
use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\User;
use App\Models\Window;
use App\Services\AnalyticsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsMetricsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Department $department;

    protected Service $service;

    protected Window $window;

    protected AnalyticsService $analyticsService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => UserRole::HospitalAdmin,
            'is_active' => true,
        ]);

        $this->department = Department::factory()->create([
            'name' => 'Outpatient Department',
            'code' => 'OPD',
            'target_wait_time_minutes' => 30,
        ]);

        $this->service = Service::factory()->create([
            'department_id' => $this->department->id,
            'name' => 'General Medicine',
            'code' => 'GEN-MED',
            'prefix' => 'GM',
            'target_wait_time_minutes' => 20,
            'target_service_time_minutes' => 15,
        ]);

        $this->window = Window::factory()->create([
            'department_id' => $this->department->id,
            'service_id' => $this->service->id,
            'window_number' => 1,
            'name' => 'Window 1',
        ]);

        $this->analyticsService = app(AnalyticsService::class);
    }

    public function test_it_calculates_accurate_kpi_summary_metrics(): void
    {
        $today = Carbon::today()->format('Y-m-d');
        $baseTime = Carbon::now()->subHours(2);

        // Completed Ticket: wait 600s (10 min), service 900s (15 min)
        Queue::factory()->create([
            'department_id' => $this->department->id,
            'service_id' => $this->service->id,
            'window_id' => $this->window->id,
            'queue_date' => $today,
            'status' => QueueStatus::Completed,
            'priority_type' => PriorityType::Regular,
            'created_at' => $baseTime,
            'called_at' => $baseTime->copy()->addSeconds(600),
            'started_at' => $baseTime->copy()->addSeconds(600),
            'completed_at' => $baseTime->copy()->addSeconds(1500),
        ]);

        // Skipped Ticket: wait 1200s (20 min)
        Queue::factory()->create([
            'department_id' => $this->department->id,
            'service_id' => $this->service->id,
            'window_id' => $this->window->id,
            'queue_date' => $today,
            'status' => QueueStatus::Skipped,
            'priority_type' => PriorityType::Senior,
            'created_at' => $baseTime,
            'called_at' => $baseTime->copy()->addSeconds(1200),
            'skipped_at' => $baseTime->copy()->addSeconds(1500),
        ]);

        // Waiting Ticket
        Queue::factory()->create([
            'department_id' => $this->department->id,
            'service_id' => $this->service->id,
            'queue_date' => $today,
            'status' => QueueStatus::Waiting,
            'priority_type' => PriorityType::Regular,
            'created_at' => $baseTime,
            'called_at' => null,
        ]);

        $summary = $this->analyticsService->getSummary(['preset' => 'today']);

        $this->assertEquals(3, $summary['total_tickets']);
        $this->assertEquals(1, $summary['total_completed']);
        $this->assertEquals(1, $summary['total_skipped']);
        $this->assertEquals(1, $summary['total_waiting']);
        $this->assertEquals(33.3, $summary['completion_rate']);
        $this->assertEquals(33.3, $summary['skip_rate']);

        // Average wait of 2 called tickets: (600 + 1200) / 2 = 900 seconds
        $this->assertEquals(900, $summary['avg_wait_seconds']);
        // Service time of 1 completed ticket: 900 seconds
        $this->assertEquals(900, $summary['avg_service_seconds']);
    }

    public function test_it_calculates_accurate_wait_time_distribution_buckets(): void
    {
        $today = Carbon::today()->format('Y-m-d');
        $now = Carbon::now();

        // 1 ticket with 120s wait (< 5 min)
        Queue::factory()->create([
            'department_id' => $this->department->id,
            'service_id' => $this->service->id,
            'queue_date' => $today,
            'status' => QueueStatus::Completed,
            'created_at' => $now->copy()->subMinutes(10),
            'called_at' => $now->copy()->subMinutes(10)->addSeconds(120),
        ]);

        // 1 ticket with 600s wait (5–15 min)
        Queue::factory()->create([
            'department_id' => $this->department->id,
            'service_id' => $this->service->id,
            'queue_date' => $today,
            'status' => QueueStatus::Completed,
            'created_at' => $now->copy()->subMinutes(20),
            'called_at' => $now->copy()->subMinutes(20)->addSeconds(600),
        ]);

        $distribution = $this->analyticsService->getWaitTimeDistribution(['preset' => 'today']);

        $under5 = collect($distribution)->firstWhere('key', 'under_5_min');
        $between515 = collect($distribution)->firstWhere('key', 'between_5_15_min');

        $this->assertEquals(1, $under5['count']);
        $this->assertEquals(50.0, $under5['percentage']);
        $this->assertEquals(1, $between515['count']);
        $this->assertEquals(50.0, $between515['percentage']);
    }

    public function test_it_calculates_accurate_sla_target_compliance(): void
    {
        $today = Carbon::today()->format('Y-m-d');
        $now = Carbon::now();

        // Target for service is 20 minutes (1200s)
        // 1 ticket within target (600s wait)
        Queue::factory()->create([
            'department_id' => $this->department->id,
            'service_id' => $this->service->id,
            'queue_date' => $today,
            'status' => QueueStatus::Completed,
            'created_at' => $now->copy()->subMinutes(30),
            'called_at' => $now->copy()->subMinutes(30)->addSeconds(600),
        ]);

        // 1 ticket exceeding target (1800s wait = 30 mins)
        Queue::factory()->create([
            'department_id' => $this->department->id,
            'service_id' => $this->service->id,
            'queue_date' => $today,
            'status' => QueueStatus::Completed,
            'created_at' => $now->copy()->subMinutes(50),
            'called_at' => $now->copy()->subMinutes(50)->addSeconds(1800),
        ]);

        $sla = $this->analyticsService->getSlaCompliance(['preset' => 'today']);
        $serviceSla = collect($sla)->firstWhere('service_id', $this->service->id);

        $this->assertNotNull($serviceSla);
        $this->assertTrue($serviceSla['target_configured']);
        $this->assertEquals(20, $serviceSla['target_wait_minutes']);
        $this->assertEquals(2, $serviceSla['total_called']);
        $this->assertEquals(1, $serviceSla['within_target']);
        $this->assertEquals(1, $serviceSla['exceeding_target']);
        $this->assertEquals(50.0, $serviceSla['compliance_percentage']);
    }
}
