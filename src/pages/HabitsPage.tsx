import { useState, useRef, useEffect } from 'react'
import { Plus, Minus, Flame, Pencil, Trash2, X, Repeat, Zap, Coins, Check, ChevronDown, ChevronRight, ArrowLeft, FlaskConical } from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import type { Habit, AttributeId, HabitId } from '../types/domain'

interface HabitCardProps {
  habit: Habit
  onEdit: () => void
  /** В экспериментальном режиме можно нажимать +/- многократно, каждый клик — следующий день */
  experimentalMode?: boolean
}

function HabitCard({ habit, onEdit, experimentalMode }: HabitCardProps) {
  const clickPositive = useRpgStore((s) => s.clickHabitPositive)
  const clickNegative = useRpgStore((s) => s.clickHabitNegative)
  const deleteHabit = useRpgStore((s) => s.deleteHabit)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  
  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []
  const attr = habit.attributeId ? attributes.find((a) => a.id === habit.attributeId) : null

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStartTs = todayStart.getTime()
  const isNewDay = habit.lastResetDate < todayStartTs
  const hasActedToday = !experimentalMode && habit.lastResetDate >= todayStartTs && (habit.todayPositive > 0 || habit.todayNegative > 0)

  return (
    <div className="glass-card group relative rounded-2xl p-5 transition-all duration-200 hover:scale-[1.01]">
      {/* Action buttons */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onEdit}
          className="icon-btn"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm('Удалить привычку?')) deleteHabit(habit.id)
          }}
          className="icon-btn icon-btn-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-start gap-4">
        {/* Negative button */}
        {habit.negativeEnabled && (
          <button
            type="button"
            onClick={() => (experimentalMode ? clickNegative(habit.id, true) : !hasActedToday && clickNegative(habit.id))}
            disabled={hasActedToday}
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
              hasActedToday ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95',
              'bg-gradient-to-br from-red-500/20 to-red-600/10 text-red-500',
              'transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20'
            )}
          >
            <Minus className="h-7 w-7" />
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl shadow-md"
              style={{ 
                background: `linear-gradient(135deg, ${habit.color}30, ${habit.color}15)`,
                boxShadow: `0 4px 12px ${habit.color}20`
              }}
            >
              {habit.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--fg)] truncate">{habit.title}</h3>
              {habit.notes && (
                <p className="text-sm text-[var(--fg-muted)] line-clamp-1 mt-0.5">{habit.notes}</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {habit.positiveEnabled && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-emerald-500 font-medium">+{habit.positiveXp} XP</span>
                <span className="text-amber-500 font-medium">+{habit.positiveCoins} 🪙</span>
              </div>
            )}
            {habit.negativeEnabled && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-500 font-medium">−{habit.negativeXp} XP</span>
                <span className="text-red-400 font-medium">−{habit.negativeCoins} 🪙</span>
              </div>
            )}
            {attr && (
              <span
                className="rounded-lg px-2 py-1 text-xs font-medium"
                style={{ backgroundColor: `${attr.color}15`, color: attr.color }}
              >
                {attr.icon} {attr.name}
              </span>
            )}
          </div>

          {/* 7-day circles */}
          <div className="mt-3 flex items-center gap-1.5">
            {(() => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const getDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
              const todayKey = getDateKey(today)
              return [-2, -1, 0, 1, 2, 3, 4].map((offset) => {
                const d = new Date(today)
                d.setDate(d.getDate() + offset)
                const key = getDateKey(d)
                const dayNum = d.getDate()
                const isToday = offset === 0
                const isPast = offset < 0
                const isFuture = offset > 0
                let status = habit.dailyCompletion?.[key]
                if (isToday && !status && habit.lastResetDate >= todayStartTs && (habit.todayPositive > 0 || habit.todayNegative > 0)) {
                  status = habit.todayPositive > 0 ? 'positive' : 'negative'
                }
                const completed = status === 'positive'
                const failed = status === 'negative' || (isPast && !status)
                const color = completed ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/50' : failed ? 'bg-red-500/20 text-red-600 border-red-500/50' : 'bg-[var(--surface)] text-[var(--fg-muted)] border-[var(--border)]'
                return (
                  <div
                    key={key}
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium border-2 transition-all',
                      color,
                      isToday && 'ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--surface-overlay)]'
                    )}
                    style={isToday ? { boxShadow: '0 0 0 1px var(--accent-subtle), 0 0 16px var(--accent-glow)' } : undefined}
                  >
                    {dayNum}
                  </div>
                )
              })
            })()}
          </div>

          {/* Streak */}
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-[var(--fg-muted)]">Стрик:</span>
            <div className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold',
              habit.streak > 0 ? 'bg-[var(--surface)]' : ''
            )}>
              <Flame className={cn('h-4 w-4 shrink-0', habit.streak > 0 ? getStreakColor(habit.streak).icon : 'text-[var(--fg-muted)]', habit.streak > 0 && 'streak-flame-animate')} />
              <span className={habit.streak > 0 ? getStreakColor(habit.streak).text : 'text-[var(--fg-muted)]'}>
                {habit.streak}
              </span>
            </div>
          </div>
        </div>

        {/* Positive button */}
        {habit.positiveEnabled && (
          <button
            type="button"
            onClick={() => (experimentalMode ? clickPositive(habit.id, true) : !hasActedToday && clickPositive(habit.id))}
            disabled={hasActedToday}
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
              hasActedToday ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95',
              'bg-gradient-to-br from-emerald-500 to-green-600 text-white',
              'transition-all duration-200 shadow-lg shadow-emerald-500/30',
              'hover:shadow-xl hover:shadow-emerald-500/40'
            )}
          >
            <Plus className="h-7 w-7" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Habit Form ─────────────────────────────────────────────────────────────

