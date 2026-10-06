<?php

namespace Database\Factories;

use App\Models\ReportAuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReportAuditLog>
 */
class ReportAuditLogFactory extends Factory
{
    protected $model = ReportAuditLog::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'report_type' => 'summary',
            'format' => 'csv',
            'filters' => ['preset' => 'today'],
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'generated_at' => now(),
            'created_at' => now(),
        ];
    }
}
