import { useState, useRef } from 'react'
import {
  ChevronDown, ChevronRight, RefreshCw, CalendarClock, BarChart3, History,
  Check, SkipForward, XCircle, Zap, Coins, Gem, ListChecks, TrendingUp,
  CheckCircle2, Flame, Crown, Archive
} from 'lucide-react'
import { cn } from '../lib/cn'
import type { TaskRpg, TaskCompletionRecord } from '../types/domain'
import {
  getNextAvailableDate,
  getCompletionRate, formatDateShortRu, getRelativeTimeRu,
  isTodayScheduled, getNextScheduledDayName
} from '../lib/taskCycleUtils'

// ─── Collapsible wrapper ─────────────────────────────────────────────────

interface CollapsibleBlockProps {
  icon: React.ReactNode
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleBlock({ icon, title, defaultOpen = false, children }: CollapsibleBlockProps) {
  const [open, setOpen] = useState(defaultOpen)
  const blockRef = useRef<HTMLDivElement>(null)

  const handleToggle = () => {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen && blockRef.current) {
      // After CSS transition starts, scroll the nearest scrollable parent to bottom
      setTimeout(() => {
        const el = blockRef.current
        if (!el) return
        const scrollParent = el.closest('.overflow-y-auto') as HTMLElement | null
        if (scrollParent) {
          scrollParent.scrollTo({ top: scrollParent.scrollHeight, behavior: 'smooth' })
        }
      }, 50)
    }
  }

