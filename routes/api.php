<?php

use App\Http\Controllers\Api\AnalyticsApiController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\OperationsApiController;
use App\Http\Controllers\Api\QueueController;
use App\Http\Controllers\Api\QueueDisplayController;
use App\Http\Controllers\Api\QueueOperationController;
use App\Http\Controllers\Api\QueueTicketStatusController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\WindowController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Public Display API (Zero PII)
Route::get('/display/{department:code?}', [QueueDisplayController::class, 'show'])->name('api.display.show');
Route::get('/v1/display/{department:code?}', [QueueDisplayController::class, 'show'])->name('api.v1.display.show');

// Public Queue Ticket Endpoints (Token-based & Kiosk, Rate-limited)
Route::post('/queue-tickets', [QueueTicketStatusController::class, 'store'])
    ->middleware('throttle:30,1')
    ->name('api.queue-tickets.store');
Route::get('/queue-tickets/{token}', [QueueTicketStatusController::class, 'show'])
    ->middleware('throttle:60,1')
    ->name('api.queue-tickets.show');
Route::get('/queue-tickets/{token}/status', [QueueTicketStatusController::class, 'status'])
    ->middleware('throttle:60,1')
    ->name('api.queue-tickets.status');

// Service Availability Endpoint
Route::get('/services/{service}/availability', [OperationsApiController::class, 'serviceAvailability'])->name('api.services.availability');

// Direct API routes
Route::name('api.')->group(function () {
    Route::apiResource('departments', DepartmentController::class);
    Route::apiResource('services', ServiceController::class);
    Route::apiResource('windows', WindowController::class);

    // Queue APIs
    Route::get('/queues', [QueueController::class, 'index'])->name('queues.index');
    Route::post('/queues', [QueueController::class, 'store'])->name('queues.store');
    Route::get('/queues/{queue}', [QueueController::class, 'show'])->name('queues.show');

    // Queue Operations
    Route::post('/queues/call-next', [QueueOperationController::class, 'callNext'])->name('queues.call-next');
    Route::post('/queues/{queue}/recall', [QueueOperationController::class, 'recall'])->name('queues.recall');
    Route::post('/queues/{queue}/serve', [QueueOperationController::class, 'startServing'])->name('queues.serve');
    Route::post('/queues/{queue}/complete', [QueueOperationController::class, 'complete'])->name('queues.complete');
    Route::post('/queues/{queue}/skip', [QueueOperationController::class, 'skip'])->name('queues.skip');
    Route::post('/queues/{queue}/hold', [QueueOperationController::class, 'hold'])->name('queues.hold');
    Route::post('/queues/{queue}/resume', [QueueOperationController::class, 'resume'])->name('queues.resume');
    Route::post('/queues/{queue}/transfer', [OperationsApiController::class, 'transferQueue'])->name('queues.transfer');
    Route::post('/queues/{queue}/cancel', [OperationsApiController::class, 'cancelQueue'])->name('queues.cancel');
    Route::post('/queues/{queue}/priority', [OperationsApiController::class, 'changePriority'])->name('queues.priority');

    // Operations Endpoints
    Route::get('/operations/dashboard', [OperationsApiController::class, 'dashboard'])->name('operations.dashboard');
    Route::get('/operations/windows', [OperationsApiController::class, 'windows'])->name('operations.windows');
    Route::post('/operations/windows/{window}/open', [OperationsApiController::class, 'openWindow'])->name('operations.windows.open');
    Route::post('/operations/windows/{window}/close', [OperationsApiController::class, 'closeWindow'])->name('operations.windows.close');
    Route::post('/operations/windows/{window}/pause', [OperationsApiController::class, 'pauseWindow'])->name('operations.windows.pause');
    Route::post('/operations/windows/{window}/resume', [OperationsApiController::class, 'resumeWindow'])->name('operations.windows.resume');
    Route::post('/operations/windows/{window}/assign', [OperationsApiController::class, 'assignStaff'])->name('operations.windows.assign');
    Route::post('/operations/windows/{window}/unassign', [OperationsApiController::class, 'unassignStaff'])->name('operations.windows.unassign');

    // Analytics Endpoints
    Route::prefix('analytics')->name('analytics.')->group(function () {
        Route::get('/summary', [AnalyticsApiController::class, 'summary'])->name('summary');
        Route::get('/volume', [AnalyticsApiController::class, 'volume'])->name('volume');
        Route::get('/hourly', [AnalyticsApiController::class, 'hourly'])->name('hourly');
        Route::get('/waiting-time', [AnalyticsApiController::class, 'waitingTime'])->name('waiting-time');
        Route::get('/departments', [AnalyticsApiController::class, 'departments'])->name('departments');
        Route::get('/services', [AnalyticsApiController::class, 'services'])->name('services');
        Route::get('/windows', [AnalyticsApiController::class, 'windows'])->name('windows');
        Route::get('/priorities', [AnalyticsApiController::class, 'priorities'])->name('priorities');
        Route::get('/transfers', [AnalyticsApiController::class, 'transfers'])->name('transfers');
        Route::get('/sla', [AnalyticsApiController::class, 'sla'])->name('sla');
        Route::get('/export', [AnalyticsApiController::class, 'export'])->name('export');
    });
});

