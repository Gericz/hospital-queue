<?php

namespace App\Events\Department;

use App\Models\Department;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DepartmentStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @var array<string, mixed>
     */
    public array $payload;

    public function __construct(public Department $department)
    {
        $this->payload = [
            'department_id' => $department->id,
            'department_code' => $department->code,
            'department_name' => $department->name,
            'status' => $department->status->value,
            'status_reason' => $department->status_reason,
            'is_active' => $department->is_active,
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
            new PrivateChannel('department.'.$this->department->id),
            new Channel('public-department.'.$this->department->id),
            new Channel('public-department.'.$this->department->code),
        ];
    }

    public function broadcastAs(): string
    {
        return 'DepartmentStatusChanged';
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
