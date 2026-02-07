import Modal from './Modal'
import { AlertTriangle, Save, Trash2, HelpCircle } from 'lucide-react'
import { cn } from '../lib/cn'

type ConfirmVariant = 'danger' | 'warning' | 'save' | 'info'

interface ConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
}

const variantConfig: Record<ConfirmVariant, {
  icon: typeof AlertTriangle
  iconBg: string
  iconColor: string
  btnClass: string
}> = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-500/15',
    iconColor: 'text-red-500',
    btnClass: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-500',
    btnClass: 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25',
  },
  save: {
    icon: Save,
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-500',
    btnClass: 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25',
  },
  info: {
    icon: HelpCircle,
    iconBg: 'bg-[var(--accent-subtle)]',
    iconColor: 'text-[var(--accent)]',
    btnClass: 'btn-primary',
  },
}

export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'danger',
}: ConfirmModalProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      showCloseButton={false}
      closeOnBackdropClick={false}
      zIndex={10001}
    >
      <div className="p-6 flex flex-col items-center text-center">
        <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl mb-4', config.iconBg)}>
          <Icon className={cn('h-7 w-7', config.iconColor)} />
        </div>
        <h3 className="text-lg font-bold text-[var(--fg)] mb-1">{title}</h3>
        {message && (
          <p className="text-sm text-[var(--fg-muted)] mb-6 max-w-[280px]">{message}</p>
        )}
        {!message && <div className="mb-6" />}
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1 py-2.5"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn('flex-1 rounded-xl py-2.5 font-semibold transition-all duration-200 active:scale-95', config.btnClass)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}
