import { useState, useRef, useEffect } from 'react'
import {
  Plus, Minus, Flame, Pencil, Trash2, X, Check,
  Zap, Snowflake, Calendar, ChevronDown, ChevronRight, ArrowLeft
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import {
  getDateKey, isDateInFreeze,
  getStreakColor, getHabitMultiplierDisplay, getPositiveRewardDisplay,
  HABIT_ICONS, PRESET_COLORS, pluralRu,
} from '../lib/habitUtils'
import type { Habit, AttributeId } from '../types/domain'
import HabitCalendarModal from './HabitCalendarModal'
import ConfirmModal from './ConfirmModal'

interface HabitDetailPanelProps {
  habit: Habit
  onDeselect: () => void
  experimentalMode?: boolean
}

export default function HabitDetailPanel({ habit, onDeselect, experimentalMode }: HabitDetailPanelProps) {
  const clickPositive = useRpgStore((s) => s.clickHabitPositive)
  const clickNegative = useRpgStore((s) => s.clickHabitNegative)
  const updateHabit = useRpgStore((s) => s.updateHabit)
  const deleteHabit = useRpgStore((s) => s.deleteHabit)
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

  const hasActedToday = !experimentalMode && habit.lastResetDate >= todayStartTs && (habit.todayPositive > 0 || habit.todayNegative > 0)
  const doneToday = habit.lastResetDate >= todayStartTs && habit.todayPositive > 0

  const multiplierDisplay = getHabitMultiplierDisplay(habit)
  const rewards = getPositiveRewardDisplay(habit)

  const [showCalendar, setShowCalendar] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Edit state
  const [editTitle, setEditTitle] = useState(habit.title)
  const [editNotes, setEditNotes] = useState(habit.notes ?? '')
  const [editIcon, setEditIcon] = useState(habit.icon)
  const [editColor, setEditColor] = useState(habit.color)
  const [editPositiveXp, setEditPositiveXp] = useState(habit.positiveXp)
  const [editNegativeXp, setEditNegativeXp] = useState(habit.negativeXp)
  const [editAttributeId, setEditAttributeId] = useState<AttributeId | null>(habit.attributeId ?? null)
  const [editScreen, setEditScreen] = useState<'main' | 'multiplier'>('main')
  const [editDifficultyLevel, setEditDifficultyLevel] = useState<'off' | 'easy' | 'medium' | 'hard' | 'custom'>(
    habit.difficultyMultiplierEnabled === true ? (habit.difficultyMultiplierLevel ?? 'easy') : 'off'
  )
  const [editCustomMultiplier, setEditCustomMultiplier] = useState(habit.difficultyMultiplierCustom ?? 1.5)
  const [editMultiplierIntervalDays, setEditMultiplierIntervalDays] = useState(habit.multiplierIntervalDays ?? 3)
  const [editMultiplierAppliesToXp, setEditMultiplierAppliesToXp] = useState(habit.multiplierAppliesToXp ?? true)
  const [editMultiplierAppliesToCoins, setEditMultiplierAppliesToCoins] = useState(habit.multiplierAppliesToCoins ?? true)
  const [editMultiplierAppliesToGems, setEditMultiplierAppliesToGems] = useState(habit.multiplierAppliesToGems ?? true)
  const [showAdditionalSettings, setShowAdditionalSettings] = useState(false)

  // Tooltip state
  const [xpTooltipVisible, setXpTooltipVisible] = useState(false)
  const [negativeXpTooltipVisible, setNegativeXpTooltipVisible] = useState(false)
  const xpTooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const negativeXpTooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (xpTooltipTimeoutRef.current) clearTimeout(xpTooltipTimeoutRef.current)
    if (negativeXpTooltipTimeoutRef.current) clearTimeout(negativeXpTooltipTimeoutRef.current)
  }, [])

  // Reset edit state when habit changes
  useEffect(() => {
    setIsEditing(false)
    setEditTitle(habit.title)
    setEditNotes(habit.notes ?? '')
    setEditIcon(habit.icon)
    setEditColor(habit.color)
    setEditPositiveXp(habit.positiveXp)
    setEditNegativeXp(habit.negativeXp)
    setEditAttributeId(habit.attributeId ?? null)
    setEditDifficultyLevel(habit.difficultyMultiplierEnabled === true ? (habit.difficultyMultiplierLevel ?? 'easy') : 'off')
    setEditCustomMultiplier(habit.difficultyMultiplierCustom ?? 1.5)
    setEditMultiplierIntervalDays(habit.multiplierIntervalDays ?? 3)
    setEditMultiplierAppliesToXp(habit.multiplierAppliesToXp ?? true)
    setEditMultiplierAppliesToCoins(habit.multiplierAppliesToCoins ?? true)
    setEditMultiplierAppliesToGems(habit.multiplierAppliesToGems ?? true)
    setEditScreen('main')
    setShowAdditionalSettings(false)
  }, [habit.id])

  const handleSave = () => {
    if (!editTitle.trim()) return
    updateHabit(habit.id, (h) => ({
      ...h,
      title: editTitle.trim(),
      notes: editNotes.trim() || undefined,
      icon: editIcon,
      color: editColor,
      positiveXp: editPositiveXp,
      negativeXp: editNegativeXp,
      attributeId: editAttributeId,
      difficultyMultiplierEnabled: editDifficultyLevel !== 'off',
      difficultyMultiplierLevel: editDifficultyLevel === 'off' ? undefined : editDifficultyLevel,
      difficultyMultiplierCustom: editDifficultyLevel === 'custom' ? editCustomMultiplier : undefined,
      multiplierIntervalDays: editDifficultyLevel !== 'off' ? editMultiplierIntervalDays : undefined,
      multiplierAppliesToXp: editDifficultyLevel !== 'off' ? (editMultiplierAppliesToXp || (!editMultiplierAppliesToCoins && !editMultiplierAppliesToGems)) : undefined,
      multiplierAppliesToCoins: editDifficultyLevel !== 'off' ? editMultiplierAppliesToCoins : undefined,
      multiplierAppliesToGems: editDifficultyLevel !== 'off' ? editMultiplierAppliesToGems : undefined,
    }))
    setIsEditing(false)
  }

  const handleDelete = () => {
    setShowDeleteConfirm(false)
    deleteHabit(habit.id)
    onDeselect()
  }

  const handlePositive = () => {
    if (!experimentalMode && hasActedToday) return
    experimentalMode ? clickPositive(habit.id, true) : clickPositive(habit.id)
  }

  const handleNegative = () => {
    if (!experimentalMode && hasActedToday) return
    experimentalMode ? clickNegative(habit.id, true) : clickNegative(habit.id)
  }

  const streakColor = getStreakColor(habit.streak)

  // 7-day completion circles
  const renderWeekCircles = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const createdDay = new Date(habit.createdAt)
    createdDay.setHours(0, 0, 0, 0)

    return [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
      const d = new Date(today)
      d.setDate(d.getDate() + offset)
      const key = getDateKey(d)
      const dayNum = d.getDate()
      const isToday = offset === 0
      const isPast = offset < 0
      const isBeforeCreation = d.getTime() < createdDay.getTime()
      let status = habit.dailyCompletion?.[key]
      if (isToday && !status && habit.lastResetDate >= todayStartTs && (habit.todayPositive > 0 || habit.todayNegative > 0)) {
        status = habit.todayPositive > 0 ? 'positive' : 'negative'
      }
      const completed = status === 'positive'
      const frozen = isPast && !status && !isBeforeCreation && isDateInFreeze(key, profile?.streakFreezeFrom, profile?.streakFreezeUntil)
      const failed = !isBeforeCreation && (status === 'negative' || (isPast && !status && !frozen))
      const color = completed
        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50'
        : frozen
          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50'
          : failed
            ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/50'
            : 'bg-[var(--surface)] text-[var(--fg-muted)] border-[var(--border)]'

      const weekday = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d.getDay()]

      return (
        <div key={key} className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-[var(--fg-muted)] font-medium">{weekday}</span>
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold border-2 transition-all',
              color,
              isToday && 'ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--surface-overlay)]'
            )}
            style={isToday ? { boxShadow: '0 0 0 1px var(--accent-subtle), 0 0 16px var(--accent-glow)' } : undefined}
          >
            {dayNum}
          </div>
        </div>
      )
    })
  }

  // ─── Edit Mode ─────────────────────────────────────────────────────────
  if (isEditing) {
    if (editScreen === 'multiplier') {
      return (
        <div className="glass-card flex h-full flex-col rounded-2xl overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <div className="flex items-center gap-3 mb-6">
              <button type="button" onClick={() => setEditScreen('main')} className="icon-btn" aria-label="Назад">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold text-[var(--fg)] flex-1">Множитель сложности</h2>
              <button type="button" onClick={() => { setIsEditing(false); setEditScreen('main') }} className="icon-btn">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-[var(--fg-muted)] mb-4">
              Можно добавить множитель награды в зависимости от сложности
            </p>

            <div className="space-y-2 mb-4">
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
                    editDifficultyLevel === id ? 'bg-[var(--accent-subtle)]' : 'hover:bg-[var(--surface-elevated)] bg-[var(--surface)]'
                  )}
                >
                  <input type="radio" name="difficultyLevel" checked={editDifficultyLevel === id} onChange={() => setEditDifficultyLevel(id)} className="sr-only" />
                  <span className={cn('flex h-4 w-4 shrink-0 rounded-full border-2 items-center justify-center', editDifficultyLevel === id ? 'border-[var(--accent)]' : 'border-[var(--border)]')}>
                    {editDifficultyLevel === id && <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />}
                  </span>
                  <span className="text-sm text-[var(--fg)]">{label}</span>
                  {mult !== null && <span className="text-xs text-[var(--fg-muted)]">(x{mult})</span>}
                  {id === 'custom' && (
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max="10"
                      value={editCustomMultiplier}
                      onChange={(e) => {
                        const v = String(e.target.value).replace(',', '.')
                        setEditCustomMultiplier(Math.min(10, Math.max(0.5, parseFloat(v) || 1)))
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-auto w-16 rounded border border-[var(--border)] bg-transparent px-2 py-1 text-sm text-right"
                    />
                  )}
                </label>
              ))}
            </div>

            {editDifficultyLevel !== 'off' && (
              <div className="pt-3 space-y-3 border-t border-[var(--border)]">
                <label className="flex items-center gap-2 text-sm text-[var(--fg)] flex-wrap">
                  Множитель срабатывает раз в
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={editMultiplierIntervalDays}
                    onChange={(e) => setEditMultiplierIntervalDays(Math.max(1, Number(e.target.value) || 1))}
                    className="w-14 rounded border border-[var(--border)] bg-transparent px-2 py-1 text-sm text-center"
                  />
                  дня
                </label>
                <div>
                  <p className="text-sm font-medium text-[var(--fg)] mb-2">Множитель работает на:</p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: 'XP', checked: editMultiplierAppliesToXp, set: setEditMultiplierAppliesToXp, others: [editMultiplierAppliesToCoins, editMultiplierAppliesToGems] },
                      { label: 'монеты', checked: editMultiplierAppliesToCoins, set: setEditMultiplierAppliesToCoins, others: [editMultiplierAppliesToXp, editMultiplierAppliesToGems] },
                      { label: 'гемы', checked: editMultiplierAppliesToGems, set: setEditMultiplierAppliesToGems, others: [editMultiplierAppliesToXp, editMultiplierAppliesToCoins] },
                    ].map(({ label, checked, set, others }) => (
                      <label key={label} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (!e.target.checked && !others.some(Boolean)) return
                            set(e.target.checked)
                          }}
                          className="rounded border-[var(--border)]"
                        />
                        <span className="text-sm text-[var(--fg)]">{label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--fg-muted)] mt-1">Можно выбрать один или все, но минимум 1</p>
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-[var(--border)] p-4">
            <button type="button" onClick={() => setEditScreen('main')} className="btn-primary w-full">
              Готово
            </button>
          </div>
        </div>
      )
    }

    // Main edit screen
    return (
      <div className="glass-card flex h-full flex-col rounded-2xl overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[var(--fg)]">Редактировать</h2>
            <button type="button" onClick={() => setIsEditing(false)} className="icon-btn">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col gap-5">
            {/* Title */}
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Название привычки"
              className="input text-lg"
              autoFocus
            />

            {/* Notes */}
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Описание (опционально)"
              rows={2}
              className="input resize-y min-h-[4.5rem]"
            />

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Иконка</label>
              <div className="flex flex-wrap gap-2">
                {HABIT_ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setEditIcon(i)}
                    className={cn(
                      'h-10 w-10 rounded-xl text-xl transition-all',
                      editIcon === i
                        ? 'bg-[var(--accent)] shadow-lg scale-110'
                        : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                    )}
                  >
                    {i}
                  </button>
                ))}
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
                    onClick={() => setEditColor(c)}
                    className={cn(
                      'h-8 w-8 rounded-lg transition-all',
                      editColor === c && 'ring-2 ring-white ring-offset-2 ring-offset-[var(--surface-overlay)] scale-110'
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            {/* Rewards */}
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
                      onMouseEnter={() => { xpTooltipTimeoutRef.current = setTimeout(() => setXpTooltipVisible(true), 1000) }}
                      onMouseLeave={() => { if (xpTooltipTimeoutRef.current) clearTimeout(xpTooltipTimeoutRef.current); setXpTooltipVisible(false) }}
                    >
                      <span className="text-[var(--fg-muted)]">XP<span className="text-amber-400">*</span>:</span>
                      <input
                        type="number"
                        value={editPositiveXp}
                        onChange={(e) => setEditPositiveXp(Number(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-right"
                      />
                      {xpTooltipVisible && (
                        <span role="tooltip" className="absolute left-0 top-full z-50 mt-2 max-w-[240px] rounded-lg bg-[var(--fg)] px-3 py-2 text-xs font-normal text-[var(--bg-solid)] shadow-lg">
                          XP начисляется как в выбранный вами атрибут, так и в общий ваш уровень
                        </span>
                      )}
                    </label>
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
                      onMouseEnter={() => { negativeXpTooltipTimeoutRef.current = setTimeout(() => setNegativeXpTooltipVisible(true), 1000) }}
                      onMouseLeave={() => { if (negativeXpTooltipTimeoutRef.current) clearTimeout(negativeXpTooltipTimeoutRef.current); setNegativeXpTooltipVisible(false) }}
                    >
                      <span className="text-[var(--fg-muted)]">XP<span className="text-amber-400">*</span>:</span>
                      <input
                        type="number"
                        value={editNegativeXp}
                        onChange={(e) => setEditNegativeXp(Number(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-right"
                      />
                      {negativeXpTooltipVisible && (
                        <span role="tooltip" className="absolute left-0 top-full z-50 mt-2 max-w-[260px] rounded-lg bg-[var(--fg)] px-3 py-2 text-xs font-normal text-[var(--bg-solid)] shadow-lg">
                          XP вычитается из вашего общего опыта и опыта выбранного атрибута
                        </span>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Attribute */}
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Атрибут</label>
              <select
                value={editAttributeId ?? ''}
                onChange={(e) => setEditAttributeId(e.target.value || null)}
                className="select w-full"
              >
                <option value="">Без атрибута</option>
                {attributes.map((a) => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            </div>

            {/* Additional settings */}
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
                  onClick={() => setEditScreen('multiplier')}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] transition-colors text-left"
                >
                  <span className="text-sm font-medium text-[var(--fg)]">Множитель сложности</span>
                  <ChevronRight className="h-4 w-4 text-[var(--fg-muted)] shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Save/Cancel */}
        <div className="shrink-0 border-t border-[var(--border)] p-4 flex gap-3">
          <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary flex-1">
            Отмена
          </button>
          <button type="button" onClick={handleSave} className="btn-primary flex-1">
            Сохранить
          </button>
        </div>
      </div>
    )
  }

  // ─── View Mode ─────────────────────────────────────────────────────────
  return (
    <div className="glass-card flex h-full flex-col rounded-2xl overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
              style={{
                background: `linear-gradient(135deg, ${habit.color}30, ${habit.color}15)`,
                boxShadow: `0 4px 16px ${habit.color}25`,
              }}
            >
              {habit.icon}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-[var(--fg)] truncate">{habit.title}</h2>
              {habit.notes && (
                <p className="text-sm text-[var(--fg-muted)] mt-0.5 line-clamp-2">{habit.notes}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button type="button" onClick={() => setIsEditing(true)} className="icon-btn">
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setShowDeleteConfirm(true)} className="icon-btn icon-btn-danger">
              <Trash2 className="h-4 w-4" />
            </button>
            <button type="button" onClick={onDeselect} className="icon-btn hidden md:flex">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {attr && (
            <span
              className="rounded-xl px-3 py-1.5 text-sm font-medium border-2"
              style={{ backgroundColor: `${attr.color}15`, color: attr.color, borderColor: `${attr.color}50` }}
            >
              {attr.icon} {attr.name}
            </span>
          )}
          {multiplierDisplay && (
            <span className="rounded-xl px-3 py-1.5 text-sm font-medium border-2 bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--border-accent)]">
              <Zap className="h-3.5 w-3.5 inline mr-1" />
              Множитель {multiplierDisplay}
            </span>
          )}
          {isFreezeActive && (
            <span className="rounded-xl px-3 py-1.5 text-sm font-medium border-2 bg-blue-500/10 text-blue-500 border-blue-500/30">
              <Snowflake className="h-3.5 w-3.5 inline mr-1" />
              Заморозка {freezeDaysLeft} дн.
            </span>
          )}
          {doneToday && (
            <span className="rounded-xl px-3 py-1.5 text-sm font-medium border-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
              <Check className="h-3.5 w-3.5 inline mr-1" />
              Выполнено сегодня
            </span>
          )}
        </div>

        {/* Streak card */}
        <div className="glass rounded-2xl p-5 mb-4">
          <h3 className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wide mb-3">Стрик</h3>
          <div className="flex items-center justify-center gap-3">
            <Flame
              className={cn(
                'h-10 w-10',
                habit.streak > 0 ? streakColor.icon : 'text-[var(--fg-muted)]',
                habit.streak > 0 && 'streak-flame-animate'
              )}
            />
            <span className={cn('text-5xl font-bold tabular-nums', habit.streak > 0 ? streakColor.text : 'text-[var(--fg-muted)]')}>
              {habit.streak}
            </span>
          </div>
          <p className="text-center text-sm text-[var(--fg-muted)] mt-2">
            {habit.streak === 0
              ? 'Начните серию!'
              : `${habit.streak} ${pluralRu(habit.streak, 'день', 'дня', 'дней')} подряд`}
          </p>
        </div>

        {/* Week circles */}
        <div className="glass rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wide">Неделя</h3>
            <button
              type="button"
              onClick={() => setShowCalendar(true)}
              className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              <Calendar className="h-3.5 w-3.5" />
              Календарь
            </button>
          </div>
          <div className="flex items-center justify-center gap-2">
            {renderWeekCircles()}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--fg-muted)] mt-4 pt-3 border-t border-[var(--border)]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500/30 border border-emerald-500/50" />
              Выполнено
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-red-500/30 border border-red-500/50" />
              Пропущено
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-blue-500/30 border border-blue-500/50" />
              Заморозка
            </span>
          </div>
        </div>

        {/* Rewards card */}
        <div className="glass rounded-2xl p-5 mb-4">
          <h3 className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wide mb-3">Награды</h3>
          <div className="grid grid-cols-2 gap-3">
            {habit.positiveEnabled && (
              <div className="rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-500">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Выполнено</span>
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  {rewards.xp > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{rewards.xp} XP</span>}
                  {rewards.coins > 0 && <span className="text-amber-600 dark:text-amber-400 font-medium">+{rewards.coins} монет</span>}
                  {rewards.gems > 0 && <span className="text-violet-600 dark:text-violet-400 font-medium">+{rewards.gems} гемов</span>}
                  {rewards.xp === 0 && rewards.coins === 0 && rewards.gems === 0 && (
                    <span className="text-[var(--fg-muted)]">Без награды</span>
                  )}
                </div>
              </div>
            )}
            {habit.negativeEnabled && (
              <div className="rounded-xl bg-red-500/10 p-4 border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20 text-red-500">
                    <Minus className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">Не выполнено</span>
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  {habit.negativeXp > 0 && <span className="text-red-600 dark:text-red-400 font-medium">-{habit.negativeXp} XP</span>}
                  {(habit.negativeCoins ?? 0) > 0 && <span className="text-amber-600 dark:text-amber-400 font-medium">-{habit.negativeCoins} монет</span>}
                  {habit.negativeXp === 0 && (habit.negativeCoins ?? 0) === 0 && (
                    <span className="text-[var(--fg-muted)]">Без штрафа</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats card */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wide mb-3">Статистика</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card">
              <div className="stat-value text-emerald-500">{habit.totalPositive}</div>
              <div className="stat-label">Всего выполнено</div>
            </div>
            <div className="stat-card">
              <div className="stat-value text-red-500">{habit.totalNegative}</div>
              <div className="stat-label">Всего пропущено</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="shrink-0 border-t border-[var(--border)] p-4 flex gap-3">
        {/* Mobile back button */}
        <button
          type="button"
          onClick={onDeselect}
          className="md:hidden flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handlePositive}
          disabled={!experimentalMode && hasActedToday}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold transition-all duration-200',
            hasActedToday && !experimentalMode
              ? 'bg-[var(--surface)] text-[var(--fg-muted)] cursor-not-allowed opacity-50'
              : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
          )}
        >
          <Plus className="h-5 w-5" />
          {doneToday ? 'Выполнено' : 'Выполнить'}
        </button>
        {habit.negativeEnabled && (
          <button
            type="button"
            onClick={handleNegative}
            disabled={!experimentalMode && hasActedToday}
            className={cn(
              'flex h-12 items-center justify-center gap-2 rounded-2xl px-5 font-semibold transition-all duration-200',
              hasActedToday && !experimentalMode
                ? 'bg-[var(--surface)] text-[var(--fg-muted)] cursor-not-allowed opacity-50'
                : 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 active:scale-[0.98]'
            )}
          >
            <Minus className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Modals */}
      {showCalendar && <HabitCalendarModal habit={habit} onClose={() => setShowCalendar(false)} />}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Удалить привычку?"
        message="Привычка будет удалена безвозвратно."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />
    </div>
  )
}
