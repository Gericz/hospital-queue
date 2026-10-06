import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import { ReverbConfig } from '@/lib/echo';

interface WindowItem {
    id: number;
    window_number: string | number;
    name: string;
    status?: string;
}

interface ServingTicket {
    queue_id: number;
    queue_number: string;
    display_number: string;
    service_name?: string;
    service_code?: string;
    service_prefix?: string;
    window_id?: number;
    window_number?: string | number;
    window_name?: string;
    department_id?: number;
    department_name?: string;
    department_code?: string;
    status: string;
    status_label?: string;
    priority_type: string;
    priority_label?: string;
    called_at?: string;
    started_at?: string;
}

interface WaitingTicket {
    queue_id: number;
    queue_number: string;
    service_name?: string;
    service_prefix?: string;
    department_id?: number;
    department_name?: string;
    priority_type: string;
    priority_label?: string;
}

interface DepartmentData {
    id: number;
    code: string;
    name: string;
    description?: string | null;
}

interface DepartmentDisplayData {
    id: number;
    code: string;
    name: string;
    description?: string | null;
    windows: WindowItem[];
    now_serving: ServingTicket[];
    upcoming_waiting: WaitingTicket[];
}

interface DisplayProps {
    departments: DepartmentData[];
    departmentsData?: DepartmentDisplayData[];
    selectedDepartment: DepartmentData | null;
    isAllDepartments?: boolean;
    windows: WindowItem[];
    initialNowServing: ServingTicket[];
    initialUpcomingWaiting: WaitingTicket[];
    allNowServing?: ServingTicket[];
    serverTime: string;
    reverbConfig?: ReverbConfig;
}

// Icon helper per department
function getDepartmentIcon(code: string): string {
    const upper = code?.toUpperCase() || '';
    if (upper.includes('CASHIER') || upper.includes('CSH')) return '💳';
    if (upper.includes('BILLING') || upper.includes('BIL')) return '📄';
    if (upper.includes('PHILHEALTH') || upper.includes('PHIC')) return '🏥';
    if (upper.includes('RECORD') || upper.includes('MRD')) return '📂';
    if (upper.includes('PHARMACY') || upper.includes('PHARM')) return '💊';
    if (upper.includes('SOCIAL') || upper.includes('MSW')) return '🤝';
    if (upper.includes('WATER') || upper.includes('WBAC') || upper.includes('BACT')) return '💧';
    if (upper.includes('OPD')) return '🩺';
    if (upper.includes('LAB')) return '🧪';
    if (upper.includes('RAD')) return '🩻';
    return '🏢';
}

