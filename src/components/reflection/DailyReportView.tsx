import { useMemo, useRef, useEffect, useCallback, useState } from 'react'
import {
  CheckSquare, ShoppingBag, Trophy,
  Flame, Coins, Zap, MessageCircle, ImagePlus, X,
  Gem, ChevronDown, ChevronRight,
} from 'lucide-react'
import MoodTracker from './MoodTracker'
import MoodChart from './MoodChart'
import ImageLightbox from './ImageLightbox'
import { useRpgStore } from '../../store/useRpgStore'
import { formatDateRu } from '../../lib/reflectionUtils'
import { vaultStorage } from '../../lib/vaultStorage'
import { resizeImageFile } from '../../lib/resizeImage'
import type { DailySnapshot, MoodLevel } from '../../types/domain'

interface DailyReportViewProps {
  dateKey: string
}

const sectionNeuStyle: React.CSSProperties = {
  background: 'var(--surface-card)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow), inset 0 1px 0 var(--neu-inset-light)',
}

function Section({ icon: Icon, title, color, children }: {
  icon: React.ElementType; title: string; color: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl p-4" style={sectionNeuStyle}>
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{
            background: `linear-gradient(145deg, ${color}25, ${color}15)`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 6px ${color}20`,
            border: `1px solid ${color}20`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <h3 className="text-sm font-semibold text-[var(--fg)]">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function AutoResizeTextarea({ value, onChange, placeholder }: {
  value: string; onChange: (val: string) => void; placeholder: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [])

  useEffect(() => { resize() }, [value, resize])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
      placeholder={placeholder}
      className="input w-full resize-none text-sm overflow-hidden"
      rows={3}
    />
  )
}

type SnapshotTask = DailySnapshot['tasksCompleted'][number]['tasks'][number]

function RewardBadges({ xp, coins, gems, size = 'sm' }: {
  xp?: number; coins?: number; gems?: number; size?: 'sm' | 'xs'
}) {
  if (!(xp && xp > 0) && !(coins && coins > 0) && !(gems && gems > 0)) return null
  const cls = size === 'sm'
    ? 'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold'
    : 'inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-semibold'
  const icon = size === 'sm' ? 'h-3 w-3' : 'h-2.5 w-2.5'
  return (
    <div className="flex flex-wrap gap-1">
      {xp != null && xp > 0 && (
        <span className={`${cls} bg-purple-500/15 text-purple-400`}>
          <Zap className={icon} /> +{xp}
        </span>
      )}
      {coins != null && coins > 0 && (
        <span className={`${cls} bg-amber-500/15 text-amber-400`}>
          <Coins className={icon} /> +{coins}
        </span>
      )}
      {gems != null && gems > 0 && (
        <span className={`${cls} bg-cyan-500/15 text-cyan-400`}>
          <Gem className={icon} strokeWidth={2.5} /> +{gems}
        </span>
      )}
    </div>
  )
}

function TaskRow({ task }: { task: SnapshotTask }) {
  const [expanded, setExpanded] = useState(false)
  const hasSubtasks = task.subtasks && task.subtasks.length > 0

  return (
    <div className="rounded-lg transition-colors hover:bg-[var(--surface-elevated)]/50">
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 ${hasSubtasks ? 'cursor-pointer' : ''}`}
        onClick={hasSubtasks ? () => setExpanded((v) => !v) : undefined}
      >
        {hasSubtasks && (
          expanded
            ? <ChevronDown className="h-3 w-3 shrink-0 text-[var(--fg-muted)]" />
            : <ChevronRight className="h-3 w-3 shrink-0 text-[var(--fg-muted)]" />
        )}
        <span className="flex-1 text-sm text-[var(--fg)]">{task.title}</span>
        {task.count > 1 && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{
              background: 'linear-gradient(145deg, rgba(99,102,241,0.15), rgba(99,102,241,0.08))',
              color: '#818cf8',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {'\u00d7'}{task.count}
          </span>
        )}
      </div>
      {/* Rewards */}
      <div className={`px-2 pb-1 ${hasSubtasks ? 'pl-7' : ''}`}>
        <RewardBadges xp={task.xpEarned} coins={task.coinsEarned} gems={task.gemsEarned} />
      </div>
      {/* Subtasks */}
      {hasSubtasks && expanded && (
        <div className="pl-7 pr-2 pb-1.5">
          {task.subtasks!.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2 py-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                <span className="text-xs text-[var(--fg-muted)] truncate">{s.title}</span>
              </div>
              <RewardBadges xp={s.xpEarned} coins={s.coinReward} gems={s.gemReward} size="xs" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DailyReportView({ dateKey }: DailyReportViewProps) {
  const generateDailySnapshot = useRpgStore((s) => s.generateDailySnapshot)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const rawReports = useRpgStore((s) => s.dailyReports)
  const setMood = useRpgStore((s) => s.setDailyMood)
  const setThoughts = useRpgStore((s) => s.setDailyThoughts)
  const addPhoto = useRpgStore((s) => s.addDailyPhoto)
  const removePhoto = useRpgStore((s) => s.removeDailyPhoto)

  const report = useMemo(
    () => rawReports.find((r) => r.profileId === activeProfileId && r.dateKey === dateKey) ?? null,
    [rawReports, activeProfileId, dateKey],
  )
  const allReports = useMemo(
    () => rawReports.filter((r) => r.profileId === activeProfileId),
    [rawReports, activeProfileId],
  )

  const saveDailySnapshot = useRpgStore((s) => s.saveDailySnapshot)

  // Generate snapshot — depends on store data which changes rarely
  const tasks = useRpgStore((s) => s.tasks)
  const taskGroups = useRpgStore((s) => s.taskGroups)
  const achievements = useRpgStore((s) => s.achievements)
  const purchaseHistory = useRpgStore((s) => s.purchaseHistory)
  const usageHistory = useRpgStore((s) => s.usageHistory)
  const shopItems = useRpgStore((s) => s.shopItems)

  // Today's dateKey for comparison
  const todayKey = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const isToday = dateKey === todayKey

  // Live snapshot (generated on the fly) — only for today or fallback
  const liveSnapshot: DailySnapshot = useMemo(
    () => generateDailySnapshot(dateKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateKey, tasks, taskGroups, achievements, purchaseHistory, usageHistory, shopItems],
  )

  // Use saved snapshot for past days, live for today
  const snapshot: DailySnapshot = isToday
    ? liveSnapshot
    : (report?.snapshot ?? liveSnapshot)

  const [moodDays, setMoodDays] = useState<7 | 14 | 30>(14)

  // Debounced thoughts
  const [localThoughts, setLocalThoughts] = useState(report?.thoughts ?? '')
  const thoughtsRef = useRef(localThoughts)
  const thoughtsTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => { thoughtsRef.current = localThoughts }, [localThoughts])

  // Sync local thoughts when dateKey changes
  useEffect(() => {
    setLocalThoughts(report?.thoughts ?? '')
  }, [dateKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save to store
  useEffect(() => {
    if (localThoughts === (report?.thoughts ?? '')) return
    if (thoughtsTimerRef.current) clearTimeout(thoughtsTimerRef.current)
    thoughtsTimerRef.current = setTimeout(() => {
      setThoughts(dateKey, localThoughts)
      thoughtsTimerRef.current = undefined
    }, 500)
    return () => {
      if (thoughtsTimerRef.current) clearTimeout(thoughtsTimerRef.current)
    }
  }, [localThoughts]) // eslint-disable-line react-hooks/exhaustive-deps

  // Flush thoughts on unmount
  useEffect(() => {
    return () => {
      if (thoughtsTimerRef.current) {
        clearTimeout(thoughtsTimerRef.current)
        setThoughts(dateKey, thoughtsRef.current)
      }
    }
  }, [dateKey, setThoughts])

  // Auto-save snapshot for today with debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!isToday) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveDailySnapshot(dateKey)
    }, 3000)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, dateKey, liveSnapshot])

  // Parse date for display
  const [y, m, d] = dateKey.split('-').map(Number)
  const dateTs = new Date(y, m - 1, d).getTime()
  const dateLabel = formatDateRu(dateTs)

  const hasActivity = snapshot.totalTasksCompleted > 0 ||
    snapshot.habitsPositive.length > 0 ||
    snapshot.itemsPurchased.length > 0 ||
    snapshot.achievementsUnlocked.length > 0

  // Weekly summary (last 7 days) — single pass over data
  const weekSummary = useMemo(() => {
    let totalTasks = 0, totalXp = 0, totalCoins = 0, totalGems = 0, totalSpent = 0, totalGemsSpent = 0, totalPurchases = 0

    // Collect 7 day boundaries
    const weekDays: { key: string; start: number; end: number }[] = []
    for (let i = 0; i < 7; i++) {
      const dd = new Date(y, m - 1, d)
      dd.setDate(dd.getDate() - i)
      const key = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`
      weekDays.push({
        key,
        start: new Date(dd.getFullYear(), dd.getMonth(), dd.getDate(), 0, 0, 0, 0).getTime(),
        end: new Date(dd.getFullYear(), dd.getMonth(), dd.getDate(), 23, 59, 59, 999).getTime(),
      })
    }

    // For days with saved snapshots (or today's live snapshot), use them directly
    // Collect keys that need raw computation
    const unsavedDayKeys = new Set<string>()
    const unsavedDays: { key: string; start: number; end: number }[] = []

    for (const day of weekDays) {
      if (day.key === todayKey) {
        // Today — use live snapshot
        const snap = liveSnapshot
        totalTasks += snap.totalTasksCompleted
        totalXp += snap.xpEarned
        totalCoins += snap.coinsEarned
        totalSpent += snap.coinsSpent
        totalGemsSpent += snap.gemsSpent
        for (const g of snap.tasksCompleted) for (const tk of g.tasks) totalGems += tk.gemsEarned
        for (const p of snap.itemsPurchased) totalPurchases += p.count
      } else {
        const savedReport = allReports.find((r) => r.dateKey === day.key)
        if (savedReport?.snapshot) {
          const snap = savedReport.snapshot
          totalTasks += snap.totalTasksCompleted
          totalXp += snap.xpEarned
          totalCoins += snap.coinsEarned
          totalSpent += snap.coinsSpent
          totalGemsSpent += snap.gemsSpent
          for (const g of snap.tasksCompleted) for (const tk of g.tasks) totalGems += tk.gemsEarned
          for (const p of snap.itemsPurchased) totalPurchases += p.count
        } else {
          unsavedDayKeys.add(day.key)
          unsavedDays.push(day)
        }
      }
    }

    // Single pass for unsaved days — compute totals from raw data
    if (unsavedDays.length > 0) {
      const weekStart = unsavedDays[unsavedDays.length - 1].start
      const weekEnd = unsavedDays[0].end

      // Tasks — single pass over completionHistory
      const profileTasks = tasks.filter((t) => t.profileId === activeProfileId)
      for (const task of profileTasks) {
        for (const r of task.completionHistory ?? []) {
          if (r.status !== 'completed' || !r.completedAt) continue
          if (r.completedAt < weekStart || r.completedAt > weekEnd) continue
          // Find which unsaved day this belongs to
          for (const day of unsavedDays) {
            if (r.completedAt >= day.start && r.completedAt <= day.end) {
              totalTasks += 1
              totalXp += r.xpEarned ?? 0
              totalCoins += r.coinsEarned ?? 0
              totalGems += r.gemsEarned ?? 0
              break
            }
          }
        }
      }

      // Purchases — single pass
      for (const p of purchaseHistory) {
        if (p.profileId !== activeProfileId) continue
        if (p.timestamp < weekStart || p.timestamp > weekEnd) continue
        for (const day of unsavedDays) {
          if (p.timestamp >= day.start && p.timestamp <= day.end) {
            totalPurchases += 1
            const item = shopItems.find((si) => si.id === p.itemId)
            if (p.packageName) {
              const pkg = item?.gameTimePackages?.find((pk) => `${pk.hours} ч` === p.packageName || pk.id === p.packageName)
              totalSpent += pkg?.cost ?? item?.cost?.coins ?? 0
            } else if (p.seasonNumber != null && p.episodeNumber != null) {
              const season = item?.serialSeasons?.find((s) => s.number === p.seasonNumber)
              const episode = season?.episodes.find((e) => e.number === p.episodeNumber)
              totalSpent += episode?.cost ?? item?.cost?.coins ?? 0
            } else {
              totalSpent += item?.cost?.coins ?? 0
            }
            totalGemsSpent += item?.cost?.gems ?? 0
            break
          }
        }
      }
    }

    return { totalTasks, totalXp, totalCoins, totalGems, totalSpent, totalGemsSpent, totalPurchases }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, todayKey, liveSnapshot, allReports, tasks, taskGroups, achievements, purchaseHistory, usageHistory, shopItems])

  // Photos
  const photos = report?.photos ?? []
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [thumbs, setThumbs] = useState<Map<string, string>>(new Map())
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    if (photos.length === 0) {
      setThumbs(new Map())
      return
    }
    let cancelled = false
    const resolve = async () => {
      const map = new Map<string, string>()
      const results = await Promise.all(
        photos.map(async (path) => {
          const data = await vaultStorage.readMedia(path)
          return { path, data }
        })
      )
      if (cancelled) return
      for (const { path, data } of results) {
        if (data) map.set(path, data)
      }
      setThumbs(map)
    }
    resolve()
    return () => { cancelled = true }
  }, [photos])

  const handleAddPhoto = () => fileInputRef.current?.click()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const fileList = Array.from(files)
    e.target.value = ''
    for (const file of fileList) {
      try {
        const resized = await resizeImageFile(file)
        const mediaPath = await vaultStorage.saveMedia(resized, 'webp')
        if (!mediaPath) continue
        addPhoto(dateKey, mediaPath)
      } catch (err) {
        console.error('Failed to add photo:', err)
      }
    }
  }

  const handleRemovePhoto = (mediaPath: string) => {
    vaultStorage.deleteMedia(mediaPath).catch(() => {})
    removePhoto(dateKey, mediaPath)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Date header */}
      <div className="text-center">
        <h2 className="text-lg font-bold text-[var(--fg)]">{dateLabel}</h2>
        <p className="text-xs text-[var(--fg-muted)]">Автоотчёт дня</p>
      </div>

      {/* Mood */}
      <div
        className="flex flex-col items-center gap-3 rounded-2xl p-5"
        style={sectionNeuStyle}
      >
        <p className="text-sm font-medium text-[var(--fg)]">Как прошёл день?</p>
        <MoodTracker value={report?.mood ?? null} onChange={(mood: MoodLevel) => setMood(dateKey, mood)} />
      </div>

      {/* Tasks */}
      {snapshot.tasksCompleted.length > 0 && (
        <Section icon={CheckSquare} title="Задачи" color="#6366f1">
          {snapshot.tasksCompleted.map((group) => (
            <div key={group.groupId ?? 'none'} className="mb-3 last:mb-0">
              <p className="mb-1.5 text-xs font-medium text-[var(--fg-muted)]">{group.groupName}</p>
              {group.tasks.map((t) => (
                <TaskRow key={t.taskId} task={t} />
              ))}
            </div>
          ))}
          <div className="mt-2 border-t border-[var(--border)] pt-2 text-xs text-[var(--fg-muted)]">
            Всего выполнено: {snapshot.totalTasksCompleted}
          </div>
        </Section>
      )}

      {/* Purchases */}
      {snapshot.itemsPurchased.length > 0 && (
        <Section icon={ShoppingBag} title="Покупки" color="#f59e0b">
          {snapshot.itemsPurchased.map((item, i) => (
            <div key={`${item.itemId}-${i}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--surface-elevated)]/50">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm text-[var(--fg)] truncate">{item.name}</span>
                {item.details && (
                  <span className="text-[10px] text-[var(--fg-muted)]">{item.details}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {item.count > 1 && (
                  <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold bg-indigo-500/15 text-indigo-400">
                    {'\u00d7'}{item.count}
                  </span>
                )}
                {item.totalCost > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold bg-amber-500/15 text-amber-400">
                    <Coins className="h-3 w-3" /> -{item.totalCost}
                  </span>
                )}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Achievements */}
      {snapshot.achievementsUnlocked.length > 0 && (
        <Section icon={Trophy} title="Достижения" color="#eab308">
          {snapshot.achievementsUnlocked.map((a) => (
            <div key={a.achievementId} className="rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--surface-elevated)]/50">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base"
                  style={{
                    background: 'linear-gradient(145deg, #fbbf2430, #f59e0b20)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  {a.icon}
                </div>
                <span className="flex-1 text-sm text-[var(--fg)]">{a.title}</span>
                {a.repeatable && (a.completionCount ?? 0) > 0 && (
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: 'rgba(6,182,212,0.12)', color: '#22d3ee' }}
                  >
                    {'\u00d7'}{a.completionCount}
                  </span>
                )}
              </div>
              <div className="ml-9.5 mt-1">
                <RewardBadges xp={a.rewardXp} coins={a.rewardCoins} gems={a.rewardGems} />
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Streaks (3+ days) */}
      {snapshot.activeStreaks.length > 0 && (
        <Section icon={Flame} title="Стрики" color="#ef4444">
          {snapshot.activeStreaks.map((s) => (
            <div key={s.taskId} className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--surface-elevated)]/50">
              <span className="text-sm text-[var(--fg)]">{s.title}</span>
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{
                  background: 'linear-gradient(145deg, rgba(249,115,22,0.15), rgba(249,115,22,0.08))',
                  color: '#fb923c',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                <Flame className="h-3 w-3" /> {s.streak}
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* Economy summary */}
      {(snapshot.xpEarned > 0 || snapshot.coinsEarned > 0 || snapshot.coinsSpent > 0) && (
        <div className="grid grid-cols-3 gap-3">
          {snapshot.xpEarned > 0 && (
            <div
              className="flex flex-col items-center gap-1.5 rounded-xl p-3"
              style={{
                ...sectionNeuStyle,
                background: 'linear-gradient(145deg, var(--surface-card), var(--surface-elevated))',
              }}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  background: 'linear-gradient(145deg, rgba(59,130,246,0.2), rgba(59,130,246,0.1))',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(59,130,246,0.15)',
                }}
              >
                <Zap className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-sm font-bold text-[var(--fg)]">+{snapshot.xpEarned}</span>
              <span className="text-[10px] text-[var(--fg-muted)]">XP</span>
            </div>
          )}
          {snapshot.coinsEarned > 0 && (
            <div
              className="flex flex-col items-center gap-1.5 rounded-xl p-3"
              style={{
                ...sectionNeuStyle,
                background: 'linear-gradient(145deg, var(--surface-card), var(--surface-elevated))',
              }}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  background: 'linear-gradient(145deg, rgba(234,179,8,0.2), rgba(234,179,8,0.1))',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(234,179,8,0.15)',
                }}
              >
                <Coins className="h-4 w-4 text-yellow-500" />
              </div>
              <span className="text-sm font-bold text-[var(--fg)]">+{snapshot.coinsEarned}</span>
              <span className="text-[10px] text-[var(--fg-muted)]">Монет</span>
            </div>
          )}
          {snapshot.coinsSpent > 0 && (
            <div
              className="flex flex-col items-center gap-1.5 rounded-xl p-3"
              style={{
                ...sectionNeuStyle,
                background: 'linear-gradient(145deg, var(--surface-card), var(--surface-elevated))',
              }}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  background: 'linear-gradient(145deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(239,68,68,0.15)',
                }}
              >
                <ShoppingBag className="h-4 w-4 text-red-400" />
              </div>
              <span className="text-sm font-bold text-[var(--fg)]">-{snapshot.coinsSpent}</span>
              <span className="text-[10px] text-[var(--fg-muted)]">Потрачено</span>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasActivity && (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-8 text-center"
          style={sectionNeuStyle}
        >
          <p className="text-sm text-[var(--fg-muted)]">Нет активности за этот день</p>
        </div>
      )}

      {/* Thoughts */}
      <div className="rounded-2xl p-4" style={sectionNeuStyle}>
        <div className="mb-2 flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(145deg, var(--accent-subtle), transparent)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
              border: '1px solid var(--border)',
            }}
          >
            <MessageCircle className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--fg)]">Мысли дня</h3>
        </div>
        <AutoResizeTextarea
          value={localThoughts}
          onChange={setLocalThoughts}
          placeholder="Запишите свои мысли за день..."
        />

        {/* Photos */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {photos.map((path, i) => {
            const src = thumbs.get(path)
            return (
              <div
                key={path}
                className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] cursor-pointer"
                onClick={() => setLightboxIndex(i)}
              >
                {src ? (
                  <img src={src} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full animate-pulse bg-[var(--border)]" />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemovePhoto(path) }}
                  className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow group-hover:flex"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
          <button
            onClick={handleAddPhoto}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Mood chart + Weekly summary — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={sectionNeuStyle}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--fg)]">Настроение</h3>
            <div className="flex gap-1">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setMoodDays(d)}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    moodDays === d
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)]'
                  }`}
                >
                  {d}д
                </button>
              ))}
            </div>
          </div>
          <MoodChart reports={allReports} days={moodDays} />
        </div>
        <div className="rounded-2xl p-4 flex flex-col" style={sectionNeuStyle}>
          <h3 className="mb-3 text-sm font-semibold text-[var(--fg)]">За неделю</h3>
          <div className="flex flex-1 flex-col justify-center gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--fg-muted)]">Задач</span>
              <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold bg-indigo-500/15 text-indigo-400">
                <CheckSquare className="h-3 w-3" /> {weekSummary.totalTasks}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--fg-muted)]">Опыт</span>
              <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold bg-purple-500/15 text-purple-400">
                <Zap className="h-3 w-3" /> +{weekSummary.totalXp}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--fg-muted)]">Заработано</span>
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold bg-amber-500/15 text-amber-400">
                  <Coins className="h-3 w-3" /> +{weekSummary.totalCoins}
                </span>
                {weekSummary.totalGems > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold bg-cyan-500/15 text-cyan-400">
                    <Gem className="h-3 w-3" strokeWidth={2.5} /> +{weekSummary.totalGems}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--fg-muted)]">Потрачено</span>
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold bg-amber-500/15 text-amber-400">
                  <Coins className="h-3 w-3" /> -{weekSummary.totalSpent}
                </span>
                {weekSummary.totalGemsSpent > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold bg-cyan-500/15 text-cyan-400">
                    <Gem className="h-3 w-3" strokeWidth={2.5} /> -{weekSummary.totalGemsSpent}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--fg-muted)]">Покупок</span>
              <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold bg-orange-500/15 text-orange-400">
                <ShoppingBag className="h-3 w-3" /> {weekSummary.totalPurchases}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}
