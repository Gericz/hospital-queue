import React, { useState, useEffect } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Department, Service, PageProps } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import SelectInput from '@/Components/Form/SelectInput';
import TextArea from '@/Components/Form/TextArea';
import Checkbox from '@/Components/Checkbox';
import ThermalTicket from '@/Components/Ticket/ThermalTicket';
import TicketPrintPreviewModal from '@/Components/Ticket/TicketPrintPreviewModal';
import { printThermalElement } from '@/lib/ticketPrinter';

interface PriorityOption {
    value: string;
    label: string;
    badgeColor: string;
}

interface HospitalInfo {
    name: string;
    tagline?: string | null;
    ticket_header?: string | null;
    ticket_footer?: string | null;
    ticket_width: '58mm' | '80mm';
    show_patient_name: boolean;
}

interface IssuedTicket {
    id: number;
    public_token: string;
    queue_number: string;
    display_number: string;
    department_name?: string;
    service_name?: string;
    priority_type: string;
    priority_label?: string;
    patient_name?: string | null;
    patient_reference?: string | null;
    created_at: string;
    footer?: string | null;
    width?: '58mm' | '80mm';
    status_url?: string;
}

interface TakeTicketProps extends PageProps {
    departments: (Department & { services: Service[] })[];
    priorities: PriorityOption[];
    hospital: HospitalInfo;
}

