<?php

namespace App\Services;

use App\Models\Queue;
use App\Models\QueueSequence;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class QueueNumberService
{
    /**
     * Generate the next atomic sequence and formatted queue number for a service on a given date.
     *
     * @return array{sequence: int, queue_number: string, display_number: string, date: string}
     */
    public function generate(Service $service, ?string $date = null): array
    {
        $queueDate = $date ?? Carbon::today()->format('Y-m-d');

        return DB::transaction(function () use ($service, $queueDate) {
            $sequenceRecord = QueueSequence::where('service_id', $service->id)
                ->where('sequence_date', $queueDate)
                ->lockForUpdate()
                ->first();

            $maxExisting = (int) (Queue::where('service_id', $service->id)
                ->where('queue_date', $queueDate)
                ->max('queue_sequence') ?? 0);

            if (! $sequenceRecord) {
                $sequenceRecord = QueueSequence::create([
                    'service_id' => $service->id,
                    'sequence_date' => $queueDate,
                    'last_sequence' => $maxExisting,
                ]);
            } elseif ($sequenceRecord->last_sequence < $maxExisting) {
                $sequenceRecord->last_sequence = $maxExisting;
            }

            $nextSequence = $sequenceRecord->last_sequence + 1;
            $sequenceRecord->last_sequence = $nextSequence;
            $sequenceRecord->save();

            $prefix = strtoupper(trim($service->prefix ?: 'Q'));
            $paddedSequence = str_pad((string) $nextSequence, 3, '0', STR_PAD_LEFT);
            $queueNumber = "{$prefix}-{$paddedSequence}";

            return [
                'sequence' => $nextSequence,
                'queue_number' => $queueNumber,
                'display_number' => $queueNumber,
                'date' => $queueDate,
            ];
        });
    }
}
