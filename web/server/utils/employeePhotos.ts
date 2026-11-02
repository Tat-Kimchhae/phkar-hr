export interface EmployeePhoto {
  data: Uint8Array
  contentType: string
}

export const employeePhotos = new Map<string, EmployeePhoto>()