interface HabitFormProps {
  habit?: Habit
  onClose: () => void
}

const HABIT_ICONS = ['💪', '🏃', '📚', '🧘', '💧', '🍎', '😴', '🎯', '✍️', '🎸', '🎮', '🍺', '🍔', '📱', '💤', '🧠', '❤️', '🔥']

/** Цвета огонька стрика по порогам: [порог, классы для иконки и текста] */
const STREAK_COLORS: { threshold: number; icon: string; text: string }[] = [
  { threshold: 365, icon: 'text-amber-400', text: 'text-amber-500' },
  { threshold: 180, icon: 'text-amber-300', text: 'text-amber-400' },
  { threshold: 90, icon: 'text-yellow-400', text: 'text-yellow-500' },
  { threshold: 30, icon: 'text-violet-400', text: 'text-violet-500' },
  { threshold: 14, icon: 'text-red-500', text: 'text-red-500' },
  { threshold: 7, icon: 'text-amber-500', text: 'text-amber-500' },
  { threshold: 3, icon: 'text-emerald-500', text: 'text-emerald-500' },
]

function getStreakColor(streak: number) {
  for (const { threshold, icon, text } of STREAK_COLORS) {
    if (streak >= threshold) return { icon, text }
  }
  return { icon: 'text-orange-400', text: 'text-orange-500' }
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
]

