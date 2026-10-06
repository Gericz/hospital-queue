import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'reverb'>;
    }
}

window.Pusher = Pusher;

export interface ReverbConfig {
    key?: string;
    host?: string;
    port?: number | string;
    scheme?: string;
}

export interface QueueBroadcastPayload {
    queue_id: number;
    queue_number: string;
    display_number: string;
    department_id: number;
    department_code?: string;
    department_name?: string;
    service_id?: number;
    service_code?: string;
    service_name?: string;
    service_prefix?: string;
    window_id?: number;
    window_number?: string;
    window_name?: string;
    status: string;
    priority_type: string;
    priority_level?: number;
    reason?: string;
    recall_count?: number;
    event_type: string;
    timestamp: string;
    called_at?: string;
    started_at?: string;
    completed_at?: string;
    skipped_at?: string;
    held_at?: string;
    source_queue_id?: number;
    source_queue_number?: string;
    new_queue_id?: number;
    new_queue_number?: string;
}

let echoInstance: Echo<'reverb'> | null = null;

export function getEcho(customConfig?: ReverbConfig): Echo<'reverb'> {
    if (echoInstance) {
        return echoInstance;
    }

    const host =
        customConfig?.host ||
        import.meta.env.VITE_REVERB_HOST ||
        window.location.hostname ||
        'localhost';

    const port = Number(
        customConfig?.port ||
        import.meta.env.VITE_REVERB_PORT ||
        (window.location.protocol === 'https:' ? 443 : 8080)
    );

    const scheme =
        customConfig?.scheme ||
        import.meta.env.VITE_REVERB_SCHEME ||
        (window.location.protocol === 'https:' ? 'https' : 'http');

    const key =
        customConfig?.key ||
        import.meta.env.VITE_REVERB_APP_KEY ||
        'hospital_queue_app_key';

    const isTls = scheme === 'https';

    echoInstance = new Echo({
        broadcaster: 'reverb',
        key: key,
        wsHost: host,
        wsPort: port,
        wssPort: port,
        forceTLS: isTls,
        enabledTransports: ['ws', 'wss'],
        disableStats: true,
        cluster: 'mt1', // Reverb uses mt1 fallback
    });

    window.Echo = echoInstance;

    return echoInstance;
}

export function disconnectEcho(): void {
    if (echoInstance) {
        echoInstance.disconnect();
        echoInstance = null;
    }
}

export const initEcho = getEcho;
