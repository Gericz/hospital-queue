<?php

namespace App\Enums;

enum QueueStatus: string
{
    case Waiting = 'waiting';
    case Called = 'called';
    case Serving = 'serving';
    case Completed = 'completed';
    case Skipped = 'skipped';
    case Hold = 'hold';
    case Transferred = 'transferred';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Waiting => 'Waiting',
            self::Called => 'Called',
            self::Serving => 'Serving',
            self::Completed => 'Completed',
            self::Skipped => 'Skipped',
            self::Hold => 'On Hold',
            self::Transferred => 'Transferred',
            self::Cancelled => 'Cancelled',
        };
    }

    public function isTerminal(): bool
    {
        return in_array($this, [
            self::Completed,
            self::Skipped,
            self::Transferred,
            self::Cancelled,
        ], true);
    }

    public function isActive(): bool
    {
        return ! $this->isTerminal();
    }

    public function badgeColor(): string
    {
        return match ($this) {
            self::Waiting => 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
            self::Called => 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
            self::Serving => 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
            self::Completed => 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
            self::Skipped => 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
            self::Hold => 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300',
            self::Transferred => 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300',
            self::Cancelled => 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
        };
    }
}
