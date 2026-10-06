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
            $table->string('phone_number', 30)->nullable()->after('patient_name');
            $table->boolean('sms_consent')->default(false)->after('phone_number');
            $table->boolean('sms_notifications_enabled')->default(false)->after('sms_consent');
        });

        Schema::table('queue_settings', function (Blueprint $table) {
            $table->boolean('enable_sms')->default(false)->after('allow_registration_when_closed');
            $table->string('sms_provider', 50)->default('log')->after('enable_sms');
            $table->string('sms_sender_id', 50)->nullable()->default('MedQueue')->after('sms_provider');
            $table->string('sms_api_key', 255)->nullable()->after('sms_sender_id');
            $table->string('sms_api_secret', 255)->nullable()->after('sms_api_key');
            $table->unsignedTinyInteger('sms_nearing_threshold')->default(3)->after('sms_api_secret');
            $table->unsignedTinyInteger('sms_retry_limit')->default(3)->after('sms_nearing_threshold');
            $table->string('sms_template_nearing', 500)->nullable()->after('sms_retry_limit');
            $table->string('sms_template_called', 500)->nullable()->after('sms_template_nearing');
            $table->string('sms_template_transferred', 500)->nullable()->after('sms_template_called');
            $table->string('sms_template_completed', 500)->nullable()->after('sms_template_transferred');
            $table->boolean('enable_browser_notifications')->default(true)->after('sms_template_completed');
            $table->boolean('enable_sound_vibration')->default(true)->after('enable_browser_notifications');
        });

        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('queue_id')->nullable()->constrained('queues')->nullOnDelete();
            $table->string('channel', 30)->default('sms');
            $table->string('notification_type', 50);
            $table->string('recipient', 50);
            $table->string('raw_recipient', 50)->nullable();
            $table->string('status', 30)->default('pending');
            $table->string('provider', 50)->default('log');
            $table->string('provider_message_id', 100)->nullable();
            $table->text('message_body');
            $table->string('idempotency_key', 120)->unique();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->text('error_message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamps();

            $table->index('queue_id');
            $table->index('status');
            $table->index('notification_type');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_logs');

        Schema::table('queue_settings', function (Blueprint $table) {
            $table->dropColumn([
                'enable_sms',
                'sms_provider',
                'sms_sender_id',
                'sms_api_key',
                'sms_api_secret',
                'sms_nearing_threshold',
                'sms_retry_limit',
                'sms_template_nearing',
                'sms_template_called',
                'sms_template_transferred',
                'sms_template_completed',
                'enable_browser_notifications',
                'enable_sound_vibration',
            ]);
        });

        Schema::table('queues', function (Blueprint $table) {
            $table->dropColumn([
                'phone_number',
                'sms_consent',
                'sms_notifications_enabled',
            ]);
        });
    }
};
