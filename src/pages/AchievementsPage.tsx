import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Trophy, Plus, Pencil, Trash2, X, Lock, Unlock,
  Zap, Coins, Gem, Target, Award, Check, ChevronLeft,
  FolderOpen, ChevronDown, Minus, Package, ShoppingBag,
  Search, Folder, ListChecks, Heart, BarChart3, Flame,
  Hammer, Hand
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import ConfirmModal from '../components/ConfirmModal'
import Modal from '../components/Modal'
import { ItemIconBadge } from '../components/ItemIconBadge'
import { getItemTypeBadge } from '../components/shop/shopUtils'
import type {
  Achievement, AchievementConditionType, AchievementGroup,
  AchievementGroupId, AttributeId, TaskDifficulty, ItemId,
  ShopItem
} from '../types/domain'
import { TASK_XP_BY_DIFFICULTY } from '../types/domain'

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

const NO_GROUP_ID = '__none__' as AchievementGroupId

// ─── Achievement Detail Modal ─────────────────────────────────────────────────

interface AchievementDetailModalProps {
  achievement: Achievement
  onClose: () => void
  onEdit: () => void
}

function AchievementDetailModal({ achievement, onClose, onEdit }: AchievementDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const deleteAchievement = useRpgStore((s) => s.deleteAchievement)
  const unlockAchievement = useRpgStore((s) => s.unlockAchievement)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const shopItems = useRpgStore((s) => s.shopItems)

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

  const progress = achievement.condition.targetValue > 0
    ? Math.min(1, achievement.currentProgress / achievement.condition.targetValue)
    : 0

  const attr = achievement.condition.attributeId
    ? attributes.find((a) => a.id === achievement.condition.attributeId)
    : null

  const getConditionText = () => {
    const { type, targetValue } = achievement.condition
    switch (type) {
      case 'tasks_completed':
        return `Выполните ${targetValue} задач`
      case 'habits_positive':
        return `Нажмите + на привычках ${targetValue} раз`
      case 'attribute_level':
        return `Достигните уровня ${targetValue} в ${attr?.name ?? 'атрибуте'}`
      case 'streak_days':
        return `Поддерживайте streak ${targetValue} дней`
      case 'coins_earned':
        return `Заработайте ${targetValue.toLocaleString('ru-RU')} монет`
      case 'items_crafted':
        return `Скрафтите ${targetValue} предметов`
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
              'flex h-20 w-20 items-center justify-center rounded-2xl text-4xl',
              achievement.unlocked && 'achievement-shimmer'
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
            {achievement.icon}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-[var(--fg)] text-center">{achievement.title}</h3>

        {/* Description */}
        {achievement.description && (
          <p className="mt-1 text-sm text-[var(--fg-muted)] text-center">{achievement.description}</p>
        )}

        {/* Condition */}
        <p className="mt-3 text-xs text-[var(--fg-muted)] text-center flex items-center justify-center gap-1">
          <Target className="h-3 w-3" />
          {getConditionText()}
        </p>

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
              <span>{achievement.currentProgress} / {achievement.condition.targetValue}</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
          </div>
        )}

        {/* Rewards */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {achievement.rewardXp > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-500">
              <Zap className="h-3 w-3" />
              +{achievement.rewardXp} XP
              {rewardAttr && <span className="opacity-75">→ {rewardAttr.icon}</span>}
            </span>
          )}
          {achievement.rewardCoins > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <Coins className="h-3 w-3" />
              +{achievement.rewardCoins}
            </span>
          )}
          {achievement.rewardGems > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-600 dark:text-cyan-400">
              <Gem className="h-3 w-3" strokeWidth={2.5} />
              +{achievement.rewardGems}
            </span>
          )}
          {rewardItemsList.map(({ itemId, quantity, item }) => (
            <span key={itemId} className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-500">
              <span className="text-sm">{item!.icon || '📦'}</span>
              {item!.name}
              {quantity > 1 && ` ×${quantity}`}
            </span>
          ))}
        </div>

        {/* Unlock date */}
        {achievement.unlocked && achievement.unlockedAt && (
          <p className="mt-3 text-xs text-[var(--fg-muted)] text-center">
            Разблокировано: {new Date(achievement.unlockedAt).toLocaleDateString('ru-RU')}
          </p>
        )}

        {/* Manual unlock button */}
        {!achievement.unlocked && achievement.condition.type === 'custom' && (
          <button
            type="button"
            onClick={() => {
              unlockAchievement(achievement.id)
              onClose()
            }}
            className="mt-4 btn-primary text-sm py-2 w-full flex items-center justify-center"
          >
            <Unlock className="h-4 w-4 mr-2" />
            Разблокировать
          </button>
        )}

        <ConfirmModal
          isOpen={showDeleteConfirm}
          onConfirm={() => {
            setShowDeleteConfirm(false)
            deleteAchievement(achievement.id)
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
  { value: 'habits_positive', label: 'Положительных привычек', description: 'Суммарное количество нажатий на положительные привычки', icon: Heart, color: '#ec4899' },
  { value: 'attribute_level', label: 'Уровень атрибута', description: 'Один из ваших атрибутов должен достичь указанного уровня', icon: BarChart3, color: '#8b5cf6' },
  { value: 'streak_days', label: 'Дней streak', description: 'Непрерывная серия активных дней подряд', icon: Flame, color: '#f97316' },
  { value: 'coins_earned', label: 'Монет заработано', description: 'Суммарное количество монет, заработанных за всё время', icon: Coins, color: '#eab308' },
  { value: 'items_crafted', label: 'Предметов скрафчено', description: 'Общее количество предметов, созданных через крафт', icon: Hammer, color: '#14b8a6' },
  { value: 'custom', label: 'Ручная разблокировка', description: 'Без автоматического отслеживания — вы разблокируете достижение вручную', icon: Hand, color: '#6b7280' },
]

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
                  <ItemIconBadge item={item} size="sm" />
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
  attributes: { id: AttributeId; name: string; icon: string; color: string }[]
  onApply: (type: AchievementConditionType, target: number, attrId: AttributeId | null) => void
}

