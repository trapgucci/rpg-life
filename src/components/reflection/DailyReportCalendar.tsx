import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { MOOD_CONFIG, type DailyReport } from '../../types/domain'

interface CalendarProps {
  reports: DailyReport[]
  selectedDate: string  // YYYY-MM-DD
  onSelectDate: (dateKey: string) => void
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

function getDateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function DailyReportCalendar({ reports, selectedDate, onSelectDate }: CalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const moodMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of reports) {
      if (r.mood) map.set(r.dateKey, r.mood)
    }
    return map
  }, [reports])

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    // Monday = 0, Sunday = 6
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const days: (number | null)[] = []

    // Leading empty cells
    for (let i = 0; i < startDow; i++) days.push(null)
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) days.push(d)

    return days
  }, [viewYear, viewMonth])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }

  const todayKey = getDateKey(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div className="flex flex-col gap-2">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          style={{
            background: 'var(--surface-elevated)',
            boxShadow: 'inset 0 1px 0 var(--neu-inset-light), 0 1px 3px var(--neu-shadow-dark)',
            border: '1px solid var(--border)',
          }}
        >
          <ChevronLeft className="h-4 w-4 text-[var(--fg-muted)]" />
        </button>
        <span className="text-sm font-semibold text-[var(--fg)]">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          style={{
            background: 'var(--surface-elevated)',
            boxShadow: 'inset 0 1px 0 var(--neu-inset-light), 0 1px 3px var(--neu-shadow-dark)',
            border: '1px solid var(--border)',
          }}
        >
          <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[10px] font-medium text-[var(--fg-muted)]">
            {w}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />

          const key = getDateKey(viewYear, viewMonth, day)
          const mood = moodMap.get(key)
          const isToday = key === todayKey
          const isSelected = key === selectedDate
          const isFuture = key > todayKey
          const moodColor = mood ? MOOD_CONFIG[mood as keyof typeof MOOD_CONFIG].color : undefined

          return (
            <button
              key={key}
              onClick={() => !isFuture && onSelectDate(key)}
              disabled={isFuture}
              className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-all duration-200 mx-auto',
                isFuture && 'text-[var(--fg-muted)] opacity-30',
                !isSelected && !isToday && !isFuture && 'text-[var(--fg)] hover:bg-[var(--surface-elevated)]',
              )}
              style={
                isSelected
                  ? {
                      background: `linear-gradient(145deg, var(--accent), var(--accent-light, var(--accent)))`,
                      color: 'white',
                      fontWeight: 700,
                      boxShadow: '0 2px 8px var(--accent-glow, rgba(99,102,241,0.3)), inset 0 1px 0 rgba(255,255,255,0.2)',
                    }
                  : isToday
                    ? {
                        background: 'var(--accent-subtle)',
                        color: 'var(--accent)',
                        fontWeight: 700,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
                        border: '1px solid var(--border-accent)',
                      }
                    : undefined
              }
            >
              {day}
              {/* Mood dot */}
              {mood && !isSelected && (
                <div
                  className="absolute -bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
                  style={{
                    backgroundColor: moodColor,
                    boxShadow: `0 0 4px ${moodColor}60`,
                  }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
