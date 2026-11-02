import { createError, defineEventHandler, getRouterParam } from 'h3'
import * as data from '../../../data'
import { employeePhotoAuth } from '../../../utils/employeePhotoAuth'
import { employeePhotos } from '../../../utils/employeePhotos'

export default defineEventHandler(async (event) => {
  const employeeId = getRouterParam(event, 'id')
  if (!employeeId) throw createError({ statusCode: 400, statusMessage: 'Employee ID is required.' })

  const auth = await employeePhotoAuth(event)
  if (!auth) throw createError({ statusCode: 401, statusMessage: 'A valid authentication token is required.' })
  if (!auth.permissions.includes('employees.update') && auth.employeeId !== employeeId) {
    throw createError({ statusCode: 403, statusMessage: 'Missing permission: employees.update.' })
  }

  const employee = data.employees.find(item => item.id === employeeId)
  if (!employee) throw createError({ statusCode: 404, statusMessage: 'Employee not found.' })

  employeePhotos.delete(employeeId)
  employee.photoPath = null
  employee.updatedAt = new Date().toISOString()
  return employee
})
