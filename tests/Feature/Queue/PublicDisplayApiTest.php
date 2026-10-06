<?php

namespace Tests\Feature\Queue;

use App\Enums\PriorityType;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\Window;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicDisplayApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_display_endpoint_returns_department_queue_without_pii(): void
    {
        $department = Department::factory()->create(['code' => 'OPD', 'name' => 'Outpatient Department', 'is_active' => true]);
        $service = Service::factory()->create(['department_id' => $department->id, 'prefix' => 'OPD', 'is_active' => true]);
        $window = Window::factory()->create(['department_id' => $department->id, 'window_number' => '1', 'name' => 'Window 1', 'is_active' => true]);

        // Active ticket at Window 1 with confidential patient details
        $activeQueue = Queue::factory()->called()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'window_id' => $window->id,
            'queue_number' => 'OPD-005',
            'patient_name' => 'Secret VIP Patient',
            'patient_reference' => 'CONFIDENTIAL-12345',
            'notes' => 'Patient has severe hypertension',
        ]);

        // Waiting ticket in queue
        $waitingQueue = Queue::factory()->waiting()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'queue_number' => 'OPD-006',
            'priority_type' => PriorityType::Senior,
            'patient_name' => 'Another Patient',
        ]);

        $response = $this->getJson("/api/display/{$department->code}");

        $response->assertOk()
            ->assertJsonPath('department.code', 'OPD')
            ->assertJsonPath('now_serving.0.queue_number', 'OPD-005')
            ->assertJsonPath('now_serving.0.window_name', 'Window 1')
            ->assertJsonPath('upcoming_waiting.0.queue_number', 'OPD-006')
            ->assertJsonPath('upcoming_waiting.0.priority_type', 'SENIOR');

        // Verify STRICTLY zero PII in JSON payload
        $content = $response->getContent();
        $this->assertStringNotContainsString('Secret VIP Patient', $content);
        $this->assertStringNotContainsString('CONFIDENTIAL-12345', $content);
        $this->assertStringNotContainsString('hypertension', $content);
        $this->assertStringNotContainsString('Another Patient', $content);
    }

    public function test_public_display_web_page_is_accessible_without_authentication(): void
    {
        $department = Department::factory()->create(['code' => 'OPD', 'is_active' => true]);

        $response = $this->get(route('queue.display', $department->code));

        $response->assertOk();
    }
}
