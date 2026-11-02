# HR System ERD (source of truth for types and mock data)

Target: PostgreSQL. GPS-only attendance. Every table also has created_at, updated_at (and deleted_at where useful). Money = decimal(15,2).

## 1. Auth, Organization, Employees

```mermaid
erDiagram
    companies ||--o{ branches : has
    branches ||--o{ departments : has
    departments ||--o{ positions : has
    companies ||--o{ employees : employs
    branches ||--o{ employees : "works at"
    departments ||--o{ employees : "belongs to"
    positions ||--o{ employees : holds
    employees ||--o{ employees : "manager of"
    employees ||--o| users : "login account"
    users ||--o{ role_user : has
    users ||--o{ refresh_tokens : has
    companies ||--o| settings : configures
    roles ||--o{ role_user : assigned
    roles ||--o{ permission_role : has
    permissions ||--o{ permission_role : granted
    employees ||--o{ employee_documents : has
    employees ||--o{ contracts : has
    employees ||--o{ emergency_contacts : has

    companies {
        bigint id PK
        string name
        string tax_id
        string default_currency
    }
    branches {
        bigint id PK
        bigint company_id FK
        string name
        string address
    }
    departments {
        bigint id PK
        bigint branch_id FK
        bigint parent_id FK
        string name
    }
    positions {
        bigint id PK
        bigint department_id FK
        string title
    }
    employees {
        bigint id PK
        bigint company_id FK
        bigint branch_id FK
        bigint department_id FK
        bigint position_id FK
        bigint manager_id FK
        string employee_no
        string first_name
        string last_name
        string first_name_kh
        string last_name_kh
        string gender
        date dob
        string phone
        string email
        date hire_date
        date termination_date
        string termination_reason
        string photo_path
        string status
    }
    users {
        bigint id PK
        bigint employee_id FK
        string email
        string password
        boolean is_active
        datetime last_login_at
    }
    roles {
        bigint id PK
        string name
    }
    permissions {
        bigint id PK
        string name
    }
    role_user {
        bigint user_id FK
        bigint role_id FK
    }
    permission_role {
        bigint role_id FK
        bigint permission_id FK
    }
    employee_documents {
        bigint id PK
        bigint employee_id FK
        string type
        string file_path
        date expiry_date
    }
    contracts {
        bigint id PK
        bigint employee_id FK
        string type
        date start_date
        date end_date
        string status
    }
    emergency_contacts {
        bigint id PK
        bigint employee_id FK
        string name
        string relation
        string phone
    }
    refresh_tokens {
        bigint id PK
        bigint user_id FK
        string token_hash
        datetime expires_at
        datetime revoked_at
    }
    settings {
        bigint id PK
        bigint company_id FK
        string work_week
        time work_start_time
        int grace_minutes
        string default_currency
    }
```

## 2. Leave, Attendance, Mobile

```mermaid
erDiagram
    employees ||--o{ leave_balances : has
    leave_types ||--o{ leave_balances : for
    employees ||--o{ leave_requests : submits
    leave_types ||--o{ leave_requests : of
    employees ||--o{ attendance_logs : records
    attendance_logs ||--o{ attendance_corrections : "fix requests"
    employees ||--o{ attendance_corrections : requests
    branches ||--o{ attendance_locations : "geofence"
    attendance_locations ||--o{ attendance_logs : "checked in at"
    employees ||--o{ overtime_records : logs
    companies ||--o{ holidays : defines
    users ||--o{ push_tokens : registers
    users ||--o{ leave_requests : "approves"
    users ||--o{ overtime_records : "approves"
    users ||--o{ notifications : receives

    leave_types {
        bigint id PK
        string name
        decimal days_per_year
        boolean is_paid
        boolean carry_over
        boolean requires_attachment
        decimal max_days_per_request
    }
    leave_balances {
        bigint id PK
        bigint employee_id FK
        bigint leave_type_id FK
        int year
        decimal entitled
        decimal used
    }
    leave_requests {
        bigint id PK
        bigint employee_id FK
        bigint leave_type_id FK
        date start_date
        date end_date
        decimal days
        string start_half
        string end_half
        string reason
        string attachment_path
        string status
        bigint approved_by FK
        datetime approved_at
        datetime cancelled_at
    }
    holidays {
        bigint id PK
        bigint company_id FK
        date holiday_date
        string name
    }
    attendance_locations {
        bigint id PK
        bigint branch_id FK
        string name
        decimal latitude
        decimal longitude
        int radius_m
    }
    attendance_logs {
        bigint id PK
        bigint employee_id FK
        bigint location_id FK
        date work_date
        datetime check_in
        datetime check_out
        decimal check_in_lat
        decimal check_in_lng
        decimal check_out_lat
        decimal check_out_lng
        decimal gps_accuracy_m
        boolean is_mock_location
        string device_id
        string method
        string reason
        bigint edited_by FK
        string status
    }
    attendance_corrections {
        bigint id PK
        bigint employee_id FK
        bigint attendance_log_id FK
        date work_date
        datetime requested_check_in
        datetime requested_check_out
        string reason
        string status
        bigint decided_by FK
        datetime decided_at
    }
    overtime_records {
        bigint id PK
        bigint employee_id FK
        date work_date
        decimal hours
        decimal rate_multiplier
        string status
        bigint approved_by FK
        bigint payslip_id FK
    }
    push_tokens {
        bigint id PK
        bigint user_id FK
        string token
        string platform
    }
    notifications {
        bigint id PK
        bigint user_id FK
        string title
        string body
        datetime read_at
    }
```