export default function TakeTicket({ auth, departments, priorities, hospital }: TakeTicketProps) {
    const { flash } = usePage<PageProps>().props;
    const lastIssuedTicket = (flash?.ticket as unknown as IssuedTicket) || null;

    const [selectedDeptId, setSelectedDeptId] = useState<number | ''>(
        departments.length > 0 ? departments[0].id : ''
    );
    const [printWidth, setPrintWidth] = useState<'58mm' | '80mm'>(
        hospital.ticket_width || '80mm'
    );
    const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

    // Auto pop-out Print Preview modal immediately when ticket is issued
    useEffect(() => {
        if (flash?.ticket) {
            setIsPreviewOpen(true);
        }
    }, [flash?.ticket]);

    const { data, setData, post, processing, errors, reset } = useForm({
        department_id: selectedDeptId,
        service_id: '',
        priority_type: 'REGULAR',
        patient_name: '',
        patient_reference: '',
        phone_number: '',
        sms_consent: false,
        notes: '',
    });

    const activeDepartment = departments.find((d) => d.id === Number(selectedDeptId));
    const activeServices = activeDepartment?.services || [];

    const handleDepartmentChange = (deptId: number | '') => {
        setSelectedDeptId(deptId);
        setData((prev) => ({
            ...prev,
            department_id: deptId,
            service_id: '',
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('queue.tickets.store'), {
            onSuccess: () => {
                setData((prev) => ({
                    ...prev,
                    patient_name: '',
                    patient_reference: '',
                    phone_number: '',
                    sms_consent: false,
                    notes: '',
                }));
            },
        });
    };

    const handlePrintTicket = () => {
        printThermalElement('registration-thermal-ticket', printWidth);
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-slate-800 dark:text-slate-100">
                            Staff Registration Desk
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Issue tickets, verify priority status, and print patient slips
                        </p>
                    </div>

                    <div className="flex items-center space-x-3">
                        <a
                            href="/kiosk"
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition"
                        >
                            Launch Patient Kiosk ↗
                        </a>
                    </div>
                </div>
            }
        >
            <Head title="Staff Registration Desk — MedQueue" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left 7 Cols: Ticket Issuance Form */}
                        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm print:hidden">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
                                <span className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-xl">🎟️</span>
                                <span>Issue New Queue Ticket</span>
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Department Selection */}
                                <div>
                                    <InputLabel htmlFor="department_id" value="Select Department *" />
                                    <SelectInput
                                        id="department_id"
                                        value={data.department_id}
                                        onChange={(e) => handleDepartmentChange(e.target.value ? Number(e.target.value) : '')}
                                        className="mt-1 block w-full"
                                        required
                                    >
                                        <option value="">-- Choose Department --</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name} ({dept.code})
                                            </option>
                                        ))}
                                    </SelectInput>
                                    <InputError message={errors.department_id} className="mt-1" />
                                </div>

                                {/* Service Selection Cards */}
                                <div>
                                    <InputLabel value="Select Clinical Service *" />
                                    {activeServices.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                            {activeServices.map((service) => (
                                                <button
                                                    key={service.id}
                                                    type="button"
                                                    onClick={() => setData('service_id', String(service.id))}
                                                    className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                                                        String(data.service_id) === String(service.id)
                                                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                                                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                                            {service.name}
                                                        </span>
                                                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                            {service.prefix}
                                                        </span>
                                                    </div>
                                                    {service.description && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                                            {service.description}
                                                        </p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-sm text-slate-500 mt-2">
                                            No active services found in this department.
                                        </div>
                                    )}
                                    <InputError message={errors.service_id} className="mt-1" />
                                </div>

                                {/* Priority Selector Buttons */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <InputLabel value="Patient Priority Category *" />
                                        <span className="text-[11px] text-slate-400">Staff verification required</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                                        {priorities.map((p) => (
                                            <button
                                                key={p.value}
                                                type="button"
                                                onClick={() => setData('priority_type', p.value)}
                                                className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                                    data.priority_type === p.value
                                                        ? p.value === 'EMERGENCY'
                                                            ? 'bg-red-600 text-white border-transparent shadow-md'
                                                            : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-md'
                                                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                    <InputError message={errors.priority_type} className="mt-1" />
                                </div>

                                {/* Patient Details */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div>
                                        <InputLabel htmlFor="patient_name" value="Patient Full Name" />
                                        <TextInput
                                            id="patient_name"
                                            value={data.patient_name}
                                            onChange={(e) => setData('patient_name', e.target.value)}
                                            placeholder="e.g. Juan Dela Cruz"
                                            className="mt-1 block w-full text-sm"
                                        />
                                        <InputError message={errors.patient_name} className="mt-1" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="patient_reference" value="Hospital / MRN ID" />
                                        <TextInput
                                            id="patient_reference"
                                            value={data.patient_reference}
                                            onChange={(e) => setData('patient_reference', e.target.value)}
                                            placeholder="e.g. MRN-000123"
                                            className="mt-1 block w-full text-sm"
                                        />
                                        <InputError message={errors.patient_reference} className="mt-1" />
                                    </div>
                                </div>

                                {/* SMS Notifications Opt-in */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                    <div>
                                        <InputLabel htmlFor="phone_number" value="Mobile Phone for SMS Notifications (Optional)" />
                                        <TextInput
                                            id="phone_number"
                                            type="tel"
                                            value={data.phone_number}
                                            onChange={(e) => setData('phone_number', e.target.value)}
                                            placeholder="e.g. 09171234567 or +639171234567"
                                            className="mt-1 block w-full text-sm font-mono"
                                        />
                                        <p className="text-[11px] text-slate-500 mt-1">
                                            Patient will receive an SMS when their turn is approaching and when called.
                                        </p>
                                        <InputError message={errors.phone_number} className="mt-1" />
                                    </div>

                                    {data.phone_number && (
                                        <div className="flex items-start space-x-2 pt-1">
                                            <Checkbox
                                                id="sms_consent"
                                                name="sms_consent"
                                                checked={data.sms_consent}
                                                onChange={(e) => setData('sms_consent', e.target.checked)}
                                                className="mt-0.5"
                                            />
                                            <label htmlFor="sms_consent" className="text-xs text-slate-600 dark:text-slate-300 select-none cursor-pointer leading-tight">
                                                Patient consents to receive SMS queue status alerts and service call updates.
                                            </label>
                                        </div>
                                    )}
                                    <InputError message={errors.sms_consent} className="mt-1" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="notes" value="Internal Registration Notes (Optional)" />
                                    <TextArea
                                        id="notes"
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        placeholder="Add any specific instructions or desk notes..."
                                        rows={2}
                                        className="mt-1 block w-full text-sm"
                                    />
                                    <InputError message={errors.notes} className="mt-1" />
                                </div>

                                <div className="pt-2">
                                    <PrimaryButton
                                        disabled={processing || !data.service_id}
                                        className="w-full justify-center py-3.5 text-sm font-bold shadow-lg shadow-blue-500/20"
                                    >
                                        {processing ? 'Issuing Ticket...' : 'Print & Issue Ticket'}
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>

                        {/* Right 5 Cols: Thermal Ticket Print Preview */}
                        <div className="lg:col-span-5 flex flex-col space-y-4 print:hidden">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Thermal Slip Preview (with QR Code)
                                    </h3>
                                    <div className="flex items-center space-x-2 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setPrintWidth('58mm')}
                                            className={`px-2 py-0.5 rounded font-bold transition ${
                                                printWidth === '58mm'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                            }`}
                                        >
                                            58mm
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPrintWidth('80mm')}
                                            className={`px-2 py-0.5 rounded font-bold transition ${
                                                printWidth === '80mm'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                            }`}
                                        >
                                            80mm
                                        </button>
                                    </div>
                                </div>

                                {lastIssuedTicket ? (
                                    <div className="space-y-4">
                                        <ThermalTicket
                                            id="registration-thermal-ticket"
                                            ticket={{
                                                ...lastIssuedTicket,
                                                width: printWidth,
                                            }}
                                            hospitalName={hospital.name}
                                            hospitalTagline={hospital.tagline || undefined}
                                            ticketHeader={hospital.ticket_header || undefined}
                                            showPatientName={hospital.show_patient_name}
                                        />

                                        <div className="flex flex-col gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsPreviewOpen(true)}
                                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                                            >
                                                <span>👁️</span>
                                                <span>Open Print Preview</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handlePrintTicket}
                                                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2 cursor-pointer"
                                            >
                                                <span>🖨️</span>
                                                <span>Quick Print Thermal Slip</span>
                                            </button>

                                            <a
                                                href={`/queue/status/${lastIssuedTicket.public_token}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl text-center transition"
                                            >
                                                Open Live Tracking Screen ↗
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                        <div className="text-3xl mb-2">🧾</div>
                                        <p className="text-sm font-semibold">Ready to issue ticket</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Fill out patient details and submit to generate the printable thermal slip with live tracking QR code.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print-Only Layout for Thermal Receipt Printers */}
            {lastIssuedTicket && (
                <div id="thermal-print-area" className="hidden print:block">
                    <ThermalTicket
                        ticket={{
                            ...lastIssuedTicket,
                            width: printWidth,
                        }}
                        hospitalName={hospital.name}
                        hospitalTagline={hospital.tagline || undefined}
                        ticketHeader={hospital.ticket_header || undefined}
                        showPatientName={hospital.show_patient_name}
                    />
                </div>
            )}

            {/* Print Preview & Print Modal */}
            <TicketPrintPreviewModal
                show={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                ticket={lastIssuedTicket ? { ...lastIssuedTicket, width: printWidth } : null}
                hospital={hospital}
                onPrint={() => setIsPreviewOpen(false)}
            />
        </AuthenticatedLayout>
    );
}
