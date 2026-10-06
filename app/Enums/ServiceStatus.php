<?php

namespace App\Enums;

enum ServiceStatus: string
{
    case Available = 'available';
    case Paused = 'paused';
    case Closed = 'closed';
    case Maintenance = 'maintenance';

    public function label(): string
    {
        return match ($this) {
            self::Available => 'Available',
            self::Paused => 'Paused',
            self::Closed => 'Closed',
            self::Maintenance => 'Maintenance',
        };
    }

    public function isAvailable(): bool
    {
        return $this === self::Available;
    }

    public function badgeColor(): string
    {
        return match ($this) {
            self::Available => 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
            self::Paused => 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
            self::Closed => 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
            self::Maintenance => 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
        };
    }
}
