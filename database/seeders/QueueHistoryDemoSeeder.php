<?php

namespace Database\Seeders;

use App\Enums\PriorityType;
use App\Enums\QueueEventType;
use App\Enums\QueueStatus;
use App\Models\Department;
use App\Models\Queue;
use App\Models\QueueEvent;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class QueueHistoryDemoSeeder extends Seeder
{
    /**
     * Seed realistic queue history data for analytics demonstration.
     */
    public function run(): void
    {
        $departments = Department::with(['services', 'windows'])->where('is_active', true)->get();
        if ($departments->isEmpty()) {
            return;
        }

        $staffUser = User::first();
        $startDate = Carbon::today()->subDays(14);
        $endDate = Carbon::today();

        $priorities = [
            PriorityType::Regular,
            PriorityType::Regular,
            PriorityType::Regular,
            PriorityType::Senior,
            PriorityType::Pwd,
            PriorityType::Pregnant,
            PriorityType::Emergency,
        ];

        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            $dateStr = $date->format('Y-m-d');

            foreach ($departments as $department) {
                foreach ($department->services as $service) {
                    $dailyTicketCount = rand(5, 18);
                    $windows = $department->windows->where('service_id', $service->id);
                    if ($windows->isEmpty()) {
                        $windows = $department->windows;
                    }

                    for ($seq = 1; $seq <= $dailyTicketCount; $seq++) {
                        $priority = $priorities[array_rand($priorities)];
                        $hour = rand(7, 16);
                        $minute = rand(0, 59);
                        $createdTime = $date->copy()->setTime($hour, $minute, 0);

                        // Decide outcome
                        $outcomeRand = rand(1, 100);
                        $window = $windows->isNotEmpty() ? $windows->random() : null;

                        if ($outcomeRand <= 75) {
                            // Completed
                            $waitSec = rand(180, 1800); // 3 to 30 mins
                            $serveSec = rand(300, 1200); // 5 to 20 mins
                            $calledTime = $createdTime->copy()->addSeconds($waitSec);
                            $startedTime = $calledTime->copy()->addSeconds(30);
                            $completedTime = $startedTime->copy()->addSeconds($serveSec);

                            $queue = Queue::create([
                                'department_id' => $department->id,
                                'service_id' => $service->id,
                                'window_id' => $window?->id,
                                'queue_date' => $dateStr,
                                'queue_number' => sprintf('%s-%03d', $service->prefix, $seq),
                                'queue_sequence' => $seq,
                                'display_number' => sprintf('%s-%03d', $service->prefix, $seq),
                                'status' => QueueStatus::Completed,
                                'priority_type' => $priority,
                                'priority_level' => $priority->level(),
                                'patient_name' => 'Demo Patient '.$seq,
                                'created_at' => $createdTime,
                                'called_at' => $calledTime,
                                'started_at' => $startedTime,
                                'completed_at' => $completedTime,
                                'served_by' => $staffUser?->id,
                                'completed_by' => $staffUser?->id,
                            ]);

                            QueueEvent::create([
                                'queue_id' => $queue->id,
                                'window_id' => $window?->id,
                                'user_id' => $staffUser?->id,
                                'event_type' => QueueEventType::Completed,
                                'from_status' => QueueStatus::Serving,
                                'to_status' => QueueStatus::Completed,
                                'created_at' => $completedTime,
                            ]);
                        } elseif ($outcomeRand <= 88) {
                            // Skipped
                            $waitSec = rand(300, 1200);
                            $calledTime = $createdTime->copy()->addSeconds($waitSec);
                            $skippedTime = $calledTime->copy()->addSeconds(300);

                            Queue::create([
                                'department_id' => $department->id,
                                'service_id' => $service->id,
                                'window_id' => $window?->id,
                                'queue_date' => $dateStr,
                                'queue_number' => sprintf('%s-%03d', $service->prefix, $seq),
                                'queue_sequence' => $seq,
                                'display_number' => sprintf('%s-%03d', $service->prefix, $seq),
                                'status' => QueueStatus::Skipped,
                                'priority_type' => $priority,
                                'priority_level' => $priority->level(),
                                'patient_name' => 'Demo Patient '.$seq,
                                'created_at' => $createdTime,
                                'called_at' => $calledTime,
                                'skipped_at' => $skippedTime,
                            ]);
                        } elseif ($outcomeRand <= 94) {
                            // Transferred
                            $targetDept = $departments->where('id', '!=', $department->id)->first() ?? $department;
                            $targetService = $targetDept->services->first() ?? $service;

                            Queue::create([
                                'department_id' => $department->id,
                                'service_id' => $service->id,
                                'window_id' => $window?->id,
                                'queue_date' => $dateStr,
                                'queue_number' => sprintf('%s-%03d', $service->prefix, $seq),
                                'queue_sequence' => $seq,
                                'display_number' => sprintf('%s-%03d', $service->prefix, $seq),
                                'status' => QueueStatus::Transferred,
                                'priority_type' => $priority,
                                'priority_level' => $priority->level(),
                                'patient_name' => 'Demo Patient '.$seq,
                                'transfer_to_department_id' => $targetDept->id,
                                'transfer_to_service_id' => $targetService->id,
                                'created_at' => $createdTime,
                                'transferred_at' => $createdTime->copy()->addMinutes(15),
                            ]);
                        } else {
                            // Cancelled
                            Queue::create([
                                'department_id' => $department->id,
                                'service_id' => $service->id,
                                'queue_date' => $dateStr,
                                'queue_number' => sprintf('%s-%03d', $service->prefix, $seq),
                                'queue_sequence' => $seq,
                                'display_number' => sprintf('%s-%03d', $service->prefix, $seq),
                                'status' => QueueStatus::Cancelled,
                                'priority_type' => $priority,
                                'priority_level' => $priority->level(),
                                'patient_name' => 'Demo Patient '.$seq,
                                'created_at' => $createdTime,
                            ]);
                        }
                    }
                }
            }
        }
    }
}
