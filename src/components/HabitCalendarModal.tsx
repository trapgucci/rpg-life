import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import type { Habit } from '../types/domain'
import Modal from './Modal'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function getDateKeyFromTs(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isDateInFreeze(key: string, freezeFrom?: number | null, freezeUntil?: number | null): boolean {
  if (!freezeFrom || !freezeUntil) return false
  const fromKey = getDateKeyFromTs(freezeFrom)
  const untilKey = getDateKeyFromTs(freezeUntil)
  return key >= fromKey && key <= untilKey
}
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]

function getDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface HabitCalendarModalProps {
  habit: Habit
  onClose: () => void
}

export default function HabitCalendarModal({ habit, onClose }: HabitCalendarModalProps) {
  const profile = useRpgStore((s) => {
    const pid = s.activeProfileId
    return pid ? s.profiles.find((p) => p.id === pid) ?? null : null
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = getDateKey(today)
  const todayStartTs = today.getTime()

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  const startWeekday = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  // Пн = 1, Вс = 0 → сдвиг: (startWeekday + 6) % 7
  const padStart = (startWeekday + 6) % 7

  /** Возвращает: positive, negative, 'frozen' (защищён заморозкой), 'skipped', null */
  function getStatusForKey(key: string): 'positive' | 'negative' | 'frozen' | 'skipped' | null {
    let status = habit.dailyCompletion?.[key] ?? null
    if (key === todayKey && !status && habit.lastResetDate >= todayStartTs && (habit.todayPositive > 0 || habit.todayNegative > 0)) {
      status = habit.todayPositive > 0 ? 'positive' : 'negative'
    }
    if (status === 'frozen') return 'frozen'
    if (status !== null) return status
    // Прошедший день без записи: если в периоде заморозки — frozen (синий), иначе skipped (красный)
    if (key < todayKey) {
      if (isDateInFreeze(key, profile?.streakFreezeFrom, profile?.streakFreezeUntil)) return 'frozen'
      return 'skipped'
    }
    return null
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const prevYear = () => setViewYear((y) => y - 1)
  const nextYear = () => setViewYear((y) => y + 1)

  const cells: { key: string; day: number | null; status: 'positive' | 'negative' | 'frozen' | 'skipped' | null; isToday: boolean }[] = []
  for (let i = 0; i < padStart; i++) {
    cells.push({ key: `empty-${i}`, day: null, status: null, isToday: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(viewYear, viewMonth, d)
    const key = getDateKey(date)
    cells.push({
      key,
      day: d,
      status: getStatusForKey(key),
      isToday: key === todayKey,
    })
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="md"
      title={`Календарь: ${habit.title}`}
      showCloseButton
      closeOnBackdropClick
      closeOnEscape
      zIndex={9999}
      className="max-h-[calc(100vh-2rem)] overflow-y-auto"
    >
      <div className="p-6">

        {/* Навигация по месяцу и году — в стиле сайта */}
        <div className="flex items-center justify-between gap-3 mb-4 rounded-xl bg-[var(--surface)]/80 p-2 border border-[var(--border)]">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={prevYear}
              className="p-2 rounded-lg hover:bg-[var(--accent-subtle)] text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
              aria-label="Предыдущий год"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-[var(--fg)] min-w-[3rem] text-center tabular-nums">
              {viewYear}
            </span>
            <button
              type="button"
              onClick={nextYear}
              className="p-2 rounded-lg hover:bg-[var(--accent-subtle)] text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
              aria-label="Следующий год"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-[var(--accent-subtle)] text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-[var(--fg)] min-w-[6.5rem] text-center">
              {MONTH_NAMES[viewMonth]}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-[var(--accent-subtle)] text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors"
              aria-label="Следующий месяц"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Сетка календаря — стеклянные ячейки в стиле glass-card */}
        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {WEEKDAYS.map((wd) => (
            <div
              key={wd}
              className="text-center text-xs font-semibold text-[var(--fg-muted)] py-1.5"
            >
              {wd}
            </div>
          ))}
          {cells.map(({ key, day, status, isToday }) => {
            const isEmpty = day === null
            const isCompleted = status === 'positive'
            const isSkippedOrNegative = status === 'negative' || status === 'skipped'
            const isFrozen = status === 'frozen'
            const isNeutral = !isEmpty && status === null
            return (
              <div
                key={key}
                className={cn(
                  'aspect-square flex items-center justify-center rounded-xl text-sm font-medium border transition-all min-h-9',
                  isEmpty && 'invisible',
                  !isEmpty && isCompleted && 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 dark:border-emerald-400/40',
                  !isEmpty && isSkippedOrNegative && 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40 dark:border-red-400/40',
                  !isEmpty && isFrozen && 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40 dark:border-blue-400/40',
                  isNeutral && 'bg-[var(--surface)] text-[var(--fg-muted)] border-[var(--border)]',
                  isToday && 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface-overlay)] border-[var(--accent)]'
                )}
              >
                {day ?? ''}
              </div>
            )
          })}
        </div>

        {/* Легенда — в стиле сайта */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--fg-muted)] border-t border-[var(--border)] pt-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-lg bg-emerald-500/30 border border-emerald-500/50" />
            Выполнено
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-lg bg-red-500/30 border border-red-500/50" />
            Пропущен / минус
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-lg bg-blue-500/30 border border-blue-500/50" />
            Заморозка
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]" />
            Нет данных
          </span>
        </div>
      </div>
    </Modal>
  )
}
