import type { TaskRpg } from '../types/domain'
import { getStartOfDay, getStartOfWeek, getStartOfMonth, getStartOfYear } from './dateUtils'

const DAY_MS = 24 * 60 * 60 * 1000

/** Рассчитать начало текущего цикла */
export function getCurrentCycleStart(task: TaskRpg): number {
  if (task.currentCycleStart != null) return task.currentCycleStart

  const now = Date.now()
  switch (task.recurrence) {
    case 'daily':
      return getStartOfDay(now)
    case 'weekly': {
      const weeklyDays = task.recurrenceSettings?.weeklyDays
      if (weeklyDays && weeklyDays.length > 0) {
        // Вариант В: Найти текущий или последний прошедший день из weeklyDays
        const today = new Date(now).getDay()
        const sortedDays = [...weeklyDays].sort((a, b) => a - b)

        // Если сегодня в списке и задача была выполнена сегодня - вернуть начало сегодня
        if (weeklyDays.includes(today) && task.lastCompletedAt && task.lastCompletedAt >= getStartOfDay(now)) {
          return getStartOfDay(now)
        }

        // Если сегодня в списке и задача НЕ выполнена - это текущий цикл
        if (weeklyDays.includes(today)) {
          return getStartOfDay(now)
        }

        // Найти последний прошедший день из списка (не сегодня, а раньше)
        for (let i = 1; i < 7; i++) {
          const day = (today - i + 7) % 7
          if (weeklyDays.includes(day)) {
            const d = new Date(now)
            d.setDate(d.getDate() - i)
            return getStartOfDay(d.getTime())
          }
        }

        // Если ничего не найдено - взять последний день из списка на прошлой неделе
        const lastDay = sortedDays[sortedDays.length - 1]
        const d = new Date(now)
        const daysBack = (today - lastDay + 7) % 7
        d.setDate(d.getDate() - daysBack - 7) // на прошлой неделе
        return getStartOfDay(d.getTime())
      }
      return getStartOfWeek(now)
    }
    case 'monthly':
      return getStartOfMonth(now)
    case 'yearly':
      return getStartOfYear(now)
    case 'custom': {
      const interval = task.recurrenceSettings?.customIntervalDays ?? task.recurrenceIntervalDays ?? 1
      const base = task.lastCompletedAt ?? task.createdAt
      const daysSince = Math.floor((now - base) / DAY_MS)
      const cyclesPassed = Math.floor(daysSince / interval)
      return getStartOfDay(base + cyclesPassed * interval * DAY_MS)
    }
    case 'instant':
      return task.lastCompletedAt ?? task.createdAt
    default:
      return task.createdAt
  }
}

/** Рассчитать конец текущего цикла */
export function getCycleEndDate(task: TaskRpg): number | null {
  const now = Date.now()
  switch (task.recurrence) {
    case 'once':
      return task.deadlineAt ?? null
    case 'daily': {
      const start = getStartOfDay(now)
      return start + DAY_MS - 1
    }
    case 'weekly': {
      const weeklyDays = task.recurrenceSettings?.weeklyDays
      if (weeklyDays && weeklyDays.length > 0) {
        // Вариант В: Конец цикла = конец текущего дня из weeklyDays
        const cycleStart = getCurrentCycleStart(task)
        return cycleStart + DAY_MS - 1
      }
      // Конец недели (воскресенье 23:59:59)
      const weekStart = getStartOfWeek(now)
      return weekStart + 7 * DAY_MS - 1
    }
    case 'monthly': {
      const d = new Date(now)
      d.setMonth(d.getMonth() + 1, 1)
      d.setHours(0, 0, 0, 0)
      return d.getTime() - 1
    }
    case 'yearly': {
      const d = new Date(now)
      d.setFullYear(d.getFullYear() + 1, 0, 1)
      d.setHours(0, 0, 0, 0)
      return d.getTime() - 1
    }
    case 'custom': {
      const interval = task.recurrenceSettings?.customIntervalDays ?? task.recurrenceIntervalDays ?? 1
      const cycleStart = getCurrentCycleStart(task)
      return cycleStart + interval * DAY_MS - 1
    }
    case 'instant':
      return null
    default:
      return null
  }
}

