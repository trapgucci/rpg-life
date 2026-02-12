import { useState, useEffect } from 'react'
import { Calendar, Repeat, Clock, Zap, Hash, Check } from 'lucide-react'
import { cn } from '../lib/cn'
import type { TaskRecurrence, RecurrenceSettings } from '../types/domain'
import Modal from './Modal'

interface RecurrenceOption {
  value: TaskRecurrence
  label: string
  description: string
  icon: React.ReactNode
}

const RECURRENCE_OPTIONS: RecurrenceOption[] = [
  {
    value: 'once',
    label: 'Один раз',
    description: 'Задача выполняется один раз без повтора',
    icon: <Clock className="h-5 w-5" />,
  },
  {
    value: 'daily',
    label: 'Ежедневно',
    description: 'Задача повторяется каждый день',
    icon: <Repeat className="h-5 w-5" />,
  },
  {
    value: 'weekly',
    label: 'Еженедельно',
    description: 'Задача повторяется каждую неделю',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    value: 'monthly',
    label: 'Ежемесячно',
    description: 'Задача повторяется каждый месяц',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    value: 'yearly',
    label: 'Ежегодно',
    description: 'Задача повторяется каждый год',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    value: 'instant',
    label: 'Инстант',
    description: 'Выполнять снова сразу после получения награды',
    icon: <Zap className="h-5 w-5" />,
  },
  {
    value: 'custom',
    label: 'Кастомный',
    description: 'Настроить интервал повтора вручную',
    icon: <Calendar className="h-5 w-5" />,
  },
]

const WEEKDAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const WEEKDAY_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

interface RecurrenceSelectModalProps {
  isOpen: boolean
  settings: RecurrenceSettings
  onSave: (settings: RecurrenceSettings) => void
  onClose: () => void
}

