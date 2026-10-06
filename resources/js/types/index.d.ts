export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    role: string;
    is_active: boolean;
    can_manage_master_data?: boolean;
    is_admin?: boolean;
}

export interface Department {
    id: number;
    code: string;
    name: string;
    description: string | null;
    is_active: boolean;
    services_count?: number;
    windows_count?: number;
    services?: Service[];
    windows?: Window[];
    created_at?: string;
    updated_at?: string;
}

export interface Service {
    id: number;
    department_id: number;
    code: string;
    name: string;
    description: string | null;
    prefix: string;
    is_active: boolean;
    department?: Department;
    created_at?: string;
    updated_at?: string;
}

export interface Window {
    id: number;
    department_id: number;
    window_number: string | number;
    name: string;
    is_active: boolean;
    department?: Department;
    created_at?: string;
    updated_at?: string;
}

export type QueueStatus =
    | 'waiting'
    | 'called'
    | 'serving'
    | 'completed'
    | 'skipped'
    | 'hold'
    | 'transferred'
    | 'cancelled';

export type PriorityType =
    | 'EMERGENCY'
    | 'SENIOR'
    | 'PWD'
    | 'PREGNANT'
    | 'REGULAR';

export interface QueueEvent {
    id: number;
    queue_id: number;
    event_type: string;
    from_status: QueueStatus | null;
    to_status: QueueStatus;
    window_id: number | null;
    window?: Window;
    user_id: number | null;
    user?: { id: number; name: string };
    metadata: Record<string, any> | null;
    created_at: string;
}

export interface Queue {
    id: number;
    public_token?: string;
    queue_date: string;
    queue_number: string;
    queue_sequence: number;
    display_number: string;
    department_id: number;
    department?: Department;
    service_id: number;
    service?: Service;
    window_id: number | null;
    window?: Window;
    status: QueueStatus;
    priority_type: PriorityType;
    priority_level: number;
    patient_reference: string | null;
    patient_name: string | null;
    called_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    skipped_at: string | null;
    held_at: string | null;
    transferred_at: string | null;
    transfer_to_department_id: number | null;
    transfer_to_department?: Department;
    transfer_to_service_id: number | null;
    transfer_to_service?: Service;
    parent_queue_id: number | null;
    created_by: number | null;
    called_by: number | null;
    caller?: { id: number; name: string };
    served_by: number | null;
    server?: { id: number; name: string };
    completed_by: number | null;
    completer?: { id: number; name: string };
    events?: QueueEvent[];
    created_at: string;
    updated_at: string;
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    first_page_url: string;
    from: number | null;
    last_page: number;
    last_page_url: string;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
}

export interface DashboardDepartmentSummary {
    id: number;
    code: string;
    name: string;
    is_active: boolean;
    services_count: number;
    windows_count: number;
}

export interface NotificationLog {
    id: number;
    queue_id?: number | null;
    queue?: {
        id: number;
        queue_number: string;
        display_number: string;
        service_id: number;
        department_id: number;
    } | null;
    channel: string;
    notification_type: string;
    recipient: string;
    status: 'pending' | 'sent' | 'failed' | 'cancelled';
    provider: string;
    provider_message_id?: string | null;
    message_body: string;
    idempotency_key: string;
    attempts: number;
    error_message?: string | null;
    metadata?: Record<string, any> | null;
    sent_at?: string | null;
    failed_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface QueueSettingData {
    id?: number;
    hospital_name: string;
    hospital_tagline?: string | null;
    logo_url?: string | null;
    ticket_header?: string | null;
    ticket_footer?: string | null;
    ticket_width: '58mm' | '80mm';
    show_patient_name_on_ticket: boolean;
    allow_kiosk_emergency: boolean;
    kiosk_idle_timeout: number;
    auto_skip_timeout_minutes: number;
    priority_ordering: string[];
    allow_registration_when_closed: boolean;
    enable_sms: boolean;
    sms_provider: 'log' | 'semaphore' | 'twilio' | 'vonage' | 'gateway' | string;
    sms_sender_id?: string | null;
    sms_api_key?: string | null;
    sms_api_secret?: string | null;
    sms_nearing_threshold: number;
    sms_retry_limit: number;
    sms_template_nearing?: string | null;
    sms_template_called?: string | null;
    sms_template_transferred?: string | null;
    sms_template_completed?: string | null;
    enable_browser_notifications: boolean;
    enable_sound_vibration: boolean;
}

export interface DashboardMetrics {
    counts: {
        departments: number;
        active_departments: number;
        services: number;
        active_services: number;
        windows: number;
        active_windows: number;
        active_users: number;
        total_users: number;
    };
    departments_summary: DashboardDepartmentSummary[];
    system_status: {
        is_ready: boolean;
        environment: string;
        server_time: string;
    };
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    flash: {
        success?: string | null;
        error?: string | null;
        info?: string | null;
        ticket?: Record<string, any> | null;
        [key: string]: any;
    };
};

export type PublicPageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth?: {
        user?: User | null;
    };
    flash?: {
        success?: string | null;
        error?: string | null;
        info?: string | null;
        ticket?: Record<string, any> | null;
        [key: string]: any;
    };
};
