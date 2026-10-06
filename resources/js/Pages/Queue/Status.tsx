import React, { useState, useEffect, useRef } from 'react';
import { Head } from '@inertiajs/react';
import { getEcho, QueueBroadcastPayload } from '@/lib/echo';
import { QRCodeSVG } from 'qrcode.react';

interface TicketInfo {
    public_token: string;
    queue_number: string;
    display_number: string;
    department_id: number;
    department_code?: string;
    department_name?: string;
    service_id: number;
    service_code?: string;
    service_name?: string;
    status: string;
    status_label?: string;
    priority_type: string;
    priority_label?: string;
    window_id?: number | null;
    window_name?: string | null;
    window_number?: string | number | null;
    called_at?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    created_at: string;
}

interface TimelineStep {
    status: string;
    label: string;
    detail?: string | null;
    timestamp: string;
    time_formatted: string;
}

interface HospitalInfo {
    name: string;
    tagline?: string | null;
    ticket_footer?: string | null;
    enable_browser_notifications?: boolean;
    enable_sound_vibration?: boolean;
}

interface StatusProps {
    ticket: TicketInfo;
    peopleAhead: number;
    position?: number | null;
    estimatedWaitMinutes?: number | null;
    estimatedWaitText?: string;
    currentlyServingNumber?: string | null;
    currentlyServingWindow?: string | null;
    timeline?: TimelineStep[];
    hospital: HospitalInfo;
    lastUpdated?: string;
}

