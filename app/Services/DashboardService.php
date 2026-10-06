<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Service;
use App\Models\User;
use App\Models\Window;
use Illuminate\Support\Carbon;

class DashboardService
{
    /**
     * Get aggregated metrics and summary for the admin dashboard.
     *
     * @return array<string, mixed>
     */
    public function getMetrics(): array
    {
        $departmentCount = Department::count();
        $activeDepartmentCount = Department::where('is_active', true)->count();

        $serviceCount = Service::count();
        $activeServiceCount = Service::where('is_active', true)->count();

        $windowCount = Window::count();
        $activeWindowCount = Window::where('is_active', true)->count();

        $userCount = User::count();
        $activeUserCount = User::where('is_active', true)->count();

        $departmentsSummary = Department::query()
            ->withCount(['services', 'windows'])
            ->orderBy('name')
            ->get()
            ->map(fn (Department $dept) => [
                'id' => $dept->id,
                'code' => $dept->code,
                'name' => $dept->name,
                'is_active' => (bool) $dept->is_active,
                'services_count' => (int) $dept->services_count,
                'windows_count' => (int) $dept->windows_count,
            ])
            ->toArray();

        return [
            'counts' => [
                'departments' => $departmentCount,
                'active_departments' => $activeDepartmentCount,
                'services' => $serviceCount,
                'active_services' => $activeServiceCount,
                'windows' => $windowCount,
                'active_windows' => $activeWindowCount,
                'active_users' => $activeUserCount,
                'total_users' => $userCount,
            ],
            'departments_summary' => $departmentsSummary,
            'system_status' => [
                'is_ready' => true,
                'environment' => config('app.env', 'production'),
                'server_time' => Carbon::now()->toIso8601String(),
            ],
        ];
    }
}
