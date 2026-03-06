import { useEffect, useState } from 'react'
import { cn } from '../lib/cn'

interface WindowTitleBarProps {
  title?: string
  className?: string
}

const isElectronWindows =
  typeof window !== 'undefined' &&
  (window as any).electronAPI?.platform === 'win32'

export default function WindowTitleBar({ className }: WindowTitleBarProps) {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    if (!isElectronWindows) return
    const api = (window as any).electronAPI
    api.isMaximized?.().then((v: boolean) => setMaximized(v))
    api.onMaximizeChange?.((v: boolean) => setMaximized(v))
  }, [])

  if (!isElectronWindows) return null

  const api = (window as any).electronAPI

  return (
    <header
      className={cn(
        'flex h-8 shrink-0 items-center justify-end select-none',
        'glass-titlebar border-b border-[var(--border)]',
        className
      )}
      data-electron-drag
    >
      {/* Minimize */}
      <button
        data-electron-no-drag
        onClick={() => api.minimizeWindow?.()}
        className="titlebar-btn"
        aria-label="Minimize"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
          <rect width="10" height="1" />
        </svg>
      </button>

      {/* Maximize / Restore */}
      <button
        data-electron-no-drag
        onClick={() => api.maximizeWindow?.().then(() => setMaximized((v) => !v))}
        className="titlebar-btn"
        aria-label={maximized ? 'Restore' : 'Maximize'}
      >
        {maximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="2" y="0" width="8" height="8" />
            <polyline points="0,2 0,10 8,10" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        )}
      </button>

      {/* Close */}
      <button
        data-electron-no-drag
        onClick={() => api.closeWindow?.()}
        className="titlebar-btn titlebar-btn-close"
        aria-label="Close"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
          <line x1="0" y1="0" x2="10" y2="10" />
          <line x1="10" y1="0" x2="0" y2="10" />
        </svg>
      </button>
    </header>
  )
}
