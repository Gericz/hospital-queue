<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Service;
use App\Models\User;
use App\Models\Window;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_from_dashboard(): void
    {
        $response = $this->get(route('dashboard'));

        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_access_dashboard(): void
    {
        $user = User::factory()->superAdmin()->create();
        Department::factory()->count(2)->create();
        Service::factory()->count(3)->create();
        Window::factory()->count(4)->create();

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
    }
}