/** Рассчитать дату следующего цикла */
export function getNextCycleDate(task: TaskRpg): number | null {
  if (task.recurrence === 'once') return null
  if (task.recurrence === 'instant') return null

  const now = Date.now()

  // Если лимит по количеству достигнут
  const rs = task.recurrenceSettings
  if (rs?.endMode === 'byCount' && rs.endCount && (rs.completedCount ?? 0) >= rs.endCount) {
    return null
  }
  // Если лимит по дате достигнут
  if (rs?.endMode === 'byDate' && rs.endDate && now >= rs.endDate) {
    return null
  }

  switch (task.recurrence) {
    case 'daily': {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      return tomorrow.getTime()
    }
    case 'weekly': {
      const weeklyDays = rs?.weeklyDays
      if (weeklyDays && weeklyDays.length > 0) {
        // Вариант В: Следующий день из weeklyDays после текущего дня цикла
        const cycleStart = getCurrentCycleStart(task)
        const currentDayOfWeek = new Date(cycleStart).getDay()
        const sortedDays = [...weeklyDays].sort((a, b) => a - b)

        // Найти следующий день в этой же неделе
        const nextDayThisWeek = sortedDays.find(day => day > currentDayOfWeek)
        if (nextDayThisWeek != null) {
          const daysUntil = nextDayThisWeek - currentDayOfWeek
          return getStartOfDay(cycleStart + daysUntil * DAY_MS)
        }

        // Иначе - первый день из списка на следующей неделе
        const firstDay = sortedDays[0]
        const daysUntil = (7 - currentDayOfWeek + firstDay) % 7 || 7
        return getStartOfDay(cycleStart + daysUntil * DAY_MS)
      }
      // Следующий понедельник
      const weekStart = getStartOfWeek(now)
      return weekStart + 7 * DAY_MS
    }
    case 'monthly': {
      const d = new Date(now)
      const dayOfMonth = d.getDate()
      d.setMonth(d.getMonth() + 1)
      // Клемпим до последнего дня месяца
      const daysInNextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      d.setDate(Math.min(dayOfMonth, daysInNextMonth))
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }
    case 'yearly': {
      const d = new Date(now)
      d.setFullYear(d.getFullYear() + 1)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }
    case 'custom': {
      const interval = rs?.customIntervalDays ?? task.recurrenceIntervalDays ?? 1
      const cycleEnd = getCycleEndDate(task)
      if (cycleEnd) return cycleEnd + 1
      return getStartOfDay(now) + interval * DAY_MS
    }
    default:
      return null
  }
}

/** Следующая доступная дата для выполнения задачи.
 *  Если задача НЕ выполнена в текущем цикле → сегодня.
 *  Если выполнена → дата следующего цикла.
 */
export function getNextAvailableDate(task: TaskRpg): number | null {
  if (task.recurrence === 'once') return null
  if (task.recurrence === 'instant') return null

  const rs = task.recurrenceSettings
  // Лимит по количеству достигнут
  if (rs?.endMode === 'byCount' && rs.endCount && (rs.completedCount ?? 0) >= rs.endCount) {
    return null
  }
  // Лимит по дате достигнут
  if (rs?.endMode === 'byDate' && rs.endDate && Date.now() >= rs.endDate) {
    return null
  }

  // Задача не выполнена в текущем цикле → доступна сегодня
  if (!task.isCompleted) {
    return getStartOfDay(Date.now())
  }

  // Задача уже выполнена → следующий цикл
  return getNextCycleDate(task)
}

/** Процент выполнения */
export function getCompletionRate(task: TaskRpg): number {
  const history = task.completionHistory ?? []
  if (history.length === 0) {
    const completed = task.recurrenceSettings?.completedCount ?? 0
    return completed > 0 ? 100 : 0
  }
  const completed = history.filter(r => r.status === 'completed').length
  return Math.round((completed / history.length) * 100)
}

/** Форматирование даты на русском */
export function formatCycleDateRu(ts: number): string {
  return new Date(ts).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Форматирование только даты (без времени) */
export function formatDateShortRu(ts: number): string {
  return new Date(ts).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Относительное время до даты */
export function getRelativeTimeRu(ts: number): string {
  const now = Date.now()
  const todayStart = getStartOfDay(now)
  const targetStart = getStartOfDay(ts)

  // Сравниваем по календарным дням
  const daysDiff = Math.round((targetStart - todayStart) / DAY_MS)

  if (daysDiff < 0) return 'Уже наступил'
  if (daysDiff === 0) return 'Сегодня'
  if (daysDiff === 1) return 'Завтра'
  if (daysDiff < 7) return `Через ${daysDiff} ${pluralDays(daysDiff)}`
  if (daysDiff < 30) {
    const weeks = Math.floor(daysDiff / 7)
    return `Через ${weeks} ${pluralWeeks(weeks)}`
  }
  const months = Math.floor(daysDiff / 30)
  return `Через ${months} ${pluralMonths(months)}`
}

function pluralDays(n: number): string {
  const abs = Math.abs(n) % 100
  const n1 = abs % 10
  if (abs > 10 && abs < 20) return 'дней'
  if (n1 > 1 && n1 < 5) return 'дня'
  if (n1 === 1) return 'день'
  return 'дней'
}

function pluralWeeks(n: number): string {
  const abs = Math.abs(n) % 100
  const n1 = abs % 10
  if (abs > 10 && abs < 20) return 'недель'
  if (n1 > 1 && n1 < 5) return 'недели'
  if (n1 === 1) return 'неделю'
  return 'недель'
}

function pluralMonths(n: number): string {
  const abs = Math.abs(n) % 100
  const n1 = abs % 10
  if (abs > 10 && abs < 20) return 'месяцев'
  if (n1 > 1 && n1 < 5) return 'месяца'
  if (n1 === 1) return 'месяц'
  return 'месяцев'
}
