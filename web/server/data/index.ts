import type {
  Allowance,
  AttendanceCorrection,
  AttendanceLocation,
  AttendanceLog,
  Branch,
  Company,
  Contract,
  Deduction,
  Department,
  Employee,
  EmployeeAllowance,
  EmployeeBankAccount,
  EmployeeDeduction,
  EmployeeDependent,
  EmployeeDocument,
  EmployeeLoan,
  EmployeeSalary,
  EmergencyContact,
  ExchangeRate,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  Notification,
  OvertimeRecord,
  PayrollAdjustment,
  PayrollPeriod,
  PayrollRun,
  Payslip,
  PayslipItem,
  Permission,
  PermissionRole,
  Position,
  PushToken,
  RefreshToken,
  Role,
  RoleUser,
  SalaryStructure,
  Settings,
  SocialSecurityRule,
  TaxRule,
  User,
} from '~/types'

const seedDate = '2026-10-26'
const timestamp = `${seedDate}T00:00:00.000Z`
let nextId = 1000

function row<T extends Record<string, unknown>>(id: string, values: T): T & { id: string; createdAt: string; updatedAt: string } {
  return { id, createdAt: timestamp, updatedAt: timestamp, ...values }
}

function generated<T extends Record<string, unknown>>(values: T): T & { id: string; createdAt: string; updatedAt: string } {
  nextId += 1
  return row(String(nextId), values)
}

function join<T extends Record<string, unknown>>(values: T): T & { createdAt: string; updatedAt: string } {
  return { createdAt: timestamp, updatedAt: timestamp, ...values }
}

export const companies: Company[] = [
  row('1', { name: 'Phkar HR Co., Ltd.', taxId: 'K009-901234567', defaultCurrency: 'USD' }),
]

export const branches: Branch[] = [
  row('1', { companyId: '1', name: 'Phnom Penh HQ', address: 'Monivong Boulevard, Phnom Penh' }),
  row('2', { companyId: '1', name: 'Siem Reap', address: 'National Road 6, Siem Reap' }),
]

export const departments: Department[] = [
  row('1', { branchId: '1', parentId: null, name: 'Executive' }),
  row('2', { branchId: '1', parentId: null, name: 'Human Resources' }),
  row('3', { branchId: '1', parentId: null, name: 'Finance' }),
  row('4', { branchId: '1', parentId: null, name: 'Operations' }),
  row('5', { branchId: '2', parentId: '4', name: 'Siem Reap Operations' }),
]

export const positions: Position[] = [
  row('1', { departmentId: '1', title: 'Managing Director' }),
  row('2', { departmentId: '2', title: 'HR Manager' }),
  row('3', { departmentId: '2', title: 'HR Officer' }),
  row('4', { departmentId: '3', title: 'Finance Manager' }),
  row('5', { departmentId: '3', title: 'Accountant' }),
  row('6', { departmentId: '4', title: 'Operations Manager' }),
  row('7', { departmentId: '4', title: 'Operations Officer' }),
  row('8', { departmentId: '5', title: 'Branch Supervisor' }),
]

export const settings: Settings[] = [
  row('1', { companyId: '1', workWeek: '1,2,3,4,5', workStartTime: '08:00', graceMinutes: 10, defaultCurrency: 'USD' }),
]

const employeeNames: Array<[string, string, string, string]> = [
  ['Sokha', 'Chan', 'សុខា', 'ចាន់'],
  ['Dara', 'Sok', 'ដារ៉ា', 'សុខ'],
  ['Sophea', 'Lim', 'សុភា', 'លឹម'],
  ['Vanna', 'Chea', 'វណ្ណា', 'ជា'],
  ['Bopha', 'Khim', 'បុប្ផា', 'ឃឹម'],
  ['Rithy', 'Mao', 'រិទ្ធី', 'ម៉ៅ'],
  ['Sreyneang', 'Heng', 'ស្រីនាង', 'ហេង'],
  ['Piseth', 'Noun', 'ពិសិដ្ឋ', 'នួន'],
  ['Chenda', 'Phan', 'ចិន្តា', 'ផាន់'],
  ['Sothea', 'Kim', 'សុធា', 'គឹម'],
  ['Kosal', 'Yim', 'កុសល', 'យឹម'],
  ['Malis', 'Seng', 'ម៉ាលីស', 'សេង'],
  ['Bunthoeun', 'Ouk', 'ប៊ុនធឿន', 'អ៊ុក'],
  ['Sreymom', 'Touch', 'ស្រីមុំ', 'ទូច'],
  ['Vicheka', 'Mean', 'វិជ្ជា', 'មាន'],
  ['Ravy', 'Hout', 'រ៉ាវី', 'ហ៊ូត'],
  ['Sokunthea', 'Kong', 'សុគន្ធា', 'គង់'],
  ['Makara', 'Long', 'មករា', 'ឡុង'],
  ['Chanthy', 'Ros', 'ចាន់ធី', 'រ៉ូស'],
  ['Chhay', 'Sam', 'ឆាយ', 'សំ'],
  ['Sophal', 'Keo', 'សុផល', 'កែវ'],
  ['Sreypov', 'Nhem', 'ស្រីពៅ', 'ញឹម'],
  ['Ratha', 'Srun', 'រដ្ឋា', 'ស្រុន'],
  ['Kunthea', 'Ieng', 'គន្ធា', 'អៀង'],
  ['Borey', 'Chum', 'បូរី', 'ជុំ'],
]

