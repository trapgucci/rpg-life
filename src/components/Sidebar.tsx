import { NavLink } from 'react-router-dom'
import {
  CheckSquare,
  Repeat,
  ShoppingBag,
  Activity,
  Trophy,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Hammer,
  Gamepad2,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useState } from 'react'

const navItems = [
  { to: '/', label: 'Задачи', icon: CheckSquare, color: '#6366f1' },
  { to: '/habits', label: 'Привычки', icon: Repeat, color: '#10b981' },
  { to: '/shop', label: 'Предметы', icon: ShoppingBag, color: '#f59e0b' },
  { to: '/status', label: 'Статус', icon: Activity, color: '#3b82f6' },
  { to: '/achievements', label: 'Достижения', icon: Trophy, color: '#eab308' },
] as const

const bottomItems = [
  { to: '/settings', label: 'Настройки', icon: Settings },
] as const

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'glass-sidebar flex shrink-0 flex-col transition-all duration-300 ease-out',
        'border-r border-[var(--border)]',
        collapsed ? 'w-[68px]' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-[var(--border)] px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
          <Gamepad2 className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[var(--fg)]">RPG Life</span>
            <span className="text-[10px] text-[var(--fg-muted)]">Геймификация жизни</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <div className="mb-2 px-2">
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              Меню
            </span>
          )}
        </div>
        
        {navItems.map(({ to, label, icon: Icon, color }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
                collapsed && 'justify-center px-2',
                isActive 
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-medium shadow-sm'
                  : 'text-[var(--fg-secondary)] hover:bg-[var(--surface)] hover:text-[var(--fg)]'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full"
                    style={{ background: `linear-gradient(to bottom, ${color}, ${color}88)` }}
                  />
                )}
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-[var(--accent)] text-white shadow-md'
                      : 'bg-[var(--surface)] text-[var(--fg-muted)] group-hover:bg-[var(--surface-elevated)] group-hover:text-[var(--fg)]'
                  )}
                  style={isActive ? { background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 4px 12px ${color}40` } : {}}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {!collapsed && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[var(--border)] p-3">
        {bottomItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
                collapsed && 'justify-center px-2',
                isActive 
                  ? 'bg-[var(--surface-elevated)] text-[var(--fg)] font-medium'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)]'
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {/* Collapse button */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200',
            'text-[var(--fg-muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)]',
            collapsed && 'justify-center px-2'
          )}
          aria-label={collapsed ? 'Развернуть' : 'Свернуть'}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Свернуть</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
