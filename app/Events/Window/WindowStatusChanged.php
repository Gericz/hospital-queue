<?php

namespace App\Events\Window;

use App\Models\Window;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WindowStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @var array<string, mixed>
     */
    public array $payload;

    public function __construct(public Window $window, public ?string $action = null)
    {
        $this->payload = [
            'window_id' => $window->id,
            'window_number' => $window->window_number,
            'window_name' => $window->name,
            'display_name' => $window->display_name,
            'department_id' => $window->department_id,
            'service_id' => $window->service_id,
            'service_name' => $window->service?->name,
            'status' => $window->status->value,
            'is_active' => $window->is_active,
            'action' => $action,
            'last_activity_at' => $window->last_activity_at?->toIso8601String(),
            'timestamp' => now()->toIso8601String(),
        ];
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('operations'),
            new PrivateChannel('queue-monitor'),
            new PrivateChannel('department.'.$this->window->department_id),
            new PrivateChannel('window.'.$this->window->id),
            new Channel('public-department.'.$this->window->department_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'WindowStatusChanged';
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