  return (
    <div ref={blockRef} className="glass rounded-2xl mb-4 overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-[var(--accent)]/15 to-[var(--accent)]/5 text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20 shadow-sm shadow-[var(--accent)]/10">
            {icon}
          </div>
          <h3 className="text-sm font-semibold text-[var(--fg)]">{title}</h3>
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-[var(--fg-muted)]" />
          : <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
        }
      </button>
      <div className={cn(
        'overflow-hidden transition-all duration-300 ease-out',
        open ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="px-4 pb-4 pt-0 border-t border-[var(--border)]">
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Row helper ──────────────────────────────────────────────────────────

function InfoRow({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-b-0">
      <span className="text-sm text-[var(--fg-muted)]">{label}</span>
      <span className={cn('text-sm font-semibold text-[var(--fg)]', valueClass)}>{value}</span>
    </div>
  )
}

// ─── 1. Объединенный блок: Текущий и следующий цикл ────────────────────

interface TaskBlockProps {
  task: TaskRpg
  nowMs?: number
}

const RECURRENCE_LABELS: Record<string, string> = {
  once: 'Один раз',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
  custom: 'Кастомный',
  instant: 'Инстант',
}

/** Короткие названия дней недели (0 = ВС, 1 = ПН, ..., 6 = СБ) */
const WEEKDAY_SHORT: string[] = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']

/** Дни в порядке ПН–ВС для отображения */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function TaskCurrentCycleBlock({ task, nowMs = Date.now() }: TaskBlockProps) {
  const nextAvailable = getNextAvailableDate(task, nowMs)
  const rs = task.recurrenceSettings
  const isLimitReached = rs?.endMode === 'byCount' && rs.endCount && (rs.completedCount ?? 0) >= rs.endCount

  return (
    <CollapsibleBlock
      icon={<RefreshCw className="h-4.5 w-4.5" />}
      title="Циклы повтора"
      defaultOpen
    >
      <div className="mt-3 space-y-3">
        {/* Тип повтора */}
        <InfoRow
          label="Повтор"
          value={RECURRENCE_LABELS[task.recurrence] ?? task.recurrence}
        />

        {/* Статус текущего цикла */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-[var(--fg-muted)]">Статус</span>
          {task.canceledAt ? (
            /* Архивированная задача */
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold shadow-sm',
              isLimitReached
                ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-500/8 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-emerald-500/10'
                : 'bg-gradient-to-b from-gray-500/20 to-gray-500/8 text-gray-500 ring-1 ring-inset ring-gray-400/25 shadow-gray-500/10'
            )}>
              {isLimitReached ? (
                <><Check className="h-3.5 w-3.5" /> Завершена</>
              ) : (
                <><Archive className="h-3.5 w-3.5" /> Архивирована</>
              )}
            </span>
          ) : task.recurrence === 'weekly' && rs?.weeklyMode === 'timesPerWeek' && rs.weeklyTimesPerWeek ? (
            /* Режим «N раз в неделю» — показываем прогресс */
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold shadow-sm',
              (rs.weeklyCompletedThisWeek ?? 0) >= rs.weeklyTimesPerWeek
                ? 'bg-gradient-to-b from-blue-500/20 to-blue-500/8 text-blue-500 ring-1 ring-inset ring-blue-400/25 shadow-blue-500/10'
                : 'bg-gradient-to-b from-amber-500/20 to-amber-500/8 text-amber-500 ring-1 ring-inset ring-amber-400/25 shadow-amber-500/10'
            )}>
              {(rs.weeklyCompletedThisWeek ?? 0) >= rs.weeklyTimesPerWeek ? (
                <><Check className="h-3.5 w-3.5" /> {rs.weeklyCompletedThisWeek ?? 0}/{rs.weeklyTimesPerWeek} за неделю</>
              ) : (
                <><CalendarClock className="h-3.5 w-3.5" /> {rs.weeklyCompletedThisWeek ?? 0}/{rs.weeklyTimesPerWeek} за неделю</>
              )}
            </span>
          ) : task.recurrence === 'weekly' && rs?.weeklyDays && rs.weeklyDays.length > 0 ? (
            <div className="flex items-center gap-1">
              {WEEKDAY_ORDER.map(day => {
                const isActive = rs.weeklyDays!.includes(day)
                const isToday = new Date(nowMs).getDay() === day
                return (
                  <span
                    key={day}
                    className={cn(
                      'inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none min-w-[26px]',
                      isActive && isToday
                        ? 'bg-[var(--accent)] text-white'
                        : isActive
                        ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                        : 'bg-transparent text-[var(--fg-muted)] opacity-30'
                    )}
                  >
                    {WEEKDAY_SHORT[day]}
                  </span>
                )
              })}
            </div>
          ) : (
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold shadow-sm',
              isLimitReached
                ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-500/8 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-emerald-500/10'
                : task.isCompleted
                ? 'bg-gradient-to-b from-blue-500/20 to-blue-500/8 text-blue-500 ring-1 ring-inset ring-blue-400/25 shadow-blue-500/10'
                : 'bg-gradient-to-b from-amber-500/20 to-amber-500/8 text-amber-500 ring-1 ring-inset ring-amber-400/25 shadow-amber-500/10'
            )}>
              {isLimitReached ? (
                <><Check className="h-3.5 w-3.5" /> Завершена</>
              ) : task.isCompleted ? (
                <><Check className="h-3.5 w-3.5" /> Выполнено за цикл</>
              ) : (
                <><CalendarClock className="h-3.5 w-3.5" /> Ожидает выполнения</>
              )}
            </span>
          )}
        </div>

        {/* Следующий цикл */}
        {task.canceledAt ? (
          /* Архивированная задача — только «завершена навсегда» если лимит достигнут */
          isLimitReached ? (
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-b from-emerald-500/18 to-emerald-500/6 p-3 ring-1 ring-inset ring-emerald-400/20 shadow-sm shadow-emerald-500/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-b from-emerald-500/25 to-emerald-500/10 ring-1 ring-inset ring-emerald-400/30">
                <Check className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-500">Задача завершена навсегда</p>
                <p className="text-xs text-[var(--fg-muted)]">Достигнут лимит повторов — больше циклов не будет</p>
              </div>
            </div>
          ) : null
        ) : task.recurrence === 'instant' ? (
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-b from-blue-500/18 to-blue-500/6 p-3 ring-1 ring-inset ring-blue-400/20 shadow-sm shadow-blue-500/10">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-b from-blue-500/25 to-blue-500/10 ring-1 ring-inset ring-blue-400/30">
              <Zap className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-500">Доступно сразу</p>
              <p className="text-xs text-[var(--fg-muted)]">Сбрасывается после выполнения</p>
            </div>
          </div>
        ) : isLimitReached ? (
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-b from-emerald-500/18 to-emerald-500/6 p-3 ring-1 ring-inset ring-emerald-400/20 shadow-sm shadow-emerald-500/10">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-b from-emerald-500/25 to-emerald-500/10 ring-1 ring-inset ring-emerald-400/30">
              <Check className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-500">Задача завершена навсегда</p>
              <p className="text-xs text-[var(--fg-muted)]">Достигнут лимит повторов — больше циклов не будет</p>
            </div>
          </div>
        ) : task.isCompleted && nextAvailable != null ? (
          // Задача выполнена за цикл — показываем когда можно снова
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-b from-indigo-500/18 to-indigo-500/6 p-3 ring-1 ring-inset ring-indigo-400/20 shadow-sm shadow-indigo-500/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-indigo-500/25 to-indigo-500/10 ring-1 ring-inset ring-indigo-400/30">
              <CalendarClock className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">Следующий цикл</p>
              <p className="text-sm font-bold text-indigo-500">{formatDateShortRu(nextAvailable)}</p>
              <p className="text-xs text-[var(--fg-muted)]">Доступна {getRelativeTimeRu(nextAvailable, nowMs).toLowerCase()}</p>
            </div>
          </div>
        ) : !task.isCompleted && nextAvailable != null ? (
          // Задача ещё не выполнена — проверяем, запланирована ли сегодня
          isTodayScheduled(task, nowMs) ? (
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-b from-amber-500/18 to-amber-500/6 p-3 ring-1 ring-inset ring-amber-400/20 shadow-sm shadow-amber-500/10">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-amber-500/25 to-amber-500/10 ring-1 ring-inset ring-amber-400/30">
                <CalendarClock className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-0.5">Текущий цикл</p>
                <p className="text-sm font-bold text-amber-500">Доступна сейчас</p>
                <p className="text-xs text-[var(--fg-muted)]">Выполните задачу, чтобы получить награды</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-b from-orange-500/18 to-orange-500/6 p-3 ring-1 ring-inset ring-orange-400/20 shadow-sm shadow-orange-500/10">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-orange-500/25 to-orange-500/10 ring-1 ring-inset ring-orange-400/30">
                <CalendarClock className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-0.5">Текущий цикл</p>
                <p className="text-sm font-bold text-orange-500">Сегодня не запланировано</p>
                <p className="text-xs text-[var(--fg-muted)]">Ближайший день: {getNextScheduledDayName(task, nowMs)}</p>
              </div>
            </div>
          )
        ) : null}

        {/* Информация об окончании повтора (не показываем для архивных задач) */}
        {rs && rs.endMode !== 'never' && !task.canceledAt && (
          <div className="rounded-xl bg-gradient-to-b from-orange-500/18 to-orange-500/6 p-3 ring-1 ring-inset ring-orange-400/20 shadow-sm shadow-orange-500/10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-orange-500 uppercase tracking-wider">Окончание</span>
            </div>
            <div className="text-sm">
              {rs.endMode === 'byDate' && rs.endDate && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--fg-muted)]">Будет доступна до</span>
                  <span className="font-semibold text-orange-500">
                    {formatDateShortRu(rs.endDate)}
                  </span>
                </div>
              )}
              {rs.endMode === 'byCount' && rs.endCount && (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--fg-muted)]">Выполнено циклов</span>
                  <span className="font-semibold text-orange-500">
                    {rs.completedCount ?? 0} / {rs.endCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </CollapsibleBlock>
  )
}

