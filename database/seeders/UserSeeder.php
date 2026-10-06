<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = [
            [
                'name' => 'Super Administrator',
                'email' => 'superadmin@medqueue.local',
                'password' => Hash::make('MedQueue@2026!'),
                'role' => UserRole::SuperAdmin,
                'is_active' => true,
            ],
            [
                'name' => 'Hospital Director',
                'email' => 'admin@medqueue.local',
                'password' => Hash::make('MedQueue@2026!'),
                'role' => UserRole::HospitalAdmin,
                'is_active' => true,
            ],
            [
                'name' => 'Queue Supervisor',
                'email' => 'queueadmin@medqueue.local',
                'password' => Hash::make('MedQueue@2026!'),
                'role' => UserRole::QueueAdmin,
                'is_active' => true,
            ],
            [
                'name' => 'Triage & Desk Staff',
                'email' => 'staff@medqueue.local',
                'password' => Hash::make('MedQueue@2026!'),
                'role' => UserRole::QueueStaff,
                'is_active' => true,
            ],
            [
                'name' => 'Window Counter Operator',
                'email' => 'window@medqueue.local',
                'password' => Hash::make('MedQueue@2026!'),
                'role' => UserRole::WindowStaff,
                'is_active' => true,
            ],
            [
                'name' => 'Waiting Hall Display',
                'email' => 'display@medqueue.local',
                'password' => Hash::make('MedQueue@2026!'),
                'role' => UserRole::DisplayUser,
                'is_active' => true,
            ],
        ];

        foreach ($users as $userData) {
            User::firstOrCreate(
                ['email' => $userData['email']],
                $userData
            );
        }
    }
}
