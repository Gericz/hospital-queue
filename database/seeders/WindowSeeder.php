<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Window;
use Illuminate\Database\Seeder;

class WindowSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $windows = [
            // CASHIER Windows
            ['department_code' => 'CSH', 'window_number' => '1', 'name' => 'CASHIER PAYMENT WINDOW 1'],
            ['department_code' => 'CSH', 'window_number' => '2', 'name' => 'CASHIER REFUND WINDOW 2'],

            // BILLING Windows
            ['department_code' => 'BIL', 'window_number' => '3', 'name' => 'BILLING WINDOW 3'],
            ['department_code' => 'BIL', 'window_number' => '4', 'name' => 'BILLING WINDOW 4'],
            ['department_code' => 'BIL', 'window_number' => '5', 'name' => 'BILLING WINDOW 5'],

            // PHILHEALTH Windows
            ['department_code' => 'PHIC', 'window_number' => '6', 'name' => 'BILLING WINDOW 6'],

            // MEDICAL RECORDS Windows
            ['department_code' => 'MRD', 'window_number' => '7', 'name' => 'DEATH CERTIFICATE AND MEDICAL CERTIFICATE WINDOW 7'],
            ['department_code' => 'MRD', 'window_number' => '8', 'name' => 'BIRTH CERTIFICATE WINDOW 8'],

            // PHARMACY Windows
            ['department_code' => 'PHARM', 'window_number' => '9', 'name' => 'PHARMACY WINDOW 9'],

            // MEDICAL SOCIAL WORKER Windows
            ['department_code' => 'MSWD', 'window_number' => '10', 'name' => 'WINDOW 10'],

            // WATER BACTERIOLOGY Windows
            ['department_code' => 'WBAC', 'window_number' => '11', 'name' => 'WATER BACTERIOLOGY WINDOW 11'],
        ];

        foreach ($windows as $windowData) {
            $department = Department::where('code', $windowData['department_code'])->first();
            if ($department) {
                Window::updateOrCreate(
                    [
                        'window_number' => $windowData['window_number'],
                    ],
                    [
                        'department_id' => $department->id,
                        'name' => $windowData['name'],
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}
