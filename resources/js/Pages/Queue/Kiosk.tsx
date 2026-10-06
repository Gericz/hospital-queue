import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { ReverbConfig } from '@/lib/echo';
import { PublicPageProps } from '@/types';
import { QRCodeSVG } from 'qrcode.react';
import ThermalTicket from '@/Components/Ticket/ThermalTicket';
import TicketPrintPreviewModal from '@/Components/Ticket/TicketPrintPreviewModal';
import { printThermalElement } from '@/lib/ticketPrinter';

interface KioskService {
    id: number;
    code: string;
    name: string;
    description: string | null;
    prefix: string;
    is_open: boolean;
    is_full: boolean;
    open_time: string | null;
    close_time: string | null;
}

interface KioskDepartment {
    id: number;
    code: string;
    name: string;
    description: string | null;
    services: KioskService[];
}

interface PriorityItem {
    value: string;
    label: string;
    badgeColor: string;
}

interface HospitalSettings {
    name: string;
    tagline?: string | null;
    logo_url?: string | null;
    ticket_header?: string | null;
    ticket_footer?: string | null;
    ticket_width: string;
    show_patient_name: boolean;
    kiosk_idle_timeout: number;
    enable_sms?: boolean;
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
    width?: string;
    status_url?: string;
}

interface KioskProps {
    departments: KioskDepartment[];
    priorities: PriorityItem[];
    hospital: HospitalSettings;
    reverbConfig?: ReverbConfig;
}

type KioskStep = 'welcome' | 'department' | 'service' | 'priority' | 'patient_info' | 'confirm' | 'ticket_issued';

