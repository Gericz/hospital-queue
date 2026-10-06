<?php

namespace App\Enums;

enum DepartmentStatus: string
{
    case Open = 'open';
    case Closed = 'closed';
    case Paused = 'paused';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'Open',
            self::Closed => 'Closed',
            self::Paused => 'Paused',
        };
    }

    public function isOpen(): bool
    {
        return $this === self::Open;
    }

    public function badgeColor(): string
    {
        return match ($this) {
            self::Open => 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
            self::Closed => 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
            self::Paused => 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
        };
    }
}
