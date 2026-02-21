import { useState } from 'react'
import { 
  Trophy, Plus, Pencil, Trash2, X, Lock, Unlock, 
  Zap, Coins, Gem, CheckCircle2, Target, Flame, Award
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import ConfirmModal from '../components/ConfirmModal'
import type { Achievement, AchievementConditionType, AttributeId } from '../types/domain'

const ACHIEVEMENT_ICONS = ['🏆', '⭐', '🎯', '🔥', '💎', '👑', '🎖️', '🏅', '🌟', '✨', '💪', '🎉', '🚀', '💫', '🎁']

// ─── Achievement Card ───────────────────────────────────────────────────────

interface AchievementCardProps {
  achievement: Achievement
  onEdit: () => void
}

function AchievementCard({ achievement, onEdit }: AchievementCardProps) {
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
    <div
      className={cn(
        'glass-card group relative rounded-2xl p-5 transition-all duration-300',
        achievement.unlocked && 'bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border-amber-500/30'
      )}
    >
      {/* Edit/Delete buttons */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onEdit} className="icon-btn">
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

      <div className="flex gap-4">
        {/* Icon */}
        <div
          className={cn(
            'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl transition-all',
            achievement.unlocked
              ? 'bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/30'
              : 'bg-[var(--surface)] grayscale'
          )}
        >
          {achievement.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[var(--fg)] truncate">{achievement.title}</h3>
            {achievement.unlocked && (
              <span className="badge badge-warning">Разблокировано</span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">{achievement.description}</p>
          
          {/* Condition */}
          <p className="mt-2 text-xs text-[var(--fg-muted)]">
            <Target className="h-3 w-3 inline mr-1" />
            {getConditionText()}
          </p>

          {/* Progress */}
          {!achievement.unlocked && achievement.condition.type !== 'custom' && (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${progress * 100}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #eab308)'
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
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

          {/* Manual unlock button */}
          {!achievement.unlocked && achievement.condition.type === 'custom' && (
            <button
              type="button"
              onClick={() => unlockAchievement(achievement.id)}
              className="mt-3 btn-primary text-sm py-2"
            >
              <Unlock className="h-4 w-4 mr-2" />
              Разблокировать
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={() => { setShowDeleteConfirm(false); deleteAchievement(achievement.id) }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Удалить достижение?"
        message="Достижение будет удалено безвозвратно."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />
    </div>
  )
}

// ─── Achievement Form ───────────────────────────────────────────────────────

interface AchievementFormProps {
  achievement?: Achievement
  onClose: () => void
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

function AchievementForm({ achievement, onClose }: AchievementFormProps) {
  const addAchievement = useRpgStore((s) => s.addAchievement)
  const updateAchievement = useRpgStore((s) => s.updateAchievement)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  
  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []

  const [title, setTitle] = useState(achievement?.title ?? '')
  const [description, setDescription] = useState(achievement?.description ?? '')
  const [icon, setIcon] = useState(achievement?.icon ?? '🏆')
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

// ─── Main Achievements Page ─────────────────────────────────────────────────

export default function AchievementsPage() {
  const allAchievements = useRpgStore((s) => s.achievements)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const achievements = activeProfileId ? allAchievements.filter((a) => a.profileId === activeProfileId) : []
  const [showForm, setShowForm] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<Achievement | undefined>()
  const [filter, setFilter] = useState<'all' | 'locked' | 'unlocked'>('all')

  const handleEdit = (achievement: Achievement) => {
    setEditingAchievement(achievement)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingAchievement(undefined)
  }

  const filteredAchievements = achievements.filter((a) => {
    if (filter === 'locked') return !a.unlocked
    if (filter === 'unlocked') return a.unlocked
    return true
  })

  const unlockedCount = achievements.filter((a) => a.unlocked).length

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/30">
            <Trophy className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-[var(--fg)]">Достижения</h1>
            <p className="text-xs md:text-sm text-[var(--fg-muted)]">
              {unlockedCount} из {achievements.length} разблокировано
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Новое достижение</span>
          <span className="sm:hidden">Новое</span>
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto">
        {(['all', 'locked', 'unlocked'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn('tab whitespace-nowrap', filter === f && 'tab-active')}
          >
            {f === 'all' ? 'Все' : f === 'locked' ? '🔒 Заблокированные' : '🏆 Разблокированные'}
          </button>
        ))}
      </div>

      {/* Achievements list */}
      {filteredAchievements.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center rounded-2xl py-16">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 mb-4">
            <Award className="h-10 w-10 text-amber-500" />
          </div>
          <p className="font-medium text-[var(--fg)]">
            {filter === 'all' ? 'Нет достижений' : filter === 'locked' ? 'Все достижения разблокированы!' : 'Пока нет разблокированных'}
          </p>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            {filter === 'all' && 'Создайте своё первое достижение'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAchievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              onEdit={() => handleEdit(achievement)}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && <AchievementForm achievement={editingAchievement} onClose={handleCloseForm} />}
    </div>
  )
}
