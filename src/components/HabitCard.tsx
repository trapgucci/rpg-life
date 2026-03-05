import { useState } from 'react'
import { Plus, Minus, Flame, Check, Zap, Snowflake } from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import { getHabitMultiplierDisplay, getPositiveRewardDisplay, getStreakBadgeColors } from '../lib/habitUtils'
import type { Habit } from '../types/domain'

interface HabitCardProps {
  habit: Habit
  selected?: boolean
  onSelect: () => void
}

export default function HabitCard({ habit, selected, onSelect }: HabitCardProps) {
  const [successPulse, setSuccessPulse] = useState(false)
  const clickPositive = useRpgStore((s) => s.clickHabitPositive)
  const clickNegative = useRpgStore((s) => s.clickHabitNegative)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)

  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []
  const attr = habit.attributeId ? attributes.find((a) => a.id === habit.attributeId) : null

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStartTs = todayStart.getTime()

  const freezeUntil = profile?.streakFreezeUntil ?? 0
  const freezeDaysLeft = freezeUntil > 0
    ? Math.max(0, Math.ceil((freezeUntil - todayStart.getTime()) / (24 * 60 * 60 * 1000)))
    : 0
  const isFreezeActive = freezeDaysLeft > 0

  const hasActedToday = habit.lastResetDate >= todayStartTs && (habit.todayPositive > 0 || habit.todayNegative > 0)
  const doneToday = habit.lastResetDate >= todayStartTs && habit.todayPositive > 0

  const multiplierDisplay = getHabitMultiplierDisplay(habit)
  const rewards = getPositiveRewardDisplay(habit)

  const handlePositive = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasActedToday) return
    clickPositive(habit.id)
    setSuccessPulse(true)
    setTimeout(() => setSuccessPulse(false), 600)
  }

  const handleNegative = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasActedToday) return
    clickNegative(habit.id)
  }

  return (
    <div
      className={cn(
        'group relative w-full rounded-2xl p-4 text-left transition-all duration-200',
        'bg-[var(--surface-card)] backdrop-blur-lg',
        'border border-[var(--border)]',
        'hover:border-[var(--border-accent)] hover:shadow-lg hover:-translate-y-0.5',
        selected && 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg shadow-[var(--accent)]/10',
        hasActedToday && !selected && 'opacity-70',
        successPulse && 'animate-habit-success-pulse'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Negative button */}
        {habit.negativeEnabled && (
          <button
            type="button"
            onClick={handleNegative}
            disabled={hasActedToday}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
              hasActedToday
                ? 'opacity-40 cursor-not-allowed bg-red-500/10 text-red-400'
                : 'bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:scale-110 active:scale-95'
            )}
          >
            <Minus className="h-4 w-4" />
          </button>
        )}

        {/* Icon + Content area (clickable) */}
        <div
          className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer"
          onClick={onSelect}
        >
          {/* Emoji icon */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl transition-transform group-hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${habit.color}30, ${habit.color}15)`,
              boxShadow: `0 2px 8px ${habit.color}20`,
            }}
          >
            {habit.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  'font-medium text-[var(--fg)] line-clamp-1 flex-1',
                  doneToday && 'text-emerald-600 dark:text-emerald-400'
                )}
              >
                {habit.title}
              </h3>
              {doneToday && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
            </div>

            {/* Badges row */}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {/* Streak */}
              {habit.streak > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold border',
                    getStreakBadgeColors(habit.streak)
                  )}
                >
                  <Flame className="h-3 w-3 streak-flame-animate" />
                  {habit.streak}
                </span>
              )}
              {/* Multiplier */}
              {multiplierDisplay && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)] border border-[var(--border-accent)]">
                  <Zap className="h-3 w-3" />
                  {multiplierDisplay}
                </span>
              )}
              {/* Rewards */}
              {(rewards.xp > 0 || rewards.coins > 0 || rewards.gems > 0) && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500/10 to-amber-500/10 px-2 py-0.5 text-xs font-medium border border-emerald-500/20">
                  {rewards.xp > 0 && <span className="text-emerald-500">+{rewards.xp}xp</span>}
                  {rewards.coins > 0 && <span className="text-amber-500">+{rewards.coins}</span>}
                  {rewards.gems > 0 && <span className="text-violet-500">+{rewards.gems}</span>}
                </span>
              )}
              {/* Attribute */}
              {attr && (
                <span
                  className="rounded-lg px-2 py-0.5 text-xs font-medium border"
                  style={{ backgroundColor: `${attr.color}12`, color: attr.color, borderColor: `${attr.color}30` }}
                >
                  {attr.icon} {attr.name}
                </span>
              )}
              {/* Freeze */}
              {isFreezeActive && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-500 border border-blue-500/30">
                  <Snowflake className="h-3 w-3" />
                  {freezeDaysLeft}д
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Positive button */}
        {habit.positiveEnabled && (
          <button
            type="button"
            onClick={handlePositive}
            disabled={hasActedToday}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
              hasActedToday
                ? 'opacity-40 cursor-not-allowed bg-emerald-500/30 text-white'
                : 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/30 hover:scale-110 active:scale-95 hover:shadow-lg hover:shadow-emerald-500/40'
            )}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
