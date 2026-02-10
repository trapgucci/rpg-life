import { Calendar, Repeat, Clock, Zap } from 'lucide-react'
import { cn } from '../lib/cn'
import type { TaskRecurrence } from '../types/domain'
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
]

interface RecurrenceSelectModalProps {
  isOpen: boolean
  selected: TaskRecurrence
  onSelect: (recurrence: TaskRecurrence) => void
  onClose: () => void
}

export default function RecurrenceSelectModal({
  isOpen,
  selected,
  onSelect,
  onClose,
}: RecurrenceSelectModalProps) {
  const handleSelect = (value: TaskRecurrence) => {
    onSelect(value)
    onClose()
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
      <div className="p-4 max-h-[60vh] overflow-y-auto">
        <div className="space-y-2">
          {RECURRENCE_OPTIONS.map((option) => {
            const isSelected = selected === option.value

            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
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
                    <h3
                      className={cn(
                        'text-base font-semibold',
                        isSelected ? 'text-[var(--accent)]' : 'text-[var(--fg)]'
                      )}
                    >
                      {option.label}
                    </h3>
                    {isSelected && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                        <svg
                          className="h-3 w-3"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M10 3L4.5 8.5L2 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
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
    </Modal>
  )
}
