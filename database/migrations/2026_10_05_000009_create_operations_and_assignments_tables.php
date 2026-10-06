<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Enhance Windows table for operational states & assigned service
        Schema::table('windows', function (Blueprint $table) {
            $table->string('status', 20)->default('closed')->after('name');
            $table->foreignId('service_id')->nullable()->after('department_id')->constrained('services')->nullOnDelete();
            $table->string('display_name')->nullable()->after('name');
            $table->timestamp('last_activity_at')->nullable()->after('is_active');
            $table->index(['department_id', 'status']);
        });

        // 2. Create Window Staff Assignments table
        Schema::create('window_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('window_id')->constrained('windows')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at');
            $table->timestamp('ended_at')->nullable();
            $table->string('status', 20)->default('active'); // active, ended
            $table->timestamps();

            $table->index(['window_id', 'status']);
            $table->index(['user_id', 'status']);
        });

        // 3. Enhance Departments table for operational states
        Schema::table('departments', function (Blueprint $table) {
            $table->string('status', 20)->default('open')->after('description'); // open, closed, paused
            $table->string('status_reason', 500)->nullable()->after('status');
        });

        // 4. Enhance Services table for operational states & queue limits
        Schema::table('services', function (Blueprint $table) {
            $table->string('status', 20)->default('available')->after('prefix'); // available, paused, closed, maintenance
            $table->string('status_reason', 500)->nullable()->after('status');
            $table->unsignedInteger('max_waiting_queue')->nullable()->after('max_daily_queue');
            $table->unsignedInteger('max_priority_queue')->nullable()->after('max_waiting_queue');
        });

        // 5. Create Service Operating Hours table (Mon=1 to Sun=7)
        Schema::create('service_operating_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 1 = Monday, 7 = Sunday
            $table->time('open_time')->default('08:00:00');
            $table->time('close_time')->default('17:00:00');
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            $table->unique(['service_id', 'day_of_week']);
            $table->index(['service_id', 'day_of_week', 'is_enabled']);
        });

        // 6. Enhance Queue Settings with Step 5 operational rules
        Schema::table('queue_settings', function (Blueprint $table) {
            $table->unsignedInteger('auto_skip_timeout_minutes')->default(0)->after('allow_kiosk_emergency'); // 0 = disabled
            $table->json('priority_ordering')->nullable()->after('auto_skip_timeout_minutes');
            $table->boolean('allow_registration_when_closed')->default(false)->after('priority_ordering');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('queue_settings', function (Blueprint $table) {
            $table->dropColumn([
                'auto_skip_timeout_minutes',
                'priority_ordering',
                'allow_registration_when_closed',
            ]);
        });

        Schema::dropIfExists('service_operating_hours');

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn([
                'status',
                'status_reason',
                'max_waiting_queue',
                'max_priority_queue',
            ]);
        });

        Schema::table('departments', function (Blueprint $table) {
            $table->dropColumn([
                'status',
                'status_reason',
            ]);
        });

        Schema::dropIfExists('window_assignments');

        Schema::table('windows', function (Blueprint $table) {
            $table->dropForeign(['service_id']);
            $table->dropIndex(['department_id', 'status']);
            $table->dropColumn([
                'status',
                'service_id',
                'display_name',
                'last_activity_at',
            ]);
        });
    }
};