// Оставляем для обратной совместимости (можно удалить позже)
export function TaskNextCycleBlock({ task: _task }: TaskBlockProps) {
  return null
}

// ─── 2b. Блок множителя ─────────────────────────────────────────────────

export function TaskMultiplierBlock({ task }: TaskBlockProps) {
  const sm = task.streakMultiplier
  if (!sm) return null

  const currentStreak = task.currentStreak ?? 0

  if (sm.mode === 'streak') {
    // Сколько выполнений осталось до следующего срабатывания
    const completedInCycle = currentStreak % sm.interval
    const untilNext = sm.interval - completedInCycle
    const timesTriggered = Math.floor(currentStreak / sm.interval)

    return (
      <CollapsibleBlock
        icon={<TrendingUp className="h-4.5 w-4.5" />}
        title="Множитель"
        defaultOpen
      >
        <div className="mt-3 space-y-3">
          {/* Множитель и режим */}
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-b from-amber-500/18 to-amber-500/6 p-3 ring-1 ring-inset ring-amber-400/20 shadow-sm shadow-amber-500/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-amber-500/25 to-amber-500/10 ring-1 ring-inset ring-amber-400/30">
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-500">x{sm.value} множитель</p>
              <p className="text-xs text-[var(--fg-muted)]">Срабатывает каждые {sm.interval} выполнений стрика</p>
            </div>
          </div>

          <InfoRow label="Режим" value="За стрик" />
          <InfoRow label="Текущий стрик" value={
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              {currentStreak}
            </span>
          } />

          {/* Прогресс до следующего срабатывания */}
          <div className="py-2.5 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--fg-muted)]">До следующего бонуса</span>
              <span className="text-sm font-semibold text-amber-500">
                {untilNext === sm.interval && currentStreak === 0
                  ? `${sm.interval} выполнений`
                  : untilNext === 0
                    ? 'Сейчас!'
                    : `${untilNext} выполнений`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${(completedInCycle / sm.interval) * 100}%`,
                  background: 'linear-gradient(90deg, #f59e0b, #f97316)',
                }}
              />
            </div>
          </div>

          <InfoRow
            label="Бонусов получено"
            value={timesTriggered}
          />

          {/* Предупреждение */}
          <div className="rounded-xl bg-red-500/8 border border-red-500/15 p-3">
            <p className="text-xs text-red-500">
              При сбросе стрика множитель будет утерян навсегда.
            </p>
          </div>
        </div>
      </CollapsibleBlock>
    )
  }

  // Mode: instant
  const remaining = sm.remainingUses ?? 0

  return (
    <CollapsibleBlock
      icon={<TrendingUp className="h-4.5 w-4.5" />}
      title="Множитель"
      defaultOpen
    >
      <div className="mt-3 space-y-3">
        {/* Множитель и режим */}
        <div className="flex items-center gap-3 rounded-xl bg-gradient-to-b from-amber-500/18 to-amber-500/6 p-3 ring-1 ring-inset ring-amber-400/20 shadow-sm shadow-amber-500/10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-amber-500/25 to-amber-500/10 ring-1 ring-inset ring-amber-400/30">
            <TrendingUp className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-500">x{sm.value} множитель</p>
            <p className="text-xs text-[var(--fg-muted)]">Действует на следующие выполнения</p>
          </div>
        </div>

        <InfoRow label="Режим" value="Для инстант задачи" />

        {/* Осталось выполнений */}
        <div className="py-2.5 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--fg-muted)]">Осталось выполнений</span>
            <span className="text-sm font-semibold text-amber-500">{remaining} / {sm.interval}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${(remaining / sm.interval) * 100}%`,
                background: 'linear-gradient(90deg, #f59e0b, #f97316)',
              }}
            />
          </div>
        </div>

        <div className="rounded-xl bg-blue-500/8 border border-blue-500/15 p-3">
          <p className="text-xs text-blue-500">
            После {sm.interval} выполнений множитель исчезнет автоматически.
          </p>
        </div>
      </div>
    </CollapsibleBlock>
  )
}

