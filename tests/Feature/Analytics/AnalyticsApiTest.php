<?php

namespace Tests\Feature\Analytics;

use App\Enums\QueueStatus;
use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AnalyticsApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Department $department;

    protected Service $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => UserRole::HospitalAdmin,
            'is_active' => true,
        ]);

        $this->department = Department::factory()->create(['name' => 'Cardiology', 'code' => 'CARD']);
        $this->service = Service::factory()->create(['department_id' => $this->department->id, 'name' => 'ECG', 'target_wait_time_minutes' => 15]);

        Queue::factory()->create([
            'department_id' => $this->department->id,
            'service_id' => $this->service->id,
            'queue_date' => Carbon::today()->format('Y-m-d'),
            'status' => QueueStatus::Completed,
        ]);
    }

    public function test_api_summary_endpoint(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson(route('api.v1.analytics.summary', ['preset' => 'today']));

        $response->assertOk()
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'success',
                'period',
                'data' => [
                    'total_tickets',
                    'total_completed',
                    'avg_wait_seconds',
                ],
            ]);
    }

    public function test_api_volume_and_hourly_endpoints(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson(route('api.v1.analytics.volume', ['preset' => 'today']))
            ->assertOk()
            ->assertJsonStructure(['success', 'data']);

        $this->getJson(route('api.v1.analytics.hourly', ['preset' => 'today']))
            ->assertOk()
            ->assertJsonStructure(['success', 'data' => ['hours', 'peak_hour']]);
    }

    public function test_api_departments_and_services_endpoints(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson(route('api.v1.analytics.departments', ['preset' => 'today']))
            ->assertOk()
            ->assertJsonStructure(['success', 'data']);

        $this->getJson(route('api.v1.analytics.services', ['preset' => 'today']))
            ->assertOk()
            ->assertJsonStructure(['success', 'data']);
    }

    public function test_api_sla_and_export_endpoints(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson(route('api.v1.analytics.sla', ['preset' => 'today']))
            ->assertOk()
            ->assertJsonStructure(['success', 'data']);

        $this->getJson(route('api.v1.analytics.export', ['report_type' => 'summary', 'format' => 'json']))
            ->assertOk()
            ->assertJsonStructure(['success', 'report_type', 'data']);
    }
}
