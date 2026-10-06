<?php

namespace App\Http\Controllers\Api;

use App\Actions\Window\CreateWindowAction;
use App\Actions\Window\DeleteWindowAction;
use App\Actions\Window\UpdateWindowAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Window\StoreWindowRequest;
use App\Http\Requests\Window\UpdateWindowRequest;
use App\Http\Resources\WindowResource;
use App\Models\Window;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class WindowController extends Controller
{
    /**
     * Display a listing of active windows.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $departmentId = $request->query('department_id');

        $windows = Window::query()
            ->when($request->boolean('active_only', true), fn ($q) => $q->where('is_active', true))
            ->when($departmentId, fn ($q) => $q->where('department_id', $departmentId))
            ->with('department')
            ->orderBy('window_number')
            ->get();

        return WindowResource::collection($windows);
    }

    /**
     * Store a newly created window.
     */
    public function store(StoreWindowRequest $request, CreateWindowAction $action): JsonResponse
    {
        Gate::authorize('create', Window::class);

        $window = $action->execute($request->validated());
        $window->load('department');

        return (new WindowResource($window))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified window.
     */
    public function show(Window $window): WindowResource
    {
        $window->load('department');

        return new WindowResource($window);
    }

    /**
     * Update the specified window.
     */
    public function update(UpdateWindowRequest $request, Window $window, UpdateWindowAction $action): WindowResource
    {
        Gate::authorize('update', $window);

        $updated = $action->execute($window, $request->validated());
        $updated->load('department');

        return new WindowResource($updated);
    }

    /**
     * Remove the specified window.
     */
    public function destroy(Window $window, DeleteWindowAction $action): JsonResponse
    {
        Gate::authorize('delete', $window);

        $action->execute($window);

        return response()->json(['message' => 'Window deleted successfully']);
    }
}
