<?php

namespace App\Models;

use Database\Factories\ReportAuditLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'report_type',
    'format',
    'filters',
    'ip_address',
    'user_agent',
    'generated_at',
])]
class ReportAuditLog extends Model
{
    /** @use HasFactory<ReportAuditLogFactory> */
    use HasFactory;

    public $timestamps = false;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'filters' => 'array',
            'generated_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /**
     * User who generated this report export.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
