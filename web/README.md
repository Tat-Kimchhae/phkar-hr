# Phkar HR web

Nuxt 3 single-page application for the Phkar HR demo. The UI calls Nuxt server routes under `/api/`; those routes use in-memory arrays and do not require a separate backend.

## Run locally

Use Node.js 20 LTS and npm. From this directory:

```sh
npm install
npm run dev
```

Nuxt prints the local development URL when the server starts. Demo sign-in accounts are:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@phkarhr.local` | `admin123` |
| HR | `hr@phkarhr.local` | `hr123` |
| Manager | `manager@phkarhr.local` | `manager123` |
| Employee | `employee@phkarhr.local` | `employee123` |

Useful checks:

```sh
npm run typecheck
npm run build
```

The mock data is held in the Nuxt server process and resets when that process restarts. Data changes are shared by API requests handled by the same server process.

## Mock REST API

Pages and components use per-topic composables such as `useEmployees()` and `useAttendance()`. Those composables call REST-shaped endpoints with `useFetch`/`$fetch`; UI code does not access the in-memory arrays directly.

Collection endpoints return `{ items, total }` and accept `page`, `pageSize`, `search`, `sort`, `sortDirection`, and exact-match filter query parameters. For example:

```text
GET /api/employees?page=1&pageSize=10&search=Dara&sort=employeeNo&sortDirection=asc&status=active
GET /api/employees/:id
POST /api/employees
PATCH /api/employees/:id
DELETE /api/employees/:id
```

Server route handlers are under `server/api/`; seed arrays and mutation state live under `server/data/`. A production NestJS API can replace these routes by preserving endpoint paths, query names, request bodies, and response shapes. The mock routes are not an authentication or authorization boundary; a real API must validate input and enforce role and employee/team data scope on the server.

## Folder map

| Path | Responsibility |
| --- | --- |
| `pages/` | Nuxt routes for dashboard, organization, employees, access, leave, attendance, payroll, reports, and self-service |
| `components/` | Reusable layout and feature panels |
| `layouts/` | Application shell and navigation |
| `composables/` | Per-topic REST API composables and permission helpers |
| `stores/` | Pinia authentication state |
| `types/` | TypeScript interfaces corresponding to HR records |
| `server/api/` | REST-shaped mock API handlers |
| `server/data/` | In-memory arrays used and mutated by API handlers |
| `middleware/` | Authentication and route permission checks |
| `locales/` | English and Khmer translation resources |
| `utils/` | Attendance, payroll calculations, and report export helpers |

## ERD assumptions represented in the UI

- `departments.parentId` is a nullable self-reference for the department tree; departments may be root nodes.
- Employee history tables (for example salaries and allowances) use effective start/end dates rather than overwriting prior records.
- Employee allowance and deduction amounts are interpreted using their definition's calculation type (fixed amount or percentage). Percentage allowances use base salary.
- Tax rules represent progressive brackets with `incomeFrom`, optional `incomeTo`, `fixedAmount`, and `rate`. The demo tax is the fixed amount plus the rate applied to income above that bracket's lower bound. These tax and social security values are illustrative, not production payroll advice.
- A payroll run belongs to one payroll period; its payslips belong to employees and its line items belong to payslips. Completed runs can be locked and then treated as read-only.
- Approved overtime is calculated using the demo 1.5× hourly base rate, with eight working hours per workday assumed. Employee loan balances appear in the loan overview but are not automatically deducted from pay.
- Attendance is GPS-only and does not model shifts. Corrections refer to an existing attendance log and require a reason; the demo check-in flow explicitly marks simulated locations.
- Leave requests retain date range and day count separately; a half-day is one date, 0.5 days, and a morning/afternoon value.
- Expiry alerts use document `expiresAt` and contract `endDate`, include today through 30 days ahead, and exclude dates already past.

## Report exports

Reports are generated in the browser from API data. CSV output is UTF-8 with a BOM. The Excel option downloads an HTML table with an `.xls` extension, avoiding an additional spreadsheet dependency. Text cells are escaped and spreadsheet formula prefixes are neutralized before download.
