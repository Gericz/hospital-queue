# MedQueue — Hospital Queue & Patient Flow Management System

MedQueue is an enterprise-grade hospital queueing and patient flow orchestration platform designed for deployment on hospital local servers. It guarantees high availability, data integrity, secure role-based access control, and rapid automatic recovery after server power outages or reboots.

---

## 🏗️ Technology Stack

* **Backend Framework:** Laravel 12 (PHP 8.3+)
* **Frontend Architecture:** Inertia.js v2 (React 18 + TypeScript)
* **Styling & UI:** Tailwind CSS + Headless UI + Lucide Icons
* **Asset Bundling:** Vite
* **Database:** MariaDB / MySQL (or SQLite for local dev/testing)
* **Authentication & Authorization:** Laravel Sanctum + Role-based Policy Gates
* **Cache & Session Architecture:** Database / Redis-ready

---

## 🚀 Installation & Setup

### 1. Clone & Install Dependencies

```bash
# Install PHP dependencies
composer install

# Install Frontend dependencies
npm install
```

### 2. Environment Configuration

Copy the example environment file and generate the application encryption key:

```bash
cp .env.example .env
php artisan key:generate
```

Configure your `.env` for your hospital environment:

```ini
APP_NAME=MedQueue
APP_ENV=production
APP_DEBUG=false
APP_URL=http://localhost:8000

# Database Configuration (MySQL/MariaDB on local hospital server)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=medqueue_db
DB_USERNAME=medqueue_user
DB_PASSWORD=your_secure_password

# Session & Cache (Redis-ready)
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

# Redis Configuration (When Redis is activated)
REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

### 3. Database Migration & Seeding

Run migrations and seed default hospital departments, clinical services, counters, and initial role accounts:

```bash
php artisan migrate --seed
```

---

## 👥 Default Development & Staging Accounts

All development accounts are seeded with password: `password`

| Role | Email | Access Scope |
|---|---|---|
| **Super Administrator** | `admin@medqueue.local` | Full system access, master data, user & role configuration |
| **Hospital Administrator** | `hospital_admin@medqueue.local` | Department, clinical service, and counter management |
| **Queue Administrator** | `queue_admin@medqueue.local` | Queue flow configuration and station supervisor |
| **Queue Staff** | `opd_staff@medqueue.local` | Counter operator & ticket issuer |
| **Window Staff** | `window_staff@medqueue.local` | Service counter operator |
| **Display User** | `display@medqueue.local` | Public lobby TV monitor viewer |

---

## 🖥️ Development vs Production Workflow

### 🛠️ Development Mode

During development, start the Laravel backend and the Vite HMR server:

```bash
# Terminal 1: Laravel Web Server
php artisan serve

