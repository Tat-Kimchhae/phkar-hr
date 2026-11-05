import 'dotenv/config'
import bcrypt from 'bcrypt'
import { PrismaPg } from '@prisma/adapter-pg'
import { EmployeeStatus, Gender, PrismaClient } from '../generated/prisma/client.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL must be set to run the seed')

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })

const password = process.env.SEED_PASSWORD ?? 'Password123!'
const currentYear = new Date().getFullYear()
const roleNames = ['admin', 'hr', 'manager', 'employee'] as const

async function main() {
  const passwordHash = await bcrypt.hash(password, 12)

  const companyData = { name: 'Phkar HR Demo Company', taxId: 'PHKAR-HR-DEMO', defaultCurrency: 'USD' }
  const existingCompany = await prisma.company.findFirst({ where: { taxId: companyData.taxId } })
  const company = existingCompany ?? await prisma.company.create({ data: companyData })

  const branchData = [
    { name: 'Phnom Penh Office', address: 'Phnom Penh, Cambodia' },
    { name: 'Siem Reap Office', address: 'Siem Reap, Cambodia' },
  ]
  const branches = await Promise.all(branchData.map(async data => {
    const existing = await prisma.branch.findFirst({ where: { companyId: company.id, name: data.name } })
    return existing ?? prisma.branch.create({ data: { ...data, companyId: company.id } })
  }))
  const [phnomPenh, siemReap] = branches
  if (!phnomPenh || !siemReap) throw new Error('Failed to seed company branches')

  const departmentData = [
    { branchId: phnomPenh.id, name: 'Human Resources' },
    { branchId: phnomPenh.id, name: 'Operations' },
    { branchId: phnomPenh.id, name: 'Finance' },
    { branchId: siemReap.id, name: 'Administration' },
  ]
  const departments = await Promise.all(departmentData.map(async data => {
    const existing = await prisma.department.findFirst({ where: { branchId: data.branchId, name: data.name } })
    return existing ?? prisma.department.create({ data })
  }))
  const departmentByName = new Map(departments.map(department => [department.name, department]))
  const positionData = [
    { department: 'Human Resources', title: 'HR Manager' },
    { department: 'Human Resources', title: 'HR Officer' },
    { department: 'Operations', title: 'Operations Manager' },
    { department: 'Operations', title: 'Operations Associate' },
    { department: 'Administration', title: 'Office Administrator' },
  ]
  const positions = await Promise.all(positionData.map(async ({ department, title }) => {
    const parent = departmentByName.get(department)
    if (!parent) throw new Error(`Missing department: ${department}`)
    const existing = await prisma.position.findFirst({ where: { departmentId: parent.id, title } })
    return existing ?? prisma.position.create({ data: { departmentId: parent.id, title } })
  }))
  const positionByTitle = new Map(positions.map(position => [position.title, position]))

  const roleRecords = await Promise.all(roleNames.map(name => prisma.role.upsert({
    where: { name },
    update: {},
    create: { name },
  })))
  const roleByName = new Map(roleRecords.map(role => [role.name, role]))

  const employeeDefinitions = [
    {
      email: 'admin@phkarhr.local',
      role: 'admin',
      employeeNo: 'PH-0001',
      firstName: 'Dara',
      lastName: 'Sok',
      firstNameKh: 'ដារ៉ា',
      lastNameKh: 'សុខ',
      gender: Gender.MALE,
      department: 'Human Resources',
      position: 'HR Manager',
      branchId: phnomPenh.id,
      managerEmail: null,
    },
    {
      email: 'hr@phkarhr.local',
      role: 'hr',
      employeeNo: 'PH-0002',
      firstName: 'Sophea',
      lastName: 'Chan',
      firstNameKh: 'សុភា',
      lastNameKh: 'ចាន់',
      gender: Gender.FEMALE,
      department: 'Human Resources',
      position: 'HR Officer',
      branchId: phnomPenh.id,
      managerEmail: null,
    },
    {
      email: 'manager@phkarhr.local',
      role: 'manager',
      employeeNo: 'PH-0003',
      firstName: 'Vanna',
      lastName: 'Lim',
      firstNameKh: 'វណ្ណា',
      lastNameKh: 'លឹម',
      gender: Gender.MALE,
      department: 'Operations',
      position: 'Operations Manager',
      branchId: phnomPenh.id,
      managerEmail: null,
    },
    {
      email: 'employee@phkarhr.local',
      role: 'employee',
      employeeNo: 'PH-0004',
      firstName: 'Sreymom',
      lastName: 'Kim',
      firstNameKh: 'ស្រីមុំ',
      lastNameKh: 'គឹម',
      gender: Gender.FEMALE,
      department: 'Operations',
      position: 'Operations Associate',
      branchId: phnomPenh.id,
      managerEmail: 'manager@phkarhr.local',
    },
  ] as const

  const employeeByEmail = new Map<string, { id: bigint }>()
  for (const definition of employeeDefinitions) {
    const department = departmentByName.get(definition.department)
    const position = positionByTitle.get(definition.position)
    if (!department || !position) throw new Error(`Missing organization data for ${definition.email}`)
    const manager = definition.managerEmail ? employeeByEmail.get(definition.managerEmail) : undefined
    const employee = await prisma.employee.upsert({
      where: { employeeNo: definition.employeeNo },
      update: {
        companyId: company.id,
        branchId: definition.branchId,
        departmentId: department.id,
        positionId: position.id,
        managerId: manager?.id ?? null,
        firstName: definition.firstName,
        lastName: definition.lastName,
        firstNameKh: definition.firstNameKh,
        lastNameKh: definition.lastNameKh,
        gender: definition.gender,
        email: definition.email,
        status: EmployeeStatus.ACTIVE,
      },
      create: {
        companyId: company.id,
        branchId: definition.branchId,
        departmentId: department.id,
        positionId: position.id,
        managerId: manager?.id ?? null,
        employeeNo: definition.employeeNo,
        firstName: definition.firstName,
        lastName: definition.lastName,
        firstNameKh: definition.firstNameKh,
        lastNameKh: definition.lastNameKh,
        gender: definition.gender,
        email: definition.email,
        hireDate: new Date(`${currentYear}-01-01T00:00:00.000Z`),
        status: EmployeeStatus.ACTIVE,
      },
    })
    employeeByEmail.set(definition.email, employee)

    const user = await prisma.user.upsert({
      where: { email: definition.email },
      update: { employeeId: employee.id, password: passwordHash, isActive: true },
      create: { email: definition.email, employeeId: employee.id, password: passwordHash, isActive: true },
    })
    const role = roleByName.get(definition.role)
    if (!role) throw new Error(`Missing role: ${definition.role}`)
    await prisma.roleUser.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    })
  }

  const leaveTypeDefinitions = [
    { name: 'Annual', daysPerYear: '18', isPaid: true, carryOver: true, requiresAttachment: false, maxDaysPerRequest: '18' },
    { name: 'Sick', daysPerYear: '7', isPaid: true, carryOver: false, requiresAttachment: true, maxDaysPerRequest: '7' },
    { name: 'Unpaid', daysPerYear: '0', isPaid: false, carryOver: false, requiresAttachment: false, maxDaysPerRequest: '30' },
    { name: 'Maternity', daysPerYear: '90', isPaid: true, carryOver: false, requiresAttachment: true, maxDaysPerRequest: '90' },
    { name: 'Special', daysPerYear: '3', isPaid: true, carryOver: false, requiresAttachment: false, maxDaysPerRequest: '3' },
  ]
  const leaveTypes = await Promise.all(leaveTypeDefinitions.map(async data => {
    const existing = await prisma.leaveType.findFirst({ where: { companyId: company.id, name: data.name } })
    return existing ?? prisma.leaveType.create({ data: { companyId: company.id, ...data } })
  }))

  const employees = await prisma.employee.findMany({
    where: { employeeNo: { in: employeeDefinitions.map(employee => employee.employeeNo) } },
  })
  for (const employee of employees) {
    for (const leaveType of leaveTypes) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            year: currentYear,
          },
        },
        update: { entitled: leaveType.daysPerYear, used: 0 },
        create: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year: currentYear,
          entitled: leaveType.daysPerYear,
          used: 0,
        },
      })
    }
  }

  await prisma.setting.upsert({
    where: { companyId: company.id },
    update: {
      workWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      workStartTime: new Date('1970-01-01T08:00:00.000Z'),
      graceMinutes: 15,
      defaultCurrency: 'USD',
    },
    create: {
      companyId: company.id,
      workWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      workStartTime: new Date('1970-01-01T08:00:00.000Z'),
      graceMinutes: 15,
      defaultCurrency: 'USD',
    },
  })

  const attendanceLocation = await prisma.attendanceLocation.findFirst({
    where: { branchId: phnomPenh.id, name: 'Phnom Penh Office' },
  })
  const attendanceLocationData = {
    latitude: '11.5564',
    longitude: '104.9282',
    radiusM: 150,
  }
  if (!attendanceLocation) {
    await prisma.attendanceLocation.create({
      data: {
        branchId: phnomPenh.id,
        name: 'Phnom Penh Office',
        ...attendanceLocationData,
      },
    })
  }

  console.log(`Seed complete: 1 company, ${branches.length} branches, ${departments.length} departments, ${positions.length} positions, ${roleRecords.length} roles, ${employeeDefinitions.length} employees/users, ${leaveTypes.length} leave types, ${employees.length * leaveTypes.length} leave balances (${currentYear}), 1 setting, 1 attendance location.`)
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
