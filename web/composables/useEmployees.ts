import type {
  Contract,
  Employee,
  EmployeeBankAccount,
  EmployeeDependent,
  EmployeeDocument,
  EmergencyContact,
} from '~/types'
import { useRestApi } from './useRestApi'

export function useEmployees() {
  const employees = useRestApi<Employee>('employees')
  return {
    employees,
    photos: {
      upload: (employeeId: string, file: File) => employees.uploadFile<Employee>(employeeId, 'photo', file),
      remove: (employeeId: string) => employees.deleteAction<Employee>(employeeId, 'photo'),
    },
    documents: useRestApi<EmployeeDocument>('employee-documents'),
    contracts: useRestApi<Contract>('contracts'),
    emergencyContacts: useRestApi<EmergencyContact>('emergency-contacts'),
    bankAccounts: useRestApi<EmployeeBankAccount>('employee-bank-accounts'),
    dependents: useRestApi<EmployeeDependent>('employee-dependents'),
    salaries: useRestApi('employee-salaries'),
    allowances: useRestApi('employee-allowances'),
    deductions: useRestApi('employee-deductions'),
    loans: useRestApi('employee-loans'),
  }
}
