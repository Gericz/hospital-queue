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
        Schema::table('queues', function (Blueprint $table) {
            $table->string('public_token', 64)->nullable()->unique()->after('id');
        });

        Schema::table('services', function (Blueprint $table) {
            $table->unsignedInteger('max_daily_queue')->nullable()->after('prefix');
            $table->time('open_time')->nullable()->after('max_daily_queue');
            $table->time('close_time')->nullable()->after('open_time');
        });

        Schema::create('queue_settings', function (Blueprint $table) {
            $table->id();
            $table->string('hospital_name')->default('MedQueue Medical Center');
            $table->string('hospital_tagline')->nullable()->default('Patient Flow & Care Management');
            $table->string('logo_url')->nullable();
            $table->string('ticket_header')->nullable()->default('MedQueue Health');
            $table->string('ticket_footer', 500)->nullable()->default('Please wait for your number to be called. Thank you for your patience.');
            $table->string('ticket_width', 10)->default('80mm');
            $table->boolean('show_patient_name_on_ticket')->default(false);
            $table->boolean('allow_kiosk_emergency')->default(false);
            $table->unsignedInteger('kiosk_idle_timeout')->default(15);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('queue_settings');

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['max_daily_queue', 'open_time', 'close_time']);
        });

        Schema::table('queues', function (Blueprint $table) {
            $table->dropColumn('public_token');
        });
    }
};
