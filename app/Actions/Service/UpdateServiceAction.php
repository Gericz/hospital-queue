<?php

namespace App\Actions\Service;

use App\Models\Service;

class UpdateServiceAction
{
    /**
     * @param  array{department_id?: int, code?: string, name?: string, description?: ?string, prefix?: string, is_active?: bool}  $data
     */
    public function execute(Service $service, array $data): Service
    {
        $payload = [];

        if (isset($data['department_id'])) {
            $payload['department_id'] = $data['department_id'];
        }
        if (isset($data['code'])) {
            $payload['code'] = strtoupper($data['code']);
        }
        if (isset($data['name'])) {
            $payload['name'] = $data['name'];
        }
        if (array_key_exists('description', $data)) {
            $payload['description'] = $data['description'];
        }
        if (isset($data['prefix'])) {
            $payload['prefix'] = strtoupper($data['prefix']);
        }
        if (isset($data['is_active'])) {
            $payload['is_active'] = (bool) $data['is_active'];
        }

        $service->update($payload);

        return $service->fresh();
    }
}
