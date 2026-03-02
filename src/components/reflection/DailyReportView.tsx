import { useMemo } from 'react'
import {
  CheckSquare, TrendingUp, ShoppingBag, Trophy,
  Flame, Coins, Gem, Zap, MessageCircle,
} from 'lucide-react'
import MoodTracker from './MoodTracker'
import MoodChart from './MoodChart'
import { useRpgStore } from '../../store/useRpgStore'
import { formatDateRu } from '../../lib/reflectionUtils'
import type { DailySnapshot, MoodLevel } from '../../types/domain'

interface DailyReportViewProps {
  dateKey: string
}

function Section({ icon: Icon, title, color, children }: {
  icon: React.ElementType; title: string; color: string; children: React.ReactNode
}) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: color + '20' }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <h3 className="text-sm font-semibold text-[var(--fg)]">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function DailyReportView({ dateKey }: DailyReportViewProps) {
  const generateDailySnapshot = useRpgStore((s) => s.generateDailySnapshot)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const rawReports = useRpgStore((s) => s.dailyReports)
  const setMood = useRpgStore((s) => s.setDailyMood)
  const setThoughts = useRpgStore((s) => s.setDailyThoughts)

  const report = useMemo(
    () => rawReports.find((r) => r.profileId === activeProfileId && r.dateKey === dateKey) ?? null,
    [rawReports, activeProfileId, dateKey],
  )
  const allReports = useMemo(
    () => rawReports.filter((r) => r.profileId === activeProfileId),
    [rawReports, activeProfileId],
  )

  // Generate snapshot — depends on store data which changes rarely
  const tasks = useRpgStore((s) => s.tasks)
  const taskGroups = useRpgStore((s) => s.taskGroups)
  const habits = useRpgStore((s) => s.habits)
  const achievements = useRpgStore((s) => s.achievements)
  const purchaseHistory = useRpgStore((s) => s.purchaseHistory)
  const usageHistory = useRpgStore((s) => s.usageHistory)
  const shopItems = useRpgStore((s) => s.shopItems)

  const snapshot: DailySnapshot = useMemo(
    () => generateDailySnapshot(dateKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateKey, tasks, taskGroups, habits, achievements, purchaseHistory, usageHistory, shopItems],
  )

  // Parse date for display
  const [y, m, d] = dateKey.split('-').map(Number)
  const dateTs = new Date(y, m - 1, d).getTime()
  const dateLabel = formatDateRu(dateTs)

  const hasActivity = snapshot.totalTasksCompleted > 0 ||
    snapshot.habitsPositive.length > 0 ||
    snapshot.itemsPurchased.length > 0 ||
    snapshot.achievementsUnlocked.length > 0

  return (
    <div className="flex flex-col gap-4">
      {/* Date header */}
      <div className="text-center">
        <h2 className="text-lg font-bold text-[var(--fg)]">{dateLabel}</h2>
        <p className="text-xs text-[var(--fg-muted)]">Автоотчёт дня</p>
      </div>

      {/* Mood */}
      <div className="glass-card flex flex-col items-center gap-3 rounded-2xl p-4">
        <p className="text-sm font-medium text-[var(--fg)]">Как прошёл день?</p>
        <MoodTracker value={report?.mood ?? null} onChange={(mood: MoodLevel) => setMood(dateKey, mood)} />
      </div>

      {/* Tasks */}
      {snapshot.tasksCompleted.length > 0 && (
        <Section icon={CheckSquare} title="Задачи" color="#6366f1">
          {snapshot.tasksCompleted.map((group) => (
            <div key={group.groupId ?? 'none'} className="mb-2 last:mb-0">
              <p className="mb-1 text-xs font-medium text-[var(--fg-muted)]">{group.groupName}</p>
              {group.tasks.map((t) => (
                <div key={t.taskId} className="flex items-center justify-between rounded-lg px-2 py-1">
                  <span className="text-sm text-[var(--fg)]">{t.title}</span>
                  <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                    ×{t.count}
                  </span>
                </div>
              ))}
            </div>
          ))}
          <div className="mt-2 border-t border-[var(--border)] pt-2 text-xs text-[var(--fg-muted)]">
            Всего выполнено: {snapshot.totalTasksCompleted}
          </div>
        </Section>
      )}

      {/* Habits */}
      {(snapshot.habitsPositive.length > 0 || snapshot.habitsNegative.length > 0) && (
        <Section icon={TrendingUp} title="Привычки" color="#22c55e">
          {snapshot.habitsPositive.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 text-[10px] font-medium text-green-500">Позитивные</p>
              {snapshot.habitsPositive.map((h) => (
                <div key={h.habitId} className="rounded-lg px-2 py-1 text-sm text-[var(--fg)]">
                  ✓ {h.title}
                </div>
              ))}
            </div>
          )}
          {snapshot.habitsNegative.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-medium text-red-500">Негативные</p>
              {snapshot.habitsNegative.map((h) => (
                <div key={h.habitId} className="rounded-lg px-2 py-1 text-sm text-[var(--fg)]">
                  ✗ {h.title}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Purchases */}
      {snapshot.itemsPurchased.length > 0 && (
        <Section icon={ShoppingBag} title="Покупки" color="#f59e0b">
          {snapshot.itemsPurchased.map((item) => (
            <div key={item.itemId} className="flex items-center justify-between rounded-lg px-2 py-1">
              <span className="text-sm text-[var(--fg)]">{item.name}</span>
              <span className="text-xs text-[var(--fg-muted)]">×{item.count}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Achievements */}
      {snapshot.achievementsUnlocked.length > 0 && (
        <Section icon={Trophy} title="Достижения" color="#eab308">
          {snapshot.achievementsUnlocked.map((a) => (
            <div key={a.achievementId} className="flex items-center gap-2 rounded-lg px-2 py-1">
              <span className="text-base">{a.icon}</span>
              <span className="text-sm text-[var(--fg)]">{a.title}</span>
            </div>
          ))}
        </Section>
      )}

      {/* Streaks */}
      {snapshot.activeStreaks.length > 0 && (
        <Section icon={Flame} title="Стрики" color="#ef4444">
          {snapshot.activeStreaks.slice(0, 5).map((s) => (
            <div key={s.taskId} className="flex items-center justify-between rounded-lg px-2 py-1">
              <span className="text-sm text-[var(--fg)]">{s.title}</span>
              <span className="flex items-center gap-1 text-xs font-medium text-orange-500">
                <Flame className="h-3 w-3" /> {s.streak} дн.
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* Economy summary */}
      {(snapshot.xpEarned > 0 || snapshot.coinsEarned > 0 || snapshot.coinsSpent > 0) && (
        <div className="grid grid-cols-3 gap-2">
          {snapshot.xpEarned > 0 && (
            <div className="glass-card flex flex-col items-center gap-1 rounded-xl p-3">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-bold text-[var(--fg)]">+{snapshot.xpEarned}</span>
              <span className="text-[10px] text-[var(--fg-muted)]">XP</span>
            </div>
          )}
          {snapshot.coinsEarned > 0 && (
            <div className="glass-card flex flex-col items-center gap-1 rounded-xl p-3">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-bold text-[var(--fg)]">+{snapshot.coinsEarned}</span>
              <span className="text-[10px] text-[var(--fg-muted)]">Монет</span>
            </div>
          )}
          {snapshot.coinsSpent > 0 && (
            <div className="glass-card flex flex-col items-center gap-1 rounded-xl p-3">
              <ShoppingBag className="h-4 w-4 text-red-400" />
              <span className="text-sm font-bold text-[var(--fg)]">-{snapshot.coinsSpent}</span>
              <span className="text-[10px] text-[var(--fg-muted)]">Потрачено</span>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasActivity && (
        <div className="glass-card flex flex-col items-center justify-center rounded-2xl py-8 text-center">
          <p className="text-sm text-[var(--fg-muted)]">Нет активности за этот день</p>
        </div>
      )}

      {/* Thoughts */}
      <div className="glass-card rounded-2xl p-4">
        <div className="mb-2 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--fg)]">Мысли дня</h3>
        </div>
        <textarea
          value={report?.thoughts ?? ''}
          onChange={(e) => setThoughts(dateKey, e.target.value)}
          placeholder="Запишите свои мысли за день…"
          className="input w-full resize-none text-sm"
          rows={4}
        />
      </div>

      {/* Mood chart */}
      <div className="glass-card rounded-2xl p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--fg)]">Настроение за 14 дней</h3>
        <MoodChart reports={allReports} days={14} />
      </div>
    </div>
  )
}
