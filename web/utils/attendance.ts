import dayjs from 'dayjs'
import type { Holiday, Settings } from '~/types'

export type AttendanceDayStatus = 'on_time' | 'late' | 'absent' | 'on_leave'

export function isWorkDay(date: string, settings: Settings, holiday?: Holiday): boolean {
  if (holiday) return false
  const dayOfWeek = dayjs(date).day()
  const workDays = settings.workWeek.split(',').map(day => Number(day.trim()))
  return workDays.includes(dayOfWeek)
}

export function isLate(checkInAt: string, settings: Settings): boolean {
  const start = dayjs(checkInAt).startOf('day')
    .hour(Number(settings.workStartTime.slice(0, 2)))
    .minute(Number(settings.workStartTime.slice(3, 5)))
    .second(0)
    .millisecond(0)
    .add(settings.graceMinutes, 'minute')
  return dayjs(checkInAt).isAfter(start)
}

export function distanceInMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earthRadiusMeters = 6_371_000
  const radians = (degrees: number) => degrees * Math.PI / 180
  const latitudeDelta = radians(to.latitude - from.latitude)
  const longitudeDelta = radians(to.longitude - from.longitude)
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.latitude))
    * Math.cos(radians(to.latitude))
    * Math.sin(longitudeDelta / 2) ** 2
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}