export default function Kiosk({ departments, priorities, hospital }: KioskProps) {
    const pageProps = usePage().props as any;
    const flash = pageProps.flash;
    const initialTicket = (flash?.ticket as IssuedTicket) || null;
    const [step, setStep] = useState<KioskStep>(initialTicket ? 'ticket_issued' : 'welcome');
    const [selectedDept, setSelectedDept] = useState<KioskDepartment | null>(null);
    const [selectedService, setSelectedService] = useState<KioskService | null>(null);
    const [selectedPriority, setSelectedPriority] = useState<string>('REGULAR');
    const [ticketData, setTicketData] = useState<IssuedTicket | null>(initialTicket);
    const [countdown, setCountdown] = useState<number>(hospital.kiosk_idle_timeout || 15);
    const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        department_id: '',
        service_id: '',
        priority_type: 'REGULAR',
        patient_name: '',
        patient_reference: '',
        phone_number: '',
        sms_consent: false,
    });

    // Auto Reset Timer
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

    const resetKioskToWelcome = useCallback(() => {
        setStep('welcome');
        setSelectedDept(null);
        setSelectedService(null);
        setSelectedPriority('REGULAR');
        setTicketData(null);
        reset();
        clearErrors();
    }, [reset, clearErrors]);

    // Handle ticket issuance from flash session
    useEffect(() => {
        if (flash?.ticket) {
            setTicketData(flash.ticket as IssuedTicket);
            setStep('ticket_issued');
            setIsPreviewOpen(true);
            setCountdown(hospital.kiosk_idle_timeout || 15);
        }
    }, [flash, hospital.kiosk_idle_timeout]);

    // Countdown effect when ticket is issued
    useEffect(() => {
        if (step === 'ticket_issued') {
            countdownTimerRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(countdownTimerRef.current as NodeJS.Timeout);
                        resetKioskToWelcome();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
            }
        };
    }, [step, resetKioskToWelcome]);

    // Step Navigation Handlers
    const handleSelectDepartment = (dept: KioskDepartment) => {
        setSelectedDept(dept);
        setSelectedService(null);
        setData('department_id', String(dept.id));
        setStep('service');
    };

    const handleSelectService = (srv: KioskService) => {
        if (!srv.is_open || srv.is_full) return;
        setSelectedService(srv);
        setData('service_id', String(srv.id));
        setStep('priority');
    };

    const handleSelectPriority = (priorityValue: string) => {
        setSelectedPriority(priorityValue);
        setData('priority_type', priorityValue);
        setStep('patient_info');
    };

    const handleConfirmSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('kiosk.store'), {
            preserveScroll: true,
            onError: () => {
                // If validation error, stay on form
            },
        });
    };

    const handlePrintTicket = () => {
        printThermalElement('kiosk-thermal-ticket', (hospital.ticket_width as '58mm' | '80mm') || '80mm');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between select-none">
            <Head title={`Touch Kiosk — ${hospital.name}`} />

            {/* Kiosk Header */}
            <header className="bg-slate-900 border-b border-slate-800 px-8 py-5 flex items-center justify-between shadow-2xl print:hidden">
                <div className="flex items-center space-x-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            {hospital.name}
                        </h1>
                        <p className="text-xs sm:text-sm font-semibold text-cyan-400 uppercase tracking-wider">
                            {hospital.tagline || 'Self-Service Queue Kiosk'}
                        </p>
                    </div>
                </div>

                {step !== 'welcome' && step !== 'ticket_issued' && (
                    <button
                        onClick={resetKioskToWelcome}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm rounded-xl border border-slate-700 transition cursor-pointer"
                    >
                        ✕ Cancel & Restart
                    </button>
                )}
            </header>

            {/* Main Interactive Stage */}
            <main className="flex-1 flex items-center justify-center p-6 sm:p-10 max-w-6xl mx-auto w-full print:hidden">
                {/* 1. WELCOME SCREEN */}
                {step === 'welcome' && (
                    <div className="text-center space-y-8 max-w-2xl py-8">
                        <div className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 shadow-2xl animate-pulse">
                            <span className="text-7xl">🏥</span>
                        </div>

                        <div>
                            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                                Welcome to Patient Care
                            </h2>
                            <p className="text-lg text-slate-400 mt-3">
                                Please touch below to get your hospital queue ticket in simple steps.
                            </p>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={() => setStep('department')}
                                className="w-full sm:w-auto px-12 py-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-2xl rounded-3xl shadow-xl shadow-cyan-500/30 transform hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                            >
                                TOUCH TO GET TICKET →
                            </button>
                        </div>

                        <div className="flex items-center justify-center space-x-6 text-xs text-slate-500 pt-6">
                            <span>✓ Fast Registration</span>
                            <span>•</span>
                            <span>✓ Senior & PWD Priority Support</span>
                            <span>•</span>
                            <span>✓ Real-Time Audio Calling</span>
                        </div>
                    </div>
                )}

                {/* 2. SELECT DEPARTMENT */}
                {step === 'department' && (
                    <div className="w-full space-y-6">
                        <div className="text-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Step 1 of 4</span>
                            <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">
                                Select Hospital Department
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">
                                Tap on the department where you have an appointment or need care.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                            {departments.map((dept) => (
                                <button
                                    key={dept.id}
                                    onClick={() => handleSelectDepartment(dept)}
                                    className="p-8 bg-slate-900/90 hover:bg-slate-800/90 border-2 border-slate-800 hover:border-cyan-500/60 rounded-3xl text-left shadow-xl transition-all duration-200 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[180px]"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs rounded-lg border border-cyan-500/30">
                                                {dept.code}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {dept.services.length} Services
                                            </span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-white group-hover:text-cyan-300">
                                            {dept.name}
                                        </h3>
                                        {dept.description && (
                                            <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                                                {dept.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-4 flex items-center text-xs font-bold text-cyan-400">
                                        <span>Select Department</span>
                                        <span className="ml-1">→</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. SELECT SERVICE */}
                {step === 'service' && selectedDept && (
                    <div className="w-full space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Step 2 of 4</span>
                                <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">
                                    {selectedDept.name} Services
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    Select the specific clinical service or consultation you require.
                                </p>
                            </div>
                            <button
                                onClick={() => setStep('department')}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                                ← Back to Departments
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                            {selectedDept.services.map((srv) => {
                                const isUnavailable = !srv.is_open || srv.is_full;
                                return (
                                    <button
                                        key={srv.id}
                                        disabled={isUnavailable}
                                        onClick={() => handleSelectService(srv)}
                                        className={`p-7 rounded-3xl border-2 text-left transition-all duration-200 shadow-xl flex flex-col justify-between min-h-[160px] ${
                                            isUnavailable
                                                ? 'bg-slate-900/40 border-slate-800/60 opacity-60 cursor-not-allowed'
                                                : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-cyan-500/60 transform hover:-translate-y-1 cursor-pointer'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="px-3 py-1 bg-slate-800 text-slate-300 font-mono font-bold text-xs rounded-lg">
                                                    Prefix: {srv.prefix}
                                                </span>

                                                {srv.is_full ? (
                                                    <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-400 text-xs font-bold rounded-full border border-rose-500/30">
                                                        Queue Full
                                                    </span>
                                                ) : !srv.is_open ? (
                                                    <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full border border-amber-500/30">
                                                        Closed
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">
                                                        Available
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="text-2xl font-bold text-white">{srv.name}</h3>
                                            {srv.description && (
                                                <p className="text-xs text-slate-400 mt-2">{srv.description}</p>
                                            )}
                                        </div>

                                        <div className="mt-4 text-xs font-bold text-cyan-400 flex items-center justify-between">
                                            <span>
                                                {isUnavailable
                                                    ? 'Service Currently Unavailable'
                                                    : 'Choose this Service →'}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 4. SELECT PRIORITY */}
                {step === 'priority' && selectedService && (
                    <div className="w-full space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Step 3 of 4</span>
                                <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">
                                    Select Priority Category
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    Priority lanes are available for seniors, persons with disability, and expectant mothers.
                                </p>
                            </div>
                            <button
                                onClick={() => setStep('service')}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                                ← Back to Services
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            {priorities.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => handleSelectPriority(p.value)}
                                    className={`p-6 rounded-3xl border-2 text-left transition-all shadow-lg cursor-pointer ${
                                        selectedPriority === p.value
                                            ? 'bg-gradient-to-r from-blue-900/60 to-slate-900 border-cyan-400 ring-4 ring-cyan-500/20'
                                            : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                                                {p.value === 'REGULAR' ? 'Standard Queue' : 'Priority Lane'}
                                            </span>
                                            <h3 className="text-2xl font-bold text-white mt-1">{p.label}</h3>
                                        </div>
                                        <span className="text-3xl">
                                            {p.value === 'SENIOR'
                                                ? '👴'
                                                : p.value === 'PWD'
                                                ? '♿'
                                                : p.value === 'PREGNANT'
                                                ? '🤰'
                                                : p.value === 'EMERGENCY'
                                                ? '🚨'
                                                : '👤'}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs text-slate-400 flex items-center space-x-3">
                            <span className="text-base">ℹ️</span>
                            <span>
                                Priority classification is subject to hospital policy and verification by authorized registration desk staff.
                            </span>
                        </div>
                    </div>
                )}

                {/* 5. PATIENT INFORMATION (OPTIONAL) & CONFIRMATION */}
                {step === 'patient_info' && selectedDept && selectedService && (
                    <div className="w-full space-y-6 max-w-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Step 4 of 4</span>
                                <h2 className="text-3xl sm:text-4xl font-black text-white mt-1">
                                    Patient Information
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    Enter your name or hospital ID (optional) to link to your consultation.
                                </p>
                            </div>
                            <button
                                onClick={() => setStep('priority')}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                                ← Back
                            </button>
                        </div>

                        {/* Selected Summary Card */}
                        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 flex items-center justify-between text-xs">
                            <div>
                                <span className="text-slate-500 font-bold uppercase tracking-wider">Department</span>
                                <div className="text-base font-bold text-white mt-0.5">{selectedDept.name}</div>
                            </div>
                            <div className="text-center">
                                <span className="text-slate-500 font-bold uppercase tracking-wider">Service</span>
                                <div className="text-base font-bold text-cyan-300 mt-0.5">{selectedService.name}</div>
                            </div>
                            <div className="text-right">
                                <span className="text-slate-500 font-bold uppercase tracking-wider">Priority</span>
                                <div className="text-base font-bold text-amber-300 mt-0.5">{selectedPriority}</div>
                            </div>
                        </div>

                        <form onSubmit={handleConfirmSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-1">
                                    Patient Full Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={data.patient_name}
                                    onChange={(e) => setData('patient_name', e.target.value)}
                                    placeholder="e.g. Juan Dela Cruz"
                                    className="w-full px-5 py-4 bg-slate-900 border-2 border-slate-800 focus:border-cyan-400 text-white rounded-2xl text-lg font-medium outline-none transition"
                                />
                                {errors.patient_name && (
                                    <p className="text-xs text-rose-400 mt-1">{errors.patient_name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-1">
                                    Hospital Patient Number / MRN (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={data.patient_reference}
                                    onChange={(e) => setData('patient_reference', e.target.value)}
                                    placeholder="e.g. PAT-102938"
                                    className="w-full px-5 py-4 bg-slate-900 border-2 border-slate-800 focus:border-cyan-400 text-white rounded-2xl text-lg font-medium outline-none transition"
                                />
                                {errors.patient_reference && (
                                    <p className="text-xs text-rose-400 mt-1">{errors.patient_reference}</p>
                                )}
                            </div>

                            {/* Optional Mobile Phone for SMS Queue Alerts */}
                            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-3">
                                <label className="block text-sm font-bold text-cyan-300">
                                    Receive Free SMS Queue Alerts (Optional)
                                </label>
                                <input
                                    type="tel"
                                    value={data.phone_number}
                                    onChange={(e) => setData('phone_number', e.target.value)}
                                    placeholder="e.g. 09171234567"
                                    className="w-full px-5 py-3.5 bg-slate-950 border border-slate-700 focus:border-cyan-400 text-white rounded-xl text-base font-medium outline-none transition"
                                />
                                {errors.phone_number && (
                                    <p className="text-xs text-rose-400">{errors.phone_number}</p>
                                )}

                                <label className="flex items-start space-x-3 cursor-pointer select-none pt-1">
                                    <input
                                        type="checkbox"
                                        checked={data.sms_consent}
                                        onChange={(e) => setData('sms_consent', e.target.checked)}
                                        className="mt-1 h-5 w-5 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-400"
                                    />
                                    <span className="text-xs text-slate-300 leading-relaxed">
                                        I consent to receive automated SMS alerts when my queue number is approaching or called.
                                    </span>
                                </label>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full py-5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xl rounded-2xl shadow-xl shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50"
                                >
                                    {processing ? 'Generating Queue Number...' : 'GET QUEUE NUMBER →'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* 6. TICKET ISSUED SUCCESS SCREEN */}
                {step === 'ticket_issued' && ticketData && (
                    <div className="w-full max-w-xl text-center space-y-5 py-2">
                        <div className="bg-slate-900/90 border-2 border-cyan-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/40">
                            <div className="text-xs font-black uppercase tracking-widest text-cyan-400">
                                {hospital.name}
                            </div>
                            <div className="text-sm font-bold text-slate-300 mt-1">
                                {ticketData.department_name} • {ticketData.service_name}
                            </div>

                            <div className="my-6 py-5 border-y-2 border-slate-800 bg-slate-950/80 rounded-2xl">
                                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                                    Your Queue Number
                                </div>
                                <div className="text-6xl sm:text-7xl font-black font-mono tracking-tighter text-white">
                                    {ticketData.queue_number}
                                </div>
                                {ticketData.priority_type !== 'REGULAR' && (
                                    <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                        ⭐ {ticketData.priority_label || ticketData.priority_type}
                                    </div>
                                )}
                            </div>

                            {/* QR Code Scan on Phone Callout */}
                            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-center gap-4 text-left">
                                <div className="bg-white p-2 rounded-xl shadow shrink-0">
                                    <QRCodeSVG
                                        value={typeof window !== 'undefined' ? `${window.location.origin}/queue/status/${ticketData.public_token}` : `/queue/status/${ticketData.public_token}`}
                                        size={95}
                                        level="M"
                                    />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                                        📱 Scan To Track On Phone
                                    </div>
                                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                        Point your smartphone camera at this QR code to watch live queue progress, estimated wait times, and get called alerts.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                                <button
                                    type="button"
                                    onClick={() => setIsPreviewOpen(true)}
                                    className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition cursor-pointer flex items-center justify-center space-x-2"
                                >
                                    <span>👁️</span>
                                    <span>Print Preview & Print</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handlePrintTicket}
                                    className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl border border-slate-700 transition cursor-pointer flex items-center justify-center space-x-2"
                                >
                                    <span>🖨️</span>
                                    <span>Quick Print</span>
                                </button>

                                <a
                                    href={`/queue/status/${ticketData.public_token}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-sm rounded-xl border border-slate-800 transition flex items-center justify-center space-x-1"
                                >
                                    <span>📱</span>
                                    <span>Live Tracker ↗</span>
                                </a>
                            </div>

                            {/* Auto Reset Progress Bar & Countdown */}
                            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                                <span>Returning to start screen in {countdown}s</span>
                                <button
                                    onClick={resetKioskToWelcome}
                                    className="text-cyan-400 hover:underline font-bold cursor-pointer"
                                >
                                    Done / New Ticket
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Printable Thermal Slip for Kiosk */}
            {ticketData && (
                <div className="hidden">
                    <ThermalTicket
                        id="kiosk-thermal-ticket"
                        ticket={{
                            ...ticketData,
                            width: (hospital.ticket_width as '58mm' | '80mm') || '80mm',
                        }}
                        hospitalName={hospital.name}
                        hospitalTagline={hospital.tagline || undefined}
                        ticketHeader={hospital.ticket_header || undefined}
                        showPatientName={hospital.show_patient_name}
                    />
                </div>
            )}

            {/* Footer */}
            <footer className="bg-slate-900 border-t border-slate-800 px-8 py-3 flex items-center justify-between text-xs text-slate-500 print:hidden">
                <div>MedQueue Touch Kiosk • QR Enabled</div>
                <div>Hospital Local Server Ready</div>
            </footer>

            {/* Print Preview & Print Modal */}
            <TicketPrintPreviewModal
                show={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                ticket={ticketData ? { ...ticketData, width: hospital.ticket_width || '80mm' } : null}
                hospital={hospital}
                onPrint={() => setIsPreviewOpen(false)}
            />
        </div>
    );
}
