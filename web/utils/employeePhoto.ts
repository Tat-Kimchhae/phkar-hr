const allowedPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function employeePhotoValidationError(file: File): 'photoTypeError' | 'photoSizeError' | null {
  if (!allowedPhotoTypes.has(file.type)) return 'photoTypeError'
  if (file.size > 2 * 1024 * 1024) return 'photoSizeError'
  return null
}
