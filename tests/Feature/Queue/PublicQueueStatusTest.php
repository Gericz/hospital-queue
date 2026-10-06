<?php

namespace Tests\Feature\Queue;

use App\Enums\PriorityType;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\Window;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicQueueStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_status_page_loads_with_valid_token(): void
    {
        $department = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->create(['department_id' => $department->id, 'prefix' => 'OPD']);
        $queue = Queue::factory()->waiting()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'queue_number' => 'OPD-005',
            'patient_name' => 'Secret Patient Name',
        ]);

        $response = $this->get(route('queue.status', $queue->public_token));

        $response->assertOk();
    }

    public function test_public_status_api_calculates_people_ahead_and_omits_pii(): void
    {
        $department = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->create(['department_id' => $department->id, 'prefix' => 'RAD']);
        $window = Window::factory()->create(['department_id' => $department->id, 'name' => 'Window 1']);

        // Currently serving ticket at window
        Queue::factory()->serving()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'window_id' => $window->id,
            'queue_number' => 'RAD-001',
        ]);

        // Waiting ticket 1 (Emergency)
        Queue::factory()->waiting()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'queue_sequence' => 2,
            'priority_type' => PriorityType::Emergency,
            'priority_level' => 1,
        ]);

        // Waiting ticket 2 (Senior)
        Queue::factory()->waiting()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'queue_sequence' => 3,
            'priority_type' => PriorityType::Senior,
            'priority_level' => 2,
        ]);

        // Our target waiting ticket (Regular - sequence 4)
        $targetQueue = Queue::factory()->waiting()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'queue_number' => 'RAD-004',
            'queue_sequence' => 4,
            'priority_type' => PriorityType::Regular,
            'priority_level' => 5,
            'patient_name' => 'Super Confidential VIP',
            'patient_reference' => 'SECRET-999',
        ]);

        $response = $this->getJson("/api/queue-tickets/{$targetQueue->public_token}/status");

        $response->assertOk()
            ->assertJsonPath('data.queue_number', 'RAD-004')
            ->assertJsonPath('data.people_ahead', 2)
            ->assertJsonPath('data.currently_serving_number', 'RAD-001');

        $content = $response->getContent();
        $this->assertStringNotContainsString('Super Confidential VIP', $content);
        $this->assertStringNotContainsString('SECRET-999', $content);
    }
}