// ─── 3. Гистограмма выполнений ───────────────────────────────────────────

type HistogramPeriod = 'week' | 'month' | 'year'

const PERIOD_LABELS: Record<HistogramPeriod, string> = {
  week: 'Неделя',
  month: 'Месяц',
  year: 'Год',
}

/** Короткие русские названия дней недели */
const SHORT_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/** Короткие русские названия месяцев */
const SHORT_MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

interface HistogramBar {
  label: string
  count: number
}

function buildBars(history: TaskCompletionRecord[], period: HistogramPeriod): HistogramBar[] {
  const now = new Date()
  const completed = history.filter(r => r.status === 'completed')

  if (period === 'week') {
    // Последние 7 дней, начиная с понедельника текущей недели
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    // dayOfWeek: 0=Sun -> сдвигаем чтобы Mon=0
    const jsDay = today.getDay()
    const mondayOffset = jsDay === 0 ? 6 : jsDay - 1
    const monday = new Date(today)
    monday.setDate(today.getDate() - mondayOffset)

    const bars: HistogramBar[] = []
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(monday)
      dayStart.setDate(monday.getDate() + i)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayStart.getDate() + 1)
      const count = completed.filter(r => {
        const t = r.completedAt ?? r.cycleStart
        return t >= dayStart.getTime() && t < dayEnd.getTime()
      }).length
      bars.push({ label: SHORT_DAYS[i], count })
    }
    return bars
  }

  if (period === 'month') {
    // Последние 30 дней, разбитые на 6 «пятидневок»
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const bars: HistogramBar[] = []
    for (let i = 5; i >= 0; i--) {
      const blockEnd = new Date(today)
      blockEnd.setDate(today.getDate() - i * 5)
      const blockStart = new Date(blockEnd)
      blockStart.setDate(blockEnd.getDate() - 5)
      // Для последнего блока включаем сегодня
      const end = i === 0 ? new Date(today.getTime() + 24 * 60 * 60 * 1000) : blockEnd
      const count = completed.filter(r => {
        const t = r.completedAt ?? r.cycleStart
        return t >= blockStart.getTime() && t < end.getTime()
      }).length
      const d = i === 0 ? today : blockStart
      bars.push({
        label: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`,
        count,
      })
    }
    return bars
  }

  // year — последние 12 месяцев
  const bars: HistogramBar[] = []
  for (let i = 11; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 1)
    const count = completed.filter(r => {
      const t = r.completedAt ?? r.cycleStart
      return t >= m.getTime() && t < mEnd.getTime()
    }).length
    bars.push({ label: SHORT_MONTHS[m.getMonth()], count })
  }
  return bars
}

function CompletionHistogram({ history }: { history: TaskCompletionRecord[] }) {
  const [period, setPeriod] = useState<HistogramPeriod>('week')
  const [open, setOpen] = useState(false)

  const bars = buildBars(history, period)
  const max = Math.max(...bars.map(b => b.count), 1)

  return (
    <div className="mt-3 rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-left bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors"
      >
        <BarChart3 className="h-4 w-4 text-[var(--fg-muted)]" />
        <span className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider flex-1">
          График выполнений
        </span>
        <ChevronDown className={cn('h-4 w-4 text-[var(--fg-muted)] transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-[var(--border)] p-3">
          {/* Period toggle */}
          <div className="flex gap-1 mb-3 p-0.5 rounded-lg bg-[var(--border)]">
            {(['week', 'month', 'year'] as HistogramPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  'flex-1 text-xs font-semibold py-1.5 rounded-md transition-all',
                  period === p
                    ? 'bg-[var(--surface)] text-[var(--fg)] shadow-sm'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                )}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Bars */}
          <div className="flex items-end gap-1.5 h-28">
            {bars.map((bar, i) => {
              const pct = max > 0 ? (bar.count / max) * 100 : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                  {/* Count tooltip */}
                  <span className={cn(
                    'text-[10px] font-bold transition-opacity',
                    bar.count > 0 ? 'text-emerald-500' : 'text-[var(--fg-muted)] opacity-0 group-hover:opacity-100'
                  )}>
                    {bar.count}
                  </span>
                  {/* Bar */}
                  <div
                    className={cn(
                      'w-full rounded-t-md transition-all duration-300',
                      bar.count > 0
                        ? 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                        : 'bg-[var(--border)]'
                    )}
                    style={{
                      height: bar.count > 0 ? `${Math.max(pct, 8)}%` : '4px',
                    }}
                  />
                  {/* Label */}
                  <span className="text-[9px] text-[var(--fg-muted)] leading-none mt-0.5">
                    {bar.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 3. Статистика задачи ────────────────────────────────────────────────

export function TaskStatsBlock({ task }: TaskBlockProps) {
  const history = task.completionHistory ?? []
  const completedCount = Math.max(
    task.recurrenceSettings?.completedCount ?? 0,
    history.filter(r => r.status === 'completed').length
  )
  const rate = getCompletionRate(task)
  const streak = task.currentStreak ?? 0
  const best = task.bestStreak ?? 0
  const isInstant = task.recurrence === 'instant'

  // Для инстант-задач: выполнения сегодня и рекорд за день
  const todayKey = isInstant ? getDateKey(Date.now()) : ''
  const todayCount = isInstant
    ? history.filter(r => r.status === 'completed' && r.completedAt && getDateKey(r.completedAt) === todayKey).length
    : 0
  const bestDayCount = isInstant
    ? (() => {
        const dayCounts = new Map<string, number>()
        for (const r of history) {
          if (r.status === 'completed' && r.completedAt) {
            const key = getDateKey(r.completedAt)
            dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
          }
        }
        let max = 0
        for (const c of dayCounts.values()) { if (c > max) max = c }
        return max
      })()
    : 0

  const hasData = history.length > 0 || completedCount > 0

  return (
    <CollapsibleBlock
      icon={<BarChart3 className="h-4.5 w-4.5" />}
      title="Статистика задачи"
    >
      <div className="mt-3">
        {hasData ? (
          <>
            {/* Обзор процента выполнения */}
            <div className="mb-4 rounded-xl bg-gradient-to-b from-blue-500/8 to-transparent p-4 ring-1 ring-inset ring-blue-400/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                  Процент выполнения
                </span>
                <span className="text-lg font-bold text-blue-500">{rate}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${rate}%`,
                    background: rate >= 80
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : rate >= 50
                      ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                      : 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  }}
                />
              </div>
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-1 gap-3 mb-3">
              {/* Выполнено — полная ширина */}
              <div className="rounded-2xl bg-gradient-to-b from-emerald-500/12 to-emerald-500/4 p-4 text-center ring-1 ring-inset ring-emerald-400/15 shadow-sm shadow-emerald-500/5">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-emerald-500/25 to-emerald-500/10 ring-1 ring-inset ring-emerald-400/30">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-500">{completedCount}</div>
                </div>
                <div className="text-xs mt-1 text-[var(--fg-muted)]">Выполнено</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {isInstant ? (
                <>
                  <div className="rounded-2xl bg-gradient-to-b from-blue-500/12 to-blue-500/4 p-4 text-center ring-1 ring-inset ring-blue-400/15 shadow-sm shadow-blue-500/5">
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-b from-blue-500/25 to-blue-500/10 ring-1 ring-inset ring-blue-400/30">
                        <Zap className="h-4.5 w-4.5 text-blue-500" />
                      </div>
                      <div className="text-2xl font-bold text-blue-500">{todayCount}</div>
                    </div>
                    <div className="text-xs mt-1 text-[var(--fg-muted)]">Сегодня</div>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-b from-violet-500/12 to-violet-500/4 p-4 text-center ring-1 ring-inset ring-violet-400/15 shadow-sm shadow-violet-500/5">
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-b from-violet-500/25 to-violet-500/10 ring-1 ring-inset ring-violet-400/30">
                        <Crown className="h-4.5 w-4.5 text-violet-500" />
                      </div>
                      <div className="text-2xl font-bold text-violet-500">{bestDayCount}</div>
                    </div>
                    <div className="text-xs mt-1 text-[var(--fg-muted)]">Рекорд за день</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl bg-gradient-to-b from-orange-500/12 to-orange-500/4 p-4 text-center ring-1 ring-inset ring-orange-400/15 shadow-sm shadow-orange-500/5">
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-b from-orange-500/25 to-orange-500/10 ring-1 ring-inset ring-orange-400/30">
                        <Flame className="h-4.5 w-4.5 text-orange-500" />
                      </div>
                      <div className="text-2xl font-bold text-orange-500">{streak}</div>
                    </div>
                    <div className="text-xs mt-1 text-[var(--fg-muted)]">Текущая серия</div>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-b from-amber-500/12 to-amber-500/4 p-4 text-center ring-1 ring-inset ring-amber-400/15 shadow-sm shadow-amber-500/5">
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-b from-amber-500/25 to-amber-500/10 ring-1 ring-inset ring-amber-400/30">
                        <Crown className="h-4.5 w-4.5 text-amber-500" />
                      </div>
                      <div className="text-2xl font-bold text-amber-500">{best}</div>
                    </div>
                    <div className="text-xs mt-1 text-[var(--fg-muted)]">Лучший результат</div>
                  </div>
                </>
              )}
            </div>

            {/* Гистограмма выполнений */}
            <CompletionHistogram history={history} />
          </>
        ) : (
          <div className="text-center py-6">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-[var(--fg-muted)] opacity-40" />
            <p className="text-sm text-[var(--fg-muted)]">
              Статистика будет доступна после первого цикла
            </p>
          </div>
        )}
      </div>
    </CollapsibleBlock>
  )
}