export const employees: Employee[] = employeeNames.map(([firstName, lastName, firstNameKh, lastNameKh], index) => {
  const departmentId = index < 2 ? '2' : index < 7 ? '3' : index < 13 ? '4' : '5'
  const positionByDepartment: Record<string, string> = { '2': '3', '3': '5', '4': '7', '5': '8' }
  const managerId = index === 0 ? null : index < 3 ? '1001' : index < 8 ? '1002' : index < 15 ? '1003' : '1008'
  return generated({
    companyId: '1',
    branchId: index >= 15 ? '2' : '1',
    departmentId,
    positionId: index === 0 ? '1' : positionByDepartment[departmentId],
    managerId,
    employeeNo: `PH-${String(index + 1).padStart(4, '0')}`,
    firstName,
    lastName,
    firstNameKh,
    lastNameKh,
    gender: index % 3 === 1 ? 'female' : 'male',
    dob: `19${80 + (index % 15)}-${String((index % 12) + 1).padStart(2, '0')}-15`,
    phone: `+855 12 555 ${String(index + 1).padStart(3, '0')}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@phkarhr.local`,
    hireDate: `202${index % 6}-${String((index % 12) + 1).padStart(2, '0')}-01`,
    terminationDate: null,
    terminationReason: null,
    photoPath: index < 13 ? `/avatars/employee-${String(index + 1).padStart(2, '0')}.svg` : null,
    status: 'active',
  })
})

export const employeeDocuments: EmployeeDocument[] = employees.slice(0, 6).map((employee, index) =>
  generated({
    employeeId: employee.id,
    type: index % 2 ? 'Work permit' : 'National ID',
    filePath: `/documents/${employee.employeeNo.toLowerCase()}-${index + 1}.pdf`,
    expiryDate: `2026-11-${String(4 + index).padStart(2, '0')}`,
  }),
)

export const contracts: Contract[] = employees.slice(0, 8).map((employee, index) =>
  generated({
    employeeId: employee.id,
    type: index % 2 ? 'Fixed term' : 'Permanent',
    startDate: employee.hireDate,
    endDate: index % 2 ? `2026-11-${String(5 + index).padStart(2, '0')}` : null,
    status: 'active',
  }),
)

export const emergencyContacts: EmergencyContact[] = employees.slice(0, 8).map((employee, index) =>
  generated({ employeeId: employee.id, name: `Contact ${index + 1}`, relation: 'Family', phone: `+855 10 555 ${String(index + 1).padStart(3, '0')}` }),
)

export const users: User[] = [
  row('1', { employeeId: null, email: 'admin@phkarhr.local', password: 'admin123', isActive: true, lastLoginAt: null }),
  row('2', { employeeId: employees[1]!.id, email: 'hr@phkarhr.local', password: 'hr123', isActive: true, lastLoginAt: null }),
  row('3', { employeeId: employees[2]!.id, email: 'manager@phkarhr.local', password: 'manager123', isActive: true, lastLoginAt: null }),
  row('4', { employeeId: employees[3]!.id, email: 'employee@phkarhr.local', password: 'employee123', isActive: true, lastLoginAt: null }),
]

export const roles: Role[] = [
  row('1', { name: 'Admin' }),
  row('2', { name: 'HR' }),
  row('3', { name: 'Manager' }),
  row('4', { name: 'Employee' }),
]

