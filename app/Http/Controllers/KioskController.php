<?php

namespace App\Http\Controllers;

use App\Actions\Queue\CreateQueueTicketAction;
use App\Enums\PriorityType;
use App\Http\Requests\Queue\StoreQueueTicketRequest;
use App\Models\Department;
use App\Models\QueueSetting;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class KioskController extends Controller
{
    /**
     * Display the self-service touch kiosk patient registration flow.
     */
    public function index(): Response
    {
        $settings = QueueSetting::getSettings();
        $today = Carbon::today()->format('Y-m-d');

        $departments = Department::where('is_active', true)
            ->with(['services' => function ($q) {
                $q->where('is_active', true)->orderBy('name');
            }])
            ->orderBy('name')
            ->get()
            ->map(fn (Department $d) => [
                'id' => $d->id,
                'code' => $d->code,
                'name' => $d->name,
                'description' => $d->description,
                'services' => $d->services->map(fn (Service $s) => [
                    'id' => $s->id,
                    'code' => $s->code,
                    'name' => $s->name,
                    'description' => $s->description,
                    'prefix' => $s->prefix,
                    'is_open' => $s->isWithinOperatingHours(),
                    'is_full' => $s->hasReachedDailyLimit($today),
                    'open_time' => $s->open_time,
                    'close_time' => $s->close_time,
                ]),
            ]);

        // Kiosk priorities (Emergency excluded unless enabled in settings)
        $priorities = collect(PriorityType::cases())
            ->filter(fn (PriorityType $p) => $settings->allow_kiosk_emergency || $p !== PriorityType::Emergency)
            ->map(fn (PriorityType $p) => [
                'value' => $p->value,
                'label' => $p->label(),
                'badgeColor' => $p->badgeColor(),
            ])
            ->values();

        return Inertia::render('Queue/Kiosk', [
            'departments' => $departments,
            'priorities' => $priorities,
            'hospital' => [
                'name' => $settings->hospital_name,
                'tagline' => $settings->hospital_tagline,
                'logo_url' => $settings->logo_url,
                'ticket_header' => $settings->ticket_header,
                'ticket_footer' => $settings->ticket_footer,
                'ticket_width' => $settings->ticket_width,
                'show_patient_name' => $settings->show_patient_name_on_ticket,
                'kiosk_idle_timeout' => $settings->kiosk_idle_timeout,
            ],
            'reverbConfig' => [
                'key' => config('reverb.apps.apps.0.key', env('VITE_REVERB_APP_KEY')),
                'host' => config('reverb.servers.reverb.hostname', env('VITE_REVERB_HOST', 'localhost')),
                'port' => (int) config('reverb.servers.reverb.port', env('VITE_REVERB_PORT', 8080)),
                'scheme' => config('reverb.servers.reverb.options.tls') ? 'https' : (env('VITE_REVERB_SCHEME', 'http')),
            ],
        ]);
    }

    /**
     * Store a new queue ticket issued via the kiosk.
     */
    public function store(StoreQueueTicketRequest $request, CreateQueueTicketAction $action): RedirectResponse
    {
        $queue = $action->execute(
            $request->validated(),
            $request->user()
        );

        $settings = QueueSetting::getSettings();

        return redirect()->route('kiosk')->with([
            'ticket' => [
                'id' => $queue->id,
                'public_token' => $queue->public_token,
                'queue_number' => $queue->queue_number,
                'display_number' => $queue->display_number,
                'department_name' => $queue->department?->name,
                'service_name' => $queue->service?->name,
                'priority_type' => $queue->priority_type->value,
                'priority_label' => $queue->priority_type->label(),
                'patient_name' => $settings->show_patient_name_on_ticket ? $queue->patient_name : null,
                'patient_reference' => $queue->patient_reference,
                'created_at' => $queue->created_at->format('M d, Y h:i A'),
                'footer' => $settings->ticket_footer,
                'width' => $settings->ticket_width,
                'status_url' => route('queue.status', $queue->public_token),
            ],
        ]);
    }
}
