<?php

namespace App\Events\Window;

use App\Models\User;
use App\Models\Window;
use App\Models\WindowAssignment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WindowStaffAssigned implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @var array<string, mixed>
     */
    public array $payload;

    public function __construct(public Window $window, public User $staff, public WindowAssignment $assignment)
    {
        $this->payload = [
            'window_id' => $window->id,
            'window_number' => $window->window_number,
            'window_name' => $window->name,
            'display_name' => $window->display_name,
            'department_id' => $window->department_id,
            'staff_id' => $staff->id,
            'staff_name' => $staff->name,
            'staff_email' => $staff->email,
            'assignment_id' => $assignment->id,
            'assigned_at' => $assignment->assigned_at->toIso8601String(),
            'window_status' => $window->status->value,
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
        ];
    }

    public function broadcastAs(): string
    {
        return 'WindowStaffAssigned';
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