function ConditionPickerModal({
  isOpen, onClose, selectedType, targetValue, conditionAttributeId, attributes, onApply,
}: ConditionPickerModalProps) {
  const [localType, setLocalType] = useState(selectedType)
  const [localTarget, setLocalTarget] = useState(targetValue)
  const [localAttrId, setLocalAttrId] = useState<AttributeId | null>(conditionAttributeId)

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalType(selectedType)
      setLocalTarget(targetValue)
      setLocalAttrId(conditionAttributeId)
    }
  }, [isOpen, selectedType, targetValue, conditionAttributeId])

  const selectedCondition = CONDITION_TYPES.find((c) => c.value === localType)!

  const handleApply = () => {
    onApply(localType, localTarget, localType === 'attribute_level' ? localAttrId : null)
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
                value={localTarget}
                onChange={(e) => setLocalTarget(Math.max(1, Number(e.target.value) || 1))}
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
  const settings = useRpgStore((s) => s.settings)

  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []

  // Available shop items (not deleted, available for purchase)
  const availableShopItems = useMemo(
    () => shopItems.filter((i) => !i.deletedFromShop && i.profileId === activeProfileId),
    [shopItems, activeProfileId]
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
        rewardCoins !== d.rewardCoins ||
        rewardGems !== d.rewardGems ||
        rewardAttributeId !== (d.rewardAttributeId ?? null) ||
        rewardDifficulty !== (d.rewardDifficulty ?? 'medium') ||
        rewardCustomXp !== (d.rewardCustomXp ?? null) ||
        itemsChanged
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
    conditionAttributeId, rewardCoins, rewardGems, rewardAttributeId,
    rewardDifficulty, rewardCustomXp, rewardItems,
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
      },
      rewardXp: rewardAttributeId ? effectiveXp : 0,
      rewardCoins,
      rewardGems,
      rewardAttributeId: rewardAttributeId ?? undefined,
      rewardDifficulty: rewardAttributeId ? rewardDifficulty : undefined,
      rewardCustomXp: rewardAttributeId ? rewardCustomXp ?? undefined : undefined,
      rewardItems: rewardItems.length > 0 ? rewardItems : undefined,
      // Clear legacy fields
      rewardItemId: undefined,
      rewardItemQuantity: undefined,
    }

    if (achievement) {
      updateAchievement(achievement.id, (a) => ({ ...a, ...data }))
    } else {
      addAchievement(data)
    }
    onClose()
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
                        setRewardCustomXp(v === '' ? null : Math.max(0, parseInt(v, 10) || 0))
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
                    onChange={(e) => setRewardCoins(Math.max(0, Number(e.target.value) || 0))}
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
                    onChange={(e) => setRewardGems(Math.max(0, Number(e.target.value) || 0))}
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
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-[var(--fg-muted)] shrink-0 transition-transform group-hover:translate-y-0.5" />
                </div>
              </button>
            )
          })()}

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
      attributes={attributes}
      onApply={(type, target, attrId) => {
        setConditionType(type)
        setTargetValue(target)
        setConditionAttributeId(attrId)
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

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group/folder relative flex flex-col items-center gap-3 rounded-2xl p-6 pt-8 pb-5 transition-all duration-200 cursor-pointer
                 bg-[var(--surface-card)] border border-[var(--border)] hover:border-[var(--border-accent)] hover:shadow-lg
                 backdrop-blur-[16px] min-h-[200px]"
      style={{ boxShadow: 'var(--shadow)' }}
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
          boxShadow: 'inset 0 1px 0 var(--neu-inset-light), 0 2px 8px var(--neu-shadow-dark)',
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
              background: progress >= 1
                ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                : 'linear-gradient(90deg, var(--accent), var(--accent-light))',
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
}

function AchievementListItem({ achievement, onClick }: AchievementListItemProps) {
  const progress = achievement.condition.targetValue > 0
    ? Math.min(1, achievement.currentProgress / achievement.condition.targetValue)
    : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl p-3 transition-all duration-200 text-left w-full',
        'bg-[var(--surface-card)] border border-[var(--border)] hover:border-[var(--border-accent)]',
        achievement.unlocked ? 'hover:shadow-md' : 'opacity-80 hover:opacity-100'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl',
          achievement.unlocked && 'achievement-shimmer'
        )}
        style={
          achievement.unlocked
            ? {
                background: 'linear-gradient(145deg, #fbbf24ee, #f59e0bee)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 8px rgba(251,191,36,0.3)',
              }
            : {
                background: 'var(--surface)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
              }
        }
      >
        <span style={achievement.unlocked ? undefined : { filter: 'grayscale(1) opacity(0.4)' }}>
          {achievement.icon}
        </span>
        {!achievement.unlocked && (
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
            achievement.unlocked ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]'
          )}>
            {achievement.title}
          </span>
          {achievement.unlocked && (
            <Check className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          )}
        </div>

        {/* Progress bar for locked non-custom achievements */}
        {!achievement.unlocked && achievement.condition.type !== 'custom' && (
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
              {achievement.currentProgress}/{achievement.condition.targetValue}
            </span>
          </div>
        )}

        {/* Rewards preview */}
        {achievement.unlocked && (
          <div className="flex gap-2 mt-1">
            {achievement.rewardXp > 0 && (
              <span className="text-[11px] text-purple-500 font-medium">+{achievement.rewardXp} XP</span>
            )}
            {achievement.rewardCoins > 0 && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">+{achievement.rewardCoins} 🪙</span>
            )}
          </div>
        )}
      </div>
    </button>
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
  const newFolderInputRef = useRef<HTMLInputElement>(null)

  // Folder rename
  const [editingFolderId, setEditingFolderId] = useState<AchievementGroupId | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const editFolderInputRef = useRef<HTMLInputElement>(null)

  // Folder icon picker
  const [iconPickerFolderId, setIconPickerFolderId] = useState<AchievementGroupId | null>(null)

  // Folder delete confirm
  const [deletingFolderId, setDeletingFolderId] = useState<AchievementGroupId | null>(null)

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
    addAchievementGroup(name)
    setNewFolderName('')
    setIsAddingFolder(false)
  }

  const handleSaveFolder = () => {
    if (!editingFolderId) return
    const name = editingFolderName.trim()
    if (name) {
      updateAchievementGroup(editingFolderId, (g) => ({ ...g, name }))
    }
    setEditingFolderId(null)
    setEditingFolderName('')
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
          {achievementGroups.length === 0 && ungroupedAchievements.length === 0 ? (
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
                      background: 'var(--surface-elevated)',
                      boxShadow: 'inset 0 1px 0 var(--neu-inset-light), 0 2px 8px var(--neu-shadow-dark)',
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
                      if (e.key === 'Escape') { setIsAddingFolder(false); setNewFolderName('') }
                    }}
                    onBlur={handleAddFolder}
                    placeholder="Название..."
                    className="input py-1.5 px-3 text-sm w-full text-center"
                  />
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
            <h3 className="text-lg font-bold text-[var(--fg)] mb-4">Переименовать папку</h3>
            <input
              ref={editFolderInputRef}
              type="text"
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveFolder()
                if (e.key === 'Escape') { setEditingFolderId(null); setEditingFolderName('') }
              }}
              className="input w-full mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setEditingFolderId(null); setEditingFolderName('') }}
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
