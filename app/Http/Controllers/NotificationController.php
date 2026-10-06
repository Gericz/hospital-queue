<?php

namespace App\Http\Controllers;

use App\Jobs\SendQueueSmsNotification;
use App\Models\NotificationLog;
use App\Models\QueueSetting;
use App\Services\Notification\SmsNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function __construct(
        protected SmsNotificationService $smsService
    ) {}

    /**
     * Display the Notification Audit & Operational History Dashboard.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('manage', QueueSetting::class);

        $status = $request->input('status');
        $type = $request->input('type');
        $search = $request->string('search')->trim()->value();

        $logs = NotificationLog::query()
            ->with(['queue' => fn ($q) => $q->select('id', 'queue_number', 'display_number', 'service_id', 'department_id')])
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($type, fn ($q) => $q->where('notification_type', $type))
            ->when($search, function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('recipient', 'like', "%{$search}%")
                        ->orWhere('idempotency_key', 'like', "%{$search}%")
                        ->orWhereHas('queue', fn ($k) => $k->where('queue_number', 'like', "%{$search}%"));
                });
            })
            ->orderBy('id', 'desc')
            ->paginate(15)
            ->withQueryString();

        // High-level KPI metrics
        $stats = [
            'total_sent' => NotificationLog::where('status', 'sent')->count(),
            'total_pending' => NotificationLog::where('status', 'pending')->count(),
            'total_failed' => NotificationLog::where('status', 'failed')->count(),
            'today_sent' => NotificationLog::where('status', 'sent')->whereDate('created_at', today())->count(),
        ];

        $settings = QueueSetting::getSettings();

        return Inertia::render('Notifications/Index', [
            'logs' => $logs,
            'stats' => $stats,
            'settings' => $settings,
            'filters' => [
                'status' => $status,
                'type' => $type,
                'search' => $search,
            ],
            'providers' => [
                ['value' => 'log', 'label' => 'System Log (Simulated / Dev / Offline)'],
                ['value' => 'semaphore', 'label' => 'Semaphore (Philippines SMS Gateway)'],
                ['value' => 'twilio', 'label' => 'Twilio SMS'],
                ['value' => 'vonage', 'label' => 'Vonage / Nexmo SMS'],
                ['value' => 'gateway', 'label' => 'Hospital Local GSM Modem / HTTP Gateway'],
            ],
        ]);
    }

    /**
     * Display and edit notification & SMS gateway settings.
     */
    public function settings(): Response
    {
        Gate::authorize('manage', QueueSetting::class);

        $settings = QueueSetting::getSettings();

        return Inertia::render('Notifications/Settings', [
            'settings' => $settings,
            'providers' => [
                ['value' => 'log', 'label' => 'System Log (Simulated / Dev / Offline)'],
                ['value' => 'semaphore', 'label' => 'Semaphore (Philippines SMS Gateway)'],
                ['value' => 'twilio', 'label' => 'Twilio SMS'],
                ['value' => 'vonage', 'label' => 'Vonage / Nexmo SMS'],
                ['value' => 'gateway', 'label' => 'Hospital Local GSM Modem / HTTP Gateway'],
            ],
        ]);
    }

    /**
     * Update notification & SMS configuration.
     */
    public function updateSettings(Request $request): RedirectResponse
    {
        Gate::authorize('manage', QueueSetting::class);

        $validated = $request->validate([
            'enable_sms' => ['required', 'boolean'],
            'sms_provider' => ['required', 'string', 'in:log,semaphore,twilio,vonage,gateway'],
            'sms_sender_id' => ['nullable', 'string', 'max:50'],
            'sms_api_key' => ['nullable', 'string', 'max:255'],
            'sms_api_secret' => ['nullable', 'string', 'max:255'],
            'sms_nearing_threshold' => ['required', 'integer', 'min:1', 'max:10'],
            'sms_retry_limit' => ['required', 'integer', 'min:1', 'max:5'],
            'sms_template_nearing' => ['nullable', 'string', 'max:500'],
            'sms_template_called' => ['nullable', 'string', 'max:500'],
            'sms_template_transferred' => ['nullable', 'string', 'max:500'],
            'sms_template_completed' => ['nullable', 'string', 'max:500'],
            'enable_browser_notifications' => ['required', 'boolean'],
            'enable_sound_vibration' => ['required', 'boolean'],
        ]);

        $settings = QueueSetting::getSettings();
        $settings->update($validated);

        return back()->with('success', 'SMS & Notification settings updated successfully.');
    }

    /**
     * Dispatch an administrator SMS connectivity test.
     */
    public function testSms(Request $request): RedirectResponse
    {
        Gate::authorize('manage', QueueSetting::class);

        $validated = $request->validate([
            'phone_number' => ['required', 'string', 'max:30'],
            'custom_message' => ['nullable', 'string', 'max:300'],
        ]);

        $result = $this->smsService->sendTestSms(
            $validated['phone_number'],
            $validated['custom_message'] ?? null
        );

        if ($result->success) {
            return back()->with('success', "Test SMS sent successfully (Message ID: {$result->messageId}).");
        }

        return back()->with('error', "SMS dispatch failed: {$result->errorMessage}");
    }

    /**
     * Retry a failed notification log.
     */
    public function retry(NotificationLog $notificationLog): RedirectResponse
    {
        Gate::authorize('manage', QueueSetting::class);

        if ($notificationLog->status === 'sent') {
            return back()->with('info', 'This notification was already delivered.');
        }

        $notificationLog->update([
            'status' => 'pending',
            'error_message' => null,
        ]);

        SendQueueSmsNotification::dispatch($notificationLog->id);

        return back()->with('success', "Notification #{$notificationLog->id} queued for retry.");
    }
}
