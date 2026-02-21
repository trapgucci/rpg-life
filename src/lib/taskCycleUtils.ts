import type { TaskRpg, SubtaskItem, TaskDifficulty, AppSettings } from '../types/domain'
import { TASK_XP_BY_DIFFICULTY } from '../types/domain'
import { getStartOfDay, getStartOfWeek, getStartOfMonth, getStartOfYear } from './dateUtils'

const DAY_MS = 24 * 60 * 60 * 1000

/** Рассчитать начало текущего цикла */
export function getCurrentCycleStart(task: TaskRpg, nowMs: number = Date.now()): number {
  if (task.currentCycleStart != null) return task.currentCycleStart

  switch (task.recurrence) {
    case 'daily':
      return getStartOfDay(nowMs)
    case 'weekly': {
      const rs = task.recurrenceSettings
      // Режим «N раз в неделю» — цикл = вся неделя (Пн–Вс)
      if (rs?.weeklyMode === 'timesPerWeek') {
        return rs.weeklyWeekStart ?? getStartOfWeek(nowMs)
      }

      const weeklyDays = rs?.weeklyDays
      if (weeklyDays && weeklyDays.length > 0) {
        // Вариант В: Найти текущий или последний прошедший день из weeklyDays
        const today = new Date(nowMs).getDay()
        const sortedDays = [...weeklyDays].sort((a, b) => a - b)

        // Если сегодня в списке и задача была выполнена сегодня - вернуть начало сегодня
        if (weeklyDays.includes(today) && task.lastCompletedAt && task.lastCompletedAt >= getStartOfDay(nowMs)) {
          return getStartOfDay(nowMs)
        }

        // Если сегодня в списке и задача НЕ выполнена - это текущий цикл
        if (weeklyDays.includes(today)) {
          return getStartOfDay(nowMs)
        }

        // Найти последний прошедший день из списка (не сегодня, а раньше)
        for (let i = 1; i < 7; i++) {
          const day = (today - i + 7) % 7
          if (weeklyDays.includes(day)) {
            const d = new Date(nowMs)
            d.setDate(d.getDate() - i)
            return getStartOfDay(d.getTime())
          }
        }

        // Если ничего не найдено - взять последний день из списка на прошлой неделе
        const lastDay = sortedDays[sortedDays.length - 1]
        const d = new Date(nowMs)
        const daysBack = (today - lastDay + 7) % 7
        d.setDate(d.getDate() - daysBack - 7) // на прошлой неделе
        return getStartOfDay(d.getTime())
      }
      return getStartOfWeek(nowMs)
    }
    case 'monthly':
      return getStartOfMonth(nowMs)
    case 'yearly':
      return getStartOfYear(nowMs)
    case 'custom': {
      const interval = task.recurrenceSettings?.customIntervalDays ?? task.recurrenceIntervalDays ?? 1
      const base = task.lastCompletedAt ?? task.createdAt
      const daysSince = Math.floor((nowMs - base) / DAY_MS)
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
export function getCycleEndDate(task: TaskRpg, nowMs: number = Date.now()): number | null {
  switch (task.recurrence) {
    case 'once':
      return task.recurrenceSettings?.endMode === 'byDate' && task.recurrenceSettings.endDate
        ? task.recurrenceSettings.endDate
        : null
    case 'daily': {
      const start = getStartOfDay(nowMs)
      return start + DAY_MS - 1
    }
    case 'weekly': {
      const rs = task.recurrenceSettings
      // Режим «N раз в неделю» — конец недели (Вс 23:59:59)
      if (rs?.weeklyMode === 'timesPerWeek') {
        const weekStart = rs.weeklyWeekStart ?? getStartOfWeek(nowMs)
        return weekStart + 7 * DAY_MS - 1
      }

      const weeklyDays = rs?.weeklyDays
      if (weeklyDays && weeklyDays.length > 0) {
        // Вариант В: Конец цикла = конец текущего дня из weeklyDays
        const cycleStart = getCurrentCycleStart(task, nowMs)
        return cycleStart + DAY_MS - 1
      }
      // Конец недели (воскресенье 23:59:59)
      const weekStart = getStartOfWeek(nowMs)
      return weekStart + 7 * DAY_MS - 1
    }
    case 'monthly': {
      const d = new Date(nowMs)
      d.setMonth(d.getMonth() + 1, 1)
      d.setHours(0, 0, 0, 0)
      return d.getTime() - 1
    }
    case 'yearly': {
      const d = new Date(nowMs)
      d.setFullYear(d.getFullYear() + 1, 0, 1)
      d.setHours(0, 0, 0, 0)
      return d.getTime() - 1
    }
    case 'custom': {
      const interval = task.recurrenceSettings?.customIntervalDays ?? task.recurrenceIntervalDays ?? 1
      const cycleStart = getCurrentCycleStart(task, nowMs)
      return cycleStart + interval * DAY_MS - 1
    }
    case 'instant':
      return null
    default:
      return null
  }
}

/** Рассчитать дату следующего цикла */
export function getNextCycleDate(task: TaskRpg, nowMs: number = Date.now()): number | null {
  if (task.recurrence === 'once') return null
  if (task.recurrence === 'instant') return null

  // Если лимит по количеству достигнут
  const rs = task.recurrenceSettings
  if (rs?.endMode === 'byCount' && rs.endCount && (rs.completedCount ?? 0) >= rs.endCount) {
    return null
  }
  // Если лимит по дате достигнут
  if (rs?.endMode === 'byDate' && rs.endDate && nowMs >= rs.endDate) {
    return null
  }

  switch (task.recurrence) {
    case 'daily': {
      const tomorrow = new Date(nowMs)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      return tomorrow.getTime()
    }
    case 'weekly': {
      // Режим «N раз в неделю» — следующий цикл = следующий понедельник
      if (rs?.weeklyMode === 'timesPerWeek') {
        const weekStart = rs.weeklyWeekStart ?? getStartOfWeek(nowMs)
        return weekStart + 7 * DAY_MS
      }

      const weeklyDays = rs?.weeklyDays
      if (weeklyDays && weeklyDays.length > 0) {
        // Вариант В: Следующий день из weeklyDays после текущего дня цикла
        const cycleStart = getCurrentCycleStart(task, nowMs)
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
      const weekStart = getStartOfWeek(nowMs)
      return weekStart + 7 * DAY_MS
    }
    case 'monthly': {
      const d = new Date(nowMs)
      const dayOfMonth = d.getDate()
      d.setMonth(d.getMonth() + 1)
      // Клемпим до последнего дня месяца
      const daysInNextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      d.setDate(Math.min(dayOfMonth, daysInNextMonth))
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }
    case 'yearly': {
      const d = new Date(nowMs)
      d.setFullYear(d.getFullYear() + 1)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }
    case 'custom': {
      const interval = rs?.customIntervalDays ?? task.recurrenceIntervalDays ?? 1
      const cycleEnd = getCycleEndDate(task, nowMs)
      if (cycleEnd) return cycleEnd + 1
      return getStartOfDay(nowMs) + interval * DAY_MS
    }
    default:
      return null
  }
}

/** Следующая доступная дата для выполнения задачи.
 *  Если задача НЕ выполнена в текущем цикле → сегодня.
 *  Если выполнена → дата следующего цикла.
 */
export function getNextAvailableDate(task: TaskRpg, nowMs: number = Date.now()): number | null {
  if (task.recurrence === 'once') return null
  if (task.recurrence === 'instant') return null

  const rs = task.recurrenceSettings
  // Лимит по количеству достигнут
  if (rs?.endMode === 'byCount' && rs.endCount && (rs.completedCount ?? 0) >= rs.endCount) {
    return null
  }
  // Лимит по дате достигнут
  if (rs?.endMode === 'byDate' && rs.endDate && nowMs >= rs.endDate) {
    return null
  }

  // Задача не выполнена в текущем цикле → доступна сегодня
  if (!task.isCompleted) {
    return getStartOfDay(nowMs)
  }

  // Задача уже выполнена → следующий цикл
  return getNextCycleDate(task, nowMs)
}

/** Проверить, исчерпаны ли выполнения на текущей неделе (для timesPerWeek) */
export function isWeeklyTimesExhausted(task: TaskRpg): boolean {
  const rs = task.recurrenceSettings
  if (rs?.weeklyMode !== 'timesPerWeek' || !rs.weeklyTimesPerWeek) return false
  return (rs.weeklyCompletedThisWeek ?? 0) >= rs.weeklyTimesPerWeek
}

/** Проверить, является ли сегодня одним из выбранных дней для еженедельной задачи */
export function isTodayScheduled(task: TaskRpg, nowMs: number = Date.now()): boolean {
  if (task.recurrence !== 'weekly') return true
  const rs = task.recurrenceSettings
  if ((rs?.weeklyMode ?? 'days') !== 'days') return true
  const weeklyDays = rs?.weeklyDays
  if (!weeklyDays || weeklyDays.length === 0) return true
  return weeklyDays.includes(new Date(nowMs).getDay())
}

const DAY_NAMES_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

/** Получить название ближайшего запланированного дня */
export function getNextScheduledDayName(task: TaskRpg, nowMs: number = Date.now()): string | null {
  const rs = task.recurrenceSettings
  if (task.recurrence !== 'weekly' || (rs?.weeklyMode ?? 'days') !== 'days') return null
  const weeklyDays = rs?.weeklyDays
  if (!weeklyDays || weeklyDays.length === 0) return null

  const today = new Date(nowMs).getDay()
  const sorted = [...weeklyDays].sort((a, b) => a - b)

  // Ищем ближайший день после сегодня
  for (let i = 1; i <= 7; i++) {
    const candidate = (today + i) % 7
    if (sorted.includes(candidate)) {
      return DAY_NAMES_SHORT[candidate]
    }
  }
  return null
}

/** Процент выполнения */
export function getCompletionRate(task: TaskRpg): number {
  const history = task.completionHistory ?? []
  const totalCompleted = Math.max(
    task.recurrenceSettings?.completedCount ?? 0,
    history.filter(r => r.status === 'completed').length
  )
  const totalSkipped = task.totalSkipped ?? 0
  const total = totalCompleted + totalSkipped
  if (total === 0) return 0
  return Math.round((totalCompleted / total) * 100)
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
export function getRelativeTimeRu(ts: number, nowMs: number = Date.now()): string {
  const todayStart = getStartOfDay(nowMs)
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

/** Рассчитать эффективный XP подзадачи (зависит от атрибутов родительской задачи) */
export function getSubtaskXp(subtask: SubtaskItem, task: TaskRpg, settings: AppSettings): number {
  const attrIds = task.attributeIds?.length ? task.attributeIds : (task.attributeId ? [task.attributeId] : [])
  if (attrIds.length === 0) return 0
  const diff: TaskDifficulty = subtask.difficulty ?? 'medium'
  return subtask.customXp ?? settings.taskDifficultyXp?.[diff] ?? TASK_XP_BY_DIFFICULTY[diff] ?? subtask.xpReward ?? 0
}
