import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Trophy, Plus, Pencil, Trash2, X, Lock, Unlock,
  Zap, Coins, Gem, Target, Award, Check, ChevronLeft,
  FolderOpen
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import ConfirmModal from '../components/ConfirmModal'
import type { Achievement, AchievementConditionType, AchievementGroup, AchievementGroupId, AttributeId } from '../types/domain'

const ACHIEVEMENT_ICONS = ['🏆', '⭐', '🎯', '🔥', '💎', '👑', '🎖️', '🏅', '🌟', '✨', '💪', '🎉', '🚀', '💫', '🎁']

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

  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []

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
            </span>
          )}
          {achievement.rewardCoins > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <Coins className="h-3 w-3" />
              +{achievement.rewardCoins}
            </span>
          )}
          {achievement.rewardGems > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-violet-500/10 px-2 py-1 text-xs font-medium text-violet-500">
              <Gem className="h-3 w-3" />
              +{achievement.rewardGems}
            </span>
          )}
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

const CONDITION_TYPES: { value: AchievementConditionType; label: string }[] = [
  { value: 'tasks_completed', label: 'Выполненных задач' },
  { value: 'habits_positive', label: 'Положительных привычек' },
  { value: 'attribute_level', label: 'Уровень атрибута' },
  { value: 'streak_days', label: 'Дней streak' },
  { value: 'coins_earned', label: 'Монет заработано' },
  { value: 'items_crafted', label: 'Предметов скрафчено' },
  { value: 'custom', label: 'Ручная разблокировка' },
]

function AchievementForm({ achievement, onClose, defaultGroupId }: AchievementFormProps) {
  const addAchievement = useRpgStore((s) => s.addAchievement)
  const updateAchievement = useRpgStore((s) => s.updateAchievement)
  const achievementGroupsRaw = useRpgStore((s) => s.achievementGroups)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)

  const achievementGroups = useMemo(
    () => activeProfileId
      ? achievementGroupsRaw.filter((g) => g.profileId === activeProfileId).sort((a, b) => a.sortOrder - b.sortOrder)
      : [],
    [achievementGroupsRaw, activeProfileId]
  )

  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []

  const [title, setTitle] = useState(achievement?.title ?? '')
  const [description, setDescription] = useState(achievement?.description ?? '')
  const [icon, setIcon] = useState(achievement?.icon ?? '🏆')
  const [groupId, setGroupId] = useState<AchievementGroupId | null>(
    achievement?.groupId ?? defaultGroupId ?? null
  )
  const [conditionType, setConditionType] = useState<AchievementConditionType>(
    achievement?.condition.type ?? 'tasks_completed'
  )
  const [targetValue, setTargetValue] = useState(achievement?.condition.targetValue ?? 10)
  const [attributeId, setAttributeId] = useState<AttributeId | null>(
    achievement?.condition.attributeId ?? null
  )
  const [rewardXp, setRewardXp] = useState(achievement?.rewardXp ?? 100)
  const [rewardCoins, setRewardCoins] = useState(achievement?.rewardCoins ?? 50)
  const [rewardGems, setRewardGems] = useState(achievement?.rewardGems ?? 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const data = {
      title: title.trim(),
      description: description.trim(),
      icon,
      groupId,
      condition: {
        type: conditionType,
        targetValue,
        attributeId: conditionType === 'attribute_level' ? attributeId : undefined,
      },
      rewardXp,
      rewardCoins,
      rewardGems,
    }

    if (achievement) {
      updateAchievement(achievement.id, (a) => ({ ...a, ...data }))
    } else {
      addAchievement(data)
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--fg)]">
            {achievement ? 'Редактировать достижение' : 'Новое достижение'}
          </h2>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название достижения"
            className="input text-lg"
            autoFocus
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание"
            rows={2}
            className="input resize-none"
          />

          {/* Group selector */}
          {achievementGroups.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Папка</label>
              <select
                value={groupId ?? ''}
                onChange={(e) => setGroupId(e.target.value || null)}
                className="select w-full"
              >
                <option value="">Без папки</option>
                {achievementGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.icon || '📁'} {g.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Иконка</label>
            <div className="flex flex-wrap gap-2">
              {ACHIEVEMENT_ICONS.map((i) => (
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

          {/* Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Условие</label>
              <select
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value as AchievementConditionType)}
                className="select w-full"
              >
                {CONDITION_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            {conditionType !== 'custom' && (
              <div>
                <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Цель</label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value) || 0)}
                  className="input w-full"
                />
              </div>
            )}
          </div>

          {conditionType === 'attribute_level' && (
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Атрибут</label>
              <select
                value={attributeId ?? ''}
                onChange={(e) => setAttributeId(e.target.value || null)}
                className="select w-full"
              >
                <option value="">Выберите атрибут</option>
                {attributes.map((a) => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Rewards */}
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Награды</label>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-[var(--surface)] p-3">
                <Zap className="h-4 w-4 text-purple-500" />
                <input
                  type="number"
                  value={rewardXp}
                  onChange={(e) => setRewardXp(Number(e.target.value) || 0)}
                  className="w-full bg-transparent text-sm focus:outline-none"
                  placeholder="XP"
                />
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-[var(--surface)] p-3">
                <Coins className="h-4 w-4 text-amber-500" />
                <input
                  type="number"
                  value={rewardCoins}
                  onChange={(e) => setRewardCoins(Number(e.target.value) || 0)}
                  className="w-full bg-transparent text-sm focus:outline-none"
                  placeholder="Монеты"
                />
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-[var(--surface)] p-3">
                <Gem className="h-4 w-4 text-violet-500" />
                <input
                  type="number"
                  value={rewardGems}
                  onChange={(e) => setRewardGems(Number(e.target.value) || 0)}
                  className="w-full bg-transparent text-sm focus:outline-none"
                  placeholder="Гемы"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" className="btn-primary flex-1">
              {achievement ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
