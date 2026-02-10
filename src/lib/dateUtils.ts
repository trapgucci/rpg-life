/**
 * Утилиты для работы с датами и временем
 * Используется для recurring задач (daily, weekly, monthly, yearly)
 */

/**
 * Проверяет, принадлежат ли две даты к одному календарному дню
 */
export function isSameDay(date1: number, date2: number): boolean {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

/**
 * Возвращает timestamp начала дня (00:00:00.000) для указанной даты
 */
export function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * Возвращает timestamp начала недели (понедельник 00:00:00.000)
 * @param timestamp - timestamp для которого нужно получить начало недели
 */
export function getStartOfWeek(timestamp: number): number {
  const date = new Date(timestamp)
  const day = date.getDay()
  // Получаем разницу до понедельника (0 = воскресенье, 1 = понедельник, ..., 6 = суббота)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * Возвращает timestamp начала месяца (1 число 00:00:00.000)
 */
export function getStartOfMonth(timestamp: number): number {
  const date = new Date(timestamp)
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * Возвращает timestamp начала года (1 января 00:00:00.000)
 */
export function getStartOfYear(timestamp: number): number {
  const date = new Date(timestamp)
  date.setMonth(0, 1)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}
