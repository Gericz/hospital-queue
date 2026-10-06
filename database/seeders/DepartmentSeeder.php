<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $departments = [
            [
                'code' => 'CSH',
                'name' => 'Cashier',
                'description' => 'Hospital payments, cash settlements, and transaction refunds.',
                'is_active' => true,
            ],
            [
                'code' => 'BIL',
                'name' => 'Billing',
                'description' => 'Statement of accounts, inpatient/outpatient billing, and account assessments.',
                'is_active' => true,
            ],
            [
                'code' => 'PHIC',
                'name' => 'PhilHealth',
                'description' => 'PhilHealth benefit clearances, member verification, and claims processing.',
                'is_active' => true,
            ],
            [
                'code' => 'MRD',
                'name' => 'Medical Records',
                'description' => 'Issuance of birth certificates, death certificates, medical records, and certifications.',
                'is_active' => true,
            ],
            [
                'code' => 'PHARM',
                'name' => 'Pharmacy',
                'description' => 'Prescription fulfillment, medication dispensing, and pharmaceutical counseling.',
                'is_active' => true,
            ],
            [
                'code' => 'MSWD',
                'name' => 'Medical Social Worker',
                'description' => 'Patient social welfare assessment, financial assistance, and indigent patient care.',
                'is_active' => true,
            ],
            [
                'code' => 'WBAC',
                'name' => 'Water Bacteriology',
                'description' => 'Water bacteriological testing, water quality examination, microbial safety analysis, and certificate of potability.',
                'is_active' => true,
            ],
        ];

        foreach ($departments as $dept) {
            Department::updateOrCreate(
                ['code' => $dept['code']],
                $dept
            );
        }
    }
}
