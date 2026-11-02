import { createError, defineEventHandler, getRouterParam, readMultipartFormData, setResponseStatus } from 'h3'
import * as data from '../../../data'
import { employeePhotoAuth } from '../../../utils/employeePhotoAuth'
import { employeePhotos } from '../../../utils/employeePhotos'

const maxPhotoSize = 2 * 1024 * 1024
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

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

  const parts = await readMultipartFormData(event)
  const photo = parts?.find(part => part.name === 'photo' && part.filename)
  if (!photo || !photo.type || !allowedTypes.has(photo.type)) {
    throw createError({ statusCode: 422, statusMessage: 'Upload a JPEG, PNG, or WebP photo.' })
  }
  if (photo.data.byteLength > maxPhotoSize) {
    throw createError({ statusCode: 422, statusMessage: 'Photo must not exceed 2 MB.' })
  }

  employeePhotos.set(employeeId, {
    data: new Uint8Array(photo.data),
    contentType: photo.type,
  })
  employee.photoPath = `/api/files/employees/${employeeId}/photo`
  employee.updatedAt = new Date().toISOString()
  setResponseStatus(event, 200)
  return employee
})
