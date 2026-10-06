<?php

namespace App\Enums;

enum UserRole: string
{
    case SuperAdmin = 'Super Administrator';
    case HospitalAdmin = 'Hospital Administrator';
    case QueueAdmin = 'Queue Administrator';
    case QueueStaff = 'Queue Staff';
    case WindowStaff = 'Window Staff';
    case DisplayUser = 'Display User';

    public function label(): string
    {
        return $this->value;
    }

    public function isAdministrator(): bool
    {
        return in_array($this, [
            self::SuperAdmin,
            self::HospitalAdmin,
            self::QueueAdmin,
        ], true);
    }

    public function canManageMasterData(): bool
    {
        return in_array($this, [
            self::SuperAdmin,
            self::HospitalAdmin,
            self::QueueAdmin,
        ], true);
    }

    public function canManageQueues(): bool
    {
        return in_array($this, [
            self::SuperAdmin,
            self::HospitalAdmin,
            self::QueueAdmin,
            self::QueueStaff,
            self::WindowStaff,
        ], true);
    }

    public function isWindowStaff(): bool
    {
        return in_array($this, [
            self::SuperAdmin,
            self::HospitalAdmin,
            self::QueueAdmin,
            self::QueueStaff,
            self::WindowStaff,
        ], true);
    }
}
