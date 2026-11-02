import { createError, defineEventHandler, getRouterParam, setResponseHeader } from 'h3'
import { employeePhotos } from '../../../../utils/employeePhotos'

export default defineEventHandler((event) => {
  const employeeId = getRouterParam(event, 'id')
  const photo = employeeId ? employeePhotos.get(employeeId) : undefined
  if (!photo) throw createError({ statusCode: 404, statusMessage: 'Employee photo not found.' })

  setResponseHeader(event, 'Content-Type', photo.contentType)
  setResponseHeader(event, 'Cache-Control', 'private, max-age=3600')
  return photo.data
})
