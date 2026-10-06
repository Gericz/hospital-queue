<?php

namespace App\Actions\Service;

use App\Models\Service;
use App\Models\ServiceOperatingHour;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class UpdateServiceOperatingHoursAction
{
    /**
     * @param  array<int, array{day_of_week: int, open_time: string, close_time: string, is_enabled: bool}>  $schedules
     * @return Collection<int, ServiceOperatingHour>
     */
    public function execute(Service $service, array $schedules)
    {
        return DB::transaction(function () use ($service, $schedules) {
            foreach ($schedules as $schedule) {
                ServiceOperatingHour::updateOrCreate(
                    [
                        'service_id' => $service->id,
                        'day_of_week' => $schedule['day_of_week'],
                    ],
                    [
                        'open_time' => $schedule['open_time'],
                        'close_time' => $schedule['close_time'],
                        'is_enabled' => (bool) $schedule['is_enabled'],
                    ]
                );
            }

            return $service->operatingHours()->orderBy('day_of_week')->get();
        });
    }
}
