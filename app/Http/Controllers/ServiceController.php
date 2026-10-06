<?php

namespace App\Http\Controllers;

use App\Http\Requests\Service\StoreServiceRequest;
use App\Http\Requests\Service\UpdateServiceRequest;
use App\Models\Department;
use App\Models\Service;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ServiceController extends Controller
{
    /**
     * Display a paginated listing of services.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $departmentId = $request->input('department_id');
        $status = $request->input('status');

        $services = Service::query()
            ->with('department')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('prefix', 'like', "%{$search}%");
                });
            })
            ->when($departmentId, fn ($query) => $query->where('department_id', $departmentId))
            ->when($status !== null && $status !== '', function ($query) use ($status) {
                $query->where('is_active', filter_var($status, FILTER_VALIDATE_BOOLEAN));
            })
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        $departments = Department::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);

        return Inertia::render('Services/Index', [
            'services' => $services,
            'departments' => $departments,
            'filters' => [
                'search' => $search,
                'department_id' => $departmentId,
                'status' => $status,
            ],
        ]);
    }

    /**
     * Store a newly created service in storage.
     */
    public function store(StoreServiceRequest $request): RedirectResponse
    {
        Gate::authorize('create', Service::class);

        $validated = $request->validated();
        $validated['code'] = strtoupper($validated['code']);
        $validated['prefix'] = strtoupper($validated['prefix']);
        $validated['is_active'] = $validated['is_active'] ?? true;

        Service::create($validated);

        return redirect()->route('services.index')
            ->with('success', 'Service created successfully.');
    }

    /**
     * Update the specified service in storage.
     */
    public function update(UpdateServiceRequest $request, Service $service): RedirectResponse
    {
        Gate::authorize('update', $service);

        $validated = $request->validated();
        $validated['code'] = strtoupper($validated['code']);
        $validated['prefix'] = strtoupper($validated['prefix']);

        $service->update($validated);

        return redirect()->route('services.index')
            ->with('success', 'Service updated successfully.');
    }

    /**
     * Remove the specified service from storage.
     */
    public function destroy(Service $service): RedirectResponse
    {
        Gate::authorize('delete', $service);

        if ($service->queues()->exists()) {
            return back()->with('error', 'Cannot delete service with existing queue tickets.');
        }

        $service->delete();

        return redirect()->route('services.index')
            ->with('success', 'Service deleted successfully.');
    }

    /**
     * Toggle active status.
     */
    public function toggleStatus(Service $service): RedirectResponse
    {
        Gate::authorize('update', $service);

        $service->update([
            'is_active' => ! $service->is_active,
        ]);

        return back()->with('success', 'Service status updated successfully.');
    }
}