export default function RecurrenceSelectModal({
  isOpen,
  settings,
  onSave,
  onClose,
}: RecurrenceSelectModalProps) {
  // Локальное состояние для редактирования
  const [localSettings, setLocalSettings] = useState<RecurrenceSettings>(settings)

  // Синхронизация с внешними настройками при открытии
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings)
    }
  }, [isOpen, settings])

  const handleTypeSelect = (value: TaskRecurrence) => {
    setLocalSettings({ ...localSettings, type: value })
  }

  const handleWeekdayToggle = (day: number) => {
    const current = localSettings.weeklyDays ?? []
    const next = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort((a, b) => a - b)
    setLocalSettings({ ...localSettings, weeklyDays: next })
  }

  const handleSave = () => {
    // Валидация: для weekly должен быть выбран хотя бы один день
    if (localSettings.type === 'weekly' && (!localSettings.weeklyDays || localSettings.weeklyDays.length === 0)) {
      onSave({ ...localSettings, weeklyDays: [0, 1, 2, 3, 4, 5, 6] })
      return
    }
    onSave(localSettings)
    onClose()
  }

  const formatEndDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return ''
    const d = new Date(timestamp)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const parseEndDate = (dateString: string): number | null => {
    if (!dateString) return null
    const ms = new Date(dateString).getTime()
    return Number.isNaN(ms) ? null : ms
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Правило повтора"
      showCloseButton
      closeOnBackdropClick
      closeOnEscape
    >
      <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
        {/* 1. Выбор типа повтора */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-3 flex items-center gap-2">
            <Repeat className="h-4 w-4 text-[var(--accent)]" />
            Тип повтора
          </h3>
          <div className="space-y-2">
            {RECURRENCE_OPTIONS.map((option) => {
              const isSelected = localSettings.type === option.value

              return (
                <button
                  key={option.value}
                  onClick={() => handleTypeSelect(option.value)}
                  className={cn(
                    'w-full flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all',
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md'
                      : 'border-[var(--border)] bg-white dark:bg-[var(--surface-elevated)] hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)]/50'
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors',
                      isSelected
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)]'
                    )}
                  >
                    {option.icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2">
                      <h4
                        className={cn(
                          'text-base font-semibold',
                          isSelected ? 'text-[var(--accent)]' : 'text-[var(--fg)]'
                        )}
                      >
                        {option.label}
                      </h4>
                      {isSelected && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--fg-muted)]">
                      {option.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. Дополнительные настройки для weekly */}
        {localSettings.type === 'weekly' && (
          <>
            <div className="border-t border-[var(--border)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--fg)] mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--accent)]" />
                Дни недели
              </h3>
              <div className="grid grid-cols-7 gap-2">
                {WEEKDAY_LABELS.map((label, index) => {
                  const isSelected = (localSettings.weeklyDays ?? []).includes(index)
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleWeekdayToggle(index)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-semibold transition-all',
                        isSelected
                          ? 'bg-[var(--accent)] text-white border-2 border-[var(--accent)] shadow-md'
                          : 'bg-[var(--surface)] text-[var(--fg-muted)] border-2 border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                      )}
                      title={WEEKDAY_FULL[index]}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      {label}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-[var(--fg-muted)]">
                Задача будет повторяться в выбранные дни недели
              </p>
            </div>
          </>
        )}

        {/* 3. Дополнительные настройки для custom */}
        {localSettings.type === 'custom' && (
          <>
            <div className="border-t border-[var(--border)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--fg)] mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--accent)]" />
                Интервал повтора
              </h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, customIntervalDays: Math.max(1, (localSettings.customIntervalDays ?? 1) - 1) })}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)] transition-all"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={localSettings.customIntervalDays ?? 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!Number.isNaN(val) && val >= 1) {
                      setLocalSettings({ ...localSettings, customIntervalDays: val })
                    }
                  }}
                  className="input flex-1 text-center text-lg font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, customIntervalDays: (localSettings.customIntervalDays ?? 1) + 1 })}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white hover:brightness-110 transition-all"
                >
                  +
                </button>
                <span className="text-sm font-medium text-[var(--fg)] shrink-0">дней</span>
              </div>
              <p className="mt-2 text-xs text-[var(--fg-muted)]">
                Задача будет повторяться каждые {localSettings.customIntervalDays ?? 1} {
                  (localSettings.customIntervalDays ?? 1) === 1 ? 'день' :
                  (localSettings.customIntervalDays ?? 1) < 5 ? 'дня' : 'дней'
                }
              </p>
            </div>
          </>
        )}

        {/* 4. Окончание повтора (только если не once) */}
        {localSettings.type !== 'once' && (
          <>
            <div className="border-t border-[var(--border)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--fg)] mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--accent)]" />
                Окончание
              </h3>

              {/* Режим: Всегда */}
              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, endMode: 'never', endDate: null, endCount: undefined })}
                className={cn(
                  'w-full flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all mb-3',
                  localSettings.endMode === 'never'
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md'
                    : 'border-[var(--border)] bg-white dark:bg-[var(--surface-elevated)] hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)]/50'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                    localSettings.endMode === 'never'
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)]'
                  )}
                >
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className={cn(
                        'text-base font-semibold',
                        localSettings.endMode === 'never' ? 'text-[var(--accent)]' : 'text-[var(--fg)]'
                      )}
                    >
                      Всегда
                    </h4>
                    {localSettings.endMode === 'never' && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--fg-muted)]">
                    Задача будет повторяться, пока не остановите вручную
                  </p>
                </div>
              </button>

              {/* Режим: По дате окончания */}
              <div
                className={cn(
                  'w-full flex flex-col rounded-xl border-2 p-4 transition-all mb-3',
                  localSettings.endMode === 'byDate'
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md'
                    : 'border-[var(--border)] bg-white dark:bg-[var(--surface-elevated)]'
                )}
              >
                <button
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, endMode: 'byDate', endCount: undefined })}
                  className="flex items-start gap-4 text-left w-full"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                      localSettings.endMode === 'byDate'
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)]'
                    )}
                  >
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2">
                      <h4
                        className={cn(
                          'text-base font-semibold',
                          localSettings.endMode === 'byDate' ? 'text-[var(--accent)]' : 'text-[var(--fg)]'
                        )}
                      >
                        По дате окончания
                      </h4>
                      {localSettings.endMode === 'byDate' && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--fg-muted)]">
                      Задача завершится после указанной даты
                    </p>
                  </div>
                </button>

                {localSettings.endMode === 'byDate' && (
                  <div className="mt-3 pl-14">
                    <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Дата и время окончания</label>
                    <input
                      type="datetime-local"
                      value={formatEndDate(localSettings.endDate)}
                      onChange={(e) => setLocalSettings({ ...localSettings, endDate: parseEndDate(e.target.value) })}
                      className="input w-full"
                    />
                  </div>
                )}
              </div>

              {/* Режим: Завершить по количеству */}
              <div
                className={cn(
                  'w-full flex flex-col rounded-xl border-2 p-4 transition-all',
                  localSettings.endMode === 'byCount'
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md'
                    : 'border-[var(--border)] bg-white dark:bg-[var(--surface-elevated)]'
                )}
              >
                <button
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, endMode: 'byCount', endDate: null, endCount: localSettings.endCount ?? 1 })}
                  className="flex items-start gap-4 text-left w-full"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                      localSettings.endMode === 'byCount'
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)]'
                    )}
                  >
                    <Hash className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2">
                      <h4
                        className={cn(
                          'text-base font-semibold',
                          localSettings.endMode === 'byCount' ? 'text-[var(--accent)]' : 'text-[var(--fg)]'
                        )}
                      >
                        Завершить по количеству
                      </h4>
                      {localSettings.endMode === 'byCount' && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--fg-muted)]">
                      Задача завершится после N выполнений
                    </p>
                  </div>
                </button>

                {localSettings.endMode === 'byCount' && (
                  <div className="mt-3 pl-14">
                    <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">
                      Количество циклов
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setLocalSettings({ ...localSettings, endCount: Math.max(1, (localSettings.endCount ?? 1) - 1) })}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)] transition-all"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={localSettings.endCount ?? 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10)
                          if (!Number.isNaN(val) && val >= 1) {
                            setLocalSettings({ ...localSettings, endCount: val })
                          }
                        }}
                        className="input flex-1 text-center font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setLocalSettings({ ...localSettings, endCount: (localSettings.endCount ?? 1) + 1 })}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white hover:brightness-110 transition-all"
                      >
                        +
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-[var(--fg-muted)]">
                      Задача перестанет появляться после {localSettings.endCount ?? 1} {
                        (localSettings.endCount ?? 1) === 1 ? 'выполнения' :
                        (localSettings.endCount ?? 1) < 5 ? 'выполнений' : 'выполнений'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Кнопки действий */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary flex-1"
          >
            Сохранить
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  )
}
