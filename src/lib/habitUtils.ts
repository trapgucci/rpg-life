import type { Habit } from '../types/domain'

// ─── Date Helpers ──────────────────────────────────────────────────────────

export function getDateKeyFromTs(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isDateInFreeze(key: string, freezeFrom?: number | null, freezeUntil?: number | null): boolean {
  if (!freezeFrom || !freezeUntil) return false
  const fromKey = getDateKeyFromTs(freezeFrom)
  const untilKey = getDateKeyFromTs(freezeUntil)
  return key >= fromKey && key <= untilKey
}

// ─── Multiplier ────────────────────────────────────────────────────────────

export const MULTIPLIER_BY_LEVEL: Record<string, number> = { easy: 1.25, medium: 1.75, hard: 2.5 }

export function getHabitEffectiveMultiplier(habit: Habit): number {
  if (!habit.difficultyMultiplierEnabled || habit.streak < 3) return 1
  const interval = habit.multiplierIntervalDays ?? 3
  if (habit.streak < interval) return 1
  const level = habit.difficultyMultiplierLevel ?? 'easy'
  return level === 'custom' ? (habit.difficultyMultiplierCustom ?? 1.5) : (MULTIPLIER_BY_LEVEL[level] ?? 1)
}

export function getHabitMultiplierDisplay(habit: Habit): string | null {
  if (!habit.difficultyMultiplierEnabled) return null
  const mult = getHabitEffectiveMultiplier(habit)
  if (mult <= 1) return null
  return `${mult}x`
}

export function applyMultiplier(value: number, mult: number, applies: boolean): number {
  if (!applies || mult <= 1) return value
  return Math.ceil(value * mult)
}

export function getPositiveRewardDisplay(habit: Habit): { xp: number; coins: number; gems: number } {
  const mult = getHabitEffectiveMultiplier(habit)
  const appliesXp = habit.multiplierAppliesToXp !== false
  const appliesCoins = habit.multiplierAppliesToCoins !== false
  const appliesGems = habit.multiplierAppliesToGems !== false
  return {
    xp: applyMultiplier(habit.positiveXp, mult, appliesXp),
    coins: applyMultiplier(habit.positiveCoins, mult, appliesCoins),
    gems: applyMultiplier(habit.positiveGems ?? 0, mult, appliesGems),
  }
}

// ─── Streak Colors ─────────────────────────────────────────────────────────

export const STREAK_COLORS: { threshold: number; icon: string; text: string }[] = [
  { threshold: 365, icon: 'text-amber-400', text: 'text-amber-500' },
  { threshold: 180, icon: 'text-amber-300', text: 'text-amber-400' },
  { threshold: 90, icon: 'text-yellow-400', text: 'text-yellow-500' },
  { threshold: 30, icon: 'text-violet-400', text: 'text-violet-500' },
  { threshold: 14, icon: 'text-red-500', text: 'text-red-500' },
  { threshold: 7, icon: 'text-amber-500', text: 'text-amber-500' },
  { threshold: 3, icon: 'text-emerald-500', text: 'text-emerald-500' },
]

export function getStreakColor(streak: number) {
  for (const { threshold, icon, text } of STREAK_COLORS) {
    if (streak >= threshold) return { icon, text }
  }
  return { icon: 'text-orange-400', text: 'text-orange-500' }
}

/** Badge-style streak colors for compact cards */
export function getStreakBadgeColors(streak: number): string {
  if (streak >= 365) return 'bg-amber-500/10 text-amber-500 border-amber-500/30'
  if (streak >= 180) return 'bg-amber-400/10 text-amber-400 border-amber-400/30'
  if (streak >= 90) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
  if (streak >= 30) return 'bg-violet-500/10 text-violet-500 border-violet-500/30'
  if (streak >= 14) return 'bg-red-500/10 text-red-500 border-red-500/30'
  if (streak >= 7) return 'bg-amber-500/10 text-amber-500 border-amber-500/30'
  if (streak >= 3) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
  return 'bg-orange-500/10 text-orange-500 border-orange-500/30'
}

// ─── Constants ─────────────────────────────────────────────────────────────

export const HABIT_ICONS = ['💪', '🏃', '📚', '🧘', '💧', '🍎', '😴', '🎯', '✍️', '🎸', '🎮', '🍺', '🍔', '📱', '💤', '🧠', '❤️', '🔥']

// ─── Russian Pluralization ────────────────────────────────────────────────

/** Russian plural: picks correct form based on number (1 день, 2 дня, 5 дней) */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n)
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod100 >= 11 && mod100 <= 19) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

export const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#f43f5e',
]
