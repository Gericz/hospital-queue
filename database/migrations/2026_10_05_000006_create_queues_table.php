<?php

use App\Enums\PriorityType;
use App\Enums\QueueStatus;
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
        Schema::create('queues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained('departments')->restrictOnDelete();
            $table->foreignId('service_id')->constrained('services')->restrictOnDelete();
            $table->foreignId('window_id')->nullable()->constrained('windows')->nullOnDelete();
            $table->foreignId('parent_queue_id')->nullable()->constrained('queues')->nullOnDelete();

            $table->date('queue_date')->index();
            $table->string('queue_number', 30)->index();
            $table->unsignedInteger('queue_sequence');
            $table->string('display_number', 30)->nullable();

            $table->string('status', 30)->default(QueueStatus::Waiting->value)->index();
            $table->string('priority_type', 30)->default(PriorityType::Regular->value)->index();
            $table->unsignedTinyInteger('priority_level')->default(5)->index();

            $table->string('patient_name', 150)->nullable();
            $table->string('patient_reference', 100)->nullable();
            $table->text('notes')->nullable();

            $table->dateTime('called_at')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->dateTime('skipped_at')->nullable();
            $table->dateTime('held_at')->nullable();
            $table->dateTime('transferred_at')->nullable();

            $table->foreignId('transfer_to_department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('transfer_to_service_id')->nullable()->constrained('services')->nullOnDelete();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('called_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('served_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->unique(['service_id', 'queue_date', 'queue_sequence'], 'unique_service_date_queue_seq');
            $table->index(['department_id', 'status', 'queue_date']);
            $table->index(['service_id', 'status', 'queue_date']);
            $table->index(['priority_level', 'queue_sequence']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('queues');
    }
};
