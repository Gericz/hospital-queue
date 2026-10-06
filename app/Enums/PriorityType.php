<?php

namespace App\Enums;

enum PriorityType: string
{
    case Emergency = 'EMERGENCY';
    case Senior = 'SENIOR';
    case Pwd = 'PWD';
    case Pregnant = 'PREGNANT';
    case Regular = 'REGULAR';

    public function label(): string
    {
        return match ($this) {
            self::Emergency => 'Emergency',
            self::Senior => 'Senior Citizen',
            self::Pwd => 'Person with Disability (PWD)',
            self::Pregnant => 'Pregnant',
            self::Regular => 'Regular',
        };
    }

    /**
     * Lower number indicates higher queue priority.
     */
    public function defaultLevel(): int
    {
        return match ($this) {
            self::Emergency => 1,
            self::Senior => 2,
            self::Pwd => 3,
            self::Pregnant => 4,
            self::Regular => 5,
        };
    }

    public function level(): int
    {
        return $this->defaultLevel();
    }

    public function weight(): int
    {
        return $this->defaultLevel();
    }

    public function badgeColor(): string
    {
        return match ($this) {
            self::Emergency => 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300',
            self::Senior => 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300',
            self::Pwd => 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300',
            self::Pregnant => 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950/50 dark:text-pink-300',
            self::Regular => 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300',
        };
    }
}
