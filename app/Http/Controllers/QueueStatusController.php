<?php

namespace App\Http\Controllers;

use App\Models\Queue;
use App\Services\Queue\PatientTrackingService;
use Inertia\Inertia;
use Inertia\Response;

class QueueStatusController extends Controller
{
    public function __construct(
        protected PatientTrackingService $trackingService
    ) {}

    /**
     * Display public real-time patient queue tracking page.
     * Uses secure public_token with ZERO PII exposure.
     */
    public function show(string $token): Response
    {
        $queue = Queue::where('public_token', $token)
            ->with(['department', 'service', 'window'])
            ->firstOrFail();

        $data = $this->trackingService->getTrackingData($queue);

        return Inertia::render('Queue/Status', $data);
    }
}
