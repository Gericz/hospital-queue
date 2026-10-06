<?php

namespace App\Events\Queue;

use App\Models\Queue;
use App\Models\Window;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class QueueStarted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @var array<string, mixed>
     */
    public array $payload;

    public function __construct(public Queue $queue, public ?Window $window = null)
    {
        $activeWindow = $window ?: $queue->window;

        $this->payload = [
            'queue_id' => $queue->id,
            'queue_number' => $queue->queue_number,
            'display_number' => $queue->display_number,
            'department_id' => $queue->department_id,
            'department_code' => $queue->department?->code,
            'department_name' => $queue->department?->name,
            'service_id' => $queue->service_id,
            'service_code' => $queue->service?->code,
            'service_name' => $queue->service?->name,
            'service_prefix' => $queue->service?->prefix,
            'window_id' => $activeWindow?->id,
            'window_number' => $activeWindow?->window_number,
            'window_name' => $activeWindow?->name,
            'status' => $queue->status->value,
            'priority_type' => $queue->priority_type->value,
            'priority_level' => $queue->priority_level,
            'started_at' => $queue->started_at?->toIso8601String() ?? now()->toIso8601String(),
            'event_type' => 'serving_started',
            'timestamp' => now()->toIso8601String(),
        ];
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('department.'.$this->queue->department_id),
            new Channel('public-department.'.$this->queue->department_id),
            new Channel('public-department.'.$this->queue->department?->code),
            new PrivateChannel('queue-monitor'),
        ];

        if ($this->queue->window_id) {
            $channels[] = new PrivateChannel('window.'.$this->queue->window_id);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'QueueStarted';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return $this->payload;
    }

    /**
     * The name of the queue on which to place the broadcasting job.
     */
    public function broadcastQueue(): string
    {
        return 'default';
    }
}
