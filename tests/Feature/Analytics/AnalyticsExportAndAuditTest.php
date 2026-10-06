<?php

namespace Tests\Feature\Analytics;

use App\Enums\QueueStatus;
use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Queue;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsExportAndAuditTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Department $department;

    protected Service $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => UserRole::HospitalAdmin,
            'is_active' => true,
        ]);

        $this->department = Department::factory()->create(['name' => 'Emergency', 'code' => 'ER']);
        $this->service = Service::factory()->create(['department_id' => $this->department->id, 'name' => 'Trauma']);

        Queue::factory()->create([
            'department_id' => $this->department->id,
            'service_id' => $this->service->id,
            'queue_date' => Carbon::today()->format('Y-m-d'),
            'status' => QueueStatus::Completed,
        ]);
    }

    public function test_it_exports_csv_and_logs_audit(): void
    {
        $response = $this->actingAs($this->admin)->get(route('analytics.export', [
            'report_type' => 'department_performance',
            'format' => 'csv',
            'preset' => 'today',
        ]));

        $response->assertOk();
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $this->assertDatabaseHas('report_audit_logs', [
            'user_id' => $this->admin->id,
            'report_type' => 'department_performance',
            'format' => 'csv',
        ]);
    }

    public function test_it_renders_pdf_report_view_and_logs_audit(): void
    {
        $response = $this->actingAs($this->admin)->get(route('analytics.export', [
            'report_type' => 'summary',
            'format' => 'pdf',
            'preset' => 'today',
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Analytics/PrintReport')
            ->has('summary')
            ->has('departmentPerformance')
        );

        $this->assertDatabaseHas('report_audit_logs', [
            'user_id' => $this->admin->id,
            'report_type' => 'summary',
            'format' => 'pdf',
        ]);
    }
}
