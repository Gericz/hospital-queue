import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { QueueSettingData } from '@/types';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import ToggleSwitch from '@/Components/Form/ToggleSwitch';

interface Props {
    settings: QueueSettingData;
    providers: { value: string; label: string }[];
}

export default function Settings({ settings, providers }: Props) {
    const { data, setData, patch, processing, errors } = useForm({
        enable_sms: Boolean(settings.enable_sms),
        sms_provider: settings.sms_provider || 'log',
        sms_sender_id: settings.sms_sender_id || 'MedQueue',
        sms_api_key: settings.sms_api_key || '',
        sms_api_secret: settings.sms_api_secret || '',
        sms_nearing_threshold: settings.sms_nearing_threshold || 3,
        sms_retry_limit: settings.sms_retry_limit || 3,
        sms_template_nearing: settings.sms_template_nearing || 'Your queue number {queue_number} for {service} is approaching service. Please proceed near the waiting area. - {hospital_name}',
        sms_template_called: settings.sms_template_called || 'NOW SERVING: Queue {queue_number} for {service}. Please proceed immediately to {window}. - {hospital_name}',
        sms_template_transferred: settings.sms_template_transferred || 'Queue {queue_number} has been transferred to {department} - {service}. Please proceed to the new waiting area. - {hospital_name}',
        sms_template_completed: settings.sms_template_completed || 'Your visit for Queue {queue_number} ({service}) has been completed. Thank you for visiting {hospital_name}.',
        enable_browser_notifications: Boolean(settings.enable_browser_notifications),
        enable_sound_vibration: Boolean(settings.enable_sound_vibration),
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        patch(route('settings.notifications.update'));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                            SMS Gateway & Notification Settings
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Configure SMS providers, API credentials, approaching thresholds, and message templates
                        </p>
                    </div>
                    <Link href={route('notifications.index')}>
                        <SecondaryButton className="text-xs py-2 px-3">
                            ← Back to Delivery Logs
                        </SecondaryButton>
                    </Link>
                </div>
            }
        >
            <Head title="SMS & Notification Settings - MedQueue" />

            <div className="max-w-4xl mx-auto space-y-6">
                <form onSubmit={submit} className="space-y-6">
                    {/* Master SMS Activation */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-4">
                            Master SMS Gateway Activation
                        </h3>
                        <ToggleSwitch
                            checked={data.enable_sms}
                            onChange={(val) => setData('enable_sms', val)}
                            label="Enable SMS Notifications"
                            description="When active, patients who opt-in at registration or kiosk will receive automated queue updates via SMS."
                        />
                    </div>

                    {/* SMS Provider Configuration */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2">
                            SMS Provider & API Credentials
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="sms_provider" value="Active SMS Provider Gateway" />
                                <select
                                    id="sms_provider"
                                    value={data.sms_provider}
                                    onChange={(e) => setData('sms_provider', e.target.value)}
                                    className="mt-1 block w-full bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-sm py-2 px-3 focus:ring-teal-500"
                                >
                                    {providers.map((p) => (
                                        <option key={p.value} value={p.value}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <InputLabel htmlFor="sms_sender_id" value="Sender ID / Alphanumeric Name" />
                                <TextInput
                                    id="sms_sender_id"
                                    value={data.sms_sender_id}
                                    onChange={(e) => setData('sms_sender_id', e.target.value)}
                                    placeholder="MedQueue"
                                    className="mt-1 block w-full text-sm"
                                />
                            </div>

                            {data.sms_provider !== 'log' && (
                                <>
                                    <div>
                                        <InputLabel htmlFor="sms_api_key" value="API Key / Account SID / Token" />
                                        <TextInput
                                            id="sms_api_key"
                                            type="password"
                                            value={data.sms_api_key}
                                            onChange={(e) => setData('sms_api_key', e.target.value)}
                                            placeholder="Enter gateway API key..."
                                            className="mt-1 block w-full text-sm"
                                        />
                                    </div>

                                    {(data.sms_provider === 'twilio' || data.sms_provider === 'vonage') && (
                                        <div>
                                            <InputLabel htmlFor="sms_api_secret" value="Auth Token / API Secret" />
                                            <TextInput
                                                id="sms_api_secret"
                                                type="password"
                                                value={data.sms_api_secret}
                                                onChange={(e) => setData('sms_api_secret', e.target.value)}
                                                placeholder="Enter gateway secret..."
                                                className="mt-1 block w-full text-sm"
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <div>
                                <InputLabel htmlFor="sms_nearing_threshold" value="Nearing Service Alert Threshold (Patients Ahead)" />
                                <TextInput
                                    id="sms_nearing_threshold"
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={data.sms_nearing_threshold}
                                    onChange={(e) => setData('sms_nearing_threshold', Number(e.target.value))}
                                    className="mt-1 block w-32 text-sm"
                                    required
                                />
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Send "Approaching Service" SMS when queue position is ≤ this number.
                                </p>
                            </div>

                            <div>
                                <InputLabel htmlFor="sms_retry_limit" value="SMS Job Retry Limit" />
                                <TextInput
                                    id="sms_retry_limit"
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={data.sms_retry_limit}
                                    onChange={(e) => setData('sms_retry_limit', Number(e.target.value))}
                                    className="mt-1 block w-32 text-sm"
                                    required
                                />
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Maximum background dispatch attempts before marking log as failed.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Configurable Message Templates */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                                Notification SMS Message Templates
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Available placeholders: <code className="text-teal-600 font-mono">{"{queue_number}"}</code>, <code className="text-teal-600 font-mono">{"{service}"}</code>, <code className="text-teal-600 font-mono">{"{window}"}</code>, <code className="text-teal-600 font-mono">{"{department}"}</code>, <code className="text-teal-600 font-mono">{"{hospital_name}"}</code>.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <InputLabel htmlFor="sms_template_nearing" value="1. Nearing Service Alert Template" />
                                <textarea
                                    id="sms_template_nearing"
                                    rows={2}
                                    value={data.sms_template_nearing}
                                    onChange={(e) => setData('sms_template_nearing', e.target.value)}
                                    className="mt-1 block w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <InputLabel htmlFor="sms_template_called" value="2. Queue Called (Now Serving) Template" />
                                <textarea
                                    id="sms_template_called"
                                    rows={2}
                                    value={data.sms_template_called}
                                    onChange={(e) => setData('sms_template_called', e.target.value)}
                                    className="mt-1 block w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <InputLabel htmlFor="sms_template_transferred" value="3. Queue Transferred Template" />
                                <textarea
                                    id="sms_template_transferred"
                                    rows={2}
                                    value={data.sms_template_transferred}
                                    onChange={(e) => setData('sms_template_transferred', e.target.value)}
                                    className="mt-1 block w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <InputLabel htmlFor="sms_template_completed" value="4. Visit Completed (Optional) Template" />
                                <textarea
                                    id="sms_template_completed"
                                    rows={2}
                                    value={data.sms_template_completed}
                                    onChange={(e) => setData('sms_template_completed', e.target.value)}
                                    className="mt-1 block w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Patient Mobile Experience Toggles */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2">
                            Patient Web Tracking Preferences
                        </h3>

                        <ToggleSwitch
                            checked={data.enable_browser_notifications}
                            onChange={(val) => setData('enable_browser_notifications', val)}
                            label="Allow Browser Notifications on Mobile Tracker"
                            description="Enables explicit opt-in browser notification controls on the public /queue/status page."
                        />

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                            <ToggleSwitch
                                checked={data.enable_sound_vibration}
                                onChange={(val) => setData('enable_sound_vibration', val)}
                                label="Allow Sound & Vibration Alerts"
                                description="Plays a tone and vibrates when a patient's ticket is called to a counter."
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <Link href={route('notifications.index')}>
                            <SecondaryButton type="button">Cancel</SecondaryButton>
                        </Link>
                        <PrimaryButton type="submit" disabled={processing}>
                            {processing ? 'Saving Settings...' : 'Save Configuration'}
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
