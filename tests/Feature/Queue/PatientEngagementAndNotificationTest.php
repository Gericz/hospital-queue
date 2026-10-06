<?php

namespace Tests\Feature\Queue;

use App\Enums\PriorityType;
use App\Enums\QueueStatus;
use App\Enums\UserRole;
use App\Jobs\SendQueueSmsNotification;
use App\Models\Department;
use App\Models\NotificationLog;
use App\Models\Queue;
use App\Models\QueueSetting;
use App\Models\Service;
use App\Models\User;
use App\Models\Window;
use App\Services\Notification\SmsNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientEngagementAndNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_tracking_returns_200_and_strictly_omits_pii(): void
    {
        $department = Department::factory()->create(['is_active' => true, 'name' => 'Cardiology']);
        $service = Service::factory()->create([
            'department_id' => $department->id,
            'name' => 'ECG Examination',
            'prefix' => 'ECG',
        ]);
        $window = Window::factory()->create(['department_id' => $department->id, 'name' => 'Window 4']);

        // Active serving ticket
        Queue::factory()->serving()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'window_id' => $window->id,
            'queue_number' => 'ECG-001',
            'queue_sequence' => 1,
        ]);

        // Target patient ticket with confidential PII
        $targetQueue = Queue::factory()->waiting()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'queue_number' => 'ECG-002',
            'queue_sequence' => 2,
            'patient_name' => 'Dr. Confidential VIP Patient',
            'patient_reference' => 'CLASSIFIED-MED-999',
            'phone_number' => '09171234567',
            'sms_consent' => true,
        ]);

        // Test API status response
        $apiResponse = $this->getJson("/api/queue-tickets/{$targetQueue->public_token}/status");
        $apiResponse->assertOk()
            ->assertJsonPath('data.queue_number', 'ECG-002')
            ->assertJsonPath('data.status', 'waiting')
            ->assertJsonPath('data.people_ahead', 0)
            ->assertJsonPath('data.currently_serving_number', 'ECG-001');

        $apiContent = $apiResponse->getContent();
        $this->assertStringNotContainsString('Dr. Confidential VIP Patient', $apiContent);
        $this->assertStringNotContainsString('CLASSIFIED-MED-999', $apiContent);
        $this->assertStringNotContainsString('09171234567', $apiContent);

        // Test Inertia web page
        $webResponse = $this->get(route('queue.status', $targetQueue->public_token));
        $webResponse->assertOk();
    }

    public function test_public_tracking_returns_404_for_invalid_token(): void
    {
        $response = $this->getJson('/api/queue-tickets/non-existent-token-12345/status');
        $response->assertNotFound();

        $webResponse = $this->get(route('queue.status', 'non-existent-token-12345'));
        $webResponse->assertNotFound();
    }

    public function test_ticket_creation_captures_phone_and_sms_consent(): void
    {
        $user = User::factory()->create(['role' => UserRole::QueueStaff]);
        $department = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->create(['department_id' => $department->id, 'is_active' => true, 'prefix' => 'GEN']);

        $response = $this->actingAs($user)->post(route('queue.tickets.store'), [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'priority_type' => PriorityType::Regular->value,
            'patient_name' => 'Juan Dela Cruz',
            'phone_number' => '09181234567',
            'sms_consent' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('queues', [
            'department_id' => $department->id,
            'service_id' => $service->id,
            'phone_number' => '09181234567',
            'sms_consent' => true,
        ]);
    }

    public function test_sms_notification_service_handles_idempotency_and_logs(): void
    {
        // Enable SMS in settings for test
        $settings = QueueSetting::getSettings();
        $settings->update([
            'enable_sms' => true,
            'sms_provider' => 'log',
        ]);

        $department = Department::factory()->create(['is_active' => true, 'name' => 'OPD']);
        $service = Service::factory()->create(['department_id' => $department->id, 'name' => 'General Medicine', 'prefix' => 'OPD']);
        $window = Window::factory()->create(['department_id' => $department->id, 'name' => 'Window 1']);

        $queue = Queue::factory()->called()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'window_id' => $window->id,
            'queue_number' => 'OPD-010',
            'phone_number' => '+639171234567',
            'sms_consent' => true,
        ]);

        $smsService = app(SmsNotificationService::class);

        // First dispatch creates log and dispatches async job
        $log1 = $smsService->dispatchQueueNotification($queue, 'called', ['window_name' => 'Window 1']);
        $this->assertNotNull($log1);

        // Process the queued job
        $job = new SendQueueSmsNotification($log1->id);
        $job->handle($smsService);

        // Verify notification log created and delivered
        $this->assertDatabaseHas('notification_logs', [
            'queue_id' => $queue->id,
            'notification_type' => 'called',
            'status' => 'sent',
            'raw_recipient' => '+639171234567',
        ]);

        $log = NotificationLog::where('queue_id', $queue->id)->first();
        $this->assertEquals('0917*****567', $log->recipient);

        // Second dispatch with same idempotency key should return existing log without duplicating
        $log2 = $smsService->dispatchQueueNotification($queue, 'called', ['window_name' => 'Window 1']);
        $this->assertEquals($log1->id, $log2->id);

        // Ensure exactly 1 log exists in database
        $this->assertEquals(1, NotificationLog::where('queue_id', $queue->id)->count());
    }

    public function test_sms_job_dispatches_and_executes_successfully(): void
    {
        // Enable SMS globally
        $settings = QueueSetting::getSettings();
        $settings->update([
            'enable_sms' => true,
            'sms_provider' => 'log',
        ]);

        $department = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->create(['department_id' => $department->id, 'prefix' => 'LAB']);
        $window = Window::factory()->create(['department_id' => $department->id, 'name' => 'Window 2']);

        $queue = Queue::factory()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'window_id' => $window->id,
            'queue_number' => 'LAB-005',
            'status' => QueueStatus::Called,
            'phone_number' => '+639170001122',
            'sms_consent' => true,
        ]);

        $log = NotificationLog::create([
            'queue_id' => $queue->id,
            'channel' => 'sms',
            'notification_type' => 'called',
            'recipient' => '0917*****122',
            'raw_recipient' => '+639170001122',
            'status' => 'pending',
            'provider' => 'log',
            'message_body' => 'Notice: LAB-005 please proceed to Window 2.',
            'idempotency_key' => 'test_job_key_123',
            'attempts' => 0,
        ]);

        // Run job directly
        $job = new SendQueueSmsNotification($log->id);
        $job->handle(app(SmsNotificationService::class));

        $this->assertDatabaseHas('notification_logs', [
            'id' => $log->id,
            'status' => 'sent',
            'raw_recipient' => '+639170001122',
        ]);
    }

    public function test_admin_can_access_and_update_sms_settings(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($admin)->get(route('settings.notifications.edit'));
        $response->assertOk();

        $updateResponse = $this->actingAs($admin)->patch(route('settings.notifications.update'), [
            'enable_sms' => true,
            'sms_provider' => 'semaphore',
            'sms_sender_id' => 'HOSPITAL',
            'sms_api_key' => 'test-api-key-123',
            'sms_api_secret' => null,
            'sms_nearing_threshold' => 3,
            'sms_retry_limit' => 3,
            'sms_template_nearing' => 'Your turn is coming up for {queue_number}',
            'sms_template_called' => 'Now calling {queue_number} at {window}',
            'sms_template_transferred' => 'Transferred {queue_number} to {service}',
            'sms_template_completed' => 'Thank you for visiting {hospital_name}.',
            'enable_browser_notifications' => true,
            'enable_sound_vibration' => true,
        ]);

        $updateResponse->assertRedirect();
        $this->assertDatabaseHas('queue_settings', [
            'enable_sms' => true,
            'sms_provider' => 'semaphore',
            'sms_sender_id' => 'HOSPITAL',
            'sms_nearing_threshold' => 3,
        ]);
    }

    public function test_admin_can_send_test_sms(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($admin)->post(route('settings.notifications.test-sms'), [
            'phone_number' => '09171234567',
            'custom_message' => 'This is a test notification from MedQueue',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
    }

    public function test_unauthorized_user_cannot_access_notification_settings(): void
    {
        $staff = User::factory()->create(['role' => UserRole::QueueStaff]);

        $response = $this->actingAs($staff)->get(route('settings.notifications.edit'));
        $response->assertForbidden();

        $updateResponse = $this->actingAs($staff)->patch(route('settings.notifications.update'), [
            'enable_sms' => true,
            'sms_provider' => 'log',
            'sms_nearing_threshold' => 3,
            'sms_retry_limit' => 3,
            'enable_browser_notifications' => true,
            'enable_sound_vibration' => true,
        ]);
        $updateResponse->assertForbidden();
    }

    public function test_admin_can_retry_failed_notification(): void
    {
        // Enable SMS in settings for retry
        $settings = QueueSetting::getSettings();
        $settings->update([
            'enable_sms' => true,
            'sms_provider' => 'log',
        ]);

        $admin = User::factory()->superAdmin()->create();
        $department = Department::factory()->create(['is_active' => true]);
        $service = Service::factory()->create(['department_id' => $department->id, 'prefix' => 'RAD']);

        $queue = Queue::factory()->create([
            'department_id' => $department->id,
            'service_id' => $service->id,
            'queue_number' => 'RAD-020',
            'phone_number' => '+639179998877',
            'sms_consent' => true,
        ]);

        $log = NotificationLog::create([
            'queue_id' => $queue->id,
            'notification_type' => 'nearing',
            'channel' => 'sms',
            'provider' => 'log',
            'recipient' => '0917*****877',
            'raw_recipient' => '+639179998877',
            'message_body' => 'Notice: RAD-020 will be called soon.',
            'idempotency_key' => 'test_retry_key_1',
            'status' => 'failed',
            'attempts' => 1,
            'error_message' => 'Simulated network timeout',
        ]);

        $response = $this->actingAs($admin)->post(route('notifications.retry', $log->id));
        $response->assertRedirect();

        $log->refresh();
        $this->assertEquals('sent', $log->status);
        $this->assertNull($log->error_message);
    }
}