# Terminal 2: Vite Hot Module Replacement (HMR) Server
npm run dev
```

### 🚀 Production Deployment

> **IMPORTANT:**
> In production on the hospital local server, **DO NOT** run `npm run dev`.
> The production application operates purely on compiled, pre-bundled static assets served directly by the web server (Nginx/Apache/IIS) from the `public/build` directory.

Compile production assets with:

```bash
npm run build
```

This compiles TypeScript, bundles React components, optimizes CSS, and writes output files to:
* `public/build/manifest.json`
* `public/build/assets/`

---

## 🏥 Hospital Server Reliability & Auto-Recovery

To ensure MedQueue automatically resumes operational state following power outages or unexpected server reboots without human intervention:

1. **Database & Web Server Services:**
   * Configure `mariadb` / `mysqld` and `nginx` / `apache2` / `caddy` to start automatically on system boot:
     ```bash
     sudo systemctl enable mariadb
     sudo systemctl enable nginx
     sudo systemctl enable php8.3-fpm
     ```
2. **Process Monitoring (Supervisor / Systemd):**
   * Use Supervisor to monitor background queues and scheduled tasks:
     ```ini
     [program:medqueue-worker]
     process_name=%(program_name)s_%(process_num)02d
     command=php /var/www/medqueue/artisan queue:work --sleep=3 --tries=3 --max-time=3600
     autostart=true
     autorestart=true
     stopasgroup=true
     killasgroup=true
     user=www-data
     numprocs=2
     redirect_stderr=true
     stdout_logfile=/var/www/medqueue/storage/logs/worker.log
     ```
3. **Application Cache Optimization:**
   After deploying new updates or migrations on the local server:
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

---

## 🧪 Automated Testing

Execute the automated PHPUnit test suite:

```bash
php artisan test
```

Includes 122+ automated test suites with 500+ assertions covering:
* Step 1: Authentication, RBAC, Department, Service & Window Station management
* Step 2: Core Queue Engine, state transitions, atomic ticket sequencing, calling, recalling, skipping, holding, transferring
* Step 3: Laravel Reverb real-time WebSocket broadcasting, public TV display, staff terminal, audio announcements
* Step 4: Self-service patient kiosk, ticket issuing with QR code, validation, capacity limits
* Step 5: Operations Dashboard, Window opening/closing/staff assignment, queue control center, service availability & operating hours, automated skip rule (`php artisan queue:auto-skip`)
* Step 6: Analytics & Performance Dashboard (`/analytics`), Department/Service Drill-Downs, Wait & Service Time Percentiles, SLA Compliance, Hourly Traffic, CSV & Printable PDF Reports, Audit Logging (`report_audit_logs`), Sanctum REST Analytics API (`/api/v1/analytics/*`)

---

## 🧭 Hospital Operations & Queue Control Center (Step 5)

MedQueue includes an enterprise-grade hospital operations and queue control center accessible under `/operations`:

### Key Capabilities:
1. **Operations Dashboard (`/operations`)**: Real-time KPI board tracking waiting, called, serving, completed, skipped, hold, transferred, and cancelled tickets, active counters, duty staff, and facility availability.
2. **Window Station & Staff Allocation (`/operations/windows`)**: Open, close, pause, and resume window counters; assign and unassign staff members with transactional concurrency safety (preventing conflicting counter assignments).
3. **Centralized Queue Control (`/operations/queues`)**: Administrative search, priority promotion (Emergency / Senior / PWD / Regular), transfer across departments/services, and cancellation with audit logging.
4. **Service Availability & Operating Hours (`/operations/services`)**: Manage department statuses (`OPEN`, `CLOSED`, `PAUSED`) and service statuses (`AVAILABLE`, `PAUSED`, `CLOSED`, `MAINTENANCE`) with public notice reasons, capacity caps (`max_daily_queue`, `max_waiting_queue`, `max_priority_queue`), and 7-day operating hours.
5. **Automated Queue Skip Daemon (`php artisan queue:auto-skip`)**: Background console command that detects tickets exceeding maximum call wait timeout and transitions them to `SKIPPED` with WebSocket notification.

---

## 📊 Hospital Queue Reports, Analytics & Performance (Step 6)

MedQueue includes a dedicated historical reporting and operational analytics engine accessible under `/analytics`:

### Key Capabilities:
1. **Analytics Dashboard (`/analytics`)**: Server-side SQL-aggregated KPI overview including Total Tickets, Completion Rate, Skip Rate, Cancellation Rate, Average/Median/P90 Waiting Time, Average/Median/P90 Service Duration, Peak Operational Hours, and Busiest Counters/Services.
2. **Dynamic Filtering**: Date presets (`Today`, `Yesterday`, `This Week`, `Last Week`, `This Month`, `Last Month`, `Custom Range`), Department, Clinical Service, Window Counter, Priority Lane, and Queue Status.
3. **Interactive Visual Charts**:
   * **Queue Volume Over Time**: Grouped by day, week, or month.
   * **Hourly Patient Traffic**: 06:00 to 20:00 arrival distribution and peak hour identification.
   * **Outcome Status Breakdown**: Donut chart visualizing completed, skipped, cancelled, and transferred distribution.
   * **Waiting Time Distribution**: Categorized into $<5\text{ min}$, $5\text{--}15\text{ min}$, $15\text{--}30\text{ min}$, $30\text{--}60\text{ min}$, $60\text{--}120\text{ min}$, and $>120\text{ min}$.
   * **Priority Lane Breakdown**: Regular, Senior Citizen, PWD, Pregnant, and Emergency acuity performance.
4. **SLA & Target Wait Time Compliance**: Configurable service-level targets (`target_wait_time_minutes`, `target_service_time_minutes`) with automated compliance percentage tracking and indicators.
5. **Department & Service Drill-Downs**: Dedicated granular analytics pages (`/analytics/departments/{id}`, `/analytics/services/{id}`).
6. **Report Export & Audit Logging**:
   * **Streaming CSV Downloads**: Sanitized, UTF-8 formatted exports for Department, Service, Window, Priority, SLA, and Summary reports.
   * **Printable / PDF Reports (`/analytics/export?format=pdf`)**: Clean hospital-branded reports with executive summaries, metrics, and print stylesheets.
   * **Audit Trail**: Every export event is recorded in `report_audit_logs` (user ID, report type, format, filters, IP address, user agent, timestamp).
7. **REST Analytics API**: Sanctum-authenticated endpoints at `/api/v1/analytics/{summary, volume, hourly, waiting-time, departments, services, windows, priorities, transfers, sla, export}`.

