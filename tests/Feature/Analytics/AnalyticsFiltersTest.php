<?php

namespace Tests\Feature\Analytics;

use App\Enums\PriorityType;
use App\Enums\QueueStatus;
use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsFiltersTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Department $dept1;

    protected Department $dept2;

    protected Service $serv1;

    protected Service $serv2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => UserRole::HospitalAdmin,
            'is_active' => true,
        ]);

        $this->dept1 = Department::factory()->create(['name' => 'OPD', 'code' => 'OPD']);
        $this->dept2 = Department::factory()->create(['name' => 'Laboratory', 'code' => 'LAB']);

        $this->serv1 = Service::factory()->create(['department_id' => $this->dept1->id, 'name' => 'Consultation']);
        $this->serv2 = Service::factory()->create(['department_id' => $this->dept2->id, 'name' => 'Blood Test']);
    }

    public function test_it_filters_by_department_correctly(): void
    {
        $today = Carbon::today()->format('Y-m-d');

        Queue::factory()->create([
            'department_id' => $this->dept1->id,
            'service_id' => $this->serv1->id,
            'queue_date' => $today,
            'status' => QueueStatus::Completed,
        ]);

        Queue::factory()->create([
            'department_id' => $this->dept2->id,
            'service_id' => $this->serv2->id,
            'queue_date' => $today,
            'status' => QueueStatus::Completed,
        ]);

        $response = $this->actingAs($this->admin)->get(route('analytics.dashboard', [
            'department_id' => $this->dept1->id,
            'preset' => 'today',
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Analytics/Dashboard')
            ->where('summary.total_tickets', 1)
        );
    }

    public function test_it_validates_service_belongs_to_selected_department(): void
    {
        // Service 2 belongs to Department 2, not Department 1
        $response = $this->actingAs($this->admin)->get(route('analytics.dashboard', [
            'department_id' => $this->dept1->id,
            'service_id' => $this->serv2->id,
        ]));

        $response->assertSessionHasErrors('service_id');
    }

    public function test_it_filters_by_priority_class(): void
    {
        $today = Carbon::today()->format('Y-m-d');

        Queue::factory()->create([
            'department_id' => $this->dept1->id,
            'service_id' => $this->serv1->id,
            'queue_date' => $today,
            'priority_type' => PriorityType::Regular,
        ]);

        Queue::factory()->create([
            'department_id' => $this->dept1->id,
            'service_id' => $this->serv1->id,
            'queue_date' => $today,
            'priority_type' => PriorityType::Emergency,
        ]);

        $response = $this->actingAs($this->admin)->get(route('analytics.dashboard', [
            'priority_type' => 'emergency',
            'preset' => 'today',
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Analytics/Dashboard')
            ->where('summary.total_tickets', 1)
        );
    }
}
