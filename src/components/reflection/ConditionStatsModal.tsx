import { useMemo } from 'react'
import { Flame, CheckCircle2, XCircle, CalendarDays, Trophy } from 'lucide-react'
import Modal from '../Modal'
import type { DailyCondition } from '../../types/domain'

interface ConditionStatsModalProps {
  isOpen: boolean
  onClose: () => void
  condition: DailyCondition | null
  stats: {
    totalDays: number
    checkedDays: number
    missedDays: number
    currentStreak: number
    bestStreak: number
    history: Record<string, boolean>
  } | null
}

export default function ConditionStatsModal({ isOpen, onClose, condition, stats }: ConditionStatsModalProps) {
  if (!condition || !stats) return null

  const completionRate = stats.totalDays > 0 ? Math.round((stats.checkedDays / stats.totalDays) * 100) : 0

  // Build dot grid grouped by weeks (rows = weeks, cols = days Mon-Sun)
  const dotGrid = useMemo(() => {
    const sortedKeys = Object.keys(stats.history).sort()
    if (sortedKeys.length === 0) return []

    const today = new Date()
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    // Start from the first Monday on or before activeFrom
    const first = new Date(sortedKeys[0] + 'T00:00:00')
    const startDay = first.getDay() // 0=Sun
    const mondayOffset = startDay === 0 ? -6 : 1 - startDay
    const startDate = new Date(first)
    startDate.setDate(startDate.getDate() + mondayOffset)

    const last = new Date(sortedKeys[sortedKeys.length - 1] + 'T00:00:00')
    // End on the Sunday on or after the last date
    const endDay = last.getDay()
    const sundayOffset = endDay === 0 ? 0 : 7 - endDay
    const endDate = new Date(last)
    endDate.setDate(endDate.getDate() + sundayOffset)

    type DotStatus = 'checked' | 'missed' | 'today' | 'today-checked' | 'outside'
    const weeks: { key: string; status: DotStatus }[][] = []
    const cur = new Date(startDate)

    while (cur <= endDate) {
      const week: { key: string; status: DotStatus }[] = []
      for (let d = 0; d < 7; d++) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
        if (key in stats.history) {
          const checked = stats.history[key]
          if (key === todayKey) {
            week.push({ key, status: checked ? 'today-checked' : 'today' })
          } else {
            week.push({ key, status: checked ? 'checked' : 'missed' })
          }
        } else {
          week.push({ key, status: 'outside' })
        }
        cur.setDate(cur.getDate() + 1)
      }
      weeks.push(week)
    }

    return weeks
  }, [stats.history])

  const statItems = [
    { icon: CalendarDays, label: 'Всего дней', value: stats.totalDays, color: '#6366f1' },
    { icon: CheckCircle2, label: 'Выполнено', value: stats.checkedDays, color: '#22c55e' },
    { icon: XCircle, label: 'Пропущено', value: stats.missedDays, color: '#ef4444' },
    { icon: Flame, label: 'Текущий стрик', value: stats.currentStreak, color: '#f59e0b' },
    { icon: Trophy, label: 'Лучший стрик', value: stats.bestStreak, color: '#8b5cf6' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={condition.name} size="sm">
      <div className="flex flex-col gap-5 p-6">
        {/* Completion rate */}
        <div className="flex items-center justify-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
            style={{
              background: 'linear-gradient(145deg, #22c55e25, #22c55e15)',
              border: '1px solid #22c55e30',
            }}
          >
            {condition.icon}
          </div>
          <div>
            <div className="text-3xl font-bold text-[var(--fg)]">{completionRate}%</div>
            <div className="text-xs text-[var(--fg-muted)]">выполнение</div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-1 rounded-xl p-2.5"
              style={{
                background: `${item.color}08`,
                border: `1px solid ${item.color}15`,
              }}
            >
              <item.icon className="h-4 w-4" style={{ color: item.color }} />
              <span className="text-lg font-bold text-[var(--fg)]">{item.value}</span>
              <span className="text-[10px] text-[var(--fg-muted)] text-center leading-tight">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Dot grid */}
        {dotGrid.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold text-[var(--fg-muted)]">История</h4>
            <div
              className="rounded-xl p-3"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Day labels */}
              <div className="mb-1 flex justify-between px-0.5">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
                  <span key={d} className="w-4 text-center text-[9px] text-[var(--fg-muted)]">{d}</span>
                ))}
              </div>
              <div className="flex flex-col gap-[3px]">
                {dotGrid.map((week, wi) => (
                  <div key={wi} className="flex justify-between px-0.5">
                    {week.map((day) => {
                      const dotTitle =
                        day.status === 'outside' ? '' :
                        day.status === 'checked' || day.status === 'today-checked' ? `${day.key}: Выполнено` :
                        day.status === 'today' ? `${day.key}: Сегодня` :
                        `${day.key}: Пропущено`

                      const isToday = day.status === 'today' || day.status === 'today-checked'

                      return (
                        <div
                          key={day.key}
                          className="h-4 w-4 rounded-full transition-colors"
                          title={dotTitle}
                          style={{
                            background:
                              day.status === 'checked' || day.status === 'today-checked'
                                ? '#22c55e'
                                : day.status === 'today'
                                  ? '#22c55e30'
                                  : day.status === 'missed'
                                    ? 'var(--border)'
                                    : 'transparent',
                            opacity: day.status === 'outside' ? 0.15 : 1,
                            border: isToday
                              ? '2px solid #22c55e'
                              : day.status === 'outside'
                                ? '1px solid var(--border)'
                                : 'none',
                          }}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
