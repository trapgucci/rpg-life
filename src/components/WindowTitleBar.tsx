import { cn } from '../lib/cn'

interface WindowTitleBarProps {
  title?: string
  className?: string
}

export default function WindowTitleBar({ className }: WindowTitleBarProps) {
  return (
    <header
      className={cn(
        'flex h-8 shrink-0 border-b border-[var(--border)]',
        'select-none',
        className
      )}
      data-electron-drag
    />
  )
}
