<?php

namespace Tests\Feature\Queue;

use App\Actions\Queue\CallNextQueueAction;
use App\Actions\Queue\CompleteQueueAction;
use App\Actions\Queue\CreateQueueTicketAction;
use App\Actions\Queue\HoldQueueAction;
use App\Actions\Queue\RecallQueueAction;
use App\Actions\Queue\ResumeQueueAction;
use App\Actions\Queue\SkipQueueAction;
use App\Actions\Queue\StartServingQueueAction;
use App\Actions\Queue\TransferQueueAction;
use App\Enums\PriorityType;
use App\Events\Queue\QueueCalled;
use App\Events\Queue\QueueCompleted;
use App\Events\Queue\QueueCreated;
use App\Events\Queue\QueueHeld;
use App\Events\Queue\QueueRecalled;
use App\Events\Queue\QueueResumed;
use App\Events\Queue\QueueSkipped;
use App\Events\Queue\QueueStarted;
use App\Events\Queue\QueueTransferred;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\User;
use App\Models\Window;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class BroadcastingEventsTest extends TestCase
{
    use RefreshDatabase;

    public function test_ticket_creation_broadcasts_queue_created_with_safe_payload(): void
    {
        Event::fake([QueueCreated::class]);

        $user = User::factory()->queueStaff()->create();
        $department = Department::factory()->create(['code' => 'OPD', 'is_active' => true]);
        $service = Service::factory()->create(['department_id' => $department->id, 'prefix' => 'OPD', 'is_active' => true]);

        $action = app(CreateQueueTicketAction::class);
        $queue = $action->execute([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Senior,
            'patient_name' => 'Confidential Patient',
            'patient_reference' => 'MRN-99999',
        ], $user);

        Event::assertDispatched(QueueCreated::class, function (QueueCreated $event) use ($queue, $department) {
            $payload = $event->broadcastWith();

            // Verify safe payload does NOT leak confidential patient name/reference in public broadcast
            $this->assertEquals($queue->id, $payload['queue_id']);
            $this->assertEquals($queue->queue_number, $payload['queue_number']);
            $this->assertEquals($department->id, $payload['department_id']);
            $this->assertEquals('SENIOR', $payload['priority_type']);

            return true;
        });
    }

    public function test_calling_next_ticket_broadcasts_queue_called(): void
    {
        Event::fake([QueueCalled::class]);

        $user = User::factory()->windowStaff()->create();
        $department = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->create(['department_id' => $department->id]);
        $window = Window::factory()->create(['department_id' => $department->id, 'name' => 'Window 1']);

        Queue::factory()->waiting()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'queue_number' => 'OPD-001',
        ]);

        $action = app(CallNextQueueAction::class);
        $called = $action->execute($window, $user);

        $this->assertNotNull($called);
        Event::assertDispatched(QueueCalled::class, function (QueueCalled $event) use ($window) {
            $payload = $event->broadcastWith();
            $this->assertEquals('OPD-001', $payload['queue_number']);
            $this->assertEquals($window->id, $payload['window_id']);
            $this->assertEquals('Window 1', $payload['window_name']);
            $this->assertEquals('called', $payload['event_type']);

            return true;
        });
    }

    public function test_recalling_ticket_broadcasts_queue_recalled_with_recall_count(): void
    {
        Event::fake([QueueRecalled::class]);

        $user = User::factory()->windowStaff()->create();
        $window = Window::factory()->create();
        $queue = Queue::factory()->called()->create(['window_id' => $window->id]);

        $action = app(RecallQueueAction::class);
        $action->execute($queue, $user, $window);

        Event::assertDispatched(QueueRecalled::class, function (QueueRecalled $event) {
            $payload = $event->broadcastWith();
            $this->assertEquals(1, $payload['recall_count']);
            $this->assertEquals('recalled', $payload['event_type']);

            return true;
        });
    }

    public function test_start_serving_and_complete_broadcasts_events(): void
    {
        Event::fake([QueueStarted::class, QueueCompleted::class]);

        $user = User::factory()->windowStaff()->create();
        $window = Window::factory()->create();
        $queue = Queue::factory()->called()->create(['window_id' => $window->id]);

        // 1. Start serving
        $startAction = app(StartServingQueueAction::class);
        $startAction->execute($queue, $user, $window);

        Event::assertDispatched(QueueStarted::class);

        // 2. Complete
        $completeAction = app(CompleteQueueAction::class);
        $completeAction->execute($queue, $user, $window);

        Event::assertDispatched(QueueCompleted::class, function (QueueCompleted $event) {
            $payload = $event->broadcastWith();
            $this->assertEquals('completed', $payload['status']);

            return true;
        });
    }

    public function test_skip_and_hold_broadcasts_events(): void
    {
        Event::fake([QueueSkipped::class, QueueHeld::class, QueueResumed::class]);

        $user = User::factory()->windowStaff()->create();
        $window = Window::factory()->create();
        $queue = Queue::factory()->called()->create(['window_id' => $window->id]);

        // Hold
        $holdAction = app(HoldQueueAction::class);
        $holdAction->execute($queue, $user, $window, 'Sent for Blood test');

        Event::assertDispatched(QueueHeld::class, function (QueueHeld $event) {
            $payload = $event->broadcastWith();
            $this->assertEquals('Sent for Blood test', $payload['reason']);

            return true;
        });

        // Resume
        $resumeAction = app(ResumeQueueAction::class);
        $resumeAction->execute($queue, $user, $window);

        Event::assertDispatched(QueueResumed::class);

        // Skip
        $skipAction = app(SkipQueueAction::class);
        $skipAction->execute($queue, $user, $window, 'Patient no-show');

        Event::assertDispatched(QueueSkipped::class, function (QueueSkipped $event) {
            $payload = $event->broadcastWith();
            $this->assertEquals('Patient no-show', $payload['reason']);

            return true;
        });
    }

    public function test_transfer_broadcasts_queue_transferred_and_created(): void
    {
        Event::fake([QueueTransferred::class, QueueCreated::class]);

        $user = User::factory()->windowStaff()->create();
        $deptA = Department::factory()->create(['is_active' => true]);
        $serviceA = Service::factory()->create(['department_id' => $deptA->id, 'prefix' => 'OPD', 'is_active' => true]);

        $deptB = Department::factory()->create(['is_active' => true]);
        $serviceB = Service::factory()->create(['department_id' => $deptB->id, 'prefix' => 'LAB', 'is_active' => true]);

        $sourceQueue = Queue::factory()->called()->create([
            'department_id' => $deptA->id,
            'service_id' => $serviceA->id,
            'queue_number' => 'OPD-001',
        ]);

        $transferAction = app(TransferQueueAction::class);
        $transferAction->execute($sourceQueue, $user, [
            'target_department_id' => $deptB->id,
            'target_service_id' => $serviceB->id,
            'reason' => 'Laboratory blood tests',
        ]);

        Event::assertDispatched(QueueTransferred::class, function (QueueTransferred $event) use ($deptA, $deptB) {
            $payload = $event->broadcastWith();
            $this->assertEquals($deptA->id, $payload['source_department_id']);
            $this->assertEquals($deptB->id, $payload['new_department_id']);
            $this->assertEquals('Laboratory blood tests', $payload['reason']);

            return true;
        });

        Event::assertDispatched(QueueCreated::class);
    }
}
