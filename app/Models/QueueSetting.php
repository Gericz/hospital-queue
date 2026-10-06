<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'hospital_name',
    'hospital_tagline',
    'logo_url',
    'ticket_header',
    'ticket_footer',
    'ticket_width',
    'show_patient_name_on_ticket',
    'allow_kiosk_emergency',
    'kiosk_idle_timeout',
    'auto_skip_timeout_minutes',
    'priority_ordering',
    'allow_registration_when_closed',
    'enable_sms',
    'sms_provider',
    'sms_sender_id',
    'sms_api_key',
    'sms_api_secret',
    'sms_nearing_threshold',
    'sms_retry_limit',
    'sms_template_nearing',
    'sms_template_called',
    'sms_template_transferred',
    'sms_template_completed',
    'enable_browser_notifications',
    'enable_sound_vibration',
])]
class QueueSetting extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'show_patient_name_on_ticket' => 'boolean',
            'allow_kiosk_emergency' => 'boolean',
            'kiosk_idle_timeout' => 'integer',
            'auto_skip_timeout_minutes' => 'integer',
            'priority_ordering' => 'array',
            'allow_registration_when_closed' => 'boolean',
            'enable_sms' => 'boolean',
            'sms_nearing_threshold' => 'integer',
            'sms_retry_limit' => 'integer',
            'enable_browser_notifications' => 'boolean',
            'enable_sound_vibration' => 'boolean',
        ];
    }

    /**
     * Retrieve priority ordering as array of strings.
     *
     * @return array<string>
     */
    public function getPriorityOrder(): array
    {
        return $this->priority_ordering ?? [
            'EMERGENCY',
            'SENIOR',
            'PWD',
            'PREGNANT',
            'REGULAR',
        ];
    }

    /**
     * Retrieve default SMS template for a specific notification type.
     */
    public function getTemplate(string $type): string
    {
        return match ($type) {
            'nearing' => $this->sms_template_nearing ?? 'Your queue number {queue_number} for {service} is approaching service. Please proceed near the waiting area. - {hospital_name}',
            'called' => $this->sms_template_called ?? 'NOW SERVING: Queue {queue_number} for {service}. Please proceed immediately to {window}. - {hospital_name}',
            'transferred' => $this->sms_template_transferred ?? 'Queue {queue_number} has been transferred to {department} - {service}. Please proceed to the new waiting area. - {hospital_name}',
            'completed' => $this->sms_template_completed ?? 'Your visit for Queue {queue_number} ({service}) has been completed. Thank you for visiting {hospital_name}.',
            default => 'Queue update for {queue_number}: Your queue status has changed. - {hospital_name}',
        };
    }

    /**
     * Retrieve the current queue settings singleton record.
     */
    public static function getSettings(): self
    {
        return static::firstOrCreate([], [
            'hospital_name' => 'MedQueue Medical Center',
            'hospital_tagline' => 'Patient Flow & Care Management',
            'logo_url' => null,
            'ticket_header' => 'MedQueue Health',
            'ticket_footer' => 'Please wait for your number to be called. Thank you for your patience.',
            'ticket_width' => '80mm',
            'show_patient_name_on_ticket' => false,
            'allow_kiosk_emergency' => false,
            'kiosk_idle_timeout' => 15,
            'auto_skip_timeout_minutes' => 0,
            'priority_ordering' => ['EMERGENCY', 'SENIOR', 'PWD', 'PREGNANT', 'REGULAR'],
            'allow_registration_when_closed' => false,
            'enable_sms' => false,
            'sms_provider' => 'log',
            'sms_sender_id' => 'MedQueue',
            'sms_nearing_threshold' => 3,
            'sms_retry_limit' => 3,
            'sms_template_nearing' => 'Your queue number {queue_number} for {service} is approaching service. Please proceed near the waiting area. - {hospital_name}',
            'sms_template_called' => 'NOW SERVING: Queue {queue_number} for {service}. Please proceed immediately to {window}. - {hospital_name}',
            'sms_template_transferred' => 'Queue {queue_number} has been transferred to {department} - {service}. Please proceed to the new waiting area. - {hospital_name}',
            'sms_template_completed' => 'Your visit for Queue {queue_number} ({service}) has been completed. Thank you for visiting {hospital_name}.',
            'enable_browser_notifications' => true,
            'enable_sound_vibration' => true,
        ]);
    }
}
