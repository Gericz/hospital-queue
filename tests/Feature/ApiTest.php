<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Service;
use App\Models\User;
use App\Models\Window;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_departments_listing(): void
    {
        $user = User::factory()->queueStaff()->create();
        Department::factory()->count(3)->create();

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/departments');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'code', 'name', 'description', 'is_active', 'created_at', 'updated_at'],
                ],
            ]);
    }

    public function test_api_department_creation_by_admin(): void
    {
        $admin = User::factory()->superAdmin()->create();

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/departments', [
            'code' => 'API-DEP',
            'name' => 'API Created Department',
            'description' => 'Test description',
            'is_active' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'API-DEP');

        $this->assertDatabaseHas('departments', ['code' => 'API-DEP']);
    }

    public function test_api_services_listing(): void
    {
        $user = User::factory()->queueStaff()->create();
        Service::factory()->count(3)->create();

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/services');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'department_id', 'code', 'name', 'prefix', 'is_active'],
                ],
            ]);
    }

    public function test_api_service_creation_by_admin(): void
    {
        $admin = User::factory()->hospitalAdmin()->create();
        $department = Department::factory()->create();

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/services', [
            'department_id' => $department->id,
            'code' => 'API-SRV',
            'name' => 'API Service',
            'prefix' => 'AP',
            'is_active' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'API-SRV');
    }

    public function test_api_windows_listing(): void
    {
        $user = User::factory()->queueStaff()->create();
        Window::factory()->count(2)->create();

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/windows');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'department_id', 'window_number', 'name', 'is_active'],
                ],
            ]);
    }

    public function test_api_window_creation_by_admin(): void
    {
        $admin = User::factory()->queueAdmin()->create();
        $department = Department::factory()->create();

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/windows', [
            'department_id' => $department->id,
            'window_number' => 10,
            'name' => 'Counter 10',
            'is_active' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.window_number', 10);
    }
}
