<?php

namespace Tests\Feature\Queue;

use App\Models\Department;
use App\Models\Service;
use App\Services\QueueNumberService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueueNumberGenerationTest extends TestCase
{
    use RefreshDatabase;

    protected QueueNumberService $numberService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->numberService = app(QueueNumberService::class);
    }

    public function test_queue_sequence_increments_monotonically(): void
    {
        $department = Department::factory()->create();
        $service = Service::factory()->create([
            'department_id' => $department->id,
            'prefix' => 'OPD',
        ]);

        $first = $this->numberService->generate($service, '2026-10-05');
        $second = $this->numberService->generate($service, '2026-10-05');
        $third = $this->numberService->generate($service, '2026-10-05');

        $this->assertEquals(1, $first['sequence']);
        $this->assertEquals('OPD-001', $first['queue_number']);

        $this->assertEquals(2, $second['sequence']);
        $this->assertEquals('OPD-002', $second['queue_number']);

        $this->assertEquals(3, $third['sequence']);
        $this->assertEquals('OPD-003', $third['queue_number']);
    }

    public function test_queue_sequence_resets_on_a_new_date(): void
    {
        $department = Department::factory()->create();
        $service = Service::factory()->create([
            'department_id' => $department->id,
            'prefix' => 'LAB',
        ]);

        $day1First = $this->numberService->generate($service, '2026-10-05');
        $day1Second = $this->numberService->generate($service, '2026-10-05');

        $this->assertEquals(1, $day1First['sequence']);
        $this->assertEquals('LAB-001', $day1First['queue_number']);
        $this->assertEquals(2, $day1Second['sequence']);
        $this->assertEquals('LAB-002', $day1Second['queue_number']);

        // Next Day
        $day2First = $this->numberService->generate($service, '2026-10-06');
        $this->assertEquals(1, $day2First['sequence']);
        $this->assertEquals('LAB-001', $day2First['queue_number']);
    }

    public function test_different_services_maintain_independent_sequences(): void
    {
        $department = Department::factory()->create();
        $opdService = Service::factory()->create([
            'department_id' => $department->id,
            'prefix' => 'OPD',
        ]);
        $xrayService = Service::factory()->create([
            'department_id' => $department->id,
            'prefix' => 'XRY',
        ]);

        $opd1 = $this->numberService->generate($opdService, '2026-10-05');
        $opd2 = $this->numberService->generate($opdService, '2026-10-05');
        $xray1 = $this->numberService->generate($xrayService, '2026-10-05');

        $this->assertEquals('OPD-001', $opd1['queue_number']);
        $this->assertEquals('OPD-002', $opd2['queue_number']);
        $this->assertEquals('XRY-001', $xray1['queue_number']);
        $this->assertEquals(1, $xray1['sequence']);
    }
}
