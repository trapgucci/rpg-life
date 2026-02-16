import { useState, useRef, useEffect } from 'react'
import {
  ChevronDown, ChevronRight, RefreshCw, CalendarClock, BarChart3, History,
  Check, SkipForward, XCircle, Zap, Coins, Gem, ListChecks, TrendingUp,
  CheckCircle2, Ban, Flame, Crown, Archive
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
          {task.canceledAt ? (
            /* Архивированная задача */
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold',
              isLimitReached
                ? 'bg-emerald-500/15 text-emerald-500'
                : 'bg-gray-500/15 text-gray-500'
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
        {task.canceledAt ? (
          /* Архивированная задача — только «завершена навсегда» если лимит достигнут */
          isLimitReached ? (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 p-3 border-t border-[var(--border)]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                <Check className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-500">Задача завершена навсегда</p>
                <p className="text-xs text-[var(--fg-muted)]">Достигнут лимит повторов — больше циклов не будет</p>
              </div>
            </div>
          ) : null
        ) : task.recurrence === 'instant' ? (
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

        {/* Информация об окончании повтора (не показываем для архивных задач) */}
        {rs && rs.endMode !== 'never' && !task.canceledAt && (
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

// ─── 3. Статистика задачи ────────────────────────────────────────────────

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
      title="Статистика задачи"
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
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <div className="stat-value text-emerald-500">{completedCount}</div>
                </div>
                <div className="stat-label">Выполнено</div>
              </div>
              <div className="stat-card">
                <div className="flex items-center justify-center gap-2">
                  <Ban className="h-5 w-5 text-red-500" />
                  <div className="stat-value text-red-500">{skippedCount}</div>
                </div>
                <div className="stat-label">Пропущено</div>
              </div>
              <div className="stat-card">
                <div className="flex items-center justify-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <div className="stat-value text-orange-500">{streak}</div>
                </div>
                <div className="stat-label">Текущая серия</div>
              </div>
              <div className="stat-card">
                <div className="flex items-center justify-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <div className="stat-value text-amber-500">{best}</div>
                </div>
                <div className="stat-label">Лучший результат</div>
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

/** Форматирование даты для заголовка группы (14 февраля) */
function formatGroupDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
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

export function TaskHistoryBlock({ task }: TaskBlockProps) {
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
                return (
                  <div key={dateKey}>
                    {/* Date header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                        {formatGroupDate(groupTs)}
                      </span>
                      <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>

                    {/* Records for this date */}
                    <div className="flex flex-col gap-2">
                      {records.map((record) => {
                        // Для once-задач пропуск = провал → красный стиль
                        // Для recurring-задач пропуск (авто) → синий стиль
                        const isOnce = task.recurrence === 'once'
                        const config =
                          record.status === 'skipped' && isOnce
                            ? { bg: 'bg-red-500/10', iconBg: 'bg-red-500/20 text-red-500', icon: XCircle, label: 'Провалено' }
                          : record.status === 'missed' && isOnce
                            ? { bg: 'bg-red-500/10', iconBg: 'bg-red-500/20 text-red-500', icon: XCircle, label: 'Провалено (авто)' }
                          : record.status === 'missed'
                            ? { bg: 'bg-blue-500/10', iconBg: 'bg-blue-500/20 text-blue-500', icon: SkipForward, label: 'Пропущено (авто)' }
                          : STATUS_CONFIG[record.status]
                        const Icon = config.icon
                        const subs = record.completedSubtasks ?? []
                        // Суммируем основные + подзадачные награды для записи
                        const recXp = (record.xpEarned ?? 0) + subs.reduce((s, sub) => s + (sub.xpEarned ?? 0), 0)
                        const recCoins = (record.coinsEarned ?? 0) + subs.reduce((s, sub) => s + (sub.coinReward ?? 0), 0)
                        const recGems = (record.gemsEarned ?? 0) + subs.reduce((s, sub) => s + (sub.gemReward ?? 0), 0)
                        return (
                          <div key={record.id} className="rounded-xl border border-[var(--border)] overflow-hidden">
                            {/* Main record row */}
                            <div
                              className={cn(
                                'flex items-center gap-3 p-3',
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
                                <p className="text-sm font-semibold text-[var(--fg)]">
                                  {config.label}
                                </p>
                                <p className="text-[11px] text-[var(--fg-muted)]">
                                  {formatTime(record.completedAt ?? record.cycleStart)}
                                </p>
                              </div>
                              {record.status === 'completed' && (
                                <div className="flex flex-wrap items-center gap-1.5 text-xs shrink-0">
                                  {recXp > 0 && (
                                    <span className="inline-flex items-center gap-0.5 rounded-md bg-purple-500/10 px-1.5 py-0.5 text-purple-500 font-semibold border border-purple-500/20">
                                      <Zap className="h-3 w-3" />+{recXp}
                                    </span>
                                  )}
                                  {recCoins > 0 && (
                                    <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-amber-500 font-semibold border border-amber-500/20">
                                      <Coins className="h-3 w-3" />+{recCoins}
                                    </span>
                                  )}
                                  {recGems > 0 && (
                                    <span className="inline-flex items-center gap-0.5 rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-cyan-500 font-semibold border border-cyan-500/20">
                                      <Gem className="h-3 w-3" strokeWidth={2.5} />+{recGems}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Completed subtasks */}
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
                                          <span className="text-[10px] text-purple-500 font-semibold">
                                            +{sub.xpEarned} XP
                                          </span>
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
                      })}
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
