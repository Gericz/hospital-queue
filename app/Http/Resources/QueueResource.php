<?php

namespace App\Http\Resources;

use App\Models\Queue;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Queue
 */
class QueueResource extends JsonResource
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
            'queue_number' => $this->queue_number,
            'queue_sequence' => $this->queue_sequence,
            'display_number' => $this->display_number,
            'queue_date' => $this->queue_date?->format('Y-m-d') ?? (string) $this->queue_date,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'priority_type' => $this->priority_type->value,
            'priority_label' => $this->priority_type->label(),
            'priority_level' => $this->priority_level,
            'patient_name' => $this->patient_name,
            'patient_reference' => $this->patient_reference,
            'notes' => $this->notes,
            'department_id' => $this->department_id,
            'department_name' => $this->department?->name,
            'department_code' => $this->department?->code,
            'service_id' => $this->service_id,
            'service_name' => $this->service?->name,
            'service_code' => $this->service?->code,
            'service_prefix' => $this->service?->prefix,
            'window_id' => $this->window_id,
            'window_number' => $this->window?->window_number,
            'window_name' => $this->window?->name,
            'called_at' => $this->called_at?->toIso8601String(),
            'started_at' => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
