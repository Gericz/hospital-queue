<?php

namespace App\Models;

use App\Enums\ServiceStatus;
use Carbon\Carbon;
use Database\Factories\ServiceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'department_id',
    'code',
    'name',
    'description',
    'prefix',
    'status',
    'status_reason',
    'max_daily_queue',
    'max_waiting_queue',
    'max_priority_queue',
    'target_wait_time_minutes',
    'target_service_time_minutes',
    'open_time',
    'close_time',
    'is_active',
])]
class Service extends Model
{
    /** @use HasFactory<ServiceFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'department_id' => 'integer',
            'status' => ServiceStatus::class,
            'max_daily_queue' => 'integer',
            'max_waiting_queue' => 'integer',
            'max_priority_queue' => 'integer',
            'target_wait_time_minutes' => 'integer',
            'target_service_time_minutes' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Check if service is currently available for operations.
     */
    public function isAvailable(): bool
    {
        return $this->is_active && $this->status === ServiceStatus::Available;
    }

    /**
     * Check if service is within open operating hours.
     */
    public function isWithinOperatingHours(?Carbon $now = null): bool
    {
        $current = $now ?? Carbon::now();
        $dayOfWeek = $current->dayOfWeekIso; // 1 (Mon) to 7 (Sun)
        $currentTime = $current->format('H:i:s');

        // Check configured daily operating hours
        $schedule = $this->operatingHours()->where('day_of_week', $dayOfWeek)->first();

        if ($schedule) {
            if (! $schedule->is_enabled) {
                return false;
            }

            if ($schedule->open_time && $currentTime < $schedule->open_time) {
                return false;
            }

            if ($schedule->close_time && $currentTime > $schedule->close_time) {
                return false;
            }

            return true;
        }

        // Fall back to general open_time / close_time
        if (! $this->open_time && ! $this->close_time) {
            return true;
        }

        if ($this->open_time && $currentTime < $this->open_time) {
            return false;
        }

        if ($this->close_time && $currentTime > $this->close_time) {
            return false;
        }

        return true;
    }

    /**
     * Check if the daily ticket cap has been reached for this service.
     */
    public function hasReachedDailyLimit(?string $date = null): bool
    {
        if (! $this->max_daily_queue || $this->max_daily_queue <= 0) {
            return false;
        }

        $checkDate = $date ?? Carbon::today()->format('Y-m-d');
        $count = $this->queues()->whereDate('queue_date', $checkDate)->count();

        return $count >= $this->max_daily_queue;
    }

    /**
     * Check if max waiting queues limit has been reached.
     */
    public function hasReachedWaitingLimit(?string $date = null): bool
    {
        if (! $this->max_waiting_queue || $this->max_waiting_queue <= 0) {
            return false;
        }

        $checkDate = $date ?? Carbon::today()->format('Y-m-d');
        $count = $this->queues()
            ->whereDate('queue_date', $checkDate)
            ->where('status', 'waiting')
            ->count();

        return $count >= $this->max_waiting_queue;
    }

    /**
     * Operating hours schedule for each day of the week.
     */
    public function operatingHours(): HasMany
    {
        return $this->hasMany(ServiceOperatingHour::class)->orderBy('day_of_week');
    }

    /**
     * Department this service belongs to.
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Windows currently assigned to this service.
     */
    public function windows(): HasMany
    {
        return $this->hasMany(Window::class);
    }

    /**
     * Queues created for this service.
     */
    public function queues(): HasMany
    {
        return $this->hasMany(Queue::class);
    }
}