const permissionNames = [
  'organization.manage', 'employees.view', 'employees.manage', 'access.manage',
  'leave.view', 'leave.manage', 'attendance.view', 'attendance.manage',
  'payroll.view', 'payroll.manage', 'reports.view', 'dashboard.view', 'employees.update',
]
export const permissions: Permission[] = permissionNames.map((name, index) => row(String(index + 1), { name }))
export const roleUsers: RoleUser[] = [
  join({ userId: '1', roleId: '1' }),
  join({ userId: '2', roleId: '2' }),
  join({ userId: '3', roleId: '3' }),
  join({ userId: '4', roleId: '4' }),
]
export const permissionRoles: PermissionRole[] = permissions.flatMap((permission) => {
  const name = permissionNames[Number(permission.id) - 1]
  const rolesForPermission: Record<string, string[]> = {
    'organization.manage': ['1', '2'],
    'employees.view': ['1', '2', '3', '4'],
    'employees.manage': ['1', '2'],
    'employees.update': ['1', '2'],
    'access.manage': ['1'],
    'leave.view': ['1', '2', '3', '4'],
    'leave.manage': ['1', '2', '3'],
    'attendance.view': ['1', '2', '3', '4'],
    'attendance.manage': ['1', '2', '3'],
    'payroll.view': ['1', '2', '4'],
    'payroll.manage': ['1', '2'],
    'reports.view': ['1', '2', '3'],
    'dashboard.view': ['1', '2', '3'],
  }
  return (rolesForPermission[name ?? ''] ?? []).map(roleId => join({ roleId, permissionId: permission.id }))
})
export const refreshTokens: RefreshToken[] = []

export const leaveTypes: LeaveType[] = [
  row('1', { name: 'Annual', daysPerYear: 18, isPaid: true, carryOver: true, requiresAttachment: false, maxDaysPerRequest: 15 }),
  row('2', { name: 'Sick', daysPerYear: 12, isPaid: true, carryOver: false, requiresAttachment: true, maxDaysPerRequest: 30 }),
  row('3', { name: 'Special', daysPerYear: 7, isPaid: true, carryOver: false, requiresAttachment: false, maxDaysPerRequest: 7 }),
  row('4', { name: 'Unpaid', daysPerYear: 0, isPaid: false, carryOver: false, requiresAttachment: false, maxDaysPerRequest: 60 }),
  row('5', { name: 'Maternity', daysPerYear: 90, isPaid: true, carryOver: false, requiresAttachment: true, maxDaysPerRequest: 90 }),
]
export const leaveBalances: LeaveBalance[] = employees.flatMap((employee, employeeIndex) =>
  leaveTypes.map((type, typeIndex) => generated({
    employeeId: employee.id,
    leaveTypeId: type.id,
    year: 2026,
    entitled: typeIndex === 0 ? 18 : typeIndex === 1 ? 12 : typeIndex === 2 ? 7 : typeIndex === 3 ? 0 : 90,
    used: employeeIndex < 7 && typeIndex === 0 ? 2 : 0,
  })),
)

export const leaveRequests: LeaveRequest[] = Array.from({ length: 15 }, (_, index) => generated({
  employeeId: employees[(index % 14) + 1]!.id,
  leaveTypeId: leaveTypes[index % leaveTypes.length]!.id,
  startDate: `2026-10-${String(2 + index).padStart(2, '0')}`,
  endDate: `2026-10-${String(2 + index).padStart(2, '0')}`,
  days: index % 3 === 0 ? 0.5 : 1,
  startHalf: index % 3 === 0 ? 'morning' : null,
  endHalf: index % 3 === 0 ? 'morning' : null,
  reason: ['Family appointment', 'Medical appointment', 'Personal leave'][index % 3],
  attachmentPath: index % 5 === 1 ? `/leave/attachment-${index + 1}.pdf` : null,
  status: index % 4 === 0 ? 'approved' : index % 4 === 1 ? 'pending' : index % 4 === 2 ? 'rejected' : 'cancelled',
  approvedBy: index % 4 === 0 || index % 4 === 2 ? '2' : null,
  approvedAt: index % 4 === 0 || index % 4 === 2 ? `${seedDate}T02:00:00.000Z` : null,
  cancelledAt: index % 4 === 3 ? `${seedDate}T02:00:00.000Z` : null,
}))