function HabitForm({ habit, onClose }: HabitFormProps) {
  const addHabit = useRpgStore((s) => s.addHabit)
  const updateHabit = useRpgStore((s) => s.updateHabit)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  
  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []

  const [title, setTitle] = useState(habit?.title ?? '')
  const [notes, setNotes] = useState(habit?.notes ?? '')
  const [icon, setIcon] = useState(habit?.icon ?? '💪')
  const [color, setColor] = useState(habit?.color ?? '#6366f1')
  const [positiveXp, setPositiveXp] = useState(habit?.positiveXp ?? 50)
  const [negativeXp, setNegativeXp] = useState(habit?.negativeXp ?? 25)
  const [attributeId, setAttributeId] = useState<AttributeId | null>(habit?.attributeId ?? null)
  const [showAdditionalSettings, setShowAdditionalSettings] = useState(false)
  const [screen, setScreen] = useState<'main' | 'multiplier'>('main')
  const [difficultyLevel, setDifficultyLevel] = useState<'off' | 'easy' | 'medium' | 'hard' | 'custom'>(
    habit?.difficultyMultiplierEnabled === true
      ? (habit?.difficultyMultiplierLevel ?? 'easy')
      : 'off'
  )
  const [customMultiplier, setCustomMultiplier] = useState(habit?.difficultyMultiplierCustom ?? 1.5)
  const [multiplierIntervalDays, setMultiplierIntervalDays] = useState(habit?.multiplierIntervalDays ?? 3)
  const [multiplierAppliesToXp, setMultiplierAppliesToXp] = useState(habit?.multiplierAppliesToXp ?? true)
  const [multiplierAppliesToCoins, setMultiplierAppliesToCoins] = useState(habit?.multiplierAppliesToCoins ?? true)
  const [multiplierAppliesToGems, setMultiplierAppliesToGems] = useState(habit?.multiplierAppliesToGems ?? true)
  const [xpTooltipVisible, setXpTooltipVisible] = useState(false)
  const [negativeXpTooltipVisible, setNegativeXpTooltipVisible] = useState(false)
  const xpTooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const negativeXpTooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (xpTooltipTimeoutRef.current) clearTimeout(xpTooltipTimeoutRef.current)
    if (negativeXpTooltipTimeoutRef.current) clearTimeout(negativeXpTooltipTimeoutRef.current)
  }, [])

  const handleXpTooltipEnter = () => {
    xpTooltipTimeoutRef.current = setTimeout(() => setXpTooltipVisible(true), 1000)
  }
  const handleXpTooltipLeave = () => {
    if (xpTooltipTimeoutRef.current) {
      clearTimeout(xpTooltipTimeoutRef.current)
      xpTooltipTimeoutRef.current = null
    }
    setXpTooltipVisible(false)
  }
  const handleNegativeXpTooltipEnter = () => {
    negativeXpTooltipTimeoutRef.current = setTimeout(() => setNegativeXpTooltipVisible(true), 1000)
  }
  const handleNegativeXpTooltipLeave = () => {
    if (negativeXpTooltipTimeoutRef.current) {
      clearTimeout(negativeXpTooltipTimeoutRef.current)
      negativeXpTooltipTimeoutRef.current = null
    }
    setNegativeXpTooltipVisible(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const data = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      icon,
      color,
      positiveEnabled: true,
      negativeEnabled: true,
      positiveXp,
      negativeXp,
      positiveCoins: 0,
      negativeCoins: 0,
      positiveGemsEnabled: false,
      positiveGems: 0,
      negativeGemsEnabled: false,
      negativeGems: 0,
      attributeId,
      difficultyMultiplierEnabled: difficultyLevel !== 'off',
      difficultyMultiplierLevel: difficultyLevel === 'off' ? undefined : difficultyLevel,
      difficultyMultiplierCustom: difficultyLevel === 'custom' ? customMultiplier : undefined,
      multiplierIntervalDays: difficultyLevel !== 'off' ? multiplierIntervalDays : undefined,
      multiplierAppliesToXp: difficultyLevel !== 'off' ? (multiplierAppliesToXp || (!multiplierAppliesToCoins && !multiplierAppliesToGems)) : undefined,
      multiplierAppliesToCoins: difficultyLevel !== 'off' ? multiplierAppliesToCoins : undefined,
      multiplierAppliesToGems: difficultyLevel !== 'off' ? multiplierAppliesToGems : undefined,
    }

    if (habit) {
      updateHabit(habit.id, (h) => ({ ...h, ...data }))
    } else {
      addHabit(data)
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-lg">
        {screen === 'main' ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--fg)]">
                {habit ? 'Редактировать привычку' : 'Новая привычка'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="icon-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название привычки"
            className="input text-lg"
            autoFocus
          />

          {/* Notes */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Описание (опционально)"
            rows={2}
            className="input resize-y min-h-[4.5rem]"
          />

          {/* Icon & Color */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Иконка</label>
              <div className="flex flex-wrap gap-2">
                {HABIT_ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={cn(
                      'h-10 w-10 rounded-xl text-xl transition-all',
                      icon === i 
                        ? 'bg-[var(--accent)] shadow-lg scale-110' 
                        : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Цвет</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-8 w-8 rounded-lg transition-all',
                    color === c && 'ring-2 ring-white ring-offset-2 ring-offset-[var(--surface-overlay)] scale-110'
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Positive/Negative toggles */}
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Награда и наказание</label>
            <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-[var(--surface)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-emerald-500 bg-emerald-500/20 text-emerald-600">
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <span className="font-medium text-emerald-500">Выполнено (+)</span>
              </div>
              <div className="flex flex-col gap-3 text-sm">
                <label
                  className="relative flex items-center justify-between"
                  onMouseEnter={handleXpTooltipEnter}
                  onMouseLeave={handleXpTooltipLeave}
                >
                  <span className="text-[var(--fg-muted)]">XP<span className="text-amber-400">*</span>:</span>
                  <input
                    type="number"
                    value={positiveXp}
                    onChange={(e) => setPositiveXp(Number(e.target.value) || 0)}
                    className="w-20 rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-right"
                  />
                  {xpTooltipVisible && (
                    <span
                      role="tooltip"
                      className="absolute left-0 top-full z-50 mt-2 max-w-[240px] rounded-lg bg-[var(--fg)] px-3 py-2 text-xs font-normal text-[var(--bg-solid)] shadow-lg"
                    >
                      XP начисляется как в выбранный вами атрибут, так и в общий ваш уровень
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  disabled
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-medium',
                    'bg-gradient-to-r from-emerald-500/15 to-emerald-600/10 text-emerald-600',
                    'border border-emerald-500/30 cursor-not-allowed opacity-90'
                  )}
                >
                  <Plus className="h-4 w-4" />
                  Добавить награду
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-[var(--surface)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-red-500 bg-red-500/20 text-red-600">
                  <X className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <span className="font-medium text-red-500">Не выполнено (−)</span>
              </div>
              <div className="flex flex-col gap-3 text-sm">
                <label
                  className="relative flex items-center justify-between"
                  onMouseEnter={handleNegativeXpTooltipEnter}
                  onMouseLeave={handleNegativeXpTooltipLeave}
                >
                  <span className="text-[var(--fg-muted)]">XP<span className="text-amber-400">*</span>:</span>
                  <input
                    type="number"
                    value={negativeXp}
                    onChange={(e) => setNegativeXp(Number(e.target.value) || 0)}
                    className="w-20 rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-right"
                  />
                  {negativeXpTooltipVisible && (
                    <span
                      role="tooltip"
                      className="absolute left-0 top-full z-50 mt-2 max-w-[260px] rounded-lg bg-[var(--fg)] px-3 py-2 text-xs font-normal text-[var(--bg-solid)] shadow-lg"
                    >
                      XP вычитается из вашего общего опыта и опыта выбранного атрибута
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  disabled
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-medium',
                    'bg-gradient-to-r from-red-500/15 to-red-600/10 text-red-600',
                    'border border-red-500/30 cursor-not-allowed opacity-90'
                  )}
                >
                  <Plus className="h-4 w-4" />
                  Наказание
                </button>
              </div>
            </div>
            </div>
          </div>

          {/* Attribute */}
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Атрибут</label>
            <select
              value={attributeId ?? ''}
              onChange={(e) => setAttributeId(e.target.value || null)}
              className="select w-full"
            >
              <option value="">Без атрибута</option>
              {attributes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.icon} {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Дополнительно */}
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Дополнительно</label>
            <button
              type="button"
              onClick={() => setShowAdditionalSettings((v) => !v)}
              className={cn(
                'w-full flex items-center justify-center py-1.5 rounded-lg mb-2',
                'text-[var(--fg-muted)] hover:text-[var(--fg)]',
                'bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-all',
                'border border-[var(--border)]'
              )}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', showAdditionalSettings && 'rotate-180')} />
            </button>
            {showAdditionalSettings && (
              <button
                type="button"
                onClick={() => setScreen('multiplier')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] transition-colors text-left"
              >
                <span className="text-sm font-medium text-[var(--fg)]">Множитель сложности</span>
                <ChevronRight className="h-4 w-4 text-[var(--fg-muted)] shrink-0" />
              </button>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" className="btn-primary flex-1">
              {habit ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
          </>
        ) : (
          /* Экран множителя сложности */
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setScreen('main')}
                className="icon-btn"
                aria-label="Назад"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold text-[var(--fg)] flex-1">Множитель сложности</h2>
              <button
                type="button"
                onClick={onClose}
                className="icon-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-[var(--fg-muted)]">
              Можно добавить множитель награды в зависимости от сложности
            </p>

            <div className="space-y-2">
              {[
                { id: 'off' as const, label: 'Не использовать', mult: null },
                { id: 'easy' as const, label: 'Легко', mult: 1.25 },
                { id: 'medium' as const, label: 'Средне', mult: 1.75 },
                { id: 'hard' as const, label: 'Сложно', mult: 2.5 },
                { id: 'custom' as const, label: 'Индивидуально', mult: null },
              ].map(({ id, label, mult }) => (
                <label
                  key={id}
                  className={cn(
                    'flex items-center gap-2 py-2.5 px-3 rounded-xl cursor-pointer transition-colors',
                    difficultyLevel === id ? 'bg-[var(--accent-subtle)]' : 'hover:bg-[var(--surface-elevated)] bg-[var(--surface)]'
                  )}
                >
                  <input
                    type="radio"
                    name="difficultyLevel"
                    checked={difficultyLevel === id}
                    onChange={() => setDifficultyLevel(id)}
                    className="sr-only"
                  />
                  <span className={cn(
                    'flex h-4 w-4 shrink-0 rounded-full border-2 items-center justify-center',
                    difficultyLevel === id ? 'border-[var(--accent)]' : 'border-[var(--border)]'
                  )}>
                    {difficultyLevel === id && <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />}
                  </span>
                  <span className="text-sm text-[var(--fg)]">{label}</span>
                  {mult !== null && <span className="text-xs text-[var(--fg-muted)]">(x{mult})</span>}
                  {id === 'custom' && (
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max="10"
                      value={customMultiplier}
                      onChange={(e) => {
                        const v = String(e.target.value).replace(',', '.')
                        setCustomMultiplier(Math.min(10, Math.max(0.5, parseFloat(v) || 1)))
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-auto w-16 rounded border border-[var(--border)] bg-transparent px-2 py-1 text-sm text-right"
                    />
                  )}
                </label>
              ))}
            </div>

            {difficultyLevel !== 'off' && (
              <div className="pt-3 space-y-3 border-t border-[var(--border)]">
                <label className="flex items-center gap-2 text-sm text-[var(--fg)] flex-wrap">
                  Множитель срабатывает раз в
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={multiplierIntervalDays}
                    onChange={(e) => setMultiplierIntervalDays(Math.max(1, Number(e.target.value) || 1))}
                    className="w-14 rounded border border-[var(--border)] bg-transparent px-2 py-1 text-sm text-center"
                  />
                  дня
                </label>
                <div>
                  <p className="text-sm font-medium text-[var(--fg)] mb-2">Множитель работает на:</p>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={multiplierAppliesToXp}
                        onChange={(e) => {
                          const v = e.target.checked
                          if (!v && !multiplierAppliesToCoins && !multiplierAppliesToGems) return
                          setMultiplierAppliesToXp(v)
                        }}
                        className="rounded border-[var(--border)]"
                      />
                      <span className="text-sm text-[var(--fg)]">XP</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={multiplierAppliesToCoins}
                        onChange={(e) => {
                          const v = e.target.checked
                          if (!v && !multiplierAppliesToXp && !multiplierAppliesToGems) return
                          setMultiplierAppliesToCoins(v)
                        }}
                        className="rounded border-[var(--border)]"
                      />
                      <span className="text-sm text-[var(--fg)]">монеты</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={multiplierAppliesToGems}
                        onChange={(e) => {
                          const v = e.target.checked
                          if (!v && !multiplierAppliesToXp && !multiplierAppliesToCoins) return
                          setMultiplierAppliesToGems(v)
                        }}
                        className="rounded border-[var(--border)]"
                      />
                      <span className="text-sm text-[var(--fg)]">гемы</span>
                    </label>
                  </div>
                  <p className="text-xs text-[var(--fg-muted)] mt-1">Можно выбрать один или все, но минимум 1</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Habits Page ───────────────────────────────────────────────────────

export default function HabitsPage() {
  const allHabits = useRpgStore((s) => s.habits)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const habits = activeProfileId ? allHabits.filter((h) => h.profileId === activeProfileId) : []
  const [showForm, setShowForm] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>()
  const [experimentalMode, setExperimentalMode] = useState(false)
  /** Снимок привычек на момент включения экспериментального режима — восстанавливаем при выключении */
  const experimentalSnapshotRef = useRef<Record<HabitId, Pick<Habit, 'streak' | 'lastResetDate' | 'todayPositive' | 'todayNegative' | 'dailyCompletion'>> | null>(null)

  const toggleExperimentalMode = () => {
    const updateHabit = useRpgStore.getState().updateHabit
    if (experimentalMode) {
      // Выключаем: восстанавливаем привычки из снимка
      const snapshot = experimentalSnapshotRef.current
      if (snapshot) {
        Object.entries(snapshot).forEach(([id, data]) => {
          updateHabit(id as HabitId, (h) => ({ ...h, ...data }))
        })
        experimentalSnapshotRef.current = null
      }
    } else {
      // Включаем: сохраняем текущее состояние привычек текущего профиля
      const snapshot: Record<string, Pick<Habit, 'streak' | 'lastResetDate' | 'todayPositive' | 'todayNegative' | 'dailyCompletion'>> = {}
      activeHabits.forEach((h) => {
        snapshot[h.id] = {
          streak: h.streak,
          lastResetDate: h.lastResetDate,
          todayPositive: h.todayPositive,
          todayNegative: h.todayNegative,
          dailyCompletion: h.dailyCompletion ? { ...h.dailyCompletion } : undefined,
        }
      })
      experimentalSnapshotRef.current = snapshot
    }
    setExperimentalMode((v) => !v)
  }

  const handleEdit = (habit: Habit) => {
    setEditingHabit(habit)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingHabit(undefined)
  }

  const activeHabits = habits.filter((h) => !h.archived)

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30">
            <Repeat className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--fg)]">Привычки</h1>
            <p className="text-sm text-[var(--fg-muted)]">{activeHabits.length} активных</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleExperimentalMode}
            className={cn(
              'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              experimentalMode
                ? 'bg-amber-500/20 text-amber-600 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-[var(--surface)] text-[var(--fg-muted)] border border-[var(--border)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)]'
            )}
            title={experimentalMode ? 'Выключить: снова один клик в день' : 'Включить: можно нажимать +/- многократно, каждый клик — следующий день'}
          >
            <FlaskConical className="h-4 w-4 shrink-0" />
            {experimentalMode ? 'Эксперимент вкл' : 'Экспериментальный режим'}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Новая привычка
          </button>
        </div>
      </div>

      {/* Habits list */}
      {activeHabits.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center rounded-2xl py-16">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--accent-subtle)] mb-4">
            <Repeat className="h-10 w-10 text-[var(--accent)]" />
          </div>
          <p className="font-medium text-[var(--fg)]">Нет привычек</p>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">Создайте свою первую привычку</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary mt-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            Создать привычку
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onEdit={() => handleEdit(habit)}
              experimentalMode={experimentalMode}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && <HabitForm habit={editingHabit} onClose={handleCloseForm} />}
    </div>
  )
}
