<?php

namespace App\Events\Queue;

use App\Models\Queue;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class QueueTransferred implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @var array<string, mixed>
     */
    public array $payload;

    public function __construct(
        public Queue $sourceQueue,
        public Queue $newQueue,
        public ?string $reason = null
    ) {
        $this->payload = [
            'source_queue_id' => $sourceQueue->id,
            'source_queue_number' => $sourceQueue->queue_number,
            'source_department_id' => $sourceQueue->department_id,
            'source_department_name' => $sourceQueue->department?->name,
            'new_queue_id' => $newQueue->id,
            'new_queue_number' => $newQueue->queue_number,
            'new_department_id' => $newQueue->department_id,
            'new_department_name' => $newQueue->department?->name,
            'new_service_id' => $newQueue->service_id,
            'new_service_name' => $newQueue->service?->name,
            'priority_type' => $newQueue->priority_type->value,
            'reason' => $reason,
            'event_type' => 'transferred',
            'timestamp' => now()->toIso8601String(),
        ];
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('department.'.$this->sourceQueue->department_id),
            new Channel('public-department.'.$this->sourceQueue->department_id),
            new Channel('public-department.'.$this->sourceQueue->department?->code),
            new PrivateChannel('department.'.$this->newQueue->department_id),
            new Channel('public-department.'.$this->newQueue->department_id),
            new Channel('public-department.'.$this->newQueue->department?->code),
            new PrivateChannel('queue-monitor'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'QueueTransferred';
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
