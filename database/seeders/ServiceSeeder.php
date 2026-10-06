<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Service;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $services = [
            // Cashier Services
            [
                'department_code' => 'CSH',
                'code' => 'CSH-PAY',
                'name' => 'Cashier Payment',
                'description' => 'Payment transactions for consultations, laboratory, pharmacy, and hospital bills.',
                'prefix' => 'PAY',
                'target_wait_time_minutes' => 15,
                'target_service_time_minutes' => 5,
                'is_active' => true,
            ],
            [
                'department_code' => 'CSH',
                'code' => 'CSH-REF',
                'name' => 'Cashier Refund',
                'description' => 'Processing patient refund requests and account reimbursements.',
                'prefix' => 'REF',
                'target_wait_time_minutes' => 20,
                'target_service_time_minutes' => 10,
                'is_active' => true,
            ],

            // Billing Services
            [
                'department_code' => 'BIL',
                'code' => 'BIL-SOA',
                'name' => 'Hospital Billing & Statement of Account',
                'description' => 'Final bill computation, SOA issuance, and discharge billing processing.',
                'prefix' => 'BIL',
                'target_wait_time_minutes' => 20,
                'target_service_time_minutes' => 10,
                'is_active' => true,
            ],
            [
                'department_code' => 'BIL',
                'code' => 'BIL-INQ',
                'name' => 'Billing Assessment & Inquiries',
                'description' => 'Patient account assessment, billing balance inquiries, and financial estimations.',
                'prefix' => 'SOA',
                'target_wait_time_minutes' => 15,
                'target_service_time_minutes' => 8,
                'is_active' => true,
            ],

            // PhilHealth Services
            [
                'department_code' => 'PHIC',
                'code' => 'PHIC-CLM',
                'name' => 'PhilHealth Clearance & Benefit Claims',
                'description' => 'PhilHealth member eligibility check, claim deduction verification, and document submission.',
                'prefix' => 'PHIC',
                'target_wait_time_minutes' => 20,
                'target_service_time_minutes' => 10,
                'is_active' => true,
            ],

            // Medical Records Services
            [
                'department_code' => 'MRD',
                'code' => 'MRD-DMC',
                'name' => 'Death Certificate and Medical Certificate',
                'description' => 'Processing and release of Death Certificates, Medical Certificates, and clinical abstracts.',
                'prefix' => 'MED',
                'target_wait_time_minutes' => 25,
                'target_service_time_minutes' => 12,
                'is_active' => true,
            ],
            [
                'department_code' => 'MRD',
                'code' => 'MRD-BRT',
                'name' => 'Birth Certificate',
                'description' => 'Registration, processing, and release of official Hospital Birth Certificates.',
                'prefix' => 'BRT',
                'target_wait_time_minutes' => 25,
                'target_service_time_minutes' => 12,
                'is_active' => true,
            ],

            // Pharmacy Services
            [
                'department_code' => 'PHARM',
                'code' => 'PHARM-DISP',
                'name' => 'Pharmacy Prescription Dispensing',
                'description' => 'Fulfillment of inpatient and outpatient prescriptions and medication counseling.',
                'prefix' => 'RX',
                'target_wait_time_minutes' => 15,
                'target_service_time_minutes' => 8,
                'is_active' => true,
            ],

            // Medical Social Worker Services
            [
                'department_code' => 'MSWD',
                'code' => 'MSWD-ASST',
                'name' => 'Medical Social Work Assistance',
                'description' => 'Medical social classification, financial assessment, and indigent patient assistance programs.',
                'prefix' => 'MSW',
                'target_wait_time_minutes' => 25,
                'target_service_time_minutes' => 15,
                'is_active' => true,
            ],

            // Water Bacteriology Services
            [
                'department_code' => 'WBAC',
                'code' => 'WBAC-TEST',
                'name' => 'Water Bacteriological Testing & Analysis',
                'description' => 'Microbiological examination of drinking water, coliform/E. coli detection, and water potability analysis.',
                'prefix' => 'WBAC',
                'target_wait_time_minutes' => 20,
                'target_service_time_minutes' => 10,
                'is_active' => true,
            ],
            [
                'department_code' => 'WBAC',
                'code' => 'WBAC-RES',
                'name' => 'Water Sample Submission & Release of Results',
                'description' => 'Sample receiving, chain-of-custody documentation, and issuance of Water Test Certificate of Analysis.',
                'prefix' => 'WTR',
                'target_wait_time_minutes' => 15,
                'target_service_time_minutes' => 8,
                'is_active' => true,
            ],
        ];

        foreach ($services as $serviceData) {
            $department = Department::where('code', $serviceData['department_code'])->first();
            if ($department) {
                Service::updateOrCreate(
                    ['code' => $serviceData['code']],
                    [
                        'department_id' => $department->id,
                        'code' => $serviceData['code'],
                        'name' => $serviceData['name'],
                        'description' => $serviceData['description'],
                        'prefix' => $serviceData['prefix'],
                        'target_wait_time_minutes' => $serviceData['target_wait_time_minutes'] ?? null,
                        'target_service_time_minutes' => $serviceData['target_service_time_minutes'] ?? null,
                        'is_active' => $serviceData['is_active'],
                    ]
                );
            }
        }
    }
}
