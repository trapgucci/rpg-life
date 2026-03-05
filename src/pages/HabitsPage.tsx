import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Plus, X, Repeat,
  ArrowUpDown, ArrowUp, ArrowDown, Search, List, Target, CheckSquare, XCircle, Sparkles
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import { HABIT_ICONS, PRESET_COLORS, pluralRu } from '../lib/habitUtils'
import type { Habit, AttributeId, HabitId } from '../types/domain'
import HabitCard from '../components/HabitCard'
import HabitDetailPanel from '../components/HabitDetailPanel'

// ─── Types ─────────────────────────────────────────────────────────────────

type HabitFilter = 'all' | 'active' | 'done' | 'missed'
type SortField = 'date' | 'streak' | 'name' | 'reward'
type SortDirection = 'asc' | 'desc'

const SORT_LABELS: Record<SortField, string> = {
  date: 'Дата',
  streak: 'Стрик',
  name: 'Название',
  reward: 'Награда',
}

// ─── Create Form (full-page, like TaskCreateForm) ──────────────────────────

interface HabitCreateFormProps {
  onCreated: () => void
}

function HabitCreateForm({ onCreated }: HabitCreateFormProps) {
  const addHabit = useRpgStore((s) => s.addHabit)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [icon, setIcon] = useState('💪')
  const [color, setColor] = useState('#6366f1')
  const [positiveXp, setPositiveXp] = useState(50)
  const [negativeXp, setNegativeXp] = useState(25)
  const [attributeId, setAttributeId] = useState<AttributeId | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    addHabit({
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
    })
    onCreated()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Название привычки"
        className="input text-lg"
        autoFocus
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
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

      {/* Rewards */}
      <div>
        <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Награда и наказание</label>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-emerald-500 bg-emerald-500/20 text-emerald-600">
                <CheckSquare className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="font-medium text-emerald-500">Выполнено (+)</span>
            </div>
            <label className="flex items-center justify-between text-sm">
              <span className="text-[var(--fg-muted)]">XP:</span>
              <input
                type="number"
                value={positiveXp || ''}
                onChange={(e) => setPositiveXp(Number(e.target.value) || 0)}
                className="w-20 rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-right"
              />
            </label>
          </div>
          <div className="rounded-xl bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-red-500 bg-red-500/20 text-red-600">
                <X className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="font-medium text-red-500">Не выполнено (−)</span>
            </div>
            <label className="flex items-center justify-between text-sm">
              <span className="text-[var(--fg-muted)]">XP:</span>
              <input
                type="number"
                value={negativeXp || ''}
                onChange={(e) => setNegativeXp(Number(e.target.value) || 0)}
                className="w-20 rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-right"
              />
            </label>
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
            <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
          ))}
        </select>
      </div>

      <button type="submit" className="btn-primary w-full mt-2">
        Создать привычку
      </button>
    </form>
  )
}

// ─── Main Habits Page ──────────────────────────────────────────────────────

