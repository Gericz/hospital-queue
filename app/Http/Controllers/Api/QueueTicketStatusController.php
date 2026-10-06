<?php

namespace App\Http\Controllers\Api;

use App\Actions\Queue\CreateQueueTicketAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Queue\StoreQueueTicketRequest;
use App\Models\Queue;
use App\Models\QueueSetting;
use App\Services\Queue\PatientTrackingService;
use Illuminate\Http\JsonResponse;

class QueueTicketStatusController extends Controller
{
    public function __construct(
        protected PatientTrackingService $trackingService
    ) {}

    /**
     * Issue a queue ticket from Kiosk or public registration desk.
     */
    public function store(StoreQueueTicketRequest $request, CreateQueueTicketAction $action): JsonResponse
    {
        $queue = $action->execute(
            $request->validated(),
            $request->user()
        );

        $settings = QueueSetting::getSettings();
        $trackingData = $this->trackingService->getTrackingData($queue);

        return response()->json([
            'message' => 'Queue ticket issued successfully.',
            'data' => array_merge($trackingData['ticket'], $trackingData, [
                'status_url' => url('/queue/status/'.$queue->public_token),
                'hospital' => [
                    'name' => $settings->hospital_name,
                    'tagline' => $settings->hospital_tagline,
                    'ticket_footer' => $settings->ticket_footer,
                    'ticket_width' => $settings->ticket_width,
                    'show_patient_name' => $settings->show_patient_name_on_ticket,
                ],
            ]),
        ], 201);
    }

    /**
     * Retrieve public queue ticket details by secure token (Zero PII).
     */
    public function show(string $token): JsonResponse
    {
        $queue = Queue::where('public_token', $token)
            ->with(['department', 'service', 'window'])
            ->firstOrFail();

        $data = $this->trackingService->getTrackingData($queue);

        return response()->json([
            'data' => array_merge($data['ticket'], $data),
        ]);
    }

    /**
     * Retrieve live queue status, people ahead, and current window serving info (Zero PII).
     */
    public function status(string $token): JsonResponse
    {
        $queue = Queue::where('public_token', $token)
            ->with(['department', 'service', 'window'])
            ->firstOrFail();

        $data = $this->trackingService->getTrackingData($queue);

        return response()->json([
            'data' => [
                'public_token' => $queue->public_token,
                'queue_number' => $queue->queue_number,
                'service_name' => $queue->service?->name,
                'department_name' => $queue->department?->name,
                'status' => $queue->status->value,
                'status_label' => $queue->status->label(),
                'window_name' => $queue->window?->name,
                'window_number' => $queue->window?->window_number,
                'currently_serving_number' => $data['currentlyServingNumber'],
                'currently_serving_window' => $data['currentlyServingWindow'],
                'people_ahead' => $data['peopleAhead'],
                'position' => $data['position'],
                'estimated_wait_minutes' => $data['estimatedWaitMinutes'],
                'estimated_wait_text' => $data['estimatedWaitText'],
                'called_at' => $queue->called_at?->toIso8601String(),
                'server_time' => now()->toIso8601String(),
            ],
        ]);
    }
}