export const holidays: Holiday[] = [
  row('1', { companyId: '1', holidayDate: '2026-10-29', name: 'King Norodom Sihamoni Birthday' }),
  row('2', { companyId: '1', holidayDate: '2026-11-09', name: 'Independence Day' }),
  row('3', { companyId: '1', holidayDate: '2026-11-24', name: 'Water Festival' }),
]

export const attendanceLocations: AttendanceLocation[] = [
  row('1', { branchId: '1', name: 'Phnom Penh HQ', latitude: 11.5564, longitude: 104.9282, radiusM: 150 }),
  row('2', { branchId: '2', name: 'Siem Reap Office', latitude: 13.3633, longitude: 103.8564, radiusM: 120 }),
]

export const attendanceLogs: AttendanceLog[] = []
for (let daysAgo = 29; daysAgo >= 0; daysAgo -= 1) {
  const date = new Date(Date.UTC(2026, 9, 26 - daysAgo)).toISOString().slice(0, 10)
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
  if (weekday === 0 || weekday === 6) continue
  employees.forEach((employee, index) => {
    if ((index + daysAgo) % 17 === 0) return
    const late = (index + daysAgo) % 6 === 0
    attendanceLogs.push(generated({
      employeeId: employee.id,
      locationId: employee.branchId,
      workDate: date,
      checkIn: `${date}T${late ? '08:18' : '07:55'}:00.000Z`,
      checkOut: `${date}T16:30:00.000Z`,
      checkInLat: attendanceLocations[Number(employee.branchId) - 1]!.latitude + 0.0001,
      checkInLng: attendanceLocations[Number(employee.branchId) - 1]!.longitude + 0.0001,
      checkOutLat: null,
      checkOutLng: null,
      gpsAccuracyM: 8 + (index % 20),
      isMockLocation: (index + daysAgo) % 31 === 0,
      deviceId: `demo-device-${(index % 5) + 1}`,
      method: 'gps',
      reason: null,
      editedBy: null,
      status: 'present',
    }))
  })
}

export const attendanceCorrections: AttendanceCorrection[] = employees.slice(4, 7).map((employee, index) =>
  generated({
    employeeId: employee.id,
    attendanceLogId: attendanceLogs[index]!.id,
    workDate: attendanceLogs[index]!.workDate,
    requestedCheckIn: `${attendanceLogs[index]!.workDate}T08:00:00.000Z`,
    requestedCheckOut: null,
    reason: 'GPS signal was delayed at the entrance.',
    status: index === 0 ? 'pending' : index === 1 ? 'approved' : 'rejected',
    decidedBy: index === 0 ? null : '2',
    decidedAt: index === 0 ? null : timestamp,
  }),
)

export const overtimeRecords: OvertimeRecord[] = employees.slice(6, 10).map((employee, index) =>
  generated({
    employeeId: employee.id,
    workDate: `2026-10-${String(20 + index).padStart(2, '0')}`,
    hours: 2 + (index % 2),
    rateMultiplier: 1.5,
    status: index === 0 ? 'pending' : 'approved',
    approvedBy: index === 0 ? null : '2',
    payslipId: null,
  }),
)

export const pushTokens: PushToken[] = []
const notificationTemplates = [
  { title: 'Leave request update', body: 'Your leave request has been reviewed.' },
  { title: 'Attendance reminder', body: 'Remember to check in at your assigned location.' },
  { title: 'Payslip available', body: 'Your October payslip is ready.' },
  { title: 'HR announcement', body: 'Please review the latest team update.' },
]
export const notifications: Notification[] = users.flatMap(user =>
  notificationTemplates.map((template, index) => {
    const createdAt = new Date(Date.parse(timestamp) - index * 3_600_000).toISOString()
    return generated({
      userId: user.id,
      ...template,
      readAt: index >= 2 ? createdAt : null,
      createdAt,
      updatedAt: createdAt,
    })
  }),
)