export default function HabitsPage() {
  const allHabits = useRpgStore((s) => s.habits)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const habits = activeProfileId ? allHabits.filter((h) => h.profileId === activeProfileId) : []
  const activeHabits = habits.filter((h) => !h.archived)

  const [selectedId, setSelectedId] = useState<HabitId | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [habitFilter, setHabitFilter] = useState<HabitFilter>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)

  // Form animation
  useEffect(() => {
    if (showForm) {
      const timeout = setTimeout(() => setFormVisible(true), 20)
      return () => clearTimeout(timeout)
    } else {
      setFormVisible(false)
    }
  }, [showForm])

  // Close sort menu on outside click
  useEffect(() => {
    if (!showSortMenu) return
    const handler = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSortMenu])

  // Filter & sort
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStartTs = todayStart.getTime()

  const filteredHabits = useMemo(() => {
    let list = activeHabits

    // Filter
    if (habitFilter === 'active') {
      list = list.filter((h) => !(h.lastResetDate >= todayStartTs && (h.todayPositive > 0 || h.todayNegative > 0)))
    } else if (habitFilter === 'done') {
      list = list.filter((h) => h.lastResetDate >= todayStartTs && h.todayPositive > 0)
    } else if (habitFilter === 'missed') {
      list = list.filter((h) => h.lastResetDate >= todayStartTs && h.todayNegative > 0 && h.todayPositive === 0)
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((h) => h.title.toLowerCase().includes(q))
    }

    // Sort
    const sorted = [...list].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1
      switch (sortField) {
        case 'date':
          return (a.createdAt - b.createdAt) * dir
        case 'streak':
          return (a.streak - b.streak) * dir
        case 'name':
          return a.title.localeCompare(b.title) * dir
        case 'reward':
          return (a.positiveXp - b.positiveXp) * dir
        default:
          return 0
      }
    })

    return sorted
  }, [activeHabits, habitFilter, searchQuery, sortField, sortDirection, todayStartTs])

  const selectedHabit = selectedId ? allHabits.find((h) => h.id === selectedId) ?? null : null

  const filterSubtitle = (() => {
    switch (habitFilter) {
      case 'all': return `${activeHabits.length} ${pluralRu(activeHabits.length, 'привычка', 'привычки', 'привычек')}`
      case 'active': return 'Ожидают действия'
      case 'done': return 'Выполнены сегодня'
      case 'missed': return 'Пропущены'
    }
  })()

  // ─── Create Form (full-page) ──────────────────────────────────────────
  if (showForm) {
    return (
      <div
        className={cn(
          'flex h-full min-h-0 flex-col',
          'transition-all duration-500 ease-out',
          formVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-8 scale-95'
        )}
      >
        <div className="glass-card mb-4 flex shrink-0 items-center justify-between rounded-2xl px-4 py-3">
          <h2 className="text-lg font-semibold text-[var(--fg)]">Новая привычка</h2>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="icon-btn h-9 w-9 shrink-0 rounded-full p-0 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            title="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-4">
          <div className="glass-card min-h-0 rounded-2xl p-4">
            <HabitCreateForm onCreated={() => setShowForm(false)} />
          </div>
        </div>
      </div>
    )
  }

  // ─── Main Layout ──────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 gap-4">
      {/* Left Panel */}
      <div className="flex w-full md:basis-[42%] md:max-w-[560px] md:min-w-[420px] md:shrink-0 flex-col gap-4">
        {/* Header */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30">
                <Repeat className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--fg)]">Привычки</h1>
                <p className="text-xs text-[var(--fg-muted)]">{filterSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Sort */}
              <div className="relative" ref={sortMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowSortMenu((v) => !v)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                    'border border-[var(--border)] text-[var(--fg-muted)]',
                    'hover:border-[var(--border-accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]',
                    showSortMenu && 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-subtle)]'
                  )}
                  title="Сортировка"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-[var(--border)] bg-[var(--surface-overlay)] shadow-lg backdrop-blur-xl overflow-hidden">
                    <div className="px-3 py-2 text-xs font-medium text-[var(--fg-muted)] border-b border-[var(--border)]">
                      Сортировка
                    </div>
                    {(Object.keys(SORT_LABELS) as SortField[]).map((field) => {
                      const isActive = sortField === field
                      return (
                        <button
                          key={field}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
                            } else {
                              setSortField(field)
                              setSortDirection('desc')
                            }
                          }}
                          className={cn(
                            'flex w-full items-center justify-between px-3 py-2 text-sm transition-colors',
                            isActive
                              ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium'
                              : 'text-[var(--fg-secondary)] hover:bg-[var(--surface)]'
                          )}
                        >
                          <span>{SORT_LABELS[field]}</span>
                          {isActive && (
                            sortDirection === 'asc'
                              ? <ArrowUp className="h-3.5 w-3.5" />
                              : <ArrowDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Search */}
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                  'border border-[var(--border)] text-[var(--fg-muted)]',
                  'hover:border-[var(--border-accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]',
                  showSearch && 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-subtle)]'
                )}
                title="Поиск"
              >
                <Search className="h-4 w-4" />
              </button>

              {/* New habit */}
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Новая</span>
              </button>
            </div>
          </div>

          {/* Search input */}
          {showSearch && (
            <div className="mt-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию..."
                className="input w-full"
                autoFocus
              />
            </div>
          )}

          {/* Filter tabs */}
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <p className="mb-2 text-xs font-medium text-[var(--fg-muted)]">Статус сегодня</p>
            <div className="grid grid-cols-4 gap-2">
              {([
                { id: 'all' as const, icon: List, label: 'Все' },
                { id: 'active' as const, icon: Target, label: 'Ожидают' },
                { id: 'done' as const, icon: CheckSquare, label: 'Выполнены' },
                { id: 'missed' as const, icon: XCircle, label: 'Пропущены' },
              ]).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setHabitFilter(id)}
                  className={cn(
                    'flex items-center justify-center rounded-xl px-3 py-2.5 text-sm transition-all',
                    habitFilter === id
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                      : 'text-[var(--fg-secondary)] hover:bg-[var(--surface)]'
                  )}
                  title={label}
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Habit list */}
        <div className="flex-1 overflow-y-auto rounded-2xl">
          {filteredHabits.length === 0 ? (
            <div className="glass-card flex h-full flex-col items-center justify-center rounded-2xl py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] mb-4">
                <Repeat className="h-8 w-8 text-[var(--accent)]" />
              </div>
              <p className="font-medium text-[var(--fg)]">
                {activeHabits.length === 0 ? 'Нет привычек' : 'Нет привычек в этом фильтре'}
              </p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">
                {activeHabits.length === 0
                  ? 'Создайте свою первую привычку'
                  : 'Попробуйте другой фильтр'}
              </p>
              {activeHabits.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="btn-primary mt-4 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Создать привычку
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  selected={habit.id === selectedId}
                  onSelect={() => setSelectedId(habit.id)}

                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden md:block min-w-0 flex-1">
        {selectedHabit ? (
          <HabitDetailPanel
            habit={selectedHabit}
            onDeselect={() => setSelectedId(null)}

          />
        ) : (
          <div className="glass-card flex h-full flex-col items-center justify-center rounded-2xl">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--surface)] mb-4">
              <Sparkles className="h-10 w-10 text-[var(--fg-muted)]" />
            </div>
            <p className="font-medium text-[var(--fg)]">Выберите привычку</p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">или создайте новую из списка слева</p>
          </div>
        )}
      </div>

      {/* Mobile detail overlay */}
      {selectedHabit && (
        <div className="fixed inset-0 z-40 md:hidden overflow-y-auto p-4 animate-habit-slide-up" style={{ background: 'var(--bg)', backgroundColor: 'var(--bg-solid)' }}>
          <HabitDetailPanel
            habit={selectedHabit}
            onDeselect={() => setSelectedId(null)}

          />
        </div>
      )}
    </div>
  )
}
