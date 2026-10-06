<?php

namespace App\Events\Queue;

use App\Enums\PriorityType;
use App\Models\Queue;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class QueuePriorityChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @var array<string, mixed>
     */
    public array $payload;

    public function __construct(
        public Queue $queue,
        public PriorityType $previousPriority,
        public PriorityType $newPriority,
        public ?string $reason = null
    ) {
        $this->payload = [
            'queue_id' => $queue->id,
            'queue_number' => $queue->queue_number,
            'display_number' => $queue->display_number,
            'department_id' => $queue->department_id,
            'service_id' => $queue->service_id,
            'status' => $queue->status->value,
            'previous_priority' => $previousPriority->value,
            'new_priority' => $newPriority->value,
            'priority_type' => $newPriority->value,
            'priority_level' => $queue->priority_level,
            'reason' => $reason,
            'timestamp' => now()->toIso8601String(),
        ];
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('operations'),
            new PrivateChannel('queue-monitor'),
            new PrivateChannel('department.'.$this->queue->department_id),
        ];

        if ($this->queue->public_token) {
            $channels[] = new Channel('public-queue.'.$this->queue->public_token);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'QueuePriorityChanged';
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
