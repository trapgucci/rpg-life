import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Trophy, Plus, Pencil, Trash2, X, Lock, Unlock,
  Zap, Coins, Gem, Target, Award, Check, ChevronLeft,
  FolderOpen, ChevronDown, Minus, Package, ShoppingBag,
  Search, Folder, ListChecks, BarChart3,
  Hand, TrendingUp, Gamepad2, Clapperboard, Gift, Percent, RefreshCw,
  CalendarCheck, History, Flame, Wallet, Repeat, Calendar, CheckSquare, Hash, ClipboardList, ClipboardCheck
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import { useShallow } from 'zustand/react/shallow'
import ConfirmModal from '../components/ConfirmModal'
import Modal from '../components/Modal'
import { ItemIconBadge } from '../components/ItemIconBadge'
import { getItemTypeBadge, getItemTypeColor } from '../components/shop/shopUtils'
import { useNotifications } from '../hooks/useNotifications'
import type {
  Achievement, AchievementConditionType, AchievementGroup,
  AchievementGroupId, AttributeId, TaskDifficulty, ItemId, TaskId,
  ShopItem, TaskRpg, TaskRecurrence, DailyCondition, DailyConditionId,
} from '../types/domain'
import { TASK_XP_BY_DIFFICULTY } from '../types/domain'
import { rpgToast } from '../components/RpgToast'

// ─── Emoji categories for picker ─────────────────────────────────────────────

const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  { name: 'Награды', emojis: ['🏆', '⭐', '🎖️', '🏅', '🥇', '🥈', '🥉', '👑', '💎', '🔮', '🎁', '🪙', '🏵️', '🎀', '💫', '🌟'] },
  { name: 'Действия', emojis: ['🎯', '🔥', '💪', '🚀', '⚡', '💥', '✊', '🤺', '🏹', '⚔️', '🛡️', '🗡️', '💣', '🧨', '🪃', '🔱'] },
  { name: 'Эмоции', emojis: ['🎉', '✨', '💫', '🌟', '❤️', '💖', '😎', '🤩', '🥳', '😈', '👻', '🤯', '😤', '🥶', '🫡', '💀'] },
  { name: 'Природа', emojis: ['🌍', '🏔️', '🌋', '🌊', '🌲', '🌸', '🍀', '🌈', '☀️', '🌙', '❄️', '🌪️', '🌺', '🌻', '🍄', '🪨'] },
  { name: 'Еда', emojis: ['🍕', '🍔', '🎂', '🍩', '🍷', '☕', '🍎', '🧁', '🍣', '🥗', '🍫', '🍿', '🥐', '🍰', '🧀', '🌮'] },
  { name: 'Спорт', emojis: ['🏃', '🏋️', '🧗', '🏄', '🚴', '🥊', '🎾', '⚽', '🏀', '🎿', '🤸', '🧘', '🏊', '🤾', '🏓', '⛳'] },
  { name: 'Учёба', emojis: ['📚', '🧠', '🎓', '📝', '🔬', '🧪', '🎨', '🎵', '🎭', '💼', '📖', '🔭', '🧮', '📐', '✏️', '🖊️'] },
  { name: 'Путешествия', emojis: ['✈️', '🗺️', '🏠', '🏰', '🗼', '🎪', '🚗', '🚀', '🛸', '🎡', '⛺', '🏝️', '🚢', '🗽', '⛩️', '🎠'] },
  { name: 'Техника', emojis: ['🎮', '🕹️', '💻', '📱', '🤖', '⚙️', '🔧', '🛠️', '📡', '🔋', '💡', '🧬', '🔌', '💾', '🖥️', '📷'] },
  { name: 'Животные', emojis: ['🐉', '🦅', '🦁', '🐺', '🦊', '🐻', '🦄', '🐲', '🦇', '🐙', '🦋', '🐍', '🦈', '🐅', '🦉', '🐘'] },
]

const FOLDER_ICONS = [
  '📁', '🗂️', '🏆', '⭐', '🎯', '🔥', '💎', '👑',
  '🌍', '✈️', '🏔️', '🎮', '📚', '💪', '🎨', '🎵',
  '🧠', '❤️', '🚀', '⚔️', '🛡️', '🏅', '🌟', '🎉',
  '🏠', '💼', '🎓', '🌱', '🧪', '🔬', '🎭', '🏄'
]

const FOLDER_COLORS = [
  '#6b7280', // серый (дефолт)
  '#f59e0b', // янтарный
  '#ef4444', // красный
  '#10b981', // зелёный
  '#3b82f6', // синий
  '#8b5cf6', // фиолетовый
  '#ec4899', // розовый
  '#06b6d4', // голубой
  '#f97316', // оранжевый
]

const NO_GROUP_ID = '__none__' as AchievementGroupId

// ─── Achievement Detail Modal ─────────────────────────────────────────────────

interface AchievementDetailModalProps {
  achievement: Achievement
  onClose: () => void
  onEdit: () => void
}