// ─── 4. История ──────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  completed: {
    bg: 'bg-gradient-to-b from-emerald-500/15 to-emerald-500/5',
    iconBg: 'bg-gradient-to-b from-emerald-500/25 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/30',
    icon: Check,
    label: 'Выполнено',
  },
  skipped: {
    bg: 'bg-gradient-to-b from-blue-500/15 to-blue-500/5',
    iconBg: 'bg-gradient-to-b from-blue-500/25 to-blue-500/10 text-blue-500 ring-1 ring-inset ring-blue-400/30',
    icon: SkipForward,
    label: 'Пропущено',
  },
  missed: {
    bg: 'bg-gradient-to-b from-red-500/15 to-red-500/5',
    iconBg: 'bg-gradient-to-b from-red-500/25 to-red-500/10 text-red-500 ring-1 ring-inset ring-red-400/30',
    icon: XCircle,
    label: 'Пропущено (авто)',
  },
} as const

/** Форматирование даты для заголовка группы (14 февраля) */
function formatGroupDate(ts: number, nowMs: number = Date.now()): string {
  const d = new Date(ts)
  const now = new Date(nowMs)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000))

  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'

  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

/** Форматирование времени (14:30) */
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Ключ группировки по дню (YYYY-MM-DD) */
function getDateKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Отдельная карточка записи истории (для переиспользования) */
function HistoryRecordCard({ record, task }: { record: TaskCompletionRecord; task: TaskRpg }) {
  const isOnce = task.recurrence === 'once'
  const config =
    record.status === 'skipped' && isOnce
      ? { bg: 'bg-gradient-to-b from-red-500/15 to-red-500/5', iconBg: 'bg-gradient-to-b from-red-500/25 to-red-500/10 text-red-500 ring-1 ring-inset ring-red-400/30', icon: XCircle, label: 'Провалено' }
    : record.status === 'missed' && isOnce
      ? { bg: 'bg-gradient-to-b from-red-500/15 to-red-500/5', iconBg: 'bg-gradient-to-b from-red-500/25 to-red-500/10 text-red-500 ring-1 ring-inset ring-red-400/30', icon: XCircle, label: 'Провалено (авто)' }
    : record.status === 'missed'
      ? { bg: 'bg-gradient-to-b from-blue-500/15 to-blue-500/5', iconBg: 'bg-gradient-to-b from-blue-500/25 to-blue-500/10 text-blue-500 ring-1 ring-inset ring-blue-400/30', icon: SkipForward, label: 'Пропущено (авто)' }
    : STATUS_CONFIG[record.status]
  const Icon = config.icon
  const subs = record.completedSubtasks ?? []
  const recXp = (record.xpEarned ?? 0) + subs.reduce((s, sub) => s + (sub.xpEarned ?? 0), 0)
  const recCoins = (record.coinsEarned ?? 0) + subs.reduce((s, sub) => s + (sub.coinReward ?? 0), 0)
  const recGems = (record.gemsEarned ?? 0) + subs.reduce((s, sub) => s + (sub.gemReward ?? 0), 0)

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <div className={cn('flex items-center gap-3 p-3', config.bg)}>
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', config.iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--fg)]">{config.label}</p>
          <p className="text-[11px] text-[var(--fg-muted)]">{formatTime(record.completedAt ?? record.cycleStart)}</p>
        </div>
        {record.status === 'completed' && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs shrink-0">
            {recXp > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-lg bg-gradient-to-b from-purple-500/20 to-purple-500/8 px-1.5 py-0.5 text-purple-500 font-semibold ring-1 ring-inset ring-purple-400/25 shadow-sm shadow-purple-500/10">
                <Zap className="h-3 w-3" />+{recXp}
              </span>
            )}
            {recCoins > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-lg bg-gradient-to-b from-amber-500/20 to-amber-500/8 px-1.5 py-0.5 text-amber-500 font-semibold ring-1 ring-inset ring-amber-400/25 shadow-sm shadow-amber-500/10">
                <Coins className="h-3 w-3" />+{recCoins}
              </span>
            )}
            {recGems > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-lg bg-gradient-to-b from-cyan-500/20 to-cyan-500/8 px-1.5 py-0.5 text-cyan-500 font-semibold ring-1 ring-inset ring-cyan-400/25 shadow-sm shadow-cyan-500/10">
                <Gem className="h-3 w-3" strokeWidth={2.5} />+{recGems}
              </span>
            )}
          </div>
        )}
      </div>
      {subs.length > 0 && (
        <div className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ListChecks className="h-3 w-3 text-[var(--fg-muted)]" />
            <span className="text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-wider">
              Подзадачи ({subs.filter(s => s.isCompleted !== false).length}/{subs.length})
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {subs.map((sub) => {
              const done = sub.isCompleted !== false
              return (
                <div key={sub.id} className="flex items-center gap-2 py-1">
                  {done ? (
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-emerald-500/20">
                      <Check className="h-2.5 w-2.5 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[var(--border)]">
                      <XCircle className="h-2.5 w-2.5 text-[var(--fg-muted)]" />
                    </div>
                  )}
                  <span className={cn('flex-1 text-xs truncate', done ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]')}>{sub.title}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {(sub.xpEarned ?? 0) > 0 && (
                      <span className="text-[10px] text-purple-500 font-semibold">+{sub.xpEarned} XP</span>
                    )}
                    {(sub.coinReward ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500 font-semibold">
                        <Coins className="h-2.5 w-2.5" />{sub.coinReward}
                      </span>
                    )}
                    {(sub.gemReward ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-cyan-500 font-semibold">
                        <Gem className="h-2.5 w-2.5" strokeWidth={2.5} />{sub.gemReward}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/** Сводная карточка для инстант-задач: «Выполнено (x100)» + разворачиваемый список */
function InstantDaySummary({ records, task: _task }: { records: TaskCompletionRecord[]; task: TaskRpg }) {
  const [expanded, setExpanded] = useState(false)
  const count = records.length

  // Агрегированные награды за день
  const dayXp = records.reduce((sum, r) => {
    const subs = r.completedSubtasks ?? []
    return sum + (r.xpEarned ?? 0) + subs.reduce((s, sub) => s + (sub.xpEarned ?? 0), 0)
  }, 0)
  const dayCoins = records.reduce((sum, r) => {
    const subs = r.completedSubtasks ?? []
    return sum + (r.coinsEarned ?? 0) + subs.reduce((s, sub) => s + (sub.coinReward ?? 0), 0)
  }, 0)
  const dayGems = records.reduce((sum, r) => {
    const subs = r.completedSubtasks ?? []
    return sum + (r.gemsEarned ?? 0) + subs.reduce((s, sub) => s + (sub.gemReward ?? 0), 0)
  }, 0)

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Summary header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className={cn(
          'flex items-center gap-3 p-3 w-full text-left transition-colors',
          'bg-gradient-to-b from-emerald-500/15 to-emerald-500/5',
          'hover:from-emerald-500/20 hover:to-emerald-500/10'
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-emerald-500/25 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/30">
          <Check className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--fg)]">
            Выполнено <span className="text-emerald-500">(x{count})</span>
          </p>
          <p className="text-[11px] text-[var(--fg-muted)]">
            {formatTime(records[records.length - 1].completedAt ?? records[records.length - 1].cycleStart)}
            {' — '}
            {formatTime(records[0].completedAt ?? records[0].cycleStart)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {dayXp > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-lg bg-gradient-to-b from-purple-500/20 to-purple-500/8 px-1.5 py-0.5 text-xs text-purple-500 font-semibold ring-1 ring-inset ring-purple-400/25 shadow-sm shadow-purple-500/10">
              <Zap className="h-3 w-3" />+{dayXp}
            </span>
          )}
          {dayCoins > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-lg bg-gradient-to-b from-amber-500/20 to-amber-500/8 px-1.5 py-0.5 text-xs text-amber-500 font-semibold ring-1 ring-inset ring-amber-400/25 shadow-sm shadow-amber-500/10">
              <Coins className="h-3 w-3" />+{dayCoins}
            </span>
          )}
          {dayGems > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-lg bg-gradient-to-b from-cyan-500/20 to-cyan-500/8 px-1.5 py-0.5 text-xs text-cyan-500 font-semibold ring-1 ring-inset ring-cyan-400/25 shadow-sm shadow-cyan-500/10">
              <Gem className="h-3 w-3" strokeWidth={2.5} />+{dayGems}
            </span>
          )}
          <ChevronDown className={cn('h-4 w-4 text-[var(--fg-muted)] transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      {/* Expanded detail list */}
      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2 flex flex-col gap-1.5">
          {records.map((record) => {
            const subs = record.completedSubtasks ?? []
            const recXp = (record.xpEarned ?? 0) + subs.reduce((s, sub) => s + (sub.xpEarned ?? 0), 0)
            const recCoins = (record.coinsEarned ?? 0) + subs.reduce((s, sub) => s + (sub.coinReward ?? 0), 0)
            const recGems = (record.gemsEarned ?? 0) + subs.reduce((s, sub) => s + (sub.gemReward ?? 0), 0)
            return (
              <div key={record.id} className="flex items-center gap-2 py-1">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                  <Check className="h-3 w-3 text-emerald-500" />
                </div>
                <span className="text-xs text-[var(--fg-muted)] shrink-0">
                  {formatTime(record.completedAt ?? record.cycleStart)}
                </span>
                <div className="flex-1" />
                <div className="flex items-center gap-1 shrink-0">
                  {recXp > 0 && (
                    <span className="text-[10px] text-purple-500 font-semibold">+{recXp} XP</span>
                  )}
                  {recCoins > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500 font-semibold">
                      <Coins className="h-2.5 w-2.5" />+{recCoins}
                    </span>
                  )}
                  {recGems > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-cyan-500 font-semibold">
                      <Gem className="h-2.5 w-2.5" strokeWidth={2.5} />+{recGems}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function TaskHistoryBlock({ task, nowMs = Date.now() }: TaskBlockProps) {
  const history = (task.completionHistory ?? [])
    .slice()
    .sort((a, b) => (b.completedAt ?? b.cycleStart) - (a.completedAt ?? a.cycleStart))

  // Подсчёт итого по всем записям
  const totalCoins = history.reduce((sum, r) => sum + (r.coinsEarned ?? 0), 0)
  const totalGems = history.reduce((sum, r) => sum + (r.gemsEarned ?? 0), 0)
  const totalXp = history.reduce((sum, r) => sum + (r.xpEarned ?? 0), 0)
  // Суммируем монеты/гемы подзадач из всей истории
  const totalSubCoins = history.reduce((sum, r) =>
    sum + (r.completedSubtasks ?? []).reduce((s, sub) => s + (sub.coinReward ?? 0), 0), 0)
  const totalSubGems = history.reduce((sum, r) =>
    sum + (r.completedSubtasks ?? []).reduce((s, sub) => s + (sub.gemReward ?? 0), 0), 0)
  const totalSubXp = history.reduce((sum, r) =>
    sum + (r.completedSubtasks ?? []).reduce((s, sub) => s + (sub.xpEarned ?? 0), 0), 0)
  const grandCoins = totalCoins + totalSubCoins
  const grandGems = totalGems + totalSubGems
  const grandXp = totalXp + totalSubXp
  const hasStats = grandCoins > 0 || grandGems > 0 || grandXp > 0

  // Группировка по датам
  const grouped = new Map<string, typeof history>()
  for (const record of history) {
    const key = getDateKey(record.completedAt ?? record.cycleStart)
    const arr = grouped.get(key) ?? []
    arr.push(record)
    grouped.set(key, arr)
  }
  const sortedGroups = Array.from(grouped.entries())

  return (
    <CollapsibleBlock
      icon={<History className="h-4.5 w-4.5" />}
      title="История"
    >
      <div className="mt-3">
        {history.length > 0 ? (
          <div className="flex flex-col gap-4">
            {/* Total stats — compact row */}
            {hasStats && (
              <div className="flex items-center gap-2 rounded-xl bg-[var(--surface)] px-3 py-2 border border-[var(--border)]">
                <TrendingUp className="h-3.5 w-3.5 text-[var(--fg-muted)] shrink-0" />
                <span className="text-xs text-[var(--fg-muted)] shrink-0">Всего:</span>
                <div className="flex flex-wrap items-center gap-2">
                  {grandXp > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-500">
                      <Zap className="h-3.5 w-3.5" />{grandXp} XP
                    </span>
                  )}
                  {grandCoins > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
                      <Coins className="h-3.5 w-3.5" />{grandCoins}
                    </span>
                  )}
                  {grandGems > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-500">
                      <Gem className="h-3.5 w-3.5" strokeWidth={2.5} />{grandGems}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Date groups */}
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
              {sortedGroups.map(([dateKey, records]) => {
                const groupTs = records[0].completedAt ?? records[0].cycleStart
                const isInstant = task.recurrence === 'instant'
                const completedRecords = isInstant ? records.filter(r => r.status === 'completed') : []
                const otherRecords = isInstant ? records.filter(r => r.status !== 'completed') : records
                return (
                  <div key={dateKey}>
                    {/* Date header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                        {formatGroupDate(groupTs, nowMs)}
                      </span>
                      <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Instant: сводная карточка для выполненных записей */}
                      {isInstant && completedRecords.length > 0 && (
                        <InstantDaySummary records={completedRecords} task={task} />
                      )}

                      {/* Остальные записи (skipped/missed для instant, все для обычных) */}
                      {otherRecords.map((record) => (
                        <HistoryRecordCard key={record.id} record={record} task={task} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <History className="h-8 w-8 mx-auto mb-2 text-[var(--fg-muted)] opacity-40" />
            <p className="text-sm text-[var(--fg-muted)]">
              История пока пуста
            </p>
          </div>
        )}
      </div>
    </CollapsibleBlock>
  )
}
