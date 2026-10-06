<?php

namespace Database\Factories;

use App\Enums\PriorityType;
use App\Enums\QueueStatus;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\User;
use App\Models\Window;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Queue>
 */
class QueueFactory extends Factory
{
    protected $model = Queue::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $priority = fake()->randomElement(PriorityType::cases());
        $sequence = fake()->numberBetween(1, 999);
        $prefix = fake()->lexify('???');

        return [
            'department_id' => Department::factory(),
            'service_id' => Service::factory(),
            'window_id' => null,
            'parent_queue_id' => null,
            'queue_date' => Carbon::today()->format('Y-m-d'),
            'queue_number' => strtoupper("{$prefix}-".str_pad((string) $sequence, 3, '0', STR_PAD_LEFT)),
            'queue_sequence' => $sequence,
            'display_number' => strtoupper("{$prefix}-".str_pad((string) $sequence, 3, '0', STR_PAD_LEFT)),
            'status' => QueueStatus::Waiting,
            'priority_type' => $priority,
            'priority_level' => $priority->defaultLevel(),
            'patient_name' => fake()->name(),
            'patient_reference' => 'PAT-'.fake()->numerify('#####'),
            'notes' => null,
            'created_by' => User::factory(),
        ];
    }

    public function waiting(): static
    {
        return $this->state(fn () => [
            'status' => QueueStatus::Waiting,
            'window_id' => null,
            'called_at' => null,
            'started_at' => null,
            'completed_at' => null,
        ]);
    }

    public function called(): static
    {
        return $this->state(fn () => [
            'status' => QueueStatus::Called,
            'window_id' => Window::factory(),
            'called_at' => Carbon::now(),
            'called_by' => User::factory(),
        ]);
    }

    public function serving(): static
    {
        return $this->state(fn () => [
            'status' => QueueStatus::Serving,
            'window_id' => Window::factory(),
            'called_at' => Carbon::now()->subMinutes(5),
            'started_at' => Carbon::now(),
            'called_by' => User::factory(),
            'served_by' => User::factory(),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => QueueStatus::Completed,
            'window_id' => Window::factory(),
            'called_at' => Carbon::now()->subMinutes(15),
            'started_at' => Carbon::now()->subMinutes(10),
            'completed_at' => Carbon::now(),
            'called_by' => User::factory(),
            'served_by' => User::factory(),
            'completed_by' => User::factory(),
        ]);
    }

    public function skipped(): static
    {
        return $this->state(fn () => [
            'status' => QueueStatus::Skipped,
            'window_id' => Window::factory(),
            'called_at' => Carbon::now()->subMinutes(10),
            'skipped_at' => Carbon::now(),
        ]);
    }

    public function hold(): static
    {
        return $this->state(fn () => [
            'status' => QueueStatus::Hold,
            'window_id' => Window::factory(),
            'called_at' => Carbon::now()->subMinutes(20),
            'started_at' => Carbon::now()->subMinutes(15),
            'held_at' => Carbon::now(),
        ]);
    }

    public function transferred(): static
    {
        return $this->state(fn () => [
            'status' => QueueStatus::Transferred,
            'transferred_at' => Carbon::now(),
            'transfer_to_department_id' => Department::factory(),
            'transfer_to_service_id' => Service::factory(),
        ]);
    }
}
