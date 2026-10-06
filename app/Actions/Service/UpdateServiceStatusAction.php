<?php

namespace App\Actions\Service;

use App\Enums\ServiceStatus;
use App\Events\Service\ServiceStatusChanged;
use App\Models\Service;
use App\Models\User;

class UpdateServiceStatusAction
{
    public function execute(
        Service $service,
        ServiceStatus $status,
        ?string $reason = null,
        ?int $maxWaitingQueue = null,
        ?int $maxPriorityQueue = null,
        ?User $actor = null
    ): Service {
        $service->status = $status;
        $service->status_reason = $reason;

        if ($maxWaitingQueue !== null) {
            $service->max_waiting_queue = $maxWaitingQueue;
        }

        if ($maxPriorityQueue !== null) {
            $service->max_priority_queue = $maxPriorityQueue;
        }

        $service->save();

        event(new ServiceStatusChanged($service));

        return $service;
    }
}
