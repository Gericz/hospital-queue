<?php

namespace Tests\Feature\Operations;

use App\Models\Department;
use App\Models\Service;
use App\Models\User;
use App\Models\Window;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OperationsDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_operations_dashboard_page_loads_for_authorized_staff(): void
    {
        $staff = User::factory()->queueStaff()->create();
        $dept = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->create(['department_id' => $dept->id, 'is_active' => true]);
        Window::factory()->create(['department_id' => $dept->id, 'service_id' => $service->id, 'is_active' => true]);

        $response = $this->actingAs($staff)->get(route('operations.dashboard'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Operations/Dashboard')
                ->has('metrics')
                ->has('board')
                ->has('departments')
            );
    }

    public function test_api_operations_dashboard_and_windows_endpoints(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $dept = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->create(['department_id' => $dept->id, 'is_active' => true]);
        $window = Window::factory()->create(['department_id' => $dept->id, 'service_id' => $service->id, 'is_active' => true]);

        Sanctum::actingAs($admin);

        // Dashboard API
        $dashResponse = $this->getJson('/api/operations/dashboard');
        $dashResponse->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'date',
                    'summary' => ['waiting', 'called', 'serving', 'completed', 'skipped', 'hold', 'transferred', 'cancelled'],
                    'windows' => ['total', 'open', 'paused', 'closed'],
                ],
            ]);

        // Windows API
        $windowsResponse = $this->getJson('/api/operations/windows');
        $windowsResponse->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'window_number', 'name', 'status', 'is_active'],
                ],
            ]);

        // Open Window via API
        $openResponse = $this->postJson("/api/operations/windows/{$window->id}/open", [
            'service_id' => $service->id,
        ]);
        $openResponse->assertOk()
            ->assertJsonPath('data.status', 'open');
    }
}
