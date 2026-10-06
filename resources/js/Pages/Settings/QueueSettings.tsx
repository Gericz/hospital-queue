import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import TextArea from '@/Components/Form/TextArea';
import ToggleSwitch from '@/Components/Form/ToggleSwitch';

interface QueueSettingData {
    id: number;
    hospital_name: string;
    hospital_tagline: string | null;
    logo_url: string | null;
    ticket_header: string | null;
    ticket_footer: string | null;
    ticket_width: '58mm' | '80mm';
    show_patient_name_on_ticket: boolean;
    allow_kiosk_emergency: boolean;
    kiosk_idle_timeout: number;
}

interface SettingsProps extends PageProps {
    settings: QueueSettingData;
}

export default function QueueSettings({ auth, settings }: SettingsProps) {
    const { data, setData, patch, processing, errors, recentlySuccessful } = useForm({
        hospital_name: settings.hospital_name,
        hospital_tagline: settings.hospital_tagline || '',
        logo_url: settings.logo_url || '',
        ticket_header: settings.ticket_header || '',
        ticket_footer: settings.ticket_footer || '',
        ticket_width: settings.ticket_width,
        show_patient_name_on_ticket: settings.show_patient_name_on_ticket,
        allow_kiosk_emergency: settings.allow_kiosk_emergency,
        kiosk_idle_timeout: settings.kiosk_idle_timeout,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        patch(route('settings.queue.update'));
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-xl font-bold leading-tight text-slate-800 dark:text-slate-100">
                        Queue & Ticket Settings
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configure hospital branding, thermal slip layout, and kiosk behavior
                    </p>
                </div>
            }
        >
            <Head title="Queue Settings — MedQueue" />

            <div className="py-6">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Hospital Branding */}
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-4">
                                    Hospital Branding
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <InputLabel htmlFor="hospital_name" value="Hospital / Clinic Name *" />
                                        <TextInput
                                            id="hospital_name"
                                            value={data.hospital_name}
                                            onChange={(e) => setData('hospital_name', e.target.value)}
                                            className="mt-1 block w-full"
                                            required
                                        />
                                        <InputError message={errors.hospital_name} className="mt-1" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="hospital_tagline" value="Tagline / Department Subtitle" />
                                        <TextInput
                                            id="hospital_tagline"
                                            value={data.hospital_tagline}
                                            onChange={(e) => setData('hospital_tagline', e.target.value)}
                                            className="mt-1 block w-full"
                                        />
                                        <InputError message={errors.hospital_tagline} className="mt-1" />
                                    </div>
                                </div>
                            </div>

                            {/* Thermal Ticket Customization */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-4">
                                    Thermal Slip Layout & Printing
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <InputLabel htmlFor="ticket_header" value="Ticket Slip Header" />
                                        <TextInput
                                            id="ticket_header"
                                            value={data.ticket_header}
                                            onChange={(e) => setData('ticket_header', e.target.value)}
                                            className="mt-1 block w-full"
                                        />
                                        <InputError message={errors.ticket_header} className="mt-1" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="ticket_footer" value="Ticket Slip Footer Message" />
                                        <TextArea
                                            id="ticket_footer"
                                            value={data.ticket_footer}
                                            onChange={(e) => setData('ticket_footer', e.target.value)}
                                            rows={2}
                                            className="mt-1 block w-full text-sm"
                                        />
                                        <InputError message={errors.ticket_footer} className="mt-1" />
                                    </div>

                                    <div>
                                        <InputLabel value="Thermal Roll Paper Width" />
                                        <div className="flex items-center space-x-4 mt-2">
                                            <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                                <input
                                                    type="radio"
                                                    name="ticket_width"
                                                    value="58mm"
                                                    checked={data.ticket_width === '58mm'}
                                                    onChange={() => setData('ticket_width', '58mm')}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>58mm (Narrow thermal roll)</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
                                                <input
                                                    type="radio"
                                                    name="ticket_width"
                                                    value="80mm"
                                                    checked={data.ticket_width === '80mm'}
                                                    onChange={() => setData('ticket_width', '80mm')}
                                                    className="text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>80mm (Standard POS receipt)</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <ToggleSwitch
                                            checked={data.show_patient_name_on_ticket}
                                            onChange={(val: boolean) => setData('show_patient_name_on_ticket', val)}
                                            label="Print Patient Name on Ticket Slip"
                                            description="When enabled, entered patient names will appear on the physical thermal ticket (useful for triage verification)."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Kiosk Behavior */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-4">
                                    Touch Kiosk Settings
                                </h3>

                                <div className="space-y-4">
                                    <ToggleSwitch
                                        checked={data.allow_kiosk_emergency}
                                        onChange={(val: boolean) => setData('allow_kiosk_emergency', val)}
                                        label="Allow Emergency Priority Selection on Public Kiosk"
                                        description="When disabled, emergency tickets can only be issued by authorized registration staff."
                                    />

                                    <div>
                                        <InputLabel htmlFor="kiosk_idle_timeout" value="Kiosk Screen Auto-Reset Timeout (Seconds)" />
                                        <TextInput
                                            id="kiosk_idle_timeout"
                                            type="number"
                                            min={5}
                                            max={120}
                                            value={data.kiosk_idle_timeout}
                                            onChange={(e) => setData('kiosk_idle_timeout', Number(e.target.value))}
                                            className="mt-1 block w-40"
                                            required
                                        />
                                        <InputError message={errors.kiosk_idle_timeout} className="mt-1" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                {recentlySuccessful && (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                                        ✓ Settings updated successfully.
                                    </span>
                                )}
                                <PrimaryButton disabled={processing} className="ml-auto">
                                    Save Settings
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
