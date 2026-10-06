<?php

namespace App\Http\Controllers;

use App\Actions\Queue\CreateQueueTicketAction;
use App\Enums\PriorityType;
use App\Http\Requests\Queue\StoreQueueTicketRequest;
use App\Models\Department;
use App\Models\QueueSetting;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class QueueTicketController extends Controller
{
    public function __construct(
        protected CreateQueueTicketAction $createQueueAction
    ) {}

    /**
     * Show ticket issuing interface (Staff Registration Desk).
     */
    public function create(): Response
    {
        $settings = QueueSetting::getSettings();

        $departments = Department::where('is_active', true)
            ->with(['services' => fn ($q) => $q->where('is_active', true)->orderBy('name')])
            ->orderBy('name')
            ->get();

        $priorities = collect(PriorityType::cases())->map(fn (PriorityType $priority) => [
            'value' => $priority->value,
            'label' => $priority->label(),
            'badgeColor' => $priority->badgeColor(),
        ]);

        return Inertia::render('Queue/TakeTicket', [
            'departments' => $departments,
            'priorities' => $priorities,
            'hospital' => [
                'name' => $settings->hospital_name,
                'tagline' => $settings->hospital_tagline,
                'ticket_header' => $settings->ticket_header,
                'ticket_footer' => $settings->ticket_footer,
                'ticket_width' => $settings->ticket_width,
                'show_patient_name' => $settings->show_patient_name_on_ticket,
            ],
        ]);
    }

    /**
     * Store and issue a new queue ticket.
     */
    public function store(StoreQueueTicketRequest $request): RedirectResponse
    {
        $queue = $this->createQueueAction->execute(
            $request->validated(),
            $request->user()
        );

        $settings = QueueSetting::getSettings();

        return redirect()->route('queue.tickets.create')->with([
            'success' => "Ticket #{$queue->queue_number} issued successfully.",
            'ticket' => [
                'id' => $queue->id,
                'public_token' => $queue->public_token,
                'queue_number' => $queue->queue_number,
                'display_number' => $queue->display_number,
                'department_name' => $queue->department?->name,
                'service_name' => $queue->service?->name,
                'priority_type' => $queue->priority_type->value,
                'priority_label' => $queue->priority_type->label(),
                'patient_name' => $queue->patient_name,
                'patient_reference' => $queue->patient_reference,
                'created_at' => $queue->created_at->format('M d, Y h:i A'),
                'footer' => $settings->ticket_footer,
                'width' => $settings->ticket_width,
                'status_url' => route('queue.status', $queue->public_token),
            ],
        ]);
    }
}
