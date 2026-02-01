import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/cn'
import type { Habit } from '../types/domain'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
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

  /** Возвращает: positive (выполнено), negative (минус), 'skipped' (прошлый день без отметки), null (будущее/сегодня без действия) */
  function getStatusForKey(key: string): 'positive' | 'negative' | 'skipped' | null {
    let status = habit.dailyCompletion?.[key] ?? null
    if (key === todayKey && !status && habit.lastResetDate >= todayStartTs && (habit.todayPositive > 0 || habit.todayNegative > 0)) {
      status = habit.todayPositive > 0 ? 'positive' : 'negative'
    }
    if (status !== null) return status
    // Прошедший день без записи = пропущен (красный)
    if (key < todayKey) return 'skipped'
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

  const cells: { key: string; day: number | null; status: 'positive' | 'negative' | 'skipped' | null; isToday: boolean }[] = []
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

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Календарь привычки"
    >
      <div
        className={cn(
          'w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl p-6',
          'border border-[var(--border)] shadow-[var(--shadow-lg)]',
          'bg-[var(--surface-overlay)] backdrop-blur-[24px] saturate-[180%]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--fg)] truncate pr-2">
            Календарь: {habit.title}
          </h2>
          <button type="button" onClick={onClose} className="icon-btn shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

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
            const isNeutral = !isEmpty && status === null
            return (
              <div
                key={key}
                className={cn(
                  'aspect-square flex items-center justify-center rounded-xl text-sm font-medium border transition-all min-h-9',
                  isEmpty && 'invisible',
                  !isEmpty && isCompleted && 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 dark:border-emerald-400/40',
                  !isEmpty && isSkippedOrNegative && 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40 dark:border-red-400/40',
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
            <span className="w-3.5 h-3.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]" />
            Нет данных
          </span>
        </div>
      </div>
    </div>
  )

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return createPortal(modalContent, document.body)
}
