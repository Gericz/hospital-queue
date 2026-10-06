<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        protected DashboardService $dashboardService
    ) {}

    /**
     * Display the hospital management dashboard.
     */
    public function index(Request $request): Response
    {
        $metrics = $this->dashboardService->getMetrics();

        return Inertia::render('Dashboard', [
            'metrics' => $metrics,
        ]);
    }
}
