<?php

namespace Tests\Feature\Operations;

use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Models\Department;
use App\Models\Queue;
use App\Models\QueueSetting;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AutoSkipCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_auto_skip_command_skips_called_tickets_exceeding_timeout(): void
    {
        $dept = Department::factory()->create(['is_active' => true, 'status' => 'open']);
        $service = Service::factory()->create(['department_id' => $dept->id, 'is_active' => true]);

        $settings = QueueSetting::getSettings();
        $settings->auto_skip_timeout_minutes = 5;
        $settings->save();

        // Expired called ticket (called 10 minutes ago)
        $expiredQueue = Queue::factory()->create([
            'department_id' => $dept->id,
            'service_id' => $service->id,
            'status' => QueueStatus::Called,
            'called_at' => Carbon::now()->subMinutes(10),
        ]);

        // Recent called ticket (called 1 minute ago)
        $recentQueue = Queue::factory()->create([
            'department_id' => $dept->id,
            'service_id' => $service->id,
            'status' => QueueStatus::Called,
            'called_at' => Carbon::now()->subMinute(),
        ]);

        $this->artisan('queue:auto-skip')
            ->expectsOutputToContain('Total tickets auto-skipped: 1')
            ->assertSuccessful();

        $this->assertEquals(QueueStatus::Skipped, $expiredQueue->fresh()->status);
        $this->assertEquals(QueueStatus::Called, $recentQueue->fresh()->status);

        $this->assertDatabaseHas('queue_events', [
            'queue_id' => $expiredQueue->id,
            'event_type' => QueueEventType::AutoSkipped->value,
            'to_status' => QueueStatus::Skipped->value,
        ]);
    }
}
