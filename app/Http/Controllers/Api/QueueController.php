<?php

namespace App\Http\Controllers\Api;

use App\Actions\Queue\CreateQueueTicketAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Queue\StoreQueueTicketRequest;
use App\Http\Resources\QueueResource;
use App\Models\Queue;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class QueueController extends Controller
{
    public function __construct(
        protected CreateQueueTicketAction $createAction
    ) {}

    /**
     * Display a listing of queues.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $departmentId = $request->input('department_id');
        $serviceId = $request->input('service_id');
        $status = $request->input('status');
        $date = $request->input('date', Carbon::today()->format('Y-m-d'));

        $queues = Queue::query()
            ->with(['department', 'service', 'window'])
            ->whereDate('queue_date', $date)
            ->when($departmentId, fn ($q) => $q->where('department_id', $departmentId))
            ->when($serviceId, fn ($q) => $q->where('service_id', $serviceId))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->orderBy('priority_level', 'asc')
            ->orderBy('queue_sequence', 'asc')
            ->paginate(20);

        return QueueResource::collection($queues);
    }

    /**
     * Store a newly created queue ticket.
     */
    public function store(StoreQueueTicketRequest $request): JsonResponse
    {
        $queue = $this->createAction->execute(
            $request->validated(),
            $request->user()
        );

        return (new QueueResource($queue))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified queue ticket.
     */
    public function show(Queue $queue): QueueResource
    {
        $queue->load(['department', 'service', 'window', 'events.user', 'events.window']);

        return new QueueResource($queue);
    }
}
