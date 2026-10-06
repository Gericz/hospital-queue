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
        // 1. Add SLA target wait/service times to services and departments
        Schema::table('services', function (Blueprint $table) {
            $table->unsignedInteger('target_wait_time_minutes')->nullable()->after('max_priority_queue');
            $table->unsignedInteger('target_service_time_minutes')->nullable()->after('target_wait_time_minutes');
        });

        Schema::table('departments', function (Blueprint $table) {
            $table->unsignedInteger('target_wait_time_minutes')->nullable()->after('status_reason');
        });

        // 2. Add composite indexes on queues for fast analytics aggregation
        Schema::table('queues', function (Blueprint $table) {
            $table->index(['queue_date', 'status'], 'idx_queues_date_status');
            $table->index(['queue_date', 'window_id', 'status'], 'idx_queues_date_window_status');
            $table->index(['queue_date', 'priority_type'], 'idx_queues_date_priority');
            $table->index(['created_at', 'called_at'], 'idx_queues_wait_time');
            $table->index(['started_at', 'completed_at'], 'idx_queues_service_time');
            $table->index(['transfer_to_department_id', 'department_id'], 'idx_queues_dept_transfers');
            $table->index(['transfer_to_service_id', 'service_id'], 'idx_queues_service_transfers');
        });

        // 3. Create report audit logs table
        Schema::create('report_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('report_type', 60)->index();
            $table->string('format', 20)->index(); // csv, pdf, json
            $table->json('filters')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('generated_at')->useCurrent()->index();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_audit_logs');

        Schema::table('queues', function (Blueprint $table) {
            $table->dropIndex('idx_queues_date_status');
            $table->dropIndex('idx_queues_date_window_status');
            $table->dropIndex('idx_queues_date_priority');
            $table->dropIndex('idx_queues_wait_time');
            $table->dropIndex('idx_queues_service_time');
            $table->dropIndex('idx_queues_dept_transfers');
            $table->dropIndex('idx_queues_service_transfers');
        });

        Schema::table('departments', function (Blueprint $table) {
            $table->dropColumn('target_wait_time_minutes');
        });

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['target_wait_time_minutes', 'target_service_time_minutes']);
        });
    }
};
