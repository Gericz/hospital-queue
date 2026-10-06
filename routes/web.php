<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\KioskController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OperationsController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QueueDisplayController;
use App\Http\Controllers\QueueMonitorController;
use App\Http\Controllers\QueueSettingController;
use App\Http\Controllers\QueueStatusController;
use App\Http\Controllers\QueueTicketController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\StaffQueueController;
use App\Http\Controllers\WindowController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return redirect()->route('login');
});

// Public Self-Service Touch Kiosk
Route::get('/kiosk', [KioskController::class, 'index'])->name('kiosk');
Route::post('/kiosk', [KioskController::class, 'store'])->name('kiosk.store');
Route::get('/queue/kiosk', fn () => redirect()->route('kiosk'));
Route::get('/ticket', fn () => redirect()->route('queue.tickets.create'));
Route::get('/take-ticket', fn () => redirect()->route('queue.tickets.create'));
Route::get('/issue-ticket', fn () => redirect()->route('queue.tickets.create'));
Route::get('/display', fn () => redirect()->route('queue.display'));

// Public Patient Live Ticket Status Tracker (Zero PII, Token-based, Rate-limited)
Route::get('/queue/status/{token}', [QueueStatusController::class, 'show'])
    ->middleware('throttle:60,1')
    ->name('queue.status');

// Public TV Display for Hospital Waiting Areas (zero PII)
Route::get('/queue/display/{department:code?}', [QueueDisplayController::class, 'show'])->name('queue.display');

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Notification Logs & SMS Gateway Management
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{notificationLog}/retry', [NotificationController::class, 'retry'])->name('notifications.retry');
    Route::get('/settings/notifications', [NotificationController::class, 'settings'])->name('settings.notifications.edit');
    Route::patch('/settings/notifications', [NotificationController::class, 'updateSettings'])->name('settings.notifications.update');
    Route::post('/settings/notifications/test-sms', [NotificationController::class, 'testSms'])->name('settings.notifications.test-sms');

    // Queue Ticket Settings
    Route::get('/settings/queue', [QueueSettingController::class, 'edit'])->name('settings.queue.edit');
    Route::patch('/settings/queue', [QueueSettingController::class, 'update'])->name('settings.queue.update');

    // Queue Ticket Generation (Kiosk / Registration Desk)
    Route::get('/queue/take-ticket', [QueueTicketController::class, 'create'])->name('queue.tickets.create');
    Route::post('/queue/take-ticket', [QueueTicketController::class, 'store'])->name('queue.tickets.store');

    // Staff Queue Workstation / Terminal
    Route::get('/queue/terminal', [StaffQueueController::class, 'index'])->name('queue.terminal');
    Route::post('/queue/terminal/call-next', [StaffQueueController::class, 'callNext'])->name('queue.terminal.call-next');
    Route::post('/queue/terminal/{queue}/recall', [StaffQueueController::class, 'recall'])->name('queue.terminal.recall');
    Route::post('/queue/terminal/{queue}/serve', [StaffQueueController::class, 'startServing'])->name('queue.terminal.serve');
    Route::post('/queue/terminal/{queue}/complete', [StaffQueueController::class, 'complete'])->name('queue.terminal.complete');
    Route::post('/queue/terminal/{queue}/skip', [StaffQueueController::class, 'skip'])->name('queue.terminal.skip');
    Route::post('/queue/terminal/{queue}/hold', [StaffQueueController::class, 'hold'])->name('queue.terminal.hold');
    Route::post('/queue/terminal/{queue}/resume', [StaffQueueController::class, 'resume'])->name('queue.terminal.resume');
    Route::post('/queue/terminal/{queue}/transfer', [StaffQueueController::class, 'transfer'])->name('queue.terminal.transfer');

    // Operations Dashboard & Queue Control Center
    Route::get('/operations', [OperationsController::class, 'index'])->name('operations.dashboard');
    Route::get('/operations/windows', [OperationsController::class, 'windows'])->name('operations.windows');
    Route::get('/operations/queues', [OperationsController::class, 'queues'])->name('operations.queues');
    Route::get('/operations/services', [OperationsController::class, 'services'])->name('operations.services');

    Route::post('/operations/windows/{window}/status', [OperationsController::class, 'updateWindowStatus'])->name('operations.windows.status');
    Route::post('/operations/windows/{window}/assign', [OperationsController::class, 'assignStaff'])->name('operations.windows.assign');
    Route::post('/operations/windows/{window}/unassign', [OperationsController::class, 'unassignStaff'])->name('operations.windows.unassign');

    Route::post('/operations/departments/{department}/status', [OperationsController::class, 'updateDepartmentStatus'])->name('operations.departments.status');
    Route::post('/operations/services/{service}/status', [OperationsController::class, 'updateServiceStatus'])->name('operations.services.status');
    Route::post('/operations/services/{service}/operating-hours', [OperationsController::class, 'updateServiceOperatingHours'])->name('operations.services.operating-hours');

    Route::post('/operations/queues/{queue}/transfer', [OperationsController::class, 'transferQueue'])->name('operations.queues.transfer');
    Route::post('/operations/queues/{queue}/cancel', [OperationsController::class, 'cancelQueue'])->name('operations.queues.cancel');
    Route::post('/operations/queues/{queue}/priority', [OperationsController::class, 'changePriority'])->name('operations.queues.priority');

    // Queue Monitor
    Route::get('/queue/monitor', [QueueMonitorController::class, 'index'])->name('queue.monitor');

    // Department Management
    Route::patch('/departments/{department}/toggle-status', [DepartmentController::class, 'toggleStatus'])
        ->name('departments.toggle-status');
    Route::resource('departments', DepartmentController::class);

    // Service Management
    Route::patch('/services/{service}/toggle-status', [ServiceController::class, 'toggleStatus'])
        ->name('services.toggle-status');
    Route::resource('services', ServiceController::class);

    // Window Management
    Route::patch('/windows/{window}/toggle-status', [WindowController::class, 'toggleStatus'])
        ->name('windows.toggle-status');
    Route::resource('windows', WindowController::class);

    // Reporting, Analytics & Performance Monitoring
    Route::get('/analytics', [AnalyticsController::class, 'index'])->name('analytics.dashboard');
    Route::get('/analytics/departments/{department}', [AnalyticsController::class, 'department'])->name('analytics.department');
    Route::get('/analytics/services/{service}', [AnalyticsController::class, 'service'])->name('analytics.service');
    Route::get('/analytics/export', [AnalyticsController::class, 'export'])->name('analytics.export');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
