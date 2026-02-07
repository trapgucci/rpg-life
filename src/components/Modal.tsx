import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../lib/cn'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  title?: string
  zIndex?: number
}

const sizeClasses = {
  sm: 'max-w-[28rem]',
  md: 'max-w-[32rem]',
  lg: 'max-w-[40rem]',
  xl: 'max-w-[48rem]',
}

export default function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  className,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  title,
  zIndex = 9999,
}: ModalProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      // Delay animation to allow DOM to update
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true)
        })
      })
    } else {
      setIsAnimating(false)
      // Delay unmount to allow exit animation
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 200) // Match animation duration
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  // Handle Escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeOnEscape, isOpen, onClose])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!shouldRender) return null

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex }}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200',
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full rounded-2xl bg-white dark:bg-[var(--surface)] shadow-2xl',
          'border border-[var(--border)] transition-all duration-200 ease-out',
          sizeClasses[size],
          isAnimating
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            {title && (
              <h2
                id="modal-title"
                className="text-lg font-bold text-[var(--fg)]"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="icon-btn h-8 w-8 p-0 ml-auto"
                title="Закрыть"
                aria-label="Закрыть модальное окно"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn(!title && !showCloseButton && 'rounded-2xl overflow-hidden')}>
          {children}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
