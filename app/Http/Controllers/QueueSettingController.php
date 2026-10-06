<?php

namespace App\Http\Controllers;

use App\Models\QueueSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class QueueSettingController extends Controller
{
    /**
     * Display the queue ticket and hospital settings management page.
     */
    public function edit(): Response
    {
        Gate::authorize('manage', QueueSetting::class);

        $settings = QueueSetting::getSettings();

        return Inertia::render('Settings/QueueSettings', [
            'settings' => $settings,
        ]);
    }

    /**
     * Update the queue ticket and hospital settings.
     */
    public function update(Request $request): RedirectResponse
    {
        Gate::authorize('manage', QueueSetting::class);

        $validated = $request->validate([
            'hospital_name' => ['required', 'string', 'max:150'],
            'hospital_tagline' => ['nullable', 'string', 'max:255'],
            'logo_url' => ['nullable', 'string', 'max:500'],
            'ticket_header' => ['nullable', 'string', 'max:150'],
            'ticket_footer' => ['nullable', 'string', 'max:500'],
            'ticket_width' => ['required', 'string', 'in:58mm,80mm'],
            'show_patient_name_on_ticket' => ['required', 'boolean'],
            'allow_kiosk_emergency' => ['required', 'boolean'],
            'kiosk_idle_timeout' => ['required', 'integer', 'min:5', 'max:120'],
        ]);

        $settings = QueueSetting::getSettings();
        $settings->update($validated);

        return back()->with('success', 'Queue and ticket settings updated successfully.');
    }
}
