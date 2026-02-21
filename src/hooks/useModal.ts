import { useState, useCallback } from 'react'

interface UseModalOptions {
  defaultOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
}

interface UseModalReturn {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

/**
 * Hook for managing modal state
 *
 * @example
 * const modal = useModal()
 *
 * return (
 *   <>
 *     <button onClick={modal.open}>Open Modal</button>
 *     <Modal isOpen={modal.isOpen} onClose={modal.close}>
 *       Content
 *     </Modal>
 *   </>
 * )
 */
export function useModal(options: UseModalOptions = {}): UseModalReturn {
  const { defaultOpen = false, onOpenChange } = options
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const open = useCallback(() => {
    setIsOpen(true)
    onOpenChange?.(true)
  }, [onOpenChange])

  const close = useCallback(() => {
    setIsOpen(false)
    onOpenChange?.(false)
  }, [onOpenChange])

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev
      onOpenChange?.(next)
      return next
    })
  }, [onOpenChange])

  return {
    isOpen,
    open,
    close,
    toggle,
  }
}
