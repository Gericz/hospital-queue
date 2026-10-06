<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Window;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Window>
 */
class WindowFactory extends Factory
{
    protected $model = Window::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'department_id' => Department::factory(),
            'window_number' => 'W'.fake()->numberBetween(1, 99),
            'name' => 'Window '.fake()->numberBetween(1, 99),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