export const salaryStructures: SalaryStructure[] = [
  row('1', { name: 'Monthly salary' }),
]
export const employeeSalaries: EmployeeSalary[] = employees.map((employee, index) =>
  generated({
    employeeId: employee.id,
    structureId: '1',
    baseSalary: 450 + index * 75,
    currency: 'USD',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
  }),
)
export const allowances: Allowance[] = [
  row('1', { name: 'Transport', calcType: 'fixed', defaultAmount: 35, isTaxable: false }),
  row('2', { name: 'Meal', calcType: 'fixed', defaultAmount: 25, isTaxable: false }),
]
export const employeeAllowances: EmployeeAllowance[] = employees.map((employee, index) =>
  generated({ employeeId: employee.id, allowanceId: index % 2 ? '1' : '2', amount: 25 + (index % 2) * 10, effectiveFrom: '2026-01-01', effectiveTo: null }),
)
export const deductions: Deduction[] = [
  row('1', { name: 'Uniform', calcType: 'fixed', rate: 5 }),
]
export const employeeDeductions: EmployeeDeduction[] = employees.slice(0, 8).map(employee =>
  generated({ employeeId: employee.id, deductionId: '1', amount: 5, effectiveFrom: '2026-01-01', effectiveTo: null }),
)
export const payrollPeriods: PayrollPeriod[] = [
  row('1', { companyId: '1', startDate: '2026-10-01', endDate: '2026-10-31', status: 'completed' }),
  row('2', { companyId: '1', startDate: '2026-11-01', endDate: '2026-11-30', status: 'draft' }),
]
export const payrollRuns: PayrollRun[] = [
  row('1', { periodId: '1', runBy: '2', runAt: timestamp, status: 'completed', approvedBy: '1', lockedAt: null }),
]
export const payslips: Payslip[] = employees.map((employee, index) => {
  const salary = employeeSalaries[index]!.baseSalary
  const gross = salary + 60
  const totalDeductions = 5 + Math.round(salary * 0.02 * 100) / 100
  return generated({
    payrollRunId: '1',
    employeeId: employee.id,
    gross,
    totalDeductions,
    net: gross - totalDeductions,
    currency: 'USD',
    workingDays: 22,
    absentDays: index % 11 === 0 ? 1 : 0,
    otHours: index % 4,
    status: 'paid',
    paidAt: timestamp,
    pdfPath: null,
  })
})
export const payslipItems: PayslipItem[] = payslips.flatMap((payslip, index) => [
  generated({ payslipId: payslip.id, type: 'earning', name: 'Base salary', amount: employeeSalaries[index]!.baseSalary }),
  generated({ payslipId: payslip.id, type: 'earning', name: 'Allowances', amount: 60 }),
  generated({ payslipId: payslip.id, type: 'deduction', name: 'Social security', amount: payslip.totalDeductions }),
])
export const taxRules: TaxRule[] = [
  row('1', { name: 'Tax free bracket', bracketMin: 0, bracketMax: 1500, rate: 0, effectiveFrom: '2026-01-01' }),
  row('2', { name: 'Lower bracket', bracketMin: 1500, bracketMax: 2000, rate: 0.05, effectiveFrom: '2026-01-01' }),
  row('3', { name: 'Middle bracket', bracketMin: 2000, bracketMax: 8500, rate: 0.1, effectiveFrom: '2026-01-01' }),
  row('4', { name: 'Upper bracket', bracketMin: 8500, bracketMax: null, rate: 0.2, effectiveFrom: '2026-01-01' }),
]
export const socialSecurityRules: SocialSecurityRule[] = [
  row('1', { name: 'NSSF demo', employeeRate: 0.02, employerRate: 0.02, salaryCap: 1200, effectiveFrom: '2026-01-01' }),
]
export const employeeBankAccounts: EmployeeBankAccount[] = employees.slice(0, 8).map((employee, index) =>
  generated({ employeeId: employee.id, bankName: 'ABA Bank', accountName: `${employee.firstName} ${employee.lastName}`, accountNoEncrypted: `demo-encrypted-account-${index + 1}`, isPrimary: true }),
)
export const employeeDependents: EmployeeDependent[] = employees.slice(0, 8).map((employee, index) =>
  generated({ employeeId: employee.id, name: `Dependent ${index + 1}`, relation: 'Child', dob: `201${index % 9}-06-01` }),
)
export const employeeLoans: EmployeeLoan[] = employees.slice(0, 4).map((employee, index) =>
  generated({ employeeId: employee.id, amount: 600, monthlyDeduction: 50, balance: 600 - index * 50, startDate: '2026-07-01', status: 'active' }),
)
export const payrollAdjustments: PayrollAdjustment[] = [
  generated({ periodId: '2', employeeId: employees[0]!.id, type: 'earning', name: 'Spot award', amount: 50, reason: 'Quarterly recognition' }),
]
export const exchangeRates: ExchangeRate[] = [
  row('1', { currency: 'KHR', rateToBase: 4100, effectiveDate: '2026-10-01' }),
  row('2', { currency: 'USD', rateToBase: 1, effectiveDate: '2026-10-01' }),
]
