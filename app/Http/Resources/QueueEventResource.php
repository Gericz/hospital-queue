<?php

namespace App\Http\Resources;

use App\Models\QueueEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin QueueEvent
 */
class QueueEventResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'queue_id' => $this->queue_id,
            'event_type' => $this->event_type->value,
            'event_label' => $this->event_type->label(),
            'from_status' => $this->from_status?->value,
            'to_status' => $this->to_status?->value,
            'reason' => $this->reason,
            'payload' => $this->payload,
            'window_id' => $this->window_id,
            'window_name' => $this->window?->name,
            'user_id' => $this->user_id,
            'user_name' => $this->user?->name,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
