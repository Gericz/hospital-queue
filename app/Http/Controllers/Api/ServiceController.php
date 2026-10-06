<?php

namespace App\Http\Controllers\Api;

use App\Actions\Service\CreateServiceAction;
use App\Actions\Service\DeleteServiceAction;
use App\Actions\Service\UpdateServiceAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Service\StoreServiceRequest;
use App\Http\Requests\Service\UpdateServiceRequest;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class ServiceController extends Controller
{
    /**
     * Display a listing of active services.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $departmentId = $request->query('department_id');

        $services = Service::query()
            ->when($request->boolean('active_only', true), fn ($q) => $q->where('is_active', true))
            ->when($departmentId, fn ($q) => $q->where('department_id', $departmentId))
            ->with('department')
            ->orderBy('name')
            ->get();

        return ServiceResource::collection($services);
    }

    /**
     * Store a newly created service.
     */
    public function store(StoreServiceRequest $request, CreateServiceAction $action): JsonResponse
    {
        Gate::authorize('create', Service::class);

        $service = $action->execute($request->validated());
        $service->load('department');

        return (new ServiceResource($service))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified service.
     */
    public function show(Service $service): ServiceResource
    {
        $service->load('department');

        return new ServiceResource($service);
    }

    /**
     * Update the specified service.
     */
    public function update(UpdateServiceRequest $request, Service $service, UpdateServiceAction $action): ServiceResource
    {
        Gate::authorize('update', $service);

        $updated = $action->execute($service, $request->validated());
        $updated->load('department');

        return new ServiceResource($updated);
    }

    /**
     * Remove the specified service.
     */
    public function destroy(Service $service, DeleteServiceAction $action): JsonResponse
    {
        Gate::authorize('delete', $service);

        $action->execute($service);

        return response()->json(['message' => 'Service deleted successfully']);
    }
}