// Color theme helper per department
function getDepartmentColorClass(index: number): {
    border: string;
    headerBg: string;
    badgeBg: string;
    accent: string;
} {
    const colors = [
        { border: 'border-emerald-500/40', headerBg: 'from-emerald-900/60 to-emerald-950/40', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', accent: 'text-emerald-400' },
        { border: 'border-cyan-500/40', headerBg: 'from-cyan-900/60 to-cyan-950/40', badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', accent: 'text-cyan-400' },
        { border: 'border-blue-500/40', headerBg: 'from-blue-900/60 to-blue-950/40', badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30', accent: 'text-blue-400' },
        { border: 'border-indigo-500/40', headerBg: 'from-indigo-900/60 to-indigo-950/40', badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', accent: 'text-indigo-400' },
        { border: 'border-teal-500/40', headerBg: 'from-teal-900/60 to-teal-950/40', badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/30', accent: 'text-teal-400' },
        { border: 'border-purple-500/40', headerBg: 'from-purple-900/60 to-purple-950/40', badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30', accent: 'text-purple-400' },
        { border: 'border-sky-500/40', headerBg: 'from-sky-900/60 to-sky-950/40', badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30', accent: 'text-sky-400' },
    ];
    return colors[index % colors.length];
}

// Audio Chime Synthesizer using Web Audio API
function playChimeAudio(volume: number = 0.8): Promise<void> {
    return new Promise((resolve) => {
        try {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (!AudioContextClass) {
                resolve();
                return;
            }
            const ctx = new AudioContextClass();
            const now = ctx.currentTime;

            // Two-tone hospital call chime (E5 -> G#5 -> B5)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(659.25, now); // E5
            osc1.frequency.setValueAtTime(830.61, now + 0.15); // G#5
            osc1.frequency.setValueAtTime(987.77, now + 0.35); // B5

            gain1.gain.setValueAtTime(0.001, now);
            gain1.gain.exponentialRampToValueAtTime(Math.max(0.01, volume * 0.4), now + 0.05);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

            osc1.connect(gain1);
            gain1.connect(ctx.destination);

            osc1.start(now);
            osc1.stop(now + 0.85);

            osc1.onended = () => {
                ctx.close();
                resolve();
            };
        } catch {
            resolve();
        }
    });
}

export default function Display({
    departments,
    departmentsData: initialDepartmentsData = [],
    selectedDepartment,
    isAllDepartments: initialIsAllDepartments = true,
    windows: initialWindows,
    initialNowServing,
    initialUpcomingWaiting,
    allNowServing: initialAllNowServing = [],
}: DisplayProps) {
    // View state: 'all' for multi-department master display, or specific department code
    const [viewMode, setViewMode] = useState<string>(
        selectedDepartment ? selectedDepartment.code : 'all'
    );

    const [departmentsData, setDepartmentsData] = useState<DepartmentDisplayData[]>(initialDepartmentsData);
    const [nowServing, setNowServing] = useState<ServingTicket[]>(initialNowServing);
    const [upcomingWaiting, setUpcomingWaiting] = useState<WaitingTicket[]>(initialUpcomingWaiting);
    const [allNowServing, setAllNowServing] = useState<ServingTicket[]>(initialAllNowServing);
    const [windows, setWindows] = useState<WindowItem[]>(initialWindows);
    const [currentTime, setCurrentTime] = useState<string>('');
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [volume, setVolume] = useState<number>(0.9);
    const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);
    const [lastCalledTicket, setLastCalledTicket] = useState<ServingTicket | null>(
        initialNowServing.length > 0 ? initialNowServing[0] : (initialAllNowServing.length > 0 ? initialAllNowServing[0] : null)
    );
    const [isFlashing, setIsFlashing] = useState<boolean>(false);

    // Audio announcement queue
    const announcementQueueRef = useRef<{ text: string; id: string }[]>([]);
    const isSpeakingRef = useRef<boolean>(false);
    const announcedEventIdsRef = useRef<Set<string>>(new Set());

    // Map of known called_at timestamps per queue_id to detect new calls and recalls
    const knownCalledTimestampsRef = useRef<Map<number, string>>(
        new Map(
            [...initialNowServing, ...initialAllNowServing]
                .filter((t) => t.called_at)
                .map((t) => [t.queue_id, t.called_at as string])
        )
    );

    // Digital clock
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(
                now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                })
            );
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    // Speech announcement processor
    const processNextAnnouncement = useCallback(() => {
        if (isSpeakingRef.current || announcementQueueRef.current.length === 0 || isMuted) {
            return;
        }

        const next = announcementQueueRef.current.shift();
        if (!next) return;

        isSpeakingRef.current = true;

        playChimeAudio(volume).then(() => {
            if (!('speechSynthesis' in window)) {
                isSpeakingRef.current = false;
                processNextAnnouncement();
                return;
            }

            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(next.text);
            utterance.rate = 0.9;
            utterance.pitch = 1.05;
            utterance.volume = volume;

            utterance.onend = () => {
                isSpeakingRef.current = false;
                setTimeout(processNextAnnouncement, 400);
            };

            utterance.onerror = () => {
                isSpeakingRef.current = false;
                setTimeout(processNextAnnouncement, 400);
            };

            window.speechSynthesis.speak(utterance);
        });
    }, [isMuted, volume]);

    const queueAnnouncement = useCallback(
        (text: string, eventKey: string) => {
            if (announcedEventIdsRef.current.has(eventKey)) {
                return;
            }
            announcedEventIdsRef.current.add(eventKey);

            announcementQueueRef.current.push({ text, id: eventKey });
            processNextAnnouncement();
        },
        [processNextAnnouncement]
    );

    // Format ticket for clear phonetic speech (e.g., "C 0 0 1" or "B 0 0 3")
    const formatQueueForSpeech = (queueNumber: string): string => {
        return queueNumber.split('').join(' ');
    };

    // Re-fetch data from API to guarantee real-time sync
    const syncWithServer = useCallback(async () => {
        try {
            const endpoint = viewMode === 'all' ? '/api/display' : `/api/display/${viewMode}`;
            const res = await fetch(endpoint);
            if (res.ok) {
                const data = await res.json();
                const newDepartmentsData: DepartmentDisplayData[] = data.departments_data || [];
                const newNowServing: ServingTicket[] = data.now_serving || [];
                const newUpcomingWaiting: WaitingTicket[] = data.upcoming_waiting || [];
                const newAllNowServing: ServingTicket[] = data.all_now_serving || newNowServing;

                setDepartmentsData(newDepartmentsData);
                setNowServing(newNowServing);
                setUpcomingWaiting(newUpcomingWaiting);
                setAllNowServing(newAllNowServing);
                if (data.windows) {
                    setWindows(data.windows);
                }
                setConnectionStatus('connected');

                // Check for newly called or recalled tickets across all departments
                const checkList = viewMode === 'all' ? newAllNowServing : newNowServing;
                for (const ticket of checkList) {
                    if (ticket.status === 'called' && ticket.called_at) {
                        const previousCalledAt = knownCalledTimestampsRef.current.get(ticket.queue_id);
                        if (!previousCalledAt || previousCalledAt !== ticket.called_at) {
                            knownCalledTimestampsRef.current.set(ticket.queue_id, ticket.called_at);

                            // Trigger visual callout
                            setLastCalledTicket(ticket);
                            setIsFlashing(true);
                            setTimeout(() => setIsFlashing(false), 2500);

                            // Trigger chime and voice announcement
                            const windowText = ticket.window_name || `Window ${ticket.window_number || 1}`;
                            const deptText = ticket.department_name ? `${ticket.department_name}, ` : '';
                            const isRecall = previousCalledAt && previousCalledAt !== ticket.called_at;
                            const prefix = isRecall ? 'Recall notice.' : 'Attention please.';
                            const speechText = `${prefix} Ticket number ${formatQueueForSpeech(ticket.queue_number)}, please proceed to ${deptText}${windowText}.`;
                            const eventKey = `${isRecall ? 'recalled' : 'called'}-${ticket.queue_id}-${ticket.called_at}`;
                            queueAnnouncement(speechText, eventKey);
                        }
                    }
                }
            } else {
                setConnectionStatus('reconnecting');
            }
        } catch {
            setConnectionStatus('reconnecting');
        }
    }, [viewMode, queueAnnouncement]);

    // High-frequency real-time polling loop
    useEffect(() => {
        syncWithServer();

        let pollTimer: NodeJS.Timeout;
        const startPolling = () => {
            clearInterval(pollTimer);
            const intervalTime = document.hidden ? 5000 : 1500;
            pollTimer = setInterval(syncWithServer, intervalTime);
        };

        startPolling();

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                syncWithServer();
            }
            startPolling();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(pollTimer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [viewMode, syncWithServer]);

    const unlockAudio = () => {
        setAudioUnlocked(true);
        playChimeAudio(volume);
    };

    const testAnnouncement = () => {
        queueAnnouncement('This is a test of the MedQueue hospital audio announcement system.', `test-${Date.now()}`);
    };

    // Filtered or active department object when in single view
    const currentDept = viewMode === 'all' ? null : departments.find((d) => d.code === viewMode);

    return (
        <div className="h-screen max-h-screen w-screen max-w-screen bg-slate-950 text-white font-sans flex flex-col justify-between overflow-hidden select-none p-0 m-0">
            <Head title={`MedQueue TV Display — ${viewMode === 'all' ? 'All Departments (Master View)' : currentDept?.name || 'Hospital TV'}`} />

            {/* Audio Autoplay Permission Banner if not unlocked */}
            {!audioUnlocked && (
                <div className="bg-emerald-600 text-white px-4 py-1.5 flex items-center justify-between text-xs shadow-lg z-50 shrink-0">
                    <div className="flex items-center space-x-2">
                        <span className="text-base">🔊</span>
                        <span className="font-semibold">
                            Enable voice announcements for this screen (Browser requires click permission).
                        </span>
                    </div>
                    <button
                        onClick={unlockAudio}
                        className="bg-white text-emerald-900 font-bold px-3 py-0.5 rounded text-xs shadow hover:bg-emerald-50 transition cursor-pointer"
                    >
                        Enable Audio
                    </button>
                </div>
            )}

            {/* Compact Fixed Header Bar */}
            <header className="h-12 md:h-14 shrink-0 bg-slate-900/95 border-b border-slate-800 px-4 py-1.5 flex items-center justify-between shadow-lg backdrop-blur-md">
                <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 md:h-9 md:w-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 leading-tight">
                            MedQueue
                        </h1>
                        <p className="text-[10px] md:text-xs font-semibold text-cyan-400 uppercase tracking-widest leading-none">
                            {viewMode === 'all' ? 'Central Waiting Lobby (All Departments)' : currentDept?.name || 'Waiting Area'}
                        </p>
                    </div>
                </div>

                {/* Center / Right controls: Department View Switcher, Live indicator, Audio controls, Time */}
                <div className="flex items-center space-x-3 md:space-x-4">
                    {/* Seamless In-Screen Department Switcher */}
                    <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg p-0.5 text-xs">
                        <button
                            onClick={() => setViewMode('all')}
                            className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer text-xs ${
                                viewMode === 'all'
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                                    : 'text-slate-300 hover:text-white'
                            }`}
                        >
                            🏥 All Departments
                        </button>
                        <select
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value)}
                            aria-label="Filter Single Department"
                            className="bg-slate-800 border-0 text-slate-200 text-xs font-semibold rounded-md py-1 px-2 focus:ring-0 cursor-pointer"
                        >
                            <option value="all">View: All Departments (Master)</option>
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.code}>
                                    {dept.name} ({dept.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Live indicator badge */}
                    <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700 text-[11px] font-semibold">
                        <span
                            className={`w-2 h-2 rounded-full ${
                                connectionStatus === 'connected'
                                    ? 'bg-emerald-400 animate-pulse'
                                    : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                                    ? 'bg-amber-400 animate-ping'
                                    : 'bg-rose-500'
                            }`}
                        />
                        <span className="text-slate-200 font-semibold text-[10px] md:text-xs">
                            {connectionStatus === 'connected'
                                ? '● Live'
                                : connectionStatus === 'reconnecting'
                                ? '● Syncing...'
                                : '● Offline'}
                        </span>
                    </div>

                    {/* Audio Controls */}
                    <div className="flex items-center space-x-2 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                            className="text-slate-300 hover:text-white transition text-xs"
                        >
                            {isMuted ? '🔇' : '🔊'}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="w-12 md:w-16 accent-cyan-400 cursor-pointer h-1.5"
                            title="Volume"
                        />
                        <button
                            onClick={testAnnouncement}
                            className="text-cyan-400 hover:text-cyan-300 font-semibold text-[10px] md:text-xs cursor-pointer"
                        >
                            Test
                        </button>
                    </div>

                    {/* Digital Clock */}
                    <div className="text-right">
                        <div className="text-lg md:text-xl font-mono font-bold tracking-tight text-white leading-tight">{currentTime}</div>
                        <div className="text-[9px] md:text-[10px] font-medium text-slate-400 tracking-wider leading-none">
                            {new Date().toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                            })}
                        </div>
                    </div>
                </div>
            </header>

            {/* ========================================================================= */}
            {/* VIEW MODE A: ALL DEPARTMENTS CENTRAL LOBBY MASTER VIEW (ALL DEPARTMENTS) */}
            {/* ========================================================================= */}
            {viewMode === 'all' ? (
                <main className="flex-1 min-h-0 p-2.5 flex flex-col gap-2 overflow-hidden w-full">
                    {/* Top Callout Hero Banner (Fixed compact height, flashes when called) */}
                    {lastCalledTicket ? (
                        <div
                            className={`h-14 sm:h-16 shrink-0 rounded-xl border transition-all duration-700 px-4 py-1.5 shadow-lg flex items-center justify-between overflow-hidden ${
                                isFlashing
                                    ? 'bg-gradient-to-r from-cyan-900/90 via-blue-950/95 to-slate-900/90 border-cyan-400 ring-4 ring-cyan-500/40 scale-[1.005]'
                                    : 'bg-slate-900/90 border-slate-800'
                            }`}
                        >
                            <div className="flex items-center space-x-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                                    🔔 LATEST CALL
                                </span>
                                <span className="text-xs md:text-sm font-bold text-slate-300 uppercase tracking-wider truncate max-w-[200px] md:max-w-xs">
                                    {lastCalledTicket.department_name || 'Hospital Waiting Lobby'}
                                </span>
                                {lastCalledTicket.priority_type !== 'REGULAR' && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                        ⭐ {lastCalledTicket.priority_label || lastCalledTicket.priority_type}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center space-x-4 md:space-x-6">
                                <div className="text-right flex items-center space-x-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
                                        Ticket:
                                    </span>
                                    <span className="text-3xl md:text-4xl xl:text-5xl font-black font-mono tracking-tight text-white drop-shadow">
                                        {lastCalledTicket.queue_number}
                                    </span>
                                </div>

                                <div className="text-cyan-400 text-xl font-bold">➔</div>

                                <div className="bg-slate-800/90 rounded-lg px-3 py-1 border border-slate-700 text-center">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400 block leading-tight">
                                        Proceed To
                                    </span>
                                    <span className="text-lg md:text-xl xl:text-2xl font-black text-white tracking-tight leading-tight">
                                        {lastCalledTicket.window_name || `Window #${lastCalledTicket.window_number}`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-10 shrink-0 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-1 flex items-center justify-between text-xs text-slate-400">
                            <span className="font-semibold text-slate-300">
                                🏥 Central Waiting Lobby Screen — All departments and consultation counters active
                            </span>
                            <span>Tickets will be announced automatically</span>
                        </div>
                    )}

                    {/* All Departments Multi-Grid Matrix (Fits 100% in remaining height) */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 flex-1 min-h-0 overflow-hidden w-full">
                        {departmentsData.map((dept, index) => {
                            const colors = getDepartmentColorClass(index);
                            const icon = getDepartmentIcon(dept.code);
                            const deptNowServing = dept.now_serving || [];
                            const deptWaiting = dept.upcoming_waiting || [];
                            const deptWindows = dept.windows || [];

                            return (
                                <div
                                    key={dept.id}
                                    className={`bg-slate-900/85 border ${colors.border} rounded-xl p-2 flex flex-col justify-between shadow-md overflow-hidden h-full`}
                                >
                                    {/* Department Header */}
                                    <div className="shrink-0 mb-1.5">
                                        <div className={`bg-gradient-to-r ${colors.headerBg} rounded-lg px-2.5 py-1 border border-slate-800 flex items-center justify-between`}>
                                            <div className="flex items-center space-x-1.5 truncate">
                                                <span className="text-base">{icon}</span>
                                                <h2 className="text-xs font-black text-white uppercase tracking-wider truncate leading-tight">
                                                    {dept.name}
                                                </h2>
                                            </div>

                                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider border ${colors.badgeBg} shrink-0 ml-1`}>
                                                {dept.code}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Windows & Now Serving Counter List (Flexible scroll-free container) */}
                                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-center space-y-1">
                                        {deptWindows.length > 0 ? (
                                            deptWindows.map((win) => {
                                                const activeTicket = deptNowServing.find((t) => t.window_id === win.id);
                                                const isCurrentlyCalled = activeTicket?.status === 'called';

                                                return (
                                                    <div
                                                        key={win.id}
                                                        className={`rounded-lg px-2 py-1 border transition-all flex items-center justify-between ${
                                                            activeTicket
                                                                ? isCurrentlyCalled
                                                                    ? 'bg-cyan-950/60 border-cyan-400/60 shadow-sm shadow-cyan-950/50'
                                                                    : 'bg-slate-800/80 border-slate-700'
                                                                : 'bg-slate-900/40 border-slate-800/50 opacity-60'
                                                        }`}
                                                    >
                                                        <div className="flex items-center space-x-1.5 truncate mr-1">
                                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTicket ? (isCurrentlyCalled ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400') : 'bg-slate-600'}`} />
                                                            <span className="text-[11px] font-bold text-slate-200 truncate">
                                                                {win.name}
                                                            </span>
                                                        </div>

                                                        {activeTicket ? (
                                                            <div className="text-right shrink-0">
                                                                <span className="text-base md:text-lg font-black font-mono text-cyan-300">
                                                                    {activeTicket.queue_number}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-800/60 px-1.5 py-0.2 rounded shrink-0">
                                                                Ready
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-center text-[10px] text-slate-500 py-1">
                                                No active windows
                                            </div>
                                        )}
                                    </div>

                                    {/* Upcoming Next in Queue 1-line Footer */}
                                    <div className="mt-1 pt-1 border-t border-slate-800/80 shrink-0 flex items-center justify-between text-[10px] overflow-hidden">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] shrink-0 mr-1">
                                            Next:
                                        </span>

                                        {deptWaiting.length > 0 ? (
                                            <div className="flex items-center gap-1 truncate">
                                                {deptWaiting.slice(0, 4).map((ticket) => (
                                                    <span
                                                        key={ticket.queue_id}
                                                        className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-[10px] text-white"
                                                    >
                                                        {ticket.queue_number}
                                                    </span>
                                                ))}
                                                {deptWaiting.length > 4 && (
                                                    <span className="text-[9px] text-slate-400 shrink-0">
                                                        +{deptWaiting.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-[9px] text-slate-500 italic truncate">
                                                None waiting
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </main>
            ) : (
                /* ========================================================================= */
                /* VIEW MODE B: DEDICATED SINGLE DEPARTMENT 16:9 VIEW (NON-SCROLLABLE)       */
                /* ========================================================================= */
                <main className="flex-1 min-h-0 p-3 grid grid-cols-12 gap-3 overflow-hidden w-full">
                    {/* Left 8 Cols: NOW SERVING Big Cards */}
                    <div className="col-span-8 flex flex-col justify-between space-y-3 h-full overflow-hidden">
                        {/* Primary Big Callout Box */}
                        {lastCalledTicket ? (
                            <div
                                className={`rounded-2xl border transition-all duration-700 p-6 shadow-xl flex flex-col justify-between flex-1 min-h-0 ${
                                    isFlashing
                                        ? 'bg-gradient-to-br from-cyan-900/90 to-blue-950/90 border-cyan-400 ring-8 ring-cyan-500/30 scale-[1.01]'
                                        : 'bg-slate-900/90 border-slate-800 shadow-cyan-950/20'
                                }`}
                            >
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                            Now Calling / Serving
                                        </span>
                                        {lastCalledTicket.priority_type !== 'REGULAR' && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                                ⭐ {lastCalledTicket.priority_label || lastCalledTicket.priority_type}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs font-semibold text-slate-400 truncate">
                                        {lastCalledTicket.service_name}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-6 my-auto items-center">
                                    {/* Ticket Number */}
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                                            Ticket Number
                                        </div>
                                        <div className="text-7xl xl:text-8xl font-black font-mono tracking-tighter text-white drop-shadow-md">
                                            {lastCalledTicket.queue_number}
                                        </div>
                                    </div>

                                    {/* Destination Window */}
                                    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 text-center shadow-inner">
                                        <div className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-1">
                                            Please Proceed To
                                        </div>
                                        <div className="text-3xl xl:text-4xl font-black text-white tracking-tight">
                                            {lastCalledTicket.window_name || `Window ${lastCalledTicket.window_number}`}
                                        </div>
                                        <div className="mt-1 text-[11px] font-medium text-slate-400">
                                            Counter Station #{lastCalledTicket.window_number}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                                    <span>MedQueue Real-Time Patient Flow</span>
                                    <span>Status: {lastCalledTicket.status.toUpperCase()}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center flex flex-col items-center justify-center space-y-2 flex-1">
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 text-xl">
                                    ⏳
                                </div>
                                <h2 className="text-xl font-bold text-slate-300">Ready For Next Patient</h2>
                                <p className="text-slate-500 max-w-md text-xs">
                                    Windows are currently open. Upcoming tickets will appear here automatically when called.
                                </p>
                            </div>
                        )}

                        {/* Window Grid Summary */}
                        <div className="shrink-0">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                                <span>Active Window Counters</span>
                                <span className="text-[10px] font-normal text-slate-500">{windows.length} Counters Open</span>
                            </h2>

                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                                {windows.map((win) => {
                                    const activeAtWin = nowServing.find((item) => item.window_id === win.id);
                                    return (
                                        <div
                                            key={win.id}
                                            className={`rounded-xl p-2.5 border transition-all ${
                                                activeAtWin
                                                    ? 'bg-slate-900/90 border-cyan-500/40 shadow-md shadow-cyan-950/30'
                                                    : 'bg-slate-900/40 border-slate-800/80 opacity-70'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between text-[11px] mb-1">
                                                <span className="font-bold text-slate-300 truncate">{win.name}</span>
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                        activeAtWin ? 'bg-cyan-400' : 'bg-slate-600'
                                                    }`}
                                                />
                                            </div>

                                            <div className="text-center">
                                                {activeAtWin ? (
                                                    <div className="text-xl font-black font-mono text-cyan-300">
                                                        {activeAtWin.queue_number}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs font-semibold text-slate-500 py-1">
                                                        Available
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right 4 Cols: UPCOMING WAITING LIST */}
                    <div className="col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl backdrop-blur-md h-full overflow-hidden">
                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 shrink-0">
                                <h2 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center space-x-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                    <span>Next in Queue</span>
                                </h2>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 rounded-full text-slate-400">
                                    {upcomingWaiting.length} Waiting
                                </span>
                            </div>

                            {upcomingWaiting.length > 0 ? (
                                <div className="space-y-1.5 overflow-hidden flex-1">
                                    {upcomingWaiting.slice(0, 10).map((ticket, index) => (
                                        <div
                                            key={ticket.queue_id}
                                            className="flex items-center justify-between bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-1.5 transition text-xs"
                                        >
                                            <div className="flex items-center space-x-2 truncate">
                                                <span className="w-5 h-5 rounded-full bg-slate-700/80 text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                                    {index + 1}
                                                </span>
                                                <div className="truncate">
                                                    <span className="text-base font-bold font-mono text-white">
                                                        {ticket.queue_number}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 ml-2 truncate">
                                                        {ticket.service_name}
                                                    </span>
                                                </div>
                                            </div>

                                            {ticket.priority_type !== 'REGULAR' && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                                    {ticket.priority_type}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-500 my-auto">
                                    <div className="text-2xl mb-1">🎉</div>
                                    <p className="font-semibold text-xs">No waiting patients</p>
                                    <p className="text-[10px] text-slate-600">Queue is currently clear</p>
                                </div>
                            )}
                        </div>

                        {/* Quick switch to All Departments */}
                        <div className="mt-2 pt-2 border-t border-slate-800 shrink-0">
                            <button
                                onClick={() => setViewMode('all')}
                                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer"
                            >
                                <span>🏥 Switch to All Departments Master View</span>
                            </button>
                        </div>
                    </div>
                </main>
            )}

            {/* Bottom Compact Notice Bar */}
            <footer className="h-7 shrink-0 bg-slate-900/95 border-t border-slate-800 px-4 py-0.5 flex items-center justify-between text-[10px] md:text-[11px] text-slate-400">
                <div className="flex items-center space-x-2 overflow-hidden truncate">
                    <span className="bg-cyan-500 text-slate-950 font-bold px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider shrink-0">
                        Notice
                    </span>
                    <span className="truncate">
                        Please watch the display screen and listen for your ticket number. Have your valid ID,Patient Discharge Clearance, and documents ready.
                    </span>
                </div>
                <div className="font-mono text-slate-500 shrink-0 ml-3 text-[10px]">MedQueue v1.0 • Hospital Real-Time Engine</div>
            </footer>
        </div>
    );
}