export default function Status({
    ticket: initialTicket,
    peopleAhead: initialPeopleAhead,
    position: initialPosition,
    estimatedWaitMinutes: initialEstimatedWaitMinutes,
    estimatedWaitText: initialEstimatedWaitText = 'Calculating...',
    currentlyServingNumber: initialServingNumber,
    currentlyServingWindow: initialServingWindow,
    timeline: initialTimeline = [],
    hospital,
    lastUpdated: initialLastUpdated,
}: StatusProps) {
    const [ticket, setTicket] = useState<TicketInfo>(initialTicket);
    const [peopleAhead, setPeopleAhead] = useState<number>(initialPeopleAhead);
    const [position, setPosition] = useState<number | null | undefined>(initialPosition);
    const [estimatedWaitMinutes, setEstimatedWaitMinutes] = useState<number | null | undefined>(initialEstimatedWaitMinutes);
    const [estimatedWaitText, setEstimatedWaitText] = useState<string>(initialEstimatedWaitText);
    const [currentlyServing, setCurrentlyServing] = useState<{
        number?: string | null;
        window?: string | null;
    }>({
        number: initialServingNumber,
        window: initialServingWindow,
    });
    const [timeline, setTimeline] = useState<TimelineStep[]>(initialTimeline);
    const [lastUpdated, setLastUpdated] = useState<string>(initialLastUpdated || new Date().toLocaleTimeString());
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>('connected');
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    // Notification and alert preferences
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
    );
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
    const [alertThreshold, setAlertThreshold] = useState<number>(3);
    const [hasNotifiedNearing, setHasNotifiedNearing] = useState<boolean>(false);
    const [hasNotifiedCalled, setHasNotifiedCalled] = useState<boolean>(false);
    const [showQrModal, setShowQrModal] = useState<boolean>(false);

    // Audio chime using Web Audio API
    const playChime = () => {
        if (!soundEnabled || typeof window === 'undefined') return;
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15); // A5
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
        } catch {
            // Audio context blocked or unsupported
        }
    };

    // Trigger vibration
    const triggerVibration = () => {
        if (!vibrationEnabled || typeof window === 'undefined') return;
        if ('vibrate' in navigator) {
            navigator.vibrate([300, 150, 300, 150, 400]);
        }
    };

    // Request browser notification permission
    const enableBrowserNotifications = async () => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            try {
                const permission = await Notification.requestPermission();
                setNotificationPermission(permission);
                if (permission === 'granted') {
                    new Notification('MedQueue Notifications Enabled', {
                        body: `You will be notified when Ticket #${ticket.queue_number} is approaching or called.`,
                        icon: '/favicon.ico',
                    });
                }
            } catch {
                // Ignore error
            }
        }
    };

    // Send native browser notification
    const sendNotification = (title: string, body: string) => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body,
                    icon: '/favicon.ico',
                    tag: `medqueue-${ticket.queue_number}`,
                });
            } catch {
                // Fallback
            }
        }
    };

    // Fetch latest status from API
    const syncStatus = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch(`/api/queue-tickets/${ticket.public_token}`);
            if (res.ok) {
                const json = await res.json();
                if (json.data) {
                    const d = json.data;
                    setTicket(d.ticket);
                    setPeopleAhead(d.peopleAhead);
                    setPosition(d.position);
                    setEstimatedWaitMinutes(d.estimatedWaitMinutes);
                    setEstimatedWaitText(d.estimatedWaitText);
                    setCurrentlyServing({
                        number: d.currentlyServingNumber,
                        window: d.currentlyServingWindow,
                    });
                    if (d.timeline) {
                        setTimeline(d.timeline);
                    }
                    setLastUpdated(new Date().toLocaleTimeString());
                    setConnectionStatus('connected');
                }
            }
        } catch {
            setConnectionStatus('reconnecting');
        } finally {
            setIsRefreshing(false);
        }
    };

    // Check alert thresholds on state updates
    useEffect(() => {
        if (ticket.status === 'called' && !hasNotifiedCalled) {
            setHasNotifiedCalled(true);
            playChime();
            triggerVibration();
            sendNotification(
                `NOW SERVING: #${ticket.queue_number}`,
                `Please proceed immediately to ${ticket.window_name || `Window ${ticket.window_number}`}.`
            );
        }

        if (ticket.status === 'waiting' && peopleAhead <= alertThreshold && !hasNotifiedNearing) {
            setHasNotifiedNearing(true);
            playChime();
            triggerVibration();
            sendNotification(
                `Queue #${ticket.queue_number} Approaching`,
                `There are only ${peopleAhead} patient(s) ahead of you. Please remain near the waiting area.`
            );
        }
    }, [ticket.status, ticket.window_name, peopleAhead, alertThreshold, hasNotifiedCalled, hasNotifiedNearing]);

    // High-frequency Real-Time Auto-Sync Polling
    useEffect(() => {
        // Immediate first sync
        syncStatus();

        let pollTimer: NodeJS.Timeout;

        const startPolling = () => {
            clearInterval(pollTimer);
            const intervalTime = document.hidden ? 6000 : 2500;
            pollTimer = setInterval(syncStatus, intervalTime);
        };

        startPolling();

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                syncStatus();
            }
            startPolling();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(pollTimer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [ticket.public_token]);

    const trackingUrl = typeof window !== 'undefined' ? window.location.href : '';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between selection:bg-teal-500 selection:text-white">
            <Head title={`Ticket #${ticket.queue_number} — ${ticket.status_label || ticket.status} — MedQueue`} />

            {/* Mobile Header Bar */}
            <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-30 px-4 py-3 sm:px-6">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-teal-500/20">
                            🏥
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white leading-tight truncate max-w-[180px] sm:max-w-xs">
                                {hospital.name}
                            </h1>
                            <p className="text-[11px] text-teal-400 font-medium truncate">
                                {ticket.department_name} • {ticket.service_name}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* Live Connection status pill */}
                        <div
                            className={`flex items-center space-x-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                                connectionStatus === 'connected'
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                    : 'bg-amber-950/80 text-amber-300 border-amber-800 animate-pulse'
                            }`}
                        >
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                    connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                                }`}
                            />
                            <span>{connectionStatus === 'connected' ? '● Live (Auto-Sync)' : '● Syncing...'}</span>
                        </div>

                        {/* Manual Refresh Button */}
                        <button
                            onClick={syncStatus}
                            disabled={isRefreshing}
                            aria-label="Refresh status"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                        >
                            <svg
                                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Stage */}
            <main className="flex-1 p-4 sm:p-6 max-w-md mx-auto w-full space-y-4">
                {/* 1. CALLED STATE: HERO NOTIFICATION BANNER */}
                {ticket.status === 'called' && (
                    <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white p-6 sm:p-7 rounded-3xl shadow-2xl shadow-emerald-950/50 border border-emerald-400/40 text-center animate-pulse">
                        <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-black/20 text-emerald-100 text-xs font-black uppercase tracking-widest mb-2">
                            <span>🔔</span> <span>NOW CALLED</span>
                        </div>
                        <div className="text-3xl sm:text-4xl font-black tracking-tight my-1">
                            PLEASE PROCEED TO
                        </div>
                        <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-yellow-300 my-2 drop-shadow-md">
                            {ticket.window_name?.toUpperCase() || `WINDOW #${ticket.window_number}`}
                        </div>
                        <div className="text-xs text-emerald-100 font-semibold mt-3">
                            The healthcare specialist is ready for Ticket #{ticket.queue_number}.
                        </div>
                    </div>
                )}

                {/* 2. SERVING STATE */}
                {ticket.status === 'serving' && (
                    <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-5 rounded-2xl text-center shadow-lg border border-blue-500/30">
                        <div className="text-xs font-bold uppercase tracking-wider text-blue-200">
                            ● Now Serving
                        </div>
                        <div className="text-xl sm:text-2xl font-black mt-1">
                            {ticket.window_name || `Window #${ticket.window_number}`}
                        </div>
                        <div className="text-xs text-blue-200/90 mt-1">
                            Your consultation or test is currently in progress.
                        </div>
                    </div>
                )}

                {/* 3. COMPLETED STATE */}
                {ticket.status === 'completed' && (
                    <div className="bg-slate-900 border-2 border-emerald-500/50 text-white p-6 rounded-3xl text-center shadow-xl">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-2xl mx-auto mb-3">
                            ✓
                        </div>
                        <div className="text-xl font-black text-white">Your Visit Has Been Completed</div>
                        <div className="text-xs text-slate-400 mt-1">
                            Ticket <strong className="text-white font-mono">{ticket.queue_number}</strong> ({ticket.service_name}) has finished.
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
                            Completed at {ticket.completed_at ? new Date(ticket.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}. Thank you for visiting {hospital.name}.
                        </div>
                    </div>
                )}

                {/* 4. HOLD STATE */}
                {ticket.status === 'hold' && (
                    <div className="bg-amber-950/60 border border-amber-600/50 text-amber-200 p-5 rounded-2xl text-center">
                        <div className="text-sm font-black uppercase tracking-wider text-amber-300">
                            ⏸ Ticket Temporarily On Hold
                        </div>
                        <div className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                            Your queue is temporarily paused (e.g. awaiting lab results or doctor review). Your number will resume automatically.
                        </div>
                    </div>
                )}

                {/* 5. TRANSFERRED STATE */}
                {ticket.status === 'transferred' && (
                    <div className="bg-purple-950/60 border border-purple-600/50 text-purple-200 p-5 rounded-2xl text-center">
                        <div className="text-sm font-black uppercase tracking-wider text-purple-300">
                            ⇄ Ticket Transferred
                        </div>
                        <div className="text-xs text-purple-200/90 mt-1 leading-relaxed">
                            Your ticket has been transferred to {ticket.department_name} ({ticket.service_name}). Please proceed to the new waiting area.
                        </div>
                    </div>
                )}

                {/* 6. SKIPPED OR CANCELLED */}
                {(ticket.status === 'skipped' || ticket.status === 'cancelled') && (
                    <div className="bg-rose-950/60 border border-rose-700/50 text-rose-200 p-5 rounded-2xl text-center">
                        <div className="text-sm font-black uppercase tracking-wider text-rose-300">
                            {ticket.status === 'skipped' ? '⚠️ Ticket Skipped' : '✕ Ticket Cancelled'}
                        </div>
                        <div className="text-xs text-rose-200/80 mt-1">
                            Your number was not answered. Please approach the triage or registration desk for assistance.
                        </div>
                    </div>
                )}

                {/* Main Queue Card (Mobile Ticket Visual) */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden">
                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                        <span className="font-semibold text-teal-400 truncate max-w-[200px]">
                            {ticket.service_name}
                        </span>
                        <span className="font-mono text-slate-500">
                            {ticket.created_at ? new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                    </div>

                    <div className="my-5">
                        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                            Your Queue Number
                        </div>
                        <div className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-white my-1 drop-shadow">
                            {ticket.queue_number}
                        </div>
                        {ticket.priority_type && ticket.priority_type !== 'REGULAR' && (
                            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 mt-1">
                                <span>★</span> <span>{ticket.priority_label || ticket.priority_type}</span>
                            </span>
                        )}
                    </div>

                    {/* Waiting Metrics Grid */}
                    {ticket.status === 'waiting' && (
                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800">
                            <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800">
                                <div className="text-[10px] uppercase font-bold text-slate-400">
                                    Patients Ahead
                                </div>
                                <div className="text-3xl font-black text-amber-400 mt-1">
                                    {peopleAhead}
                                </div>
                                {position && (
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                        Position #{position}
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800">
                                <div className="text-[10px] uppercase font-bold text-slate-400">
                                    Now Serving
                                </div>
                                <div className="text-2xl font-black font-mono text-teal-400 mt-1 truncate">
                                    {currentlyServing.number || '---'}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                    {currentlyServing.window || 'Waiting Area'}
                                </div>
                            </div>

                            {/* Estimated Wait Card */}
                            <div className="col-span-2 bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                                <div className="flex items-center space-x-2 text-left">
                                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Estimated Wait
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Dynamic estimate based on counters
                                        </div>
                                    </div>
                                </div>
                                <div className="text-sm font-bold text-white">
                                    {estimatedWaitText}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* QR Code trigger & Share */}
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                        <button
                            type="button"
                            onClick={() => setShowQrModal(true)}
                            className="text-slate-400 hover:text-teal-300 flex items-center space-x-1 transition font-medium"
                        >
                            <span>📱</span>
                            <span>View Ticket QR Code</span>
                        </button>
                        <span className="text-[10px] text-slate-600 font-mono">
                            Updated {lastUpdated}
                        </span>
                    </div>
                </div>

                {/* Patient Engagement & Notification Controls */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                            <span>🔔</span> <span>Patient Alerts & Preferences</span>
                        </div>
                    </div>

                    {/* Browser Push Permission CTA */}
                    {notificationPermission !== 'granted' && (
                        <div className="bg-teal-950/40 border border-teal-600/30 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                            <div className="text-left">
                                <div className="text-xs font-bold text-teal-300">Enable Phone Push Alerts</div>
                                <div className="text-[10px] text-teal-200/70 mt-0.5">
                                    Get notified even when you switch tabs or put your phone in your pocket.
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={enableBrowserNotifications}
                                className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow transition shrink-0"
                            >
                                Enable
                            </button>
                        </div>
                    )}

                    {/* Sound and Vibration Toggles */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                            type="button"
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`p-2.5 rounded-2xl border flex items-center justify-center space-x-1.5 transition font-semibold ${
                                soundEnabled
                                    ? 'bg-slate-800 border-teal-500/40 text-teal-300'
                                    : 'bg-slate-950 border-slate-800 text-slate-500'
                            }`}
                        >
                            <span>{soundEnabled ? '🔊' : '🔇'}</span>
                            <span>{soundEnabled ? 'Sound On' : 'Sound Muted'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setVibrationEnabled(!vibrationEnabled)}
                            className={`p-2.5 rounded-2xl border flex items-center justify-center space-x-1.5 transition font-semibold ${
                                vibrationEnabled
                                    ? 'bg-slate-800 border-teal-500/40 text-teal-300'
                                    : 'bg-slate-950 border-slate-800 text-slate-500'
                            }`}
                        >
                            <span>{vibrationEnabled ? '📳' : '📴'}</span>
                            <span>{vibrationEnabled ? 'Vibrate On' : 'Vibrate Off'}</span>
                        </button>
                    </div>

                    {/* Approaching Service Alert Setting */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                        <label htmlFor="alert-threshold" className="text-slate-400 font-medium">
                            Alert me when:
                        </label>
                        <select
                            id="alert-threshold"
                            value={alertThreshold}
                            onChange={(e) => setAlertThreshold(Number(e.target.value))}
                            className="bg-slate-950 border border-slate-700 text-white rounded-xl text-xs py-1.5 px-2.5 focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value={5}>5 patients ahead</option>
                            <option value={3}>3 patients ahead (Recommended)</option>
                            <option value={1}>1 patient ahead</option>
                            <option value={0}>Only when called</option>
                        </select>
                    </div>
                </div>

                {/* Queue Progress Timeline */}
                {timeline.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
                            <span>⏱</span> <span>Visit Progress Timeline</span>
                        </div>
                        <div className="space-y-3">
                            {timeline.map((step, idx) => (
                                <div key={idx} className="flex items-start space-x-3 text-xs">
                                    <div className="mt-0.5 w-2 h-2 rounded-full bg-teal-400 ring-4 ring-teal-500/20 shrink-0" />
                                    <div className="flex-1 flex items-center justify-between">
                                        <div>
                                            <span className="font-bold text-slate-200">{step.label}</span>
                                            {step.detail && (
                                                <span className="text-slate-400 ml-1.5 text-[11px]">— {step.detail}</span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-500">{step.time_formatted}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* QR Code Modal for Easy Phone Scanning / Sharing */}
            {showQrModal && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
                >
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl">
                        <div className="text-xs font-bold uppercase tracking-wider text-teal-400">
                            Track On Another Phone
                        </div>
                        <div className="text-2xl font-black text-white font-mono mt-1">
                            #{ticket.queue_number}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 mb-4">
                            Scan this QR code with any camera to open this live status tracker.
                        </div>

                        <div className="bg-white p-3 rounded-2xl inline-block shadow-inner mx-auto">
                            <QRCodeSVG value={trackingUrl || window.location.href} size={180} level="M" />
                        </div>

                        <div className="mt-5">
                            <button
                                type="button"
                                onClick={() => setShowQrModal(false)}
                                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
                            >
                                Close QR Code
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Footer */}
            <footer className="bg-slate-900 border-t border-slate-800 px-4 py-3 text-center text-[10px] text-slate-500">
                <div>MedQueue Real-Time Patient Tracker • Privacy Protected</div>
                <div className="mt-0.5 text-slate-600">{hospital.ticket_footer || 'Keep this page open to watch your queue status.'}</div>
            </footer>
        </div>
    );
}
