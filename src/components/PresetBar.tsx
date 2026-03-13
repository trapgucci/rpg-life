import { useState, useMemo } from 'react'
import { Settings } from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import { useShallow } from 'zustand/react/shallow'
import type { TaskPreset } from '../types/domain'
import Modal from './Modal'
import ConfirmModal from './ConfirmModal'
import { Trash2, Coins, Gem } from 'lucide-react'

interface PresetBarProps {
  onApplyPreset: (preset: TaskPreset) => void
  onClearPreset?: () => void
}

export default function PresetBar({ onApplyPreset, onClearPreset }: PresetBarProps) {
  const { taskPresetsRaw, activeProfileId, taskGroupsRaw } = useRpgStore(
    useShallow((s) => ({
      taskPresetsRaw: s.taskPresets,
      activeProfileId: s.activeProfileId,
      taskGroupsRaw: s.taskGroups,
    }))
  )
  const deleteTaskPreset = useRpgStore((s) => s.deleteTaskPreset)

  const presets = useMemo(
    () => taskPresetsRaw
      .filter((p) => p.profileId === activeProfileId)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    [taskPresetsRaw, activeProfileId]
  )

  const groups = useMemo(
    () => taskGroupsRaw.filter((g) => g.profileId === activeProfileId),
    [taskGroupsRaw, activeProfileId]
  )

  const [showManage, setShowManage] = useState(false)
  const [appliedId, setAppliedId] = useState<string | null>(null)

  const handleApply = (preset: TaskPreset) => {
    if (appliedId === preset.id) {
      setAppliedId(null)
      onClearPreset?.()
      return
    }
    setAppliedId(preset.id)
    onApplyPreset(preset)
  }

  // Если нет пресетов — ничего не рендерим
  if (presets.length === 0) return null

  return (
    <>
      <div className="flex items-center gap-1.5">
        <div className="flex flex-1 gap-1.5 overflow-x-auto scrollbar-thin">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApply(preset)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                'bg-[var(--surface)] ring-1 ring-inset ring-[var(--border)]',
                'hover:ring-[var(--accent)]/30 hover:bg-[var(--surface-elevated)]',
                'active:scale-[0.97]',
                appliedId === preset.id && 'ring-2 ring-[var(--accent)] bg-[var(--accent-subtle)] shadow-sm shadow-[var(--accent)]/20'
              )}
            >
              {preset.icon && <span className="text-sm leading-none">{preset.icon}</span>}
              <span className="text-[var(--fg)] whitespace-nowrap">{preset.name}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowManage(true)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--fg-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-all"
          title="Управление пресетами"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      {showManage && (
        <ManagePresetsOverlay
          presets={presets}
          groups={groups}
          onDelete={deleteTaskPreset}
          onClose={() => setShowManage(false)}
        />
      )}
    </>
  )
}

// ─── Manage overlay ─────────────────────────────────────────────────────────

interface ManagePresetsOverlayProps {
  presets: TaskPreset[]
  groups: { id: string; name: string }[]
  onDelete: (id: string) => void
  onClose: () => void
}

const DIFF_LABELS: Record<string, string> = {
  easy: 'Лёгкая',
  medium: 'Средняя',
  hard: 'Сложная',
  veryHard: 'Импосибл',
}

const REC_LABELS: Record<string, string> = {
  once: 'Без повтора',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
  instant: 'Инстант',
  custom: 'Кастомный',
}

function ManagePresetsOverlay({ presets, groups, onDelete, onClose }: ManagePresetsOverlayProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const presetToDelete = deleteId ? presets.find((p) => p.id === deleteId) : null

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        size="sm"
        title="Управление пресетами"
        showCloseButton
        closeOnBackdropClick
        closeOnEscape
      >
        <div className="px-4 pb-4 pt-3 max-h-[65vh] overflow-y-auto">
          {presets.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)] text-center py-8">Нет сохранённых пресетов</p>
          ) : (
            <div className="space-y-2">
              {presets.map((preset) => {
                const group = groups.find((g) => g.id === preset.groupId)
                return (
                  <div
                    key={preset.id}
                    className="group flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition-all hover:border-[var(--border-strong)]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-base">
                      {preset.icon || '⚡'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--fg)] truncate">{preset.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {group && (
                          <span className="text-[10px] text-[var(--fg-muted)] bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded">
                            {group.name}
                          </span>
                        )}
                        {preset.difficulty && (
                          <span className="text-[10px] text-[var(--fg-muted)] bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded">
                            {DIFF_LABELS[preset.difficulty] ?? preset.difficulty}
                          </span>
                        )}
                        {preset.recurrence && preset.recurrence !== 'once' && (
                          <span className="text-[10px] text-[var(--fg-muted)] bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded">
                            {REC_LABELS[preset.recurrence] ?? preset.recurrence}
                          </span>
                        )}
                        {(preset.coinReward ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500">
                            <Coins className="h-3 w-3" />{preset.coinReward}
                          </span>
                        )}
                        {(preset.gemReward ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-cyan-500">
                            <Gem className="h-3 w-3" />{preset.gemReward}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteId(preset.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--fg-muted)] hover:bg-[var(--danger-subtle)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-all"
                      title="Удалить"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Modal>
      <ConfirmModal
        isOpen={!!deleteId}
        title="Удалить пресет"
        message={`Удалить пресет «${presetToDelete?.name ?? ''}»? Это действие нельзя отменить.`}
        confirmText="Удалить"
        variant="danger"
        onConfirm={() => {
          if (deleteId) onDelete(deleteId)
          setDeleteId(null)
        }}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}
