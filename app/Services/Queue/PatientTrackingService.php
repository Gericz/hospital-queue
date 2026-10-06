<?php

namespace App\Services\Queue;

use App\Enums\QueueStatus;
use App\Enums\WindowStatus;
use App\Models\Queue;
use App\Models\QueueSetting;
use App\Models\Window;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PatientTrackingService
{
    /**
     * Build rich, privacy-preserving tracking payload for a patient ticket.
     *
     * @return array<string, mixed>
     */
    public function getTrackingData(Queue $queue): array
    {
        $queue->loadMissing(['department', 'service', 'window']);
        $settings = QueueSetting::getSettings();
        $today = $queue->queue_date ? $queue->queue_date->format('Y-m-d') : Carbon::today()->format('Y-m-d');

        // 1. Calculate people ahead and approximate position (respecting priority)
        $peopleAhead = 0;
        if ($queue->status === QueueStatus::Waiting) {
            $peopleAhead = Queue::where('service_id', $queue->service_id)
                ->whereDate('queue_date', $today)
                ->where('status', QueueStatus::Waiting->value)
                ->where(function ($q) use ($queue) {
                    $q->where('priority_level', '<', $queue->priority_level)
                        ->orWhere(function ($sub) use ($queue) {
                            $sub->where('priority_level', '=', $queue->priority_level)
                                ->where('queue_sequence', '<', $queue->queue_sequence);
                        });
                })
                ->count();
        }

        $position = ($queue->status === QueueStatus::Waiting) ? ($peopleAhead + 1) : null;

        // 2. Currently serving ticket in this department / service
        $currentlyServing = Queue::where('department_id', $queue->department_id)
            ->whereDate('queue_date', $today)
            ->whereIn('status', [QueueStatus::Called->value, QueueStatus::Serving->value])
            ->whereNotNull('window_id')
            ->orderBy('called_at', 'desc')
            ->first();

        // 3. Estimate waiting time based on active counters & recent average duration
        $estimatedWait = $this->calculateEstimatedWait($queue, $peopleAhead, $today);

        // 4. Clean timeline of state transitions without internal audit/staff metadata
        $timeline = $this->buildTimeline($queue);

        return [
            'ticket' => [
                'public_token' => $queue->public_token,
                'queue_number' => $queue->queue_number,
                'display_number' => $queue->display_number,
                'department_id' => $queue->department_id,
                'department_code' => $queue->department?->code,
                'department_name' => $queue->department?->name,
                'service_id' => $queue->service_id,
                'service_code' => $queue->service?->code,
                'service_name' => $queue->service?->name,
                'status' => $queue->status->value,
                'status_label' => $queue->status->label(),
                'priority_type' => $queue->priority_type->value,
                'priority_label' => $queue->priority_type->label(),
                'window_id' => $queue->window_id,
                'window_name' => $queue->window?->name,
                'window_number' => $queue->window?->window_number,
                'called_at' => $queue->called_at?->toIso8601String(),
                'started_at' => $queue->started_at?->toIso8601String(),
                'completed_at' => $queue->completed_at?->toIso8601String(),
                'created_at' => $queue->created_at->toIso8601String(),
            ],
            'peopleAhead' => $peopleAhead,
            'position' => $position,
            'estimatedWaitMinutes' => $estimatedWait['minutes'],
            'estimatedWaitText' => $estimatedWait['text'],
            'currentlyServingNumber' => $currentlyServing?->queue_number,
            'currentlyServingWindow' => $currentlyServing?->window?->name,
            'timeline' => $timeline,
            'hospital' => [
                'name' => $settings->hospital_name,
                'tagline' => $settings->hospital_tagline,
                'ticket_footer' => $settings->ticket_footer,
                'enable_browser_notifications' => $settings->enable_browser_notifications,
                'enable_sound_vibration' => $settings->enable_sound_vibration,
            ],
            'reverbConfig' => [
                'key' => config('reverb.apps.apps.0.key', env('VITE_REVERB_APP_KEY')),
                'host' => config('reverb.servers.reverb.hostname', env('VITE_REVERB_HOST', 'localhost')),
                'port' => (int) config('reverb.servers.reverb.port', env('VITE_REVERB_PORT', 8080)),
                'scheme' => config('reverb.servers.reverb.options.tls') ? 'https' : (env('VITE_REVERB_SCHEME', 'http')),
            ],
            'lastUpdated' => now()->toIso8601String(),
        ];
    }

    /**
     * Calculate realistic estimated wait time.
     *
     * @return array{minutes: ?int, text: string}
     */
    protected function calculateEstimatedWait(Queue $queue, int $peopleAhead, string $today): array
    {
        if ($queue->status === QueueStatus::Serving) {
            return ['minutes' => 0, 'text' => 'Currently being served'];
        }

        if ($queue->status === QueueStatus::Called) {
            return ['minutes' => 0, 'text' => 'Now called - Proceed to counter'];
        }

        if ($queue->status === QueueStatus::Completed) {
            return ['minutes' => null, 'text' => 'Visit completed'];
        }

        if ($queue->status !== QueueStatus::Waiting) {
            return ['minutes' => null, 'text' => 'Estimated wait unavailable'];
        }

        // Count active open windows serving this service / department
        $activeWindows = Window::where('department_id', $queue->department_id)
            ->where('is_active', true)
            ->where('status', WindowStatus::Open)
            ->count();

        if ($activeWindows === 0) {
            return ['minutes' => null, 'text' => 'Counters temporarily paused / closed'];
        }

        // Get average service duration in minutes (from service settings or completed tickets)
        $avgDuration = DB::table('queues')
            ->where('service_id', $queue->service_id)
            ->whereNotNull('started_at')
            ->whereNotNull('completed_at')
            ->where('queue_date', '>=', Carbon::parse($today)->subDays(7)->format('Y-m-d'))
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, started_at, completed_at)) as avg_duration')
            ->value('avg_duration');

        $avgMinutes = (int) round($avgDuration ?: 10);
        if ($avgMinutes <= 0) {
            $avgMinutes = 8;
        }

        $estimatedMinutes = (int) ceil(($peopleAhead * $avgMinutes) / max(1, $activeWindows));

        if ($estimatedMinutes <= 0) {
            $text = '~5 minutes (Next up)';
        } elseif ($estimatedMinutes < 60) {
            $text = "~{$estimatedMinutes} minutes";
        } else {
            $hours = floor($estimatedMinutes / 60);
            $mins = $estimatedMinutes % 60;
            $text = $mins > 0 ? "~{$hours}h {$mins}m" : "~{$hours} hours";
        }

        return [
            'minutes' => $estimatedMinutes,
            'text' => $text,
        ];
    }

    /**
     * Construct safe patient-facing timeline.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function buildTimeline(Queue $queue): array
    {
        $events = $queue->events()->orderBy('created_at', 'asc')->get();
        $steps = [];

        foreach ($events as $event) {
            $toStatus = $event->to_status;
            $statusEnum = is_string($toStatus) ? QueueStatus::tryFrom($toStatus) : $toStatus;
            $statusLabel = $statusEnum ? $statusEnum->label() : ucfirst((string) $toStatus);

            $detail = null;
            if ($statusEnum === QueueStatus::Called && $event->window) {
                $detail = 'Called to '.$event->window->name;
            } elseif ($statusEnum === QueueStatus::Transferred) {
                $detail = 'Transferred to '.$queue->department?->name;
            }

            $steps[] = [
                'status' => $statusEnum?->value ?? (string) $toStatus,
                'label' => $statusLabel,
                'detail' => $detail,
                'timestamp' => $event->created_at->toIso8601String(),
                'time_formatted' => $event->created_at->format('g:i A'),
            ];
        }

        if (empty($steps)) {
            $steps[] = [
                'status' => 'waiting',
                'label' => 'Ticket Created',
                'detail' => 'Waiting for counter assignment',
                'timestamp' => $queue->created_at->toIso8601String(),
                'time_formatted' => $queue->created_at->format('g:i A'),
            ];
        }

        return $steps;
    }
}