## 3. Payroll

```mermaid
erDiagram
    employees ||--o{ employee_salaries : has
    salary_structures ||--o{ employee_salaries : defines
    employees ||--o{ employee_allowances : gets
    allowances ||--o{ employee_allowances : applied
    employees ||--o{ employee_deductions : has
    deductions ||--o{ employee_deductions : applied
    companies ||--o{ payroll_periods : runs
    payroll_periods ||--o{ payroll_runs : has
    payroll_runs ||--o{ payslips : generates
    employees ||--o{ payslips : receives
    payslips ||--o{ payslip_items : contains
    employees ||--o{ employee_bank_accounts : has
    employees ||--o{ employee_dependents : has
    employees ||--o{ employee_loans : borrows
    payroll_periods ||--o{ payroll_adjustments : has
    employees ||--o{ payroll_adjustments : gets
    payslips ||--o{ overtime_records : pays

    salary_structures {
        bigint id PK
        string name
    }
    employee_salaries {
        bigint id PK
        bigint employee_id FK
        bigint structure_id FK
        decimal base_salary
        string currency
        date effective_from
        date effective_to
    }
    allowances {
        bigint id PK
        string name
        string calc_type
        decimal default_amount
        boolean is_taxable
    }
    employee_allowances {
        bigint id PK
        bigint employee_id FK
        bigint allowance_id FK
        decimal amount
        date effective_from
        date effective_to
    }
    deductions {
        bigint id PK
        string name
        string calc_type
        decimal rate
    }
    employee_deductions {
        bigint id PK
        bigint employee_id FK
        bigint deduction_id FK
        decimal amount
        date effective_from
        date effective_to
    }
    payroll_periods {
        bigint id PK
        bigint company_id FK
        date start_date
        date end_date
        string status
    }
    payroll_runs {
        bigint id PK
        bigint period_id FK
        bigint run_by FK
        datetime run_at
        string status
        bigint approved_by FK
        datetime locked_at
    }
    payslips {
        bigint id PK
        bigint payroll_run_id FK
        bigint employee_id FK
        decimal gross
        decimal total_deductions
        decimal net
        string currency
        int working_days
        int absent_days
        decimal ot_hours
        string status
        datetime paid_at
        string pdf_path
    }
    payslip_items {
        bigint id PK
        bigint payslip_id FK
        string type
        string name
        decimal amount
    }
    tax_rules {
        bigint id PK
        string name
        decimal bracket_min
        decimal bracket_max
        decimal rate
        date effective_from
    }
    social_security_rules {
        bigint id PK
        string name
        decimal employee_rate
        decimal employer_rate
        decimal salary_cap
        date effective_from
    }
    employee_bank_accounts {
        bigint id PK
        bigint employee_id FK
        string bank_name
        string account_name
        string account_no_encrypted
        boolean is_primary
    }
    employee_dependents {
        bigint id PK
        bigint employee_id FK
        string name
        string relation
        date dob
    }
    employee_loans {
        bigint id PK
        bigint employee_id FK
        decimal amount
        decimal monthly_deduction
        decimal balance
        date start_date
        string status
    }
    payroll_adjustments {
        bigint id PK
        bigint period_id FK
        bigint employee_id FK
        string type
        string name
        decimal amount
        string reason
    }
    exchange_rates {
        bigint id PK
        string currency
        decimal rate_to_base
        date effective_date
    }
```

## Design notes

- users.employee_id is nullable so pure admin accounts need no employee record.
- employees.manager_id (self-reference) drives manager approval and team scoping.
- Payslips are snapshots: payslip_items copy amounts at run time, so later salary changes never alter past payslips.
- leave_balances is one row per employee, leave type, and year.
- tax_rules and employee_salaries carry effective_from dates so rates have history.
- Attendance is one row per employee per day: add a unique constraint on (employee_id, work_date).
- Late / absent come from settings (work_start_time + grace_minutes), not shifts. Absent = working day with no check-in and no approved leave.
- device_id on attendance_logs is information only; check-ins are never blocked by device.
- approved_by, run_by, decided_by, edited_by all reference users.
- Removed for now: shifts, audit_logs, attendance_devices, attendance_punches, employee_devices.
- PostgreSQL: use timestamptz (UTC) and compute work_date in Asia/Phnom_Penh; numeric(15,2) for money; CHECK constraints or enums for statuses.
- Indexes: attendance_logs(employee_id, work_date), leave_requests(employee_id, status), payslips(employee_id, payroll_run_id).
- Encrypt employee_bank_accounts.account_no_encrypted and restrict who can read it. Confirm tax and NSSF rules with an accountant before coding them.
