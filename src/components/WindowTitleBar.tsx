import { cn } from '../lib/cn'

interface WindowTitleBarProps {
  title?: string
  className?: string
}

export default function WindowTitleBar({ title = 'RPG Life', className }: WindowTitleBarProps) {
  return (
    <header
      className={cn(
        'glass-titlebar flex h-9 shrink-0 items-center border-b border-[var(--border)] px-4',
        'select-none',
        className
      )}
      data-electron-drag
    >
      <span className="text-xs font-medium text-[var(--fg-muted)] truncate">{title}</span>
    </header>
  )
}
