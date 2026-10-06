<?php

namespace App\Http\Controllers;

use App\Http\Requests\Window\StoreWindowRequest;
use App\Http\Requests\Window\UpdateWindowRequest;
use App\Models\Department;
use App\Models\Window;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class WindowController extends Controller
{
    /**
     * Display a paginated listing of windows.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $departmentId = $request->input('department_id');
        $status = $request->input('status');

        $windows = Window::query()
            ->with('department')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('window_number', 'like', "%{$search}%");
                });
            })
            ->when($departmentId, fn ($query) => $query->where('department_id', $departmentId))
            ->when($status !== null && $status !== '', function ($query) use ($status) {
                $query->where('is_active', filter_var($status, FILTER_VALIDATE_BOOLEAN));
            })
            ->orderBy('department_id')
            ->orderBy('window_number')
            ->paginate(10)
            ->withQueryString();

        $departments = Department::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);

        return Inertia::render('Windows/Index', [
            'windows' => $windows,
            'departments' => $departments,
            'filters' => [
                'search' => $search,
                'department_id' => $departmentId,
                'status' => $status,
            ],
        ]);
    }

    /**
     * Store a newly created window in storage.
     */
    public function store(StoreWindowRequest $request): RedirectResponse
    {
        Gate::authorize('create', Window::class);

        $validated = $request->validated();
        $validated['is_active'] = $validated['is_active'] ?? true;

        Window::create($validated);

        return redirect()->route('windows.index')
            ->with('success', 'Window created successfully.');
    }

    /**
     * Update the specified window in storage.
     */
    public function update(UpdateWindowRequest $request, Window $window): RedirectResponse
    {
        Gate::authorize('update', $window);

        $validated = $request->validated();

        $window->update($validated);

        return redirect()->route('windows.index')
            ->with('success', 'Window updated successfully.');
    }

    /**
     * Remove the specified window from storage.
     */
    public function destroy(Window $window): RedirectResponse
    {
        Gate::authorize('delete', $window);

        if ($window->queues()->exists()) {
            return back()->with('error', 'Cannot delete window with associated queue records.');
        }

        $window->delete();

        return redirect()->route('windows.index')
            ->with('success', 'Window deleted successfully.');
    }

    /**
     * Toggle active status.
     */
    public function toggleStatus(Window $window): RedirectResponse
    {
        Gate::authorize('update', $window);

        $window->update([
            'is_active' => ! $window->is_active,
        ]);

        return back()->with('success', 'Window status updated successfully.');
    }
}
