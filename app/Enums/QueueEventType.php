<?php

namespace App\Enums;

enum QueueEventType: string
{
    case Created = 'created';
    case Called = 'called';
    case Recalled = 'recalled';
    case ServingStarted = 'serving_started';
    case Completed = 'completed';
    case Skipped = 'skipped';
    case Held = 'held';
    case Resumed = 'resumed';
    case Transferred = 'transferred';
    case Cancelled = 'cancelled';
    case PriorityChanged = 'priority_changed';
    case AutoSkipped = 'auto_skipped';

    public function label(): string
    {
        return match ($this) {
            self::Created => 'Ticket Created',
            self::Called => 'Called to Window',
            self::Recalled => 'Recalled',
            self::ServingStarted => 'Started Consultation/Service',
            self::Completed => 'Completed',
            self::Skipped => 'Skipped / No Show',
            self::Held => 'Placed on Hold',
            self::Resumed => 'Resumed',
            self::Transferred => 'Transferred',
            self::Cancelled => 'Cancelled',
            self::PriorityChanged => 'Priority Changed',
            self::AutoSkipped => 'Auto Skipped (Timeout)',
        };
    }
}
