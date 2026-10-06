<?php

namespace App\Http\Controllers\Api;

use App\Actions\Department\CreateDepartmentAction;
use App\Actions\Department\DeleteDepartmentAction;
use App\Actions\Department\UpdateDepartmentAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Department\StoreDepartmentRequest;
use App\Http\Requests\Department\UpdateDepartmentRequest;
use App\Http\Resources\DepartmentResource;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class DepartmentController extends Controller
{
    /**
     * Display a listing of active departments with active services and windows.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $departments = Department::query()
            ->when($request->boolean('active_only', true), fn ($q) => $q->where('is_active', true))
            ->with([
                'services' => fn ($query) => $query->where('is_active', true)->orderBy('name'),
                'windows' => fn ($query) => $query->where('is_active', true)->orderBy('window_number'),
            ])
            ->orderBy('name')
            ->get();

        return DepartmentResource::collection($departments);
    }

    /**
     * Store a newly created department.
     */
    public function store(StoreDepartmentRequest $request, CreateDepartmentAction $action): JsonResponse
    {
        Gate::authorize('create', Department::class);

        $department = $action->execute($request->validated());

        return (new DepartmentResource($department))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified department.
     */
    public function show(Department $department): DepartmentResource
    {
        $department->load([
            'services' => fn ($query) => $query->where('is_active', true)->orderBy('name'),
            'windows' => fn ($query) => $query->where('is_active', true)->orderBy('window_number'),
        ]);

        return new DepartmentResource($department);
    }

    /**
     * Update the specified department.
     */
    public function update(UpdateDepartmentRequest $request, Department $department, UpdateDepartmentAction $action): DepartmentResource
    {
        Gate::authorize('update', $department);

        $updated = $action->execute($department, $request->validated());

        return new DepartmentResource($updated);
    }

    /**
     * Remove the specified department.
     */
    public function destroy(Department $department, DeleteDepartmentAction $action): JsonResponse
    {
        Gate::authorize('delete', $department);

        $action->execute($department);

        return response()->json(['message' => 'Department deleted successfully']);
    }
}