// Versioned v1 API routes
Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::apiResource('departments', DepartmentController::class);
    Route::apiResource('services', ServiceController::class);
    Route::apiResource('windows', WindowController::class);

    // Queue APIs
    Route::get('/queues', [QueueController::class, 'index'])->name('queues.index');
    Route::post('/queues', [QueueController::class, 'store'])->name('queues.store');
    Route::get('/queues/{queue}', [QueueController::class, 'show'])->name('queues.show');

    // Queue Operations
    Route::post('/queues/call-next', [QueueOperationController::class, 'callNext'])->name('queues.call-next');
    Route::post('/queues/{queue}/recall', [QueueOperationController::class, 'recall'])->name('queues.recall');
    Route::post('/queues/{queue}/serve', [QueueOperationController::class, 'startServing'])->name('queues.serve');
    Route::post('/queues/{queue}/complete', [QueueOperationController::class, 'complete'])->name('queues.complete');
    Route::post('/queues/{queue}/skip', [QueueOperationController::class, 'skip'])->name('queues.skip');
    Route::post('/queues/{queue}/hold', [QueueOperationController::class, 'hold'])->name('queues.hold');
    Route::post('/queues/{queue}/resume', [QueueOperationController::class, 'resume'])->name('queues.resume');
    Route::post('/queues/{queue}/transfer', [OperationsApiController::class, 'transferQueue'])->name('queues.transfer');
    Route::post('/queues/{queue}/cancel', [OperationsApiController::class, 'cancelQueue'])->name('queues.cancel');
    Route::post('/queues/{queue}/priority', [OperationsApiController::class, 'changePriority'])->name('queues.priority');

    // Operations Endpoints
    Route::get('/operations/dashboard', [OperationsApiController::class, 'dashboard'])->name('operations.dashboard');
    Route::get('/operations/windows', [OperationsApiController::class, 'windows'])->name('operations.windows');
    Route::post('/operations/windows/{window}/open', [OperationsApiController::class, 'openWindow'])->name('operations.windows.open');
    Route::post('/operations/windows/{window}/close', [OperationsApiController::class, 'closeWindow'])->name('operations.windows.close');
    Route::post('/operations/windows/{window}/pause', [OperationsApiController::class, 'pauseWindow'])->name('operations.windows.pause');
    Route::post('/operations/windows/{window}/resume', [OperationsApiController::class, 'resumeWindow'])->name('operations.windows.resume');
    Route::post('/operations/windows/{window}/assign', [OperationsApiController::class, 'assignStaff'])->name('operations.windows.assign');
    Route::post('/operations/windows/{window}/unassign', [OperationsApiController::class, 'unassignStaff'])->name('operations.windows.unassign');

    // Analytics Endpoints
    Route::prefix('analytics')->name('analytics.')->group(function () {
        Route::get('/summary', [AnalyticsApiController::class, 'summary'])->name('summary');
        Route::get('/volume', [AnalyticsApiController::class, 'volume'])->name('volume');
        Route::get('/hourly', [AnalyticsApiController::class, 'hourly'])->name('hourly');
        Route::get('/waiting-time', [AnalyticsApiController::class, 'waitingTime'])->name('waiting-time');
        Route::get('/departments', [AnalyticsApiController::class, 'departments'])->name('departments');
        Route::get('/services', [AnalyticsApiController::class, 'services'])->name('services');
        Route::get('/windows', [AnalyticsApiController::class, 'windows'])->name('windows');
        Route::get('/priorities', [AnalyticsApiController::class, 'priorities'])->name('priorities');
        Route::get('/transfers', [AnalyticsApiController::class, 'transfers'])->name('transfers');
        Route::get('/sla', [AnalyticsApiController::class, 'sla'])->name('sla');
        Route::get('/export', [AnalyticsApiController::class, 'export'])->name('export');
    });
});
