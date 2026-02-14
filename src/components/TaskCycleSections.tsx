import { useState } from 'react'
import {
  ChevronDown, ChevronRight, RefreshCw, CalendarClock, BarChart3, History,
  Check, SkipForward, XCircle, Zap, Coins, Gem
} from 'lucide-react'
import { cn } from '../lib/cn'
import type { TaskRpg } from '../types/domain'
import {
  getNextAvailableDate,
  getCompletionRate, formatCycleDateRu, formatDateShortRu, getRelativeTimeRu,
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
  return (
    <div className="glass rounded-2xl mb-4 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
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

export function TaskCurrentCycleBlock({ task }: TaskBlockProps) {
  const nextAvailable = getNextAvailableDate(task)
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
          {task.recurrence === 'weekly' && rs?.weeklyMode === 'timesPerWeek' && rs.weeklyTimesPerWeek ? (
            /* Режим «N раз в неделю» — показываем прогресс */
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold',
              (rs.weeklyCompletedThisWeek ?? 0) >= rs.weeklyTimesPerWeek
                ? 'bg-blue-500/15 text-blue-500'
                : 'bg-amber-500/15 text-amber-500'
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
                const isToday = new Date().getDay() === day
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
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold',
              isLimitReached
                ? 'bg-emerald-500/15 text-emerald-500'
                : task.isCompleted
                ? 'bg-blue-500/15 text-blue-500'
                : 'bg-amber-500/15 text-amber-500'
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
        {task.recurrence === 'instant' ? (
          <div className="flex items-center gap-3 rounded-xl bg-blue-500/10 p-3 border-t border-[var(--border)]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
              <Zap className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-500">Доступно сразу</p>
              <p className="text-xs text-[var(--fg-muted)]">Сбрасывается после выполнения</p>
            </div>
          </div>
        ) : isLimitReached ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 p-3 border-t border-[var(--border)]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
              <Check className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-500">Задача завершена навсегда</p>
              <p className="text-xs text-[var(--fg-muted)]">Достигнут лимит повторов — больше циклов не будет</p>
            </div>
          </div>
        ) : task.isCompleted && nextAvailable != null ? (
          // Задача выполнена за цикл — показываем когда можно снова
          <div className="flex items-center gap-3 rounded-xl bg-indigo-500/10 p-3 border border-indigo-500/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
              <CalendarClock className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">Следующий цикл</p>
              <p className="text-sm font-bold text-indigo-500">{formatDateShortRu(nextAvailable)}</p>
              <p className="text-xs text-[var(--fg-muted)]">Доступна {getRelativeTimeRu(nextAvailable).toLowerCase()}</p>
            </div>
          </div>
        ) : !task.isCompleted && nextAvailable != null ? (
          // Задача ещё не выполнена — проверяем, запланирована ли сегодня
          isTodayScheduled(task) ? (
            <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 p-3 border border-amber-500/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                <CalendarClock className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-0.5">Текущий цикл</p>
                <p className="text-sm font-bold text-amber-500">Доступна сейчас</p>
                <p className="text-xs text-[var(--fg-muted)]">Выполните задачу, чтобы получить награды</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-orange-500/10 p-3 border border-orange-500/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20">
                <CalendarClock className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-0.5">Текущий цикл</p>
                <p className="text-sm font-bold text-orange-500">Сегодня не запланировано</p>
                <p className="text-xs text-[var(--fg-muted)]">Ближайший день: {getNextScheduledDayName(task)}</p>
              </div>
            </div>
          )
        ) : null}

        {/* Информация об окончании повтора */}
        {rs && rs.endMode !== 'never' && (
          <div className="rounded-xl bg-orange-500/10 p-3 border border-orange-500/30">
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
export function TaskNextCycleBlock({ task }: TaskBlockProps) {
  return null
}

// ─── 3. Статистика задач ─────────────────────────────────────────────────

export function TaskStatsBlock({ task }: TaskBlockProps) {
  const history = task.completionHistory ?? []
  const completedCount = history.filter(r => r.status === 'completed').length
    || task.recurrenceSettings?.completedCount
    || 0
  const skippedCount = task.totalSkipped ?? 0
  const rate = getCompletionRate(task)
  const streak = task.currentStreak ?? 0
  const best = task.bestStreak ?? 0
  const hasData = history.length > 0 || completedCount > 0

  return (
    <CollapsibleBlock
      icon={<BarChart3 className="h-4.5 w-4.5" />}
      title="Статистика задач"
    >
      <div className="mt-3">
        {hasData ? (
          <>
            {/* Обзор процента выполнения */}
            <div className="mb-4 rounded-xl bg-[var(--surface)] p-4">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card">
                <div className="stat-value text-emerald-500">{completedCount}</div>
                <div className="stat-label">Выполнено</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-red-500">{skippedCount}</div>
                <div className="stat-label">Пропущено</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-orange-500">{streak}</div>
                <div className="stat-label">Текущая серия</div>
              </div>
              <div className="stat-card">
                <div className="stat-value text-purple-500">{best}</div>
                <div className="stat-label">Лучшая серия</div>
              </div>
            </div>
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
    bg: 'bg-emerald-500/10',
    iconBg: 'bg-emerald-500/20 text-emerald-500',
    icon: Check,
    label: 'Выполнено',
  },
  skipped: {
    bg: 'bg-blue-500/10',
    iconBg: 'bg-blue-500/20 text-blue-500',
    icon: SkipForward,
    label: 'Пропущено',
  },
  missed: {
    bg: 'bg-red-500/10',
    iconBg: 'bg-red-500/20 text-red-500',
    icon: XCircle,
    label: 'Пропущено (авто)',
  },
} as const

export function TaskHistoryBlock({ task }: TaskBlockProps) {
  const history = (task.completionHistory ?? [])
    .slice()
    .sort((a, b) => b.cycleStart - a.cycleStart)

  return (
    <CollapsibleBlock
      icon={<History className="h-4.5 w-4.5" />}
      title="История"
    >
      <div className="mt-3">
        {history.length > 0 ? (
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
            {history.map((record) => {
              const config = STATUS_CONFIG[record.status]
              const Icon = config.icon
              return (
                <div
                  key={record.id}
                  className={cn(
                    'flex items-center gap-3 rounded-xl p-3',
                    config.bg
                  )}
                >
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    config.iconBg
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--fg)]">
                      {config.label}
                    </p>
                    <p className="text-xs text-[var(--fg-muted)]">
                      {formatCycleDateRu(record.completedAt ?? record.cycleStart)}
                    </p>
                  </div>
                  {record.status === 'completed' && (
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      {(record.xpEarned ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-purple-500 font-semibold">
                          <Zap className="h-3 w-3" />+{record.xpEarned}
                        </span>
                      )}
                      {(record.coinsEarned ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-amber-500 font-semibold">
                          <Coins className="h-3 w-3" />+{record.coinsEarned}
                        </span>
                      )}
                      {(record.gemsEarned ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-cyan-500 font-semibold">
                          <Gem className="h-3 w-3" strokeWidth={2.5} />+{record.gemsEarned}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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
