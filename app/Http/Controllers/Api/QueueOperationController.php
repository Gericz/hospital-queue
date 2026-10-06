<?php

namespace App\Http\Controllers\Api;

use App\Actions\Queue\CallNextQueueAction;
use App\Actions\Queue\CompleteQueueAction;
use App\Actions\Queue\HoldQueueAction;
use App\Actions\Queue\RecallQueueAction;
use App\Actions\Queue\ResumeQueueAction;
use App\Actions\Queue\SkipQueueAction;
use App\Actions\Queue\StartServingQueueAction;
use App\Actions\Queue\TransferQueueAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Queue\CallNextRequest;
use App\Http\Requests\Queue\TransferQueueRequest;
use App\Http\Resources\QueueResource;
use App\Models\Queue;
use App\Models\Window;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QueueOperationController extends Controller
{
    /**
     * Call the next waiting patient to a window.
     */
    public function callNext(CallNextRequest $request, CallNextQueueAction $action): JsonResponse
    {
        $window = Window::findOrFail($request->validated('window_id'));
        $serviceId = $request->validated('service_id');

        $queue = $action->execute(
            window: $window,
            user: $request->user(),
            serviceId: $serviceId
        );

        if (! $queue) {
            return response()->json([
                'message' => 'No patients waiting in queue.',
                'data' => null,
            ], 200);
        }

        return (new QueueResource($queue))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Recall patient.
     */
    public function recall(Queue $queue, Request $request, RecallQueueAction $action): JsonResponse
    {
        $window = null;
        if ($request->has('window_id')) {
            $window = Window::find($request->input('window_id'));
        }

        $recalled = $action->execute($queue, $request->user(), $window);

        return (new QueueResource($recalled))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Start serving patient.
     */
    public function startServing(Queue $queue, Request $request, StartServingQueueAction $action): JsonResponse
    {
        $window = null;
        if ($request->has('window_id')) {
            $window = Window::find($request->input('window_id'));
        }

        $served = $action->execute($queue, $request->user(), $window);

        return (new QueueResource($served))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Complete patient consultation/service.
     */
    public function complete(Queue $queue, Request $request, CompleteQueueAction $action): JsonResponse
    {
        $window = null;
        if ($request->has('window_id')) {
            $window = Window::find($request->input('window_id'));
        }

        $completed = $action->execute($queue, $request->user(), $window);

        return (new QueueResource($completed))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Skip patient ticket.
     */
    public function skip(Queue $queue, Request $request, SkipQueueAction $action): JsonResponse
    {
        $request->validate(['reason' => ['nullable', 'string', 'max:255']]);

        $skipped = $action->execute(
            queue: $queue,
            user: $request->user(),
            window: $queue->window,
            reason: $request->input('reason')
        );

        return (new QueueResource($skipped))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Put patient ticket on hold.
     */
    public function hold(Queue $queue, Request $request, HoldQueueAction $action): JsonResponse
    {
        $request->validate(['reason' => ['nullable', 'string', 'max:255']]);

        $held = $action->execute(
            queue: $queue,
            user: $request->user(),
            window: $queue->window,
            reason: $request->input('reason')
        );

        return (new QueueResource($held))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Resume patient ticket from hold.
     */
    public function resume(Queue $queue, Request $request, ResumeQueueAction $action): JsonResponse
    {
        $window = Window::findOrFail($request->input('window_id', $queue->window_id));

        $resumed = $action->execute(
            queue: $queue,
            user: $request->user(),
            window: $window
        );

        return (new QueueResource($resumed))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Transfer patient ticket to another department/service.
     */
    public function transfer(Queue $queue, TransferQueueRequest $request, TransferQueueAction $action): JsonResponse
    {
        $result = $action->execute($queue, $request->user(), $request->validated());

        return response()->json([
            'message' => 'Queue ticket transferred successfully.',
            'data' => [
                'source_queue' => new QueueResource($result['source_queue']),
                'new_queue' => new QueueResource($result['new_queue']),
            ],
        ], 200);
    }
}
