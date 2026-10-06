<?php

namespace App\Console\Commands;

use App\Actions\Queue\AutoSkipQueuesAction;
use Illuminate\Console\Command;

class AutoSkipQueueCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'queue:auto-skip {--timeout= : Override auto-skip timeout in minutes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically skip tickets in CALLED status exceeding the configured timeout';

    /**
     * Execute the console command.
     */
    public function handle(AutoSkipQueuesAction $action): int
    {
        $timeoutOption = $this->option('timeout');
        $timeout = $timeoutOption !== null ? (int) $timeoutOption : null;

        $this->info('Scanning for called queues exceeding timeout...');

        $skipped = $action->execute($timeout);

        $this->info("Completed auto-skip process. Total tickets auto-skipped: {$skipped->count()}");

        return Command::SUCCESS;
    }
}