function AchievementDetailModal({ achievement, onClose, onEdit }: AchievementDetailModalProps) {
  const { notifyAchievement } = useNotifications()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { profiles, activeProfileId, shopItems } = useRpgStore(
    useShallow((s) => ({
      profiles: s.profiles,
      activeProfileId: s.activeProfileId,
      shopItems: s.shopItems,
    }))
  )

  const deleteAchievement = useRpgStore((s) => s.deleteAchievement)
  const unlockAchievement = useRpgStore((s) => s.unlockAchievement)
  const markAchievementReady = useRpgStore((s) => s.markAchievementReady)

  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []
  const rewardAttr = achievement.rewardAttributeId ? attributes.find((a) => a.id === achievement.rewardAttributeId) : null
  const rewardItemsList = useMemo(() => {
    const items = achievement.rewardItems?.length
      ? achievement.rewardItems
      : achievement.rewardItemId
        ? [{ itemId: achievement.rewardItemId, quantity: achievement.rewardItemQuantity ?? 1 }]
        : []
    return items.map((ri) => ({ ...ri, item: shopItems.find((i) => i.id === ri.itemId) })).filter((ri) => ri.item)
  }, [achievement, shopItems])

  const safeCurrentProgress = Number.isFinite(achievement.currentProgress) ? achievement.currentProgress : 0
  const safeTargetValue = Number.isFinite(achievement.condition.targetValue) ? achievement.condition.targetValue : 0
  const progress = safeTargetValue > 0
    ? Math.min(1, safeCurrentProgress / safeTargetValue)
    : 0
  const allTasks = useRpgStore((s) => s.tasks)

  const attr = achievement.condition.attributeId
    ? attributes.find((a) => a.id === achievement.condition.attributeId)
    : null

  const condTask = achievement.condition.taskId
    ? allTasks.find((t) => t.id === achievement.condition.taskId)
    : null

  const condItem = achievement.condition.itemId
    ? shopItems.find((i) => i.id === achievement.condition.itemId)
    : null

  const pluralize = (n: number, one: string, few: string, many: string): string => {
    const abs = Math.abs(n) % 100
    const mod10 = abs % 10
    if (abs > 10 && abs < 20) return many
    if (mod10 === 1) return one
    if (mod10 >= 2 && mod10 <= 4) return few
    return many
  }

  const getConditionText = () => {
    const { type, targetValue } = achievement.condition
    switch (type) {
      case 'tasks_completed':
        return `Выполните ${targetValue} ${pluralize(targetValue, 'задачу', 'задачи', 'задач')}`
      case 'task_completed_today':
        return `«${condTask?.title ?? 'задача'}» выполнена ${targetValue} ${pluralize(targetValue, 'раз', 'раза', 'раз')} сегодня`
      case 'task_completed_total':
        return `«${condTask?.title ?? 'задача'}» выполнена ${targetValue} ${pluralize(targetValue, 'раз', 'раза', 'раз')} за всё время`
      case 'task_streak':
        return `Стрик ${targetValue} для «${condTask?.title ?? 'задача'}»`
      case 'item_used':
        return `«${condItem?.name ?? 'предмет'}» использован ${targetValue} ${pluralize(targetValue, 'раз', 'раза', 'раз')}`
      case 'attribute_level':
        return `Достигните уровня ${targetValue} в ${attr?.name ?? 'атрибуте'}`
      case 'coins_earned_spent':
        return `${targetValue.toLocaleString('ru-RU')} монет ${achievement.condition.coinMode === 'spent' ? 'потрачено' : 'заработано'}`
      case 'gems_earned_spent':
        return `${targetValue.toLocaleString('ru-RU')} кристаллов ${achievement.condition.coinMode === 'spent' ? 'потрачено' : 'заработано'}`
      case 'custom':
        return 'Разблокируйте вручную'
      default:
        return ''
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-sm relative">
        {/* Edit / Delete buttons — top right */}
        <div className="absolute top-4 right-4 flex gap-1">
          <button
            type="button"
            onClick={() => {
              onClose()
              onEdit()
            }}
            className="icon-btn"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="icon-btn icon-btn-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Big icon */}
        <div className="flex justify-center pt-2 pb-4">
          <div
            className={cn(
              'relative flex h-20 w-20 items-center justify-center rounded-2xl text-[52px]',
              achievement.unlocked && 'achievement-shimmer achievement-icon-wrapper'
            )}
            style={
              achievement.unlocked
                ? {
                    background: 'linear-gradient(145deg, #fbbf24ee, #f59e0bee)',
                    boxShadow:
                      '0 0 20px rgba(251,191,36,0.5), inset 0 1px 0 rgba(255,255,255,0.4)',
                  }
                : {
                    background: 'var(--surface)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
                    filter: 'grayscale(1)',
                    opacity: 0.6,
                  }
            }
          >
            <span className="achievement-icon-emoji">{achievement.icon}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-[var(--fg)] text-center">{achievement.title}</h3>

        {/* Description */}
        {achievement.description && (
          <p className="mt-1 text-sm text-[var(--fg-muted)] text-center">{achievement.description}</p>
        )}

        {/* Condition */}
        <div className="mt-4 w-full rounded-xl bg-[var(--accent)]/8 border border-[var(--accent)]/25 px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] mb-1 text-center">Условие</p>
          <p className="text-sm text-[var(--accent)] text-center font-semibold">
            {getConditionText()}
          </p>
        </div>

        {/* Progress bar */}
        {!achievement.unlocked && achievement.condition.type !== 'custom' && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress * 100}%`,
                  background: 'linear-gradient(90deg, #f59e0b, #eab308)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-[var(--fg-muted)]">
              <span>{safeCurrentProgress} / {safeTargetValue}</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
          </div>
        )}

        {/* Rewards */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {achievement.rewardXp > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-500">
              <Zap className="h-3 w-3" />
              {achievement.rewardXp} XP
              {rewardAttr && <span className="opacity-75">→ {rewardAttr.icon}</span>}
            </span>
          )}
          {achievement.rewardCoins > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <Coins className="h-3 w-3" />
              {achievement.rewardCoins}
            </span>
          )}
          {achievement.rewardGems > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-600 dark:text-cyan-400">
              <Gem className="h-3 w-3" strokeWidth={2.5} />
              {achievement.rewardGems}
            </span>
          )}
          {rewardItemsList.map(({ itemId, quantity, item }) => (
            <span key={itemId} className="relative inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-500">
              <ItemIconBadge item={item!} size="xs" />
              {item!.name}
              {quantity > 1 && (
                <span className="absolute -top-1 -right-1 text-[8px] font-bold leading-none bg-indigo-500 text-white rounded-full w-3 h-3 flex items-center justify-center z-10">
                  ×{quantity}
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Unlock date */}
        {achievement.unlocked && achievement.unlockedAt && (
          <p className="mt-3 text-xs text-[var(--fg-muted)] text-center">
            Разблокировано: {new Date(achievement.unlockedAt).toLocaleDateString('ru-RU')}
          </p>
        )}

        {/* Repeatable: completion count & current lap */}
        {achievement.repeatable && (achievement.completionCount ?? 0) > 0 && (
          <p className="mt-2 text-xs text-cyan-400 text-center font-semibold">
            Выполнено: {achievement.completionCount} {pluralize(achievement.completionCount ?? 0, 'раз', 'раза', 'раз')} · Круг {(achievement.completionCount ?? 0) + 1}
          </p>
        )}

        {/* Unlock button — two-step for custom: first mark ready, then claim */}
        {!achievement.unlocked && achievement.condition.type === 'custom' && !achievement.readyToUnlock && (
          <button
            type="button"
            onClick={() => {
              markAchievementReady(achievement.id)
              rpgToast({
                title: achievement.title,
                description: 'Можно забрать награду!',
                type: 'achievement_complete',
                coins: achievement.rewardCoins,
                xp: achievement.rewardXp,
                gems: achievement.rewardGems,
                items: rewardItemsList.map((ri) => ({
                  name: ri.item!.name,
                  emoji: ri.item!.emoji,
                  quantity: ri.quantity,
                })),
                duration: 6000,
              })
              onClose()
            }}
            className="mt-4 btn-primary text-sm py-2 w-full flex items-center justify-center"
          >
            <Unlock className="h-4 w-4 mr-2" />
            Разблокировать
          </button>
        )}
        {!achievement.unlocked && achievement.readyToUnlock && (
          <button
            type="button"
            onClick={() => {
              const result = unlockAchievement(achievement.id)
              notifyAchievement(achievement.title)

              // Компенсация из достижения — сложить доп. монеты/кристаллы
              let extraCoins = 0, extraGems = 0
              const compDescriptions: string[] = []
              if (result?.compensations.length) {
                for (const c of result.compensations) {
                  extraCoins += c.coins
                  extraGems += c.gems
                  if (c.reason === 'out_of_stock') {
                    compDescriptions.push(c.coins > 0 || c.gems > 0
                      ? `${c.name} — нет в наличии, компенсация 80%`
                      : `${c.name} — нет в наличии`)
                  }
                }
              }

              rpgToast({
                title: `Достижение: ${achievement.title}!`,
                type: 'achievement',
                coins: achievement.rewardCoins + extraCoins,
                xp: achievement.rewardXp,
                gems: achievement.rewardGems + extraGems,
                items: result?.givenItems.length ? result.givenItems : undefined,
                description: compDescriptions.length ? compDescriptions.join('; ') : undefined,
              })
              onClose()
            }}
            className="mt-4 btn-primary text-sm py-2 w-full flex items-center justify-center"
          >
            <Trophy className="h-4 w-4 mr-2" />
            Забрать награду
          </button>
        )}

        <ConfirmModal
          isOpen={showDeleteConfirm}
          onConfirm={() => {
            setShowDeleteConfirm(false)
            deleteAchievement(achievement.id)
            rpgToast({ title: 'Достижение удалено', type: 'info' })
            onClose()
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          title="Удалить достижение?"
          message="Достижение будет удалено безвозвратно."
          confirmText="Удалить"
          cancelText="Отмена"
          variant="danger"
        />
      </div>
    </div>
  )
}

// ─── Achievement Form ───────────────────────────────────────────────────────

interface AchievementFormProps {
  achievement?: Achievement
  onClose: () => void
  defaultGroupId?: AchievementGroupId | null
}

const CONDITION_TYPES: {
  value: AchievementConditionType
  label: string
  description: string
  icon: typeof ListChecks
  color: string
}[] = [
  { value: 'tasks_completed', label: 'Выполненных задач', description: 'Достижение разблокируется после выполнения определённого количества задач', icon: ListChecks, color: '#3b82f6' },
  { value: 'task_completed_today', label: 'Задача выполнена сегодня', description: 'Конкретная задача выполнена указанное количество раз за сегодня', icon: CalendarCheck, color: '#22c55e' },
  { value: 'task_completed_total', label: 'Задача выполнена всего', description: 'Конкретная задача выполнена указанное количество раз за всё время', icon: History, color: '#6366f1' },
  { value: 'task_streak', label: 'Серия для задачи', description: 'Непрерывная серия выполнений конкретной задачи подряд', icon: Flame, color: '#f97316' },
  { value: 'item_used', label: 'Предмет использован', description: 'Конкретный предмет использован указанное количество раз', icon: Package, color: '#14b8a6' },
  { value: 'attribute_level', label: 'Уровень атрибута', description: 'Один из ваших атрибутов должен достичь указанного уровня', icon: BarChart3, color: '#8b5cf6' },
  { value: 'coins_earned_spent', label: 'Монет заработано / потрачено', description: 'Суммарное количество монет, заработанных или потраченных за всё время', icon: Wallet, color: '#eab308' },
  { value: 'gems_earned_spent', label: 'Кристаллов заработано / потрачено', description: 'Суммарное количество кристаллов, заработанных или потраченных за всё время', icon: Gem, color: '#a855f7' },
  { value: 'condition_checked', label: 'Условие дневника', description: 'Условие из дневника выполнено указанное количество раз (галочки по дням)', icon: ClipboardCheck, color: '#22c55e' },
  { value: 'custom', label: 'Ручная разблокировка', description: 'Без автоматического отслеживания — вы разблокируете достижение вручную', icon: Hand, color: '#6b7280' },
]

const RECURRENCE_LABELS: Record<TaskRecurrence, { label: string; color: string }> = {
  once: { label: 'Один раз', color: '#6b7280' },
  daily: { label: 'Ежедневно', color: '#3b82f6' },
  weekly: { label: 'Еженедельно', color: '#8b5cf6' },
  monthly: { label: 'Ежемесячно', color: '#ec4899' },
  yearly: { label: 'Ежегодно', color: '#f59e0b' },
  instant: { label: 'Инстант', color: '#22c55e' },
  custom: { label: 'Кастомный', color: '#6366f1' },
}

const TASK_KIND_ICONS: Record<string, typeof CheckSquare> = {
  checkbox: CheckSquare,
  counter: Hash,
  nested: ClipboardList,
}

const ITEM_TYPE_BADGE_STYLES: Record<string, { cls: string; Icon: typeof Gift }> = {
  lootbox: { cls: 'bg-gradient-to-br from-violet-400 to-violet-600', Icon: Gift },
  multiplier: { cls: 'bg-gradient-to-br from-amber-400 to-orange-500', Icon: TrendingUp },
  discount: { cls: 'bg-gradient-to-br from-red-400 to-rose-600', Icon: Percent },
  videogame: { cls: 'bg-gradient-to-br from-cyan-400 to-cyan-600', Icon: Gamepad2 },
  serial: { cls: 'bg-gradient-to-br from-pink-400 to-rose-600', Icon: Clapperboard },
}

const DIFFICULTY_OPTIONS: { value: TaskDifficulty; label: string; defaultXp: number }[] = [
  { value: 'easy', label: 'Легко', defaultXp: 10 },
  { value: 'medium', label: 'Средне', defaultXp: 30 },
  { value: 'hard', label: 'Сложно', defaultXp: 100 },
  { value: 'veryHard', label: 'Импосибл', defaultXp: 300 },
]

const getXpColorClasses = (xp: number) => {
  if (xp >= 300) return { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' }
  if (xp >= 100) return { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' }
  if (xp >= 30) return { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' }
  return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' }
}


// ─── Item Picker Modal ──────────────────────────────────────────────────────

interface ItemPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (item: ShopItem) => void
  selectedItemId: ItemId | null
  items: ShopItem[]
}

function ItemPickerModal({ isOpen, onClose, onSelect, selectedItemId, items }: ItemPickerModalProps) {
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)

  const groups = activeProfileId
    ? allItemGroups.filter((g) => g.profileId === activeProfileId).slice().sort((a, b) => a.sortOrder - b.sortOrder)
    : []

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  const filteredItems = useMemo(() => {
    let result = items
    if (selectedGroupId) {
      if (selectedGroupId === '__no_group__') {
        result = result.filter((i) => !i.groupId)
      } else {
        result = result.filter((i) => i.groupId === selectedGroupId)
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((i) =>
        i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q)
      )
    }
    return result
  }, [items, selectedGroupId, searchQuery])

  const handleSelect = (item: ShopItem) => {
    onSelect(item)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Выбрать предмет"
      showCloseButton
      closeOnBackdropClick
      closeOnEscape
      zIndex={10001}
    >
      <div className="px-4 pb-4 pt-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск предмета..."
            className="rounded-xl border border-[var(--border)] pl-9 pr-3 py-2.5 text-sm w-full text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] bg-[var(--surface)]"
            autoFocus
          />
        </div>

        {/* Group filter */}
        {groups.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedGroupId(null)}
              className={cn(
                'shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                selectedGroupId === null
                  ? 'bg-[var(--accent)] text-white shadow-md'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] border border-[var(--border)]'
              )}
            >
              Все
            </button>
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroupId(selectedGroupId === group.id ? null : group.id)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                  selectedGroupId === group.id
                    ? 'bg-[var(--accent)] text-white shadow-md'
                    : 'text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] border border-[var(--border)]'
                )}
              >
                <Folder className="h-3 w-3" style={group.color && selectedGroupId !== group.id ? { color: group.color } : undefined} />
                {group.name}
              </button>
            ))}
          </div>
        )}

        {/* Items grid */}
        <div className="max-h-[50vh] overflow-y-auto space-y-1">
          {filteredItems.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)] text-center py-8">Нет предметов</p>
          ) : (
            filteredItems.map((item) => {
              const badge = getItemTypeBadge(item)
              const isSelected = item.id === selectedItemId
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-2.5 w-full text-left transition-all',
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md shadow-[var(--accent)]/10'
                      : 'border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
                  )}
                >
                  <div className="relative shrink-0">
                    <ItemIconBadge item={item} size="sm" />
                    {badge && (
                      <div className={cn(
                        'absolute -top-1 -right-1 z-20 flex h-4 w-4 items-center justify-center rounded-md',
                        'shadow-[0_2px_6px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]',
                        'ring-1 ring-[var(--surface-card)]',
                        badge.type === 'lootbox' && 'bg-gradient-to-br from-violet-400 to-violet-600',
                        badge.type === 'multiplier' && 'bg-gradient-to-br from-amber-400 to-orange-500',
                        badge.type === 'discount' && 'bg-gradient-to-br from-red-400 to-rose-600',
                        badge.type === 'videogame' && 'bg-gradient-to-br from-cyan-400 to-cyan-600',
                        badge.type === 'serial' && 'bg-gradient-to-br from-pink-400 to-rose-600',
                      )}>
                        {badge.type === 'lootbox' && <Gift className="h-2.5 w-2.5 text-white drop-shadow" />}
                        {badge.type === 'multiplier' && <TrendingUp className="h-2.5 w-2.5 text-white drop-shadow" />}
                        {badge.type === 'discount' && <Percent className="h-2.5 w-2.5 text-white drop-shadow" />}
                        {badge.type === 'videogame' && <Gamepad2 className="h-2.5 w-2.5 text-white drop-shadow" />}
                        {badge.type === 'serial' && <Clapperboard className="h-2.5 w-2.5 text-white drop-shadow" />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--fg)] truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {badge && (
                        <span className="text-[10px] text-[var(--fg-muted)]">{badge.label}</span>
                      )}
                      <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                        <Coins className="h-2.5 w-2.5" />
                        {item.cost?.coins ?? 0}
                      </span>
                      {(item.cost?.gems ?? 0) > 0 && (
                        <span className="text-[10px] text-cyan-500 flex items-center gap-0.5">
                          <Gem className="h-2.5 w-2.5" />
                          {item.cost.gems}
                        </span>
                      )}
                      {item.stock !== undefined && (
                        <span className="text-[10px] text-[var(--fg-muted)]">Запас: {item.stock}</span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-[var(--accent)] shrink-0" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Condition Picker Modal ─────────────────────────────────────────────────

interface ConditionPickerModalProps {
  isOpen: boolean
  onClose: () => void
  selectedType: AchievementConditionType
  targetValue: number
  conditionAttributeId: AttributeId | null
  conditionTaskId: TaskId | null
  conditionItemId: ItemId | null
  conditionConditionId: DailyConditionId | null
  conditionCoinMode: 'earned' | 'spent'
  attributes: { id: AttributeId; name: string; icon: string; color: string }[]
  tasks: TaskRpg[]
  shopItems: ShopItem[]
  dailyConditions: DailyCondition[]
  onApply: (type: AchievementConditionType, target: number, attrId: AttributeId | null, taskId: TaskId | null, itemId: ItemId | null, coinMode: 'earned' | 'spent', condId: DailyConditionId | null) => void
}

const TASK_CONDITION_TYPES: AchievementConditionType[] = ['task_completed_today', 'task_completed_total', 'task_streak']

function ConditionPickerModal({
  isOpen, onClose, selectedType, targetValue, conditionAttributeId, conditionTaskId, conditionItemId, conditionConditionId, conditionCoinMode, attributes, tasks, shopItems, dailyConditions, onApply,
}: ConditionPickerModalProps) {
  const [localType, setLocalType] = useState(selectedType)
  const [localTarget, setLocalTarget] = useState(targetValue)
  const [localAttrId, setLocalAttrId] = useState<AttributeId | null>(conditionAttributeId)
  const [localTaskId, setLocalTaskId] = useState<TaskId | null>(conditionTaskId)
  const [localItemId, setLocalItemId] = useState<ItemId | null>(conditionItemId)
  const [localCondId, setLocalCondId] = useState<DailyConditionId | null>(conditionConditionId)
  const [localCoinMode, setLocalCoinMode] = useState<'earned' | 'spent'>(conditionCoinMode)
  const [taskSearch, setTaskSearch] = useState('')
  const [itemSearch, setItemSearch] = useState('')

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalType(selectedType)
      setLocalTarget(targetValue)
      setLocalAttrId(conditionAttributeId)
      setLocalTaskId(conditionTaskId)
      setLocalItemId(conditionItemId)
      setLocalCondId(conditionConditionId)
      setLocalCoinMode(conditionCoinMode)
      setTaskSearch('')
      setItemSearch('')
    }
  }, [isOpen, selectedType, targetValue, conditionAttributeId, conditionTaskId, conditionItemId, conditionConditionId, conditionCoinMode])

  const selectedCondition = CONDITION_TYPES.find((c) => c.value === localType)!

  const needsTask = TASK_CONDITION_TYPES.includes(localType)
  const needsItem = localType === 'item_used'
  const needsCondition = localType === 'condition_checked'

  const MAX_VISIBLE = 30

  const filteredTasks = useMemo(() => {
    const active = tasks.filter(t => !t.archived)
    if (!taskSearch.trim()) return active.slice(0, MAX_VISIBLE)
    const q = taskSearch.toLowerCase()
    return active.filter(t => t.title.toLowerCase().includes(q)).slice(0, MAX_VISIBLE)
  }, [tasks, taskSearch])

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return shopItems.slice(0, MAX_VISIBLE)
    const q = itemSearch.toLowerCase()
    return shopItems.filter(i => i.name.toLowerCase().includes(q)).slice(0, MAX_VISIBLE)
  }, [shopItems, itemSearch])

  const handleApply = () => {
    onApply(
      localType,
      localTarget,
      localType === 'attribute_level' ? localAttrId : null,
      needsTask ? localTaskId : null,
      needsItem ? localItemId : null,
      localCoinMode,
      needsCondition ? localCondId : null,
    )
    onClose()
  }

  const neuInputStyle = {
    background: 'var(--surface)',
    boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.04)',
  } as const

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Условие разблокировки"
      showCloseButton
      closeOnBackdropClick
      closeOnEscape
      zIndex={10001}
    >
      <div className="px-4 pb-4 pt-3 space-y-4">
        {/* Condition type list */}
        <div className="space-y-2">
          {CONDITION_TYPES.map((cond) => {
            const Icon = cond.icon
            const isSelected = localType === cond.value
            return (
              <button
                key={cond.value}
                type="button"
                onClick={() => setLocalType(cond.value)}
                className={cn(
                  'w-full flex items-center gap-3.5 rounded-2xl border-2 p-3.5 text-left transition-all',
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg shadow-[var(--accent)]/10'
                    : 'border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
                )}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `${cond.color}18`,
                    boxShadow: isSelected
                      ? `0 0 16px ${cond.color}30, inset 0 1px 0 rgba(255,255,255,0.1)`
                      : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: cond.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-semibold',
                    isSelected ? 'text-[var(--accent)]' : 'text-[var(--fg)]'
                  )}>
                    {cond.label}
                  </p>
                  <p className="text-[11px] text-[var(--fg-muted)] mt-0.5 leading-snug">
                    {cond.description}
                  </p>
                </div>
                {isSelected && (
                  <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)]">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Target value — only for non-custom */}
        {localType !== 'custom' && (
          <div
            className="rounded-2xl border border-[var(--border)] p-4 space-y-3"
            style={{
              background: 'linear-gradient(135deg, var(--surface-card) 0%, var(--surface) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
              Целевое значение
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLocalTarget(Math.max(1, localTarget - 1))}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                value={localTarget === 0 ? '' : localTarget}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') { setLocalTarget(0); return }
                  const num = Math.round(Number(raw))
                  if (!isNaN(num) && isFinite(num)) setLocalTarget(Math.max(0, num))
                }}
                onBlur={() => { if (localTarget < 1) setLocalTarget(1) }}
                className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2.5 text-center text-lg font-bold text-[var(--fg)] no-spin focus:outline-none focus:border-[var(--accent)] transition-colors"
                style={neuInputStyle}
              />
              <button
                type="button"
                onClick={() => setLocalTarget(localTarget + 1)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 flex-wrap">
              {[5, 10, 25, 50, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setLocalTarget(v)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                    localTarget === v
                      ? 'bg-[var(--accent)] text-white shadow-md'
                      : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)] hover:text-[var(--fg)] border border-[var(--border)]'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Coin mode selector — for coins_earned_spent and gems_earned_spent */}
        {(localType === 'coins_earned_spent' || localType === 'gems_earned_spent') && (
          <div
            className="rounded-2xl border border-[var(--border)] p-4 space-y-3"
            style={{
              background: 'linear-gradient(135deg, var(--surface-card) 0%, var(--surface) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider flex items-center gap-2">
              <Coins className="h-3.5 w-3.5" />
              Режим подсчёта
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'earned' as const, label: 'Заработано', icon: TrendingUp, color: '#22c55e' },
                { value: 'spent' as const, label: 'Потрачено', icon: ShoppingBag, color: '#f59e0b' },
              ]).map((mode) => {
                const isSelected = localCoinMode === mode.value
                const ModeIcon = mode.icon
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setLocalCoinMode(mode.value)}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all',
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md shadow-[var(--accent)]/10'
                        : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                    )}
                  >
                    <ModeIcon className="h-4 w-4" style={{ color: isSelected ? mode.color : 'var(--fg-muted)' }} />
                    <span className={isSelected ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]'}>{mode.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Attribute selector — only for attribute_level */}
        {localType === 'attribute_level' && (
          <div
            className="rounded-2xl border border-[var(--border)] p-4 space-y-3"
            style={{
              background: 'linear-gradient(135deg, var(--surface-card) 0%, var(--surface) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
              Атрибут для отслеживания
            </label>
            <div className="flex flex-wrap gap-2">
              {attributes.map((attr) => {
                const isSelected = localAttrId === attr.id
                return (
                  <button
                    key={attr.id}
                    type="button"
                    onClick={() => setLocalAttrId(isSelected ? null : attr.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all',
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md shadow-[var(--accent)]/10'
                        : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                    )}
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                      style={{ backgroundColor: `${attr.color}25` }}
                    >
                      {attr.icon}
                    </span>
                    <span className="text-[var(--fg)]">{attr.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Task selector — for task_completed_today, task_completed_total, task_streak */}
        {needsTask && (
          <div
            className="rounded-2xl border border-[var(--border)] p-4 space-y-3"
            style={{
              background: 'linear-gradient(135deg, var(--surface-card) 0%, var(--surface) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider flex items-center gap-2">
              <Target className="h-3.5 w-3.5" />
              Выберите задачу
            </label>

            {localTaskId ? (() => {
              const selectedTask = tasks.find((t) => t.id === localTaskId)
              if (!selectedTask) return null
              const recInfo = RECURRENCE_LABELS[selectedTask.recurrence]
              const KindIcon = TASK_KIND_ICONS[selectedTask.kind] ?? CheckSquare
              return (
                <div
                  className="flex items-center gap-3 rounded-xl border-2 border-[var(--accent)] p-3 transition-all"
                  style={{ background: 'var(--accent-subtle)' }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${recInfo.color}20` }}
                  >
                    <KindIcon className="h-4.5 w-4.5" style={{ color: recInfo.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--fg)] truncate">{selectedTask.title}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: recInfo.color }}>{recInfo.label}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setLocalTaskId(null); setTaskSearch('') }}
                    className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] transition-colors"
                  >
                    Изменить
                  </button>
                </div>
              )
            })() : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Поиск задачи..."
                    className="w-full rounded-xl border border-[var(--border)] pl-9 pr-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                    style={neuInputStyle}
                  />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 scrollbar-thin">
                  {filteredTasks.length === 0 ? (
                    <p className="text-xs text-[var(--fg-muted)] text-center py-4">Задачи не найдены</p>
                  ) : (
                    filteredTasks.map((task) => {
                      const recInfo = RECURRENCE_LABELS[task.recurrence]
                      const KindIcon = TASK_KIND_ICONS[task.kind] ?? CheckSquare
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => setLocalTaskId(task.id)}
                          className="w-full flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all hover:bg-[var(--surface-elevated)]"
                        >
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${recInfo.color}15` }}
                          >
                            <KindIcon className="h-4 w-4" style={{ color: recInfo.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate text-[var(--fg)]">{task.title}</p>
                            <p className="text-[10px] mt-0.5 text-[var(--fg-muted)]">{recInfo.label}</p>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Item selector — for item_used */}
        {needsItem && (
          <div
            className="rounded-2xl border border-[var(--border)] p-4 space-y-3"
            style={{
              background: 'linear-gradient(135deg, var(--surface-card) 0%, var(--surface) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider flex items-center gap-2">
              <Package className="h-3.5 w-3.5" />
              Выберите предмет
            </label>

            {localItemId ? (() => {
              const selectedItem = shopItems.find((i) => i.id === localItemId)
              if (!selectedItem) return null
              const badge = getItemTypeBadge(selectedItem)
              const itemColor = getItemTypeColor(selectedItem)
              const badgeStyle = badge ? ITEM_TYPE_BADGE_STYLES[badge.type] : null
              return (
                <div
                  className="flex items-center gap-3 rounded-xl border-2 border-[var(--accent)] p-3 transition-all"
                  style={{ background: 'var(--accent-subtle)' }}
                >
                  <div className="relative shrink-0">
                    <ItemIconBadge item={selectedItem} size="sm" />
                    {badgeStyle && (() => {
                      const BadgeIcon = badgeStyle.Icon
                      return (
                        <div className={cn('absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-md shadow-sm ring-1 ring-[var(--surface-card)]', badgeStyle.cls)}>
                          <BadgeIcon className="h-2.5 w-2.5 text-white" />
                        </div>
                      )
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--fg)] truncate">{selectedItem.name}</p>
                    {badge && (
                      <p className="text-[11px] mt-0.5" style={{ color: itemColor }}>{badge.label}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setLocalItemId(null); setItemSearch('') }}
                    className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] transition-colors"
                  >
                    Изменить
                  </button>
                </div>
              )
            })() : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Поиск предмета..."
                    className="w-full rounded-xl border border-[var(--border)] pl-9 pr-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                    style={neuInputStyle}
                  />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 scrollbar-thin">
                  {filteredItems.length === 0 ? (
                    <p className="text-xs text-[var(--fg-muted)] text-center py-4">Предметы не найдены</p>
                  ) : (
                    filteredItems.map((item) => {
                      const badge = getItemTypeBadge(item)
                      const itemColor = getItemTypeColor(item)
                      const badgeStyle = badge ? ITEM_TYPE_BADGE_STYLES[badge.type] : null
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setLocalItemId(item.id)}
                          className="w-full flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all hover:bg-[var(--surface-elevated)]"
                        >
                          <div className="relative shrink-0">
                            <ItemIconBadge item={item} size="sm" />
                            {badgeStyle && (() => {
                              const BadgeIcon = badgeStyle.Icon
                              return (
                                <div className={cn('absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-md shadow-sm ring-1 ring-[var(--surface-card)]', badgeStyle.cls)}>
                                  <BadgeIcon className="h-2.5 w-2.5 text-white" />
                                </div>
                              )
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate text-[var(--fg)]">{item.name}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: itemColor }}>
                              {badge?.label ?? 'Обычный'}
                            </p>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Daily condition selector — for condition_checked */}
        {needsCondition && (
          <div
            className="rounded-2xl border border-[var(--border)] p-4 space-y-3"
            style={{
              background: 'linear-gradient(135deg, var(--surface-card) 0%, var(--surface) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider flex items-center gap-2">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Выберите условие дневника
            </label>
            {dailyConditions.length === 0 ? (
              <p className="text-xs text-[var(--fg-muted)] text-center py-4">
                Нет условий. Создайте условие в Дневнике.
              </p>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-1 scrollbar-thin">
                {dailyConditions.map((cond) => {
                  const isSelected = localCondId === cond.id
                  return (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => setLocalCondId(isSelected ? null : cond.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all',
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md shadow-[var(--accent)]/10'
                          : 'border-transparent hover:bg-[var(--surface-elevated)]'
                      )}
                    >
                      <span className="text-base">{cond.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate text-[var(--fg)]">{cond.name}</p>
                        <p className="text-[10px] mt-0.5 text-[var(--fg-muted)]">
                          с {cond.activeFrom}{cond.activeUntil ? ` до ${cond.activeUntil}` : ''}
                        </p>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Apply button */}
        <button
          type="button"
          onClick={handleApply}
          className="btn-primary w-full py-3 text-sm font-semibold"
        >
          Применить
        </button>
      </div>
    </Modal>
  )
}

function AchievementForm({ achievement, onClose, defaultGroupId }: AchievementFormProps) {
  const addAchievement = useRpgStore((s) => s.addAchievement)
  const updateAchievement = useRpgStore((s) => s.updateAchievement)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const shopItems = useRpgStore((s) => s.shopItems)
  const allTasks = useRpgStore((s) => s.tasks)
  const settings = useRpgStore((s) => s.settings)

  const dailyConditions = useRpgStore((s) => s.getDailyConditions)()

  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []

  // Available shop items (not deleted, available for purchase)
  const availableShopItems = useMemo(
    () => shopItems.filter((i) => !i.deletedFromShop && i.profileId === activeProfileId),
    [shopItems, activeProfileId]
  )

  // Tasks for current profile
  const profileTasks = useMemo(
    () => allTasks.filter((t) => t.profileId === activeProfileId),
    [allTasks, activeProfileId]
  )

  // ─── Form state ──────────────────────────────────────────────
  const [title, setTitle] = useState(achievement?.title ?? '')
  const [description, setDescription] = useState(achievement?.description ?? '')
  const [icon, setIcon] = useState(achievement?.icon ?? '🏆')
  const [conditionType, setConditionType] = useState<AchievementConditionType>(
    achievement?.condition.type ?? 'tasks_completed'
  )
  const [targetValue, setTargetValue] = useState(achievement?.condition.targetValue ?? 10)
  const [conditionAttributeId, setConditionAttributeId] = useState<AttributeId | null>(
    achievement?.condition.attributeId ?? null
  )
  const [conditionTaskId, setConditionTaskId] = useState<TaskId | null>(
    achievement?.condition.taskId ?? null
  )
  const [conditionItemId, setConditionItemId] = useState<ItemId | null>(
    achievement?.condition.itemId ?? null
  )
  const [conditionConditionId, setConditionConditionId] = useState<DailyConditionId | null>(
    achievement?.condition.conditionId ?? null
  )
  const [conditionCoinMode, setConditionCoinMode] = useState<'earned' | 'spent'>(
    achievement?.condition.coinMode ?? 'earned'
  )

  // Rewards
  const [rewardCoins, setRewardCoins] = useState(achievement?.rewardCoins ?? 0)
  const [rewardGems, setRewardGems] = useState(achievement?.rewardGems ?? 0)
  const [rewardAttributeId, setRewardAttributeId] = useState<AttributeId | null>(
    achievement?.rewardAttributeId ?? null
  )
  const [rewardDifficulty, setRewardDifficulty] = useState<TaskDifficulty>(
    achievement?.rewardDifficulty ?? 'medium'
  )
  const [rewardCustomXp, setRewardCustomXp] = useState<number | null>(
    achievement?.rewardCustomXp ?? null
  )
  const [rewardItems, setRewardItems] = useState<{ itemId: ItemId; quantity: number }[]>(() => {
    if (achievement?.rewardItems?.length) return achievement.rewardItems
    if (achievement?.rewardItemId) return [{ itemId: achievement.rewardItemId, quantity: achievement.rewardItemQuantity ?? 1 }]
    return []
  })

  // Cycle mode
  const [repeatable, setRepeatable] = useState(achievement?.repeatable ?? false)

  // UI state
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState(0)
  const [showItemPickerModal, setShowItemPickerModal] = useState(false)
  const [showConditionPickerModal, setShowConditionPickerModal] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  // Dirty check — has user changed anything?
  const isDirty = useMemo(() => {
    const d = achievement
    if (d) {
      const origItems = d.rewardItems?.length
        ? d.rewardItems
        : d.rewardItemId
          ? [{ itemId: d.rewardItemId, quantity: d.rewardItemQuantity ?? 1 }]
          : []
      const itemsChanged = rewardItems.length !== origItems.length ||
        rewardItems.some((ri, i) => ri.itemId !== origItems[i]?.itemId || ri.quantity !== origItems[i]?.quantity)
      return (
        title !== d.title ||
        description !== d.description ||
        icon !== d.icon ||
        conditionType !== d.condition.type ||
        targetValue !== d.condition.targetValue ||
        conditionAttributeId !== (d.condition.attributeId ?? null) ||
        conditionTaskId !== (d.condition.taskId ?? null) ||
        conditionItemId !== (d.condition.itemId ?? null) ||
        conditionConditionId !== (d.condition.conditionId ?? null) ||
        conditionCoinMode !== (d.condition.coinMode ?? 'earned') ||
        rewardCoins !== d.rewardCoins ||
        rewardGems !== d.rewardGems ||
        rewardAttributeId !== (d.rewardAttributeId ?? null) ||
        rewardDifficulty !== (d.rewardDifficulty ?? 'medium') ||
        rewardCustomXp !== (d.rewardCustomXp ?? null) ||
        itemsChanged ||
        repeatable !== (d.repeatable ?? false)
      )
    }
    return (
      title.trim() !== '' ||
      description.trim() !== '' ||
      icon !== '🏆' ||
      rewardCoins !== 0 ||
      rewardGems !== 0 ||
      rewardAttributeId !== null ||
      rewardItems.length > 0
    )
  }, [
    achievement, title, description, icon, conditionType, targetValue,
    conditionAttributeId, conditionTaskId, conditionItemId, conditionCoinMode,
    rewardCoins, rewardGems, rewardAttributeId,
    rewardDifficulty, rewardCustomXp, rewardItems, repeatable,
  ])

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      onClose()
    }
  }, [isDirty, onClose])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  // Auto-resize textarea
  const autoResizeTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  useEffect(() => { autoResizeTextarea() }, [description, autoResizeTextarea])

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setEmojiPickerOpen(false)
      }
    }
    if (emojiPickerOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [emojiPickerOpen])

  // Computed XP
  const difficultyXp = settings.taskDifficultyXp?.[rewardDifficulty] ?? TASK_XP_BY_DIFFICULTY[rewardDifficulty]
  const effectiveXp = rewardCustomXp ?? difficultyXp

  // Resolved reward items from shop
  const resolvedRewardItems = useMemo(
    () => rewardItems.map((ri) => ({
      ...ri,
      item: shopItems.find((i) => i.id === ri.itemId),
    })).filter((ri) => ri.item),
    [rewardItems, shopItems]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const data = {
      title: title.trim(),
      description: description.trim(),
      icon,
      groupId: achievement?.groupId ?? defaultGroupId ?? null,
      condition: {
        type: conditionType,
        targetValue,
        attributeId: conditionType === 'attribute_level' ? conditionAttributeId : undefined,
        taskId: TASK_CONDITION_TYPES.includes(conditionType) ? conditionTaskId : undefined,
        itemId: conditionType === 'item_used' ? conditionItemId : undefined,
        conditionId: conditionType === 'condition_checked' ? conditionConditionId : undefined,
        coinMode: (conditionType === 'coins_earned_spent' || conditionType === 'gems_earned_spent') ? conditionCoinMode : undefined,
      },
      rewardXp: rewardAttributeId ? effectiveXp : 0,
      rewardCoins,
      rewardGems,
      rewardAttributeId: rewardAttributeId ?? undefined,
      rewardDifficulty: rewardAttributeId ? rewardDifficulty : undefined,
      rewardCustomXp: rewardAttributeId ? rewardCustomXp ?? undefined : undefined,
      rewardItems: rewardItems.length > 0 ? rewardItems : undefined,
      repeatable,
      // Clear legacy fields
      rewardItemId: undefined,
      rewardItemQuantity: undefined,
    }

    try {
      if (achievement) {
        updateAchievement(achievement.id, (a) => ({ ...a, ...data }))
      } else {
        addAchievement(data)
      }
    } finally {
      onClose()
    }
  }

  // ─── Glassmorphic neumorphism style for sections ──────────────────────────
  const sectionStyle = {
    background: 'linear-gradient(135deg, var(--surface-card) 0%, var(--surface) 100%)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,0.08),
      inset 0 -1px 0 rgba(0,0,0,0.05),
      0 4px 16px rgba(0,0,0,0.08),
      0 1px 4px rgba(0,0,0,0.04)
    `,
  } as const

  const neuInputStyle = {
    background: 'var(--surface)',
    boxShadow: `
      inset 2px 2px 4px rgba(0,0,0,0.06),
      inset -2px -2px 4px rgba(255,255,255,0.04)
    `,
  } as const

  return (
    <>
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleClose()} style={{ display: showConditionPickerModal ? 'none' : undefined }}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6"
        style={{
          background: 'linear-gradient(145deg, var(--surface-overlay) 0%, var(--surface-card) 100%)',
          backdropFilter: 'blur(24px) saturate(200%)',
          WebkitBackdropFilter: 'blur(24px) saturate(200%)',
          border: '1px solid var(--border)',
          boxShadow: `
            0 24px 48px rgba(0,0,0,0.12),
            0 8px 16px rgba(0,0,0,0.08),
            inset 0 1px 0 rgba(255,255,255,0.1),
            inset 0 -1px 0 rgba(0,0,0,0.05)
          `,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-[var(--fg)]">
            {achievement ? 'Редактировать достижение' : 'Новое достижение'}
          </h2>
          <button type="button" onClick={handleClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название достижения"
            className="rounded-xl border border-[var(--border)] px-4 py-3 text-lg font-medium text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            style={neuInputStyle}
            autoFocus
          />

          {/* Description — auto-expanding */}
          <textarea
            ref={textareaRef}
            value={description}
            onChange={(e) => { setDescription(e.target.value); autoResizeTextarea() }}
            placeholder="Описание (необязательно)"
            rows={1}
            className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] transition-all resize-none"
            style={{ ...neuInputStyle, minHeight: '42px', overflowY: description.length > 100 ? 'auto' : 'hidden' }}
          />

          {/* Emoji picker — dropdown */}
          <div className="relative" ref={emojiPickerRef}>
            <label className="block text-xs font-semibold text-[var(--fg-muted)] mb-1.5 uppercase tracking-wider">Иконка</label>
            <button
              type="button"
              onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-2.5 w-full transition-all hover:border-[var(--border-strong)]"
              style={neuInputStyle}
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-sm text-[var(--fg-muted)] flex-1 text-left">Выбрать иконку</span>
              <ChevronDown className={cn('h-4 w-4 text-[var(--fg-muted)] transition-transform', emojiPickerOpen && 'rotate-180')} />
            </button>

            {emojiPickerOpen && (
              <div
                className="absolute z-50 left-0 right-0 mt-2 rounded-2xl border border-[var(--border)] p-3 overflow-hidden"
                style={{
                  ...sectionStyle,
                  maxHeight: '280px',
                }}
              >
                {/* Category tabs */}
                <div className="flex gap-1 mb-2 overflow-x-auto pb-1 scrollbar-none">
                  {EMOJI_CATEGORIES.map((cat, idx) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setEmojiCategory(idx)}
                      className={cn(
                        'shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all',
                        idx === emojiCategory
                          ? 'bg-[var(--accent)] text-white shadow-md'
                          : 'text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)]'
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                {/* Emoji grid */}
                <div className="grid grid-cols-8 gap-1.5">
                  {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { setIcon(emoji); setEmojiPickerOpen(false) }}
                      className={cn(
                        'h-9 w-9 rounded-lg text-lg flex items-center justify-center transition-all',
                        icon === emoji
                          ? 'bg-[var(--accent)] shadow-lg scale-110'
                          : 'hover:bg-[var(--surface-elevated)] hover:scale-105'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ─── Rewards Block ────────────────────────────────────────────── */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div
            className="rounded-2xl border border-[var(--border)] p-4 space-y-4"
            style={sectionStyle}
          >
            <h3 className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider flex items-center gap-2">
              <Award className="h-3.5 w-3.5" />
              Награды
            </h3>

            {/* 1) Attribute + Difficulty (XP) */}
            <div>
              <p className="text-[11px] text-[var(--fg-muted)] mb-2">Атрибут и XP</p>
              {/* Attribute selection — single select */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attributes.map((attr) => {
                  const isSelected = rewardAttributeId === attr.id
                  return (
                    <button
                      key={attr.id}
                      type="button"
                      onClick={() => setRewardAttributeId(isSelected ? null : attr.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all',
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md shadow-[var(--accent)]/10'
                          : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                      )}
                      style={isSelected ? undefined : neuInputStyle}
                    >
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                        style={{ backgroundColor: `${attr.color}20` }}
                      >
                        {attr.icon}
                      </span>
                      <span className="text-[var(--fg)]">{attr.name}</span>
                      <span className="text-[var(--fg-muted)] text-[10px]">Ур.{attr.level}</span>
                      {isSelected && (
                        <X className="h-3 w-3 text-[var(--fg-muted)] ml-0.5" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Difficulty selection — only if attribute selected */}
              {rewardAttributeId && (
                <>
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    {DIFFICULTY_OPTIONS.map((opt) => {
                      const optXp = settings.taskDifficultyXp?.[opt.value] ?? opt.defaultXp
                      const colors = getXpColorClasses(optXp)
                      const isActive = rewardDifficulty === opt.value && rewardCustomXp == null
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setRewardDifficulty(opt.value); setRewardCustomXp(null) }}
                          className={cn(
                            'flex flex-col items-center gap-1 rounded-lg border p-2 transition-all',
                            isActive
                              ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md'
                              : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                          )}
                          style={isActive ? undefined : neuInputStyle}
                        >
                          <span className="text-[10px] font-semibold text-[var(--fg)]">{opt.label}</span>
                          <span className={cn('flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold', colors.bg, colors.text)}>
                            <Zap className="h-2.5 w-2.5" />{optXp}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Custom XP */}
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2" style={neuInputStyle}>
                    <span className="text-[10px] text-[var(--fg-muted)] shrink-0">Свой XP:</span>
                    <button
                      type="button"
                      onClick={() => setRewardCustomXp(Math.max(0, (rewardCustomXp ?? difficultyXp) - 10))}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-xs text-[var(--fg)] hover:bg-[var(--surface-elevated)]"
                    >−</button>
                    <input
                      type="number"
                      min={0}
                      value={rewardCustomXp ?? ''}
                      placeholder={String(difficultyXp)}
                      onChange={(e) => {
                        const v = e.target.value.trim()
                        setRewardCustomXp(v === '' ? null : Math.max(0, Math.round(Number(v)) || 0))
                      }}
                      className="w-14 text-center text-xs bg-transparent focus:outline-none text-[var(--fg)]"
                    />
                    <button
                      type="button"
                      onClick={() => setRewardCustomXp((rewardCustomXp ?? difficultyXp) + 10)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent-subtle)] text-xs text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                    >+</button>
                  </div>

                  {/* XP Summary */}
                  {effectiveXp > 0 && (
                    <div className={cn('mt-2 flex items-center gap-2 rounded-lg px-3 py-1.5 border', getXpColorClasses(effectiveXp).bg, getXpColorClasses(effectiveXp).border)}>
                      <Zap className={cn('h-3 w-3', getXpColorClasses(effectiveXp).text)} />
                      <span className={cn('text-xs font-bold', getXpColorClasses(effectiveXp).text)}>
                        +{effectiveXp} XP → {attributes.find((a) => a.id === rewardAttributeId)?.icon} {attributes.find((a) => a.id === rewardAttributeId)?.name}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 2) Coins & Gems */}
            <div>
              <p className="text-[11px] text-[var(--fg-muted)] mb-2">Валюта</p>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5"
                  style={neuInputStyle}
                >
                  <Coins className="h-4 w-4 text-amber-500 shrink-0" />
                  <input
                    type="number"
                    min={0}
                    value={rewardCoins || ''}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === '') { setRewardCoins(0); return }
                      const num = Math.round(Number(raw))
                      if (!isNaN(num) && isFinite(num)) setRewardCoins(Math.max(0, num))
                    }}
                    className="w-full bg-transparent text-sm focus:outline-none text-[var(--fg)] no-spin"
                    placeholder="Монеты"
                  />
                </div>
                <div
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5"
                  style={neuInputStyle}
                >
                  <Gem className="h-4 w-4 text-cyan-500 shrink-0" strokeWidth={2.5} />
                  <input
                    type="number"
                    min={0}
                    value={rewardGems || ''}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === '') { setRewardGems(0); return }
                      const num = Math.round(Number(raw))
                      if (!isNaN(num) && isFinite(num)) setRewardGems(Math.max(0, num))
                    }}
                    className="w-full bg-transparent text-sm focus:outline-none text-[var(--fg)] no-spin"
                    placeholder="Гемы"
                  />
                </div>
              </div>
            </div>

            {/* 3) Shop item rewards — multiple */}
            <div>
              <p className="text-[11px] text-[var(--fg-muted)] mb-2">Предметы из магазина</p>
              {resolvedRewardItems.length > 0 && (
                <div className="space-y-2 mb-2">
                  {resolvedRewardItems.map(({ itemId, quantity, item }) => {
                    const stock = item!.stock
                    return (
                      <div
                        key={itemId}
                        className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"
                        style={neuInputStyle}
                      >
                        <ItemIconBadge item={item!} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--fg)] truncate">{item!.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {stock !== undefined && (
                              <span className="text-[10px] text-[var(--fg-muted)]">Запас: {stock}</span>
                            )}
                            <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                              <Coins className="h-2.5 w-2.5" />
                              {item!.cost?.coins ?? 0}
                            </span>
                          </div>
                        </div>
                        {/* Quantity */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRewardItems((prev) => prev.map((ri) => ri.itemId === itemId ? { ...ri, quantity: Math.max(1, ri.quantity - 1) } : ri))}
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] text-xs hover:bg-[var(--surface-elevated)]"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-bold text-[var(--fg)] w-6 text-center">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const max = stock !== undefined ? stock : 99
                              setRewardItems((prev) => prev.map((ri) => ri.itemId === itemId ? { ...ri, quantity: Math.min(max, ri.quantity + 1) } : ri))
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-subtle)] text-xs text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => setRewardItems((prev) => prev.filter((ri) => ri.itemId !== itemId))}
                          className="icon-btn icon-btn-compact"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}

                  {/* Stock warnings */}
                  {resolvedRewardItems.filter(({ quantity, item }) => item!.stock !== undefined && quantity > item!.stock!).map(({ itemId, quantity, item }) => (
                    <p key={`warn-${itemId}`} className="text-[10px] text-amber-500 flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {item!.name}: не хватает {quantity - item!.stock!} шт. — будут компенсированы монетами ({(item!.cost?.coins ?? 0) * (quantity - item!.stock!)} 🪙)
                    </p>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowItemPickerModal(true)}
                className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-3 w-full text-sm text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
              >
                <ShoppingBag className="h-4 w-4" />
                {rewardItems.length > 0 ? 'Добавить ещё предмет' : 'Выбрать предмет'}
              </button>
            </div>

            {/* Item Picker Modal */}
            <ItemPickerModal
              isOpen={showItemPickerModal}
              onClose={() => setShowItemPickerModal(false)}
              onSelect={(item) => {
                setRewardItems((prev) => {
                  const existing = prev.find((ri) => ri.itemId === item.id)
                  if (existing) return prev.map((ri) => ri.itemId === item.id ? { ...ri, quantity: ri.quantity + 1 } : ri)
                  return [...prev, { itemId: item.id, quantity: 1 }]
                })
              }}
              selectedItemId={null}
              items={availableShopItems}
            />
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ─── Conditions Block — big styled button ────────────────────── */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {(() => {
            const cond = CONDITION_TYPES.find((c) => c.value === conditionType)!
            const CondIcon = cond.icon
            const condAttr = conditionType === 'attribute_level'
              ? attributes.find((a) => a.id === conditionAttributeId)
              : null
            const condTask = TASK_CONDITION_TYPES.includes(conditionType)
              ? profileTasks.find((t) => t.id === conditionTaskId)
              : null
            const condItem = conditionType === 'item_used'
              ? shopItems.find((i) => i.id === conditionItemId)
              : null
            const condDailyCond = conditionType === 'condition_checked'
              ? dailyConditions.find((c) => c.id === conditionConditionId)
              : null
            return (
              <button
                type="button"
                onClick={() => setShowConditionPickerModal(true)}
                className="group w-full rounded-2xl border-2 border-[var(--border)] p-4 text-left transition-all hover:border-[var(--accent)] hover:shadow-lg hover:shadow-[var(--accent)]/5"
                style={{
                  background: 'linear-gradient(135deg, var(--surface-card) 0%, var(--surface) 100%)',
                  backdropFilter: 'blur(16px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                  boxShadow: `
                    inset 0 1px 0 rgba(255,255,255,0.08),
                    inset 0 -1px 0 rgba(0,0,0,0.05),
                    0 4px 16px rgba(0,0,0,0.08),
                    0 1px 4px rgba(0,0,0,0.04)
                  `,
                }}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: `${cond.color}18`,
                      boxShadow: `0 0 20px ${cond.color}20, inset 0 1px 0 rgba(255,255,255,0.1)`,
                    }}
                  >
                    <CondIcon className="h-6 w-6" style={{ color: cond.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                      <Target className="h-3 w-3" />
                      Условие
                    </p>
                    <p className="text-sm font-bold text-[var(--fg)] truncate">
                      {cond.label}
                      {conditionType !== 'custom' && (
                        <span className="ml-1.5 text-[var(--accent)]">
                          — {targetValue}
                        </span>
                      )}
                      {condAttr && (
                        <span className="ml-1.5 text-[var(--fg-muted)] font-medium">
                          ({condAttr.icon} {condAttr.name})
                        </span>
                      )}
                      {condTask && (
                        <span className="ml-1.5 text-[var(--fg-muted)] font-medium">
                          ({condTask.title})
                        </span>
                      )}
                      {condItem && (
                        <span className="ml-1.5 text-[var(--fg-muted)] font-medium">
                          ({condItem.icon || '📦'} {condItem.name})
                        </span>
                      )}
                      {condDailyCond && (
                        <span className="ml-1.5 text-[var(--fg-muted)] font-medium">
                          ({condDailyCond.icon} {condDailyCond.name})
                        </span>
                      )}
                      {(conditionType === 'coins_earned_spent' || conditionType === 'gems_earned_spent') && (
                        <span className="ml-1.5 text-[var(--fg-muted)] font-medium">
                          ({conditionCoinMode === 'spent' ? 'потрачено' : 'заработано'})
                        </span>
                      )}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-[var(--fg-muted)] shrink-0 transition-transform group-hover:translate-y-0.5" />
                </div>
              </button>
            )
          })()}

          {/* ─── Cycle mode ──────────────────────────────────────────────── */}
          <div
            className="rounded-2xl border border-[var(--border)] p-4"
            style={sectionStyle}
          >
            <h3 className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider flex items-center gap-2 mb-3">
              <RefreshCw className="h-3.5 w-3.5" />
              Цикл
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRepeatable(false)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 transition-all',
                  !repeatable
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md shadow-[var(--accent)]/10'
                    : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                )}
                style={!repeatable ? undefined : neuInputStyle}
              >
                <Lock className={cn('h-4 w-4', !repeatable ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]')} />
                <span className={cn('text-xs font-semibold', !repeatable ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]')}>
                  Неповторяемый
                </span>
                <span className="text-[10px] text-[var(--fg-muted)] text-center leading-tight">
                  Выдаётся один раз
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRepeatable(true)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 transition-all',
                  repeatable
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md shadow-[var(--accent)]/10'
                    : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                )}
                style={repeatable ? undefined : neuInputStyle}
              >
                <RefreshCw className={cn('h-4 w-4', repeatable ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]')} />
                <span className={cn('text-xs font-semibold', repeatable ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]')}>
                  Повторяемый
                </span>
                <span className="text-[10px] text-[var(--fg-muted)] text-center leading-tight">
                  Сбрасывается после выполнения
                </span>
              </button>
            </div>
          </div>

          {/* ─── Submit buttons ──────────────────────────────────────────── */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={handleClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" className="btn-primary flex-1">
              {achievement ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Condition Picker Modal — rendered outside the hideable form */}
    <ConditionPickerModal
      isOpen={showConditionPickerModal}
      onClose={() => setShowConditionPickerModal(false)}
      selectedType={conditionType}
      targetValue={targetValue}
      conditionAttributeId={conditionAttributeId}
      conditionTaskId={conditionTaskId}
      conditionItemId={conditionItemId}
      conditionConditionId={conditionConditionId}
      conditionCoinMode={conditionCoinMode}
      attributes={attributes}
      tasks={profileTasks}
      shopItems={availableShopItems}
      dailyConditions={dailyConditions}
      onApply={(type, target, attrId, taskId, itemId, coinMode, condId) => {
        setConditionType(type)
        setTargetValue(target)
        setConditionAttributeId(attrId)
        setConditionTaskId(taskId)
        setConditionItemId(itemId)
        setConditionConditionId(condId)
        setConditionCoinMode(coinMode)
      }}
    />

    {/* Discard changes confirmation */}
    <ConfirmModal
      isOpen={showDiscardConfirm}
      onConfirm={() => {
        setShowDiscardConfirm(false)
        onClose()
      }}
      onCancel={() => setShowDiscardConfirm(false)}
      title="Отменить изменения?"
      message="Вы внесли изменения, которые не были сохранены. Закрыть без сохранения?"
      confirmText="Закрыть"
      cancelText="Вернуться"
      variant="danger"
    />
    </>
  )
}

// ─── Folder Icon Picker Modal ───────────────────────────────────────────────

interface FolderIconPickerProps {
  currentIcon: string
  onSelect: (icon: string) => void
  onClose: () => void
}

function FolderIconPicker({ currentIcon, onSelect, onClose }: FolderIconPickerProps) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg)]">Иконка папки</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-8 gap-2">
          {FOLDER_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => { onSelect(icon); onClose() }}
              className={cn(
                'h-10 w-10 rounded-xl text-xl flex items-center justify-center transition-all',
                icon === currentIcon
                  ? 'bg-[var(--accent)] shadow-lg scale-110'
                  : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
              )}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Folder Card ────────────────────────────────────────────────────────────

interface FolderCardProps {
  group: AchievementGroup
  achievements: Achievement[]
  onOpen: () => void
  onEditIcon: () => void
  onEdit: () => void
  onDelete: () => void
}

function FolderCard({ group, achievements, onOpen, onEditIcon, onEdit, onDelete }: FolderCardProps) {
  const total = achievements.length
  const unlocked = achievements.filter((a) => a.unlocked).length
  const progress = total > 0 ? unlocked / total : 0
  const color = group.color ?? '#6b7280'

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group/folder relative flex flex-col items-center gap-3 rounded-2xl p-6 pt-8 pb-5 transition-all duration-200 cursor-pointer
                 bg-[var(--surface-card)] border border-[var(--border)] hover:shadow-lg
                 backdrop-blur-[16px] min-h-[200px]"
      style={{
        boxShadow: 'var(--shadow)',
        borderLeftColor: color,
        borderLeftWidth: '3px',
      }}
    >
      {/* Edit/Delete actions — top right on hover */}
      <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover/folder:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="icon-btn icon-btn-compact"
          title="Редактировать"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="icon-btn icon-btn-compact icon-btn-danger"
          title="Удалить"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Folder icon */}
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl transition-transform duration-200 group-hover/folder:scale-105 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onEditIcon() }}
        title="Изменить иконку"
        style={{
          background: 'var(--surface-elevated)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.15)',
          border: '1.5px solid var(--border)',
        }}
      >
        {group.icon || '📁'}
      </div>

      {/* Folder name */}
      <span className="text-sm font-semibold text-[var(--fg)] text-center leading-tight line-clamp-2">
        {group.name}
      </span>

      {/* Spacer to push progress to bottom */}
      <div className="flex-1" />

      {/* Progress */}
      <div className="w-full">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, ${color}, ${color}bb)`,
            }}
          />
        </div>
        <p className="mt-1 text-[11px] text-[var(--fg-muted)] text-center">
          {unlocked}/{total}
        </p>
      </div>
    </button>
  )
}

// ─── Achievement List Item (inside folder view) ─────────────────────────────

interface AchievementListItemProps {
  achievement: Achievement
  onClick: () => void
  groupColor?: string
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  isDragOver?: boolean
}

function AchievementListItem({ achievement, onClick, groupColor, draggable, onDragStart, onDragOver, onDrop, onDragEnd, isDragOver }: AchievementListItemProps) {
  const safeCurrentProgress = Number.isFinite(achievement.currentProgress) ? achievement.currentProgress : 0
  const safeTargetValue = Number.isFinite(achievement.condition.targetValue) ? achievement.condition.targetValue : 0
  const progress = safeTargetValue > 0
    ? Math.min(1, safeCurrentProgress / safeTargetValue)
    : 0
  const isReady = !achievement.unlocked && achievement.readyToUnlock
  // Use group color for grouped achievements, gold for ungrouped
  const iconColor = groupColor ?? '#f59e0b'
  const shopItems = useRpgStore((s) => s.shopItems)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const attributes = profiles.find((p) => p.id === activeProfileId)?.attributes ?? []
  const rewardAttr = achievement.rewardAttributeId ? attributes.find((a) => a.id === achievement.rewardAttributeId) : null
  const rewardItemsList = useMemo(() => {
    const items = achievement.rewardItems?.length
      ? achievement.rewardItems
      : achievement.rewardItemId
        ? [{ itemId: achievement.rewardItemId, quantity: achievement.rewardItemQuantity ?? 1 }]
        : []
    return items.map((ri) => ({ ...ri, item: shopItems.find((i) => i.id === ri.itemId) })).filter((ri) => ri.item)
  }, [achievement, shopItems])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        'flex items-center gap-3 rounded-xl p-3 transition-all duration-200 text-left w-full cursor-pointer',
        'bg-[var(--surface-card)] border border-[var(--border)] hover:border-[var(--border-accent)]',
        achievement.unlocked ? 'hover:shadow-md' : 'opacity-80 hover:opacity-100',
        isReady && 'achievement-ready-glow opacity-100',
        isDragOver && 'border-t-2 border-t-[var(--accent)]'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl',
          achievement.unlocked && 'achievement-shimmer achievement-icon-wrapper'
        )}
        style={
          (achievement.unlocked
            ? {
                background: `linear-gradient(145deg, ${iconColor}ee, ${iconColor}bb)`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 8px ${iconColor}4d`,
                '--ach-glow': `${iconColor}88`,
              }
            : isReady
              ? {
                  background: `linear-gradient(145deg, ${iconColor}88, ${iconColor}66)`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px ${iconColor}33`,
                }
              : {
                  background: 'var(--surface)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
                }) as React.CSSProperties
        }
      >
        <span
          className={achievement.unlocked || isReady ? 'achievement-icon-emoji' : undefined}
          style={achievement.unlocked || isReady ? undefined : { filter: 'grayscale(1) opacity(0.4)' }}
        >
          {achievement.icon}
        </span>
        {!achievement.unlocked && !isReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="h-3 w-3 text-[var(--fg-muted)]" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-medium truncate',
            achievement.unlocked || isReady ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]'
          )}>
            {achievement.title}
          </span>
          {achievement.repeatable && (achievement.completionCount ?? 0) > 0 && (
            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold bg-cyan-500/15 text-cyan-400 shrink-0">
              ×{achievement.completionCount}
            </span>
          )}
          {achievement.unlocked && (
            <Check className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          )}
        </div>

        {/* Ready badge */}
        {isReady && (
          <span className="inline-flex items-center gap-1 mt-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-500">
            <Unlock className="h-3 w-3" />
            Можно забрать!
          </span>
        )}

        {/* Progress bar for locked non-custom achievements */}
        {!achievement.unlocked && !isReady && achievement.condition.type !== 'custom' && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress * 100}%`,
                  background: 'linear-gradient(90deg, #f59e0b, #eab308)',
                }}
              />
            </div>
            <span className="text-[11px] text-[var(--fg-muted)] shrink-0 tabular-nums">
              {safeCurrentProgress}/{safeTargetValue}
            </span>
          </div>
        )}

        {/* Rewards preview — always visible */}
        {(achievement.rewardXp > 0 || achievement.rewardCoins > 0 || achievement.rewardGems > 0 || rewardItemsList.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-1" style={{ opacity: achievement.unlocked ? 1 : 0.45 }}>
            {achievement.rewardXp > 0 && (
              <span
                className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                style={{
                  background: rewardAttr ? `${rewardAttr.color}22` : 'rgb(168 85 247 / 0.15)',
                  color: rewardAttr?.color ?? '#a855f7',
                }}
              >
                <Zap className="h-3 w-3" />
                {achievement.rewardXp} XP
              </span>
            )}
            {achievement.rewardCoins > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold bg-amber-500/15 text-amber-400">
                <Coins className="h-3 w-3" />
                {achievement.rewardCoins}
              </span>
            )}
            {achievement.rewardGems > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold bg-cyan-500/15 text-cyan-400">
                <Gem className="h-3 w-3" strokeWidth={2.5} />
                {achievement.rewardGems}
              </span>
            )}
            {rewardItemsList.map(({ itemId, quantity, item }) => (
              <span key={itemId} className="relative inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] font-semibold bg-indigo-500/15 text-indigo-400">
                <ItemIconBadge item={item!} size="xs" />
                {item!.name}
                {quantity > 1 && (
                  <span className="absolute -top-1 -right-1 text-[8px] font-bold leading-none bg-indigo-500 text-white rounded-full w-3 h-3 flex items-center justify-center z-10">
                    ×{quantity}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Achievements Page ─────────────────────────────────────────────────

export default function AchievementsPage() {
  const allAchievements = useRpgStore((s) => s.achievements)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const achievements = activeProfileId ? allAchievements.filter((a) => a.profileId === activeProfileId) : []

  const achievementGroupsRaw = useRpgStore((s) => s.achievementGroups)
  const addAchievementGroup = useRpgStore((s) => s.addAchievementGroup)
  const updateAchievementGroup = useRpgStore((s) => s.updateAchievementGroup)
  const deleteAchievementGroup = useRpgStore((s) => s.deleteAchievementGroup)

  const achievementGroups = useMemo(
    () =>
      activeProfileId
        ? achievementGroupsRaw
            .filter((g) => g.profileId === activeProfileId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [achievementGroupsRaw, activeProfileId]
  )

  // View state: null = folders view, groupId = inside folder
  const [openFolderId, setOpenFolderId] = useState<AchievementGroupId | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<Achievement | undefined>()
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)

  // Folder creation
  const [isAddingFolder, setIsAddingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState('#6b7280')
  const newFolderInputRef = useRef<HTMLInputElement>(null)

  // Folder rename
  const [editingFolderId, setEditingFolderId] = useState<AchievementGroupId | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [editingFolderColor, setEditingFolderColor] = useState('#6b7280')
  const editFolderInputRef = useRef<HTMLInputElement>(null)

  // Folder icon picker
  const [iconPickerFolderId, setIconPickerFolderId] = useState<AchievementGroupId | null>(null)

  // Folder delete confirm
  const [deletingFolderId, setDeletingFolderId] = useState<AchievementGroupId | null>(null)

  // Drag & drop achievements
  const reorderAchievements = useRpgStore((s) => s.reorderAchievements)
  const draggedAchRef = useRef<AchievementId | null>(null)
  const [dragOverAchId, setDragOverAchId] = useState<AchievementId | null>(null)

  useEffect(() => {
    if (isAddingFolder && newFolderInputRef.current) newFolderInputRef.current.focus()
  }, [isAddingFolder])

  useEffect(() => {
    if (editingFolderId && editFolderInputRef.current) editFolderInputRef.current.focus()
  }, [editingFolderId])

  const handleEdit = (achievement: Achievement) => {
    setEditingAchievement(achievement)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingAchievement(undefined)
  }

  const handleAddFolder = () => {
    const name = newFolderName.trim()
    if (!name) { setIsAddingFolder(false); return }
    addAchievementGroup(name, newFolderColor)
    setNewFolderName('')
    setNewFolderColor('#6b7280')
    setIsAddingFolder(false)
  }

  const handleSaveFolder = () => {
    if (!editingFolderId) return
    const name = editingFolderName.trim()
    if (name) {
      updateAchievementGroup(editingFolderId, (g) => ({ ...g, name, color: editingFolderColor }))
    }
    setEditingFolderId(null)
    setEditingFolderName('')
    setEditingFolderColor('#6b7280')
  }

  const handleDeleteFolder = () => {
    if (!deletingFolderId) return
    deleteAchievementGroup(deletingFolderId)
    if (openFolderId === deletingFolderId) setOpenFolderId(null)
    setDeletingFolderId(null)
  }

  // Achievements by group
  const achievementsByGroup = useMemo(() => {
    const map = new Map<AchievementGroupId | null, Achievement[]>()
    achievements.forEach((a) => {
      const g = a.groupId ?? null
      const arr = map.get(g) ?? []
      arr.push(a)
      map.set(g, arr)
    })
    // Sort each group by sortOrder so drag & drop reordering is reflected
    map.forEach((arr, key) => {
      map.set(key, arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
    })
    return map
  }, [achievements])

  const ungroupedAchievements = achievementsByGroup.get(null) ?? []

  // Currently open folder
  const openFolder = openFolderId ? achievementGroups.find((g) => g.id === openFolderId) : null
  const openFolderAchievements = openFolderId
    ? (openFolderId === NO_GROUP_ID ? ungroupedAchievements : (achievementsByGroup.get(openFolderId) ?? []))
    : []

  const unlockedCount = achievements.filter((a) => a.unlocked).length

  // Default groupId for new achievements
  const defaultGroupId = openFolderId && openFolderId !== NO_GROUP_ID ? openFolderId : null

  // Icon picker target group
  const iconPickerGroup = iconPickerFolderId ? achievementGroups.find((g) => g.id === iconPickerFolderId) : null

  // ─── Folder edit modal ─────────────────────────────────────────────────────
  const editingFolder = editingFolderId ? achievementGroups.find((g) => g.id === editingFolderId) : null

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {openFolderId ? (
            <button
              type="button"
              onClick={() => setOpenFolderId(null)}
              className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl
                         bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-elevated)] transition-colors"
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-[var(--fg)]" />
            </button>
          ) : (
            <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/30">
              <Trophy className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-[var(--fg)]">
              {openFolderId
                ? (openFolder ? `${openFolder.icon || '📁'} ${openFolder.name}` : 'Без папки')
                : 'Достижения'}
            </h1>
            <p className="text-xs md:text-sm text-[var(--fg-muted)]">
              {openFolderId
                ? `${openFolderAchievements.filter((a) => a.unlocked).length} из ${openFolderAchievements.length} разблокировано`
                : `${unlockedCount} из ${achievements.length} разблокировано`}
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {!openFolderId ? (
            <button
              type="button"
              onClick={() => setIsAddingFolder(true)}
              className="btn-primary flex items-center gap-2"
              title="Новая папка"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Папка</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Достижение</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Folders View ────────────────────────────────────────────────── */}
      {!openFolderId && (
        <>
          {/* Folder grid */}
          {achievementGroups.length === 0 && ungroupedAchievements.length === 0 && !isAddingFolder ? (
            <div className="glass-card flex flex-col items-center justify-center rounded-2xl py-16">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 mb-4">
                <Award className="h-10 w-10 text-amber-500" />
              </div>
              <p className="font-medium text-[var(--fg)]">Нет достижений</p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">
                Создайте папку и добавьте первое достижение
              </p>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-2xl grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Folder cards */}
              {achievementGroups.map((group) => (
                <FolderCard
                  key={group.id}
                  group={group}
                  achievements={achievementsByGroup.get(group.id) ?? []}
                  onOpen={() => setOpenFolderId(group.id)}
                  onEditIcon={() => setIconPickerFolderId(group.id)}
                  onEdit={() => {
                    setEditingFolderId(group.id)
                    setEditingFolderName(group.name)
                    setEditingFolderColor(group.color ?? '#6b7280')
                  }}
                  onDelete={() => setDeletingFolderId(group.id)}
                />
              ))}

              {/* "No folder" card if there are ungrouped achievements */}
              {ungroupedAchievements.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOpenFolderId(NO_GROUP_ID)}
                  className="flex flex-col items-center gap-3 rounded-2xl p-6 pt-8 pb-5 transition-all duration-200 cursor-pointer
                             bg-[var(--surface-card)] border border-dashed border-[var(--border-strong)] hover:border-[var(--border-accent)] hover:shadow-lg
                             backdrop-blur-[16px] min-h-[200px]"
                  style={{ boxShadow: 'var(--shadow)' }}
                >
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
                    style={{
                      background: 'var(--surface-elevated)',
                      boxShadow: 'inset 0 1px 0 var(--neu-inset-light), 0 2px 8px var(--neu-shadow-dark)',
                    }}
                  >
                    📋
                  </div>
                  <span className="text-sm font-semibold text-[var(--fg-muted)] text-center">
                    Без папки
                  </span>
                  <div className="flex-1" />
                  <div className="w-full">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${ungroupedAchievements.length > 0
                            ? (ungroupedAchievements.filter((a) => a.unlocked).length / ungroupedAchievements.length) * 100
                            : 0}%`,
                          background: 'linear-gradient(90deg, var(--accent), var(--accent-light))',
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--fg-muted)] text-center">
                      {ungroupedAchievements.filter((a) => a.unlocked).length}/{ungroupedAchievements.length}
                    </p>
                  </div>
                </button>
              )}

              {/* New folder inline input */}
              {isAddingFolder && (
                <div className="flex flex-col items-center gap-3 rounded-2xl p-5
                                bg-[var(--surface-card)] border border-dashed border-[var(--accent)] backdrop-blur-[16px]">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
                    style={{
                      background: `linear-gradient(145deg, ${newFolderColor}33, ${newFolderColor}11)`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 8px ${newFolderColor}33`,
                      border: `2px solid ${newFolderColor}55`,
                    }}
                  >
                    📁
                  </div>
                  <input
                    ref={newFolderInputRef}
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddFolder()
                      if (e.key === 'Escape') { setIsAddingFolder(false); setNewFolderName(''); setNewFolderColor('#6b7280') }
                    }}
                    placeholder="Название..."
                    className="input py-1.5 px-3 text-sm w-full text-center"
                  />
                  {/* Color picker */}
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {FOLDER_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewFolderColor(c)}
                        className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                        style={{
                          background: c,
                          outline: newFolderColor === c ? `2px solid ${c}` : 'none',
                          outlineOffset: '2px',
                          boxShadow: newFolderColor === c ? `0 0 0 1px var(--surface-card)` : 'none',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => { setIsAddingFolder(false); setNewFolderName(''); setNewFolderColor('#6b7280') }}
                      className="btn-secondary flex-1 py-1 text-xs"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleAddFolder}
                      className="btn-primary flex-1 py-1 text-xs"
                    >
                      Создать
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── Inside Folder View (two-column list) ─────────────────────── */}
      {openFolderId && (
        <>
          {openFolderAchievements.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center rounded-2xl py-16">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 mb-4">
                <Award className="h-10 w-10 text-amber-500" />
              </div>
              <p className="font-medium text-[var(--fg)]">Нет достижений в этой папке</p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">
                Добавьте первое достижение
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {openFolderAchievements.map((achievement) => (
                <AchievementListItem
                  key={achievement.id}
                  achievement={achievement}
                  onClick={() => setSelectedAchievement(achievement)}
                  groupColor={openFolder?.color}
                  draggable
                  isDragOver={dragOverAchId === achievement.id}
                  onDragStart={(e) => {
                    draggedAchRef.current = achievement.id
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (draggedAchRef.current && draggedAchRef.current !== achievement.id) {
                      setDragOverAchId(achievement.id)
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOverAchId(null)
                    const sourceId = draggedAchRef.current
                    draggedAchRef.current = null
                    if (!sourceId || sourceId === achievement.id) return
                    const ids = openFolderAchievements.map((a) => a.id)
                    const fromIdx = ids.indexOf(sourceId)
                    const toIdx = ids.indexOf(achievement.id)
                    if (fromIdx === -1 || toIdx === -1) return
                    const reordered = [...ids]
                    reordered.splice(fromIdx, 1)
                    reordered.splice(toIdx, 0, sourceId)
                    reorderAchievements(reordered)
                  }}
                  onDragEnd={() => {
                    draggedAchRef.current = null
                    setDragOverAchId(null)
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selectedAchievement && (
        <AchievementDetailModal
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
          onEdit={() => handleEdit(selectedAchievement)}
        />
      )}

      {/* Form modal */}
      {showForm && (
        <AchievementForm
          achievement={editingAchievement}
          onClose={handleCloseForm}
          defaultGroupId={defaultGroupId}
        />
      )}

      {/* Folder icon picker */}
      {iconPickerGroup && (
        <FolderIconPicker
          currentIcon={iconPickerGroup.icon || '📁'}
          onSelect={(icon) => {
            updateAchievementGroup(iconPickerGroup.id, (g) => ({ ...g, icon }))
          }}
          onClose={() => setIconPickerFolderId(null)}
        />
      )}

      {/* Rename folder modal */}
      {editingFolder && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && handleSaveFolder()}>
          <div className="modal-content max-w-xs">
            <h3 className="text-lg font-bold text-[var(--fg)] mb-4">Редактировать папку</h3>
            <input
              ref={editFolderInputRef}
              type="text"
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveFolder()
                if (e.key === 'Escape') { setEditingFolderId(null); setEditingFolderName(''); setEditingFolderColor('#6b7280') }
              }}
              className="input w-full mb-3"
              autoFocus
            />
            {/* Color picker */}
            <p className="text-xs text-[var(--fg-muted)] mb-2">Цвет папки</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditingFolderColor(c)}
                  className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    outline: editingFolderColor === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    boxShadow: editingFolderColor === c ? `0 0 0 1px var(--surface-card)` : 'none',
                  }}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setEditingFolderId(null); setEditingFolderName(''); setEditingFolderColor('#6b7280') }}
                className="btn-secondary flex-1"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveFolder}
                className="btn-primary flex-1"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete folder confirm */}
      <ConfirmModal
        isOpen={!!deletingFolderId}
        onConfirm={handleDeleteFolder}
        onCancel={() => setDeletingFolderId(null)}
        title="Удалить папку?"
        message="Папка будет удалена. Достижения останутся без папки."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />
    </div>
  )
}
