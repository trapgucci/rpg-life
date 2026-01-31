import { useState } from 'react'
import { Plus, Minus, Flame, Pencil, Trash2, X, Repeat, Zap, Coins } from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import type { Habit, AttributeId } from '../types/domain'

interface HabitCardProps {
  habit: Habit
  onEdit: () => void
}

function HabitCard({ habit, onEdit }: HabitCardProps) {
  const clickPositive = useRpgStore((s) => s.clickHabitPositive)
  const clickNegative = useRpgStore((s) => s.clickHabitNegative)
  const deleteHabit = useRpgStore((s) => s.deleteHabit)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  
  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []
  const attr = habit.attributeId ? attributes.find((a) => a.id === habit.attributeId) : null

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
            onClick={() => clickNegative(habit.id)}
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
              'bg-gradient-to-br from-red-500/20 to-red-600/10 text-red-500',
              'transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-red-500/20',
              'active:scale-95'
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
            {habit.streak > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl bg-orange-500/10 px-3 py-1.5">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-semibold text-orange-500">{habit.streak}</span>
              </div>
            )}
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

          {/* Today counters */}
          <div className="mt-3 flex items-center gap-4 text-xs text-[var(--fg-muted)]">
            <span>Сегодня: <span className="text-emerald-500 font-medium">+{habit.todayPositive}</span></span>
            <span><span className="text-red-500 font-medium">−{habit.todayNegative}</span></span>
            <span>Всего: <span className="font-medium text-[var(--fg)]">{habit.totalPositive - habit.totalNegative}</span></span>
          </div>
        </div>

        {/* Positive button */}
        {habit.positiveEnabled && (
          <button
            type="button"
            onClick={() => clickPositive(habit.id)}
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
              'bg-gradient-to-br from-emerald-500 to-green-600 text-white',
              'transition-all duration-200 hover:scale-110 shadow-lg shadow-emerald-500/30',
              'hover:shadow-xl hover:shadow-emerald-500/40 active:scale-95'
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
  const [positiveEnabled, setPositiveEnabled] = useState(habit?.positiveEnabled ?? true)
  const [negativeEnabled, setNegativeEnabled] = useState(habit?.negativeEnabled ?? true)
  const [positiveXp, setPositiveXp] = useState(habit?.positiveXp ?? 50)
  const [negativeXp, setNegativeXp] = useState(habit?.negativeXp ?? 25)
  const [positiveCoins, setPositiveCoins] = useState(habit?.positiveCoins ?? 5)
  const [negativeCoins, setNegativeCoins] = useState(habit?.negativeCoins ?? 2)
  const [attributeId, setAttributeId] = useState<AttributeId | null>(habit?.attributeId ?? null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const data = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      icon,
      color,
      positiveEnabled,
      negativeEnabled,
      positiveXp,
      negativeXp,
      positiveCoins,
      negativeCoins,
      attributeId,
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
            className="input resize-none"
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
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-[var(--surface)] p-4">
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={positiveEnabled}
                  onChange={(e) => setPositiveEnabled(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-500"
                />
                <span className="font-medium text-emerald-500">Положительно (+)</span>
              </label>
              {positiveEnabled && (
                <div className="flex flex-col gap-2 text-sm">
                  <label className="flex items-center justify-between">
                    <span className="text-[var(--fg-muted)]">XP:</span>
                    <input
                      type="number"
                      value={positiveXp}
                      onChange={(e) => setPositiveXp(Number(e.target.value) || 0)}
                      className="w-20 rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-right"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-[var(--fg-muted)]">Монеты:</span>
                    <input
                      type="number"
                      value={positiveCoins}
                      onChange={(e) => setPositiveCoins(Number(e.target.value) || 0)}
                      className="w-20 rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-right"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-[var(--surface)] p-4">
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={negativeEnabled}
                  onChange={(e) => setNegativeEnabled(e.target.checked)}
                  className="h-4 w-4 rounded accent-red-500"
                />
                <span className="font-medium text-red-500">Отрицательно (−)</span>
              </label>
              {negativeEnabled && (
                <div className="flex flex-col gap-2 text-sm">
                  <label className="flex items-center justify-between">
                    <span className="text-[var(--fg-muted)]">XP:</span>
                    <input
                      type="number"
                      value={negativeXp}
                      onChange={(e) => setNegativeXp(Number(e.target.value) || 0)}
                      className="w-20 rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-right"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-[var(--fg-muted)]">Монеты:</span>
                    <input
                      type="number"
                      value={negativeCoins}
                      onChange={(e) => setNegativeCoins(Number(e.target.value) || 0)}
                      className="w-20 rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-right"
                    />
                  </label>
                </div>
              )}
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30">
            <Repeat className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--fg)]">Привычки</h1>
            <p className="text-sm text-[var(--fg-muted)]">{activeHabits.length} активных</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Новая привычка
        </button>
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
            <HabitCard key={habit.id} habit={habit} onEdit={() => handleEdit(habit)} />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && <HabitForm habit={editingHabit} onClose={handleCloseForm} />}
    </div>
  )
}
