import { NavLink } from 'react-router-dom'
import {
  CheckSquare,
  ShoppingBag,
  Package,
  Brain,
  Activity,
  Trophy,
  Settings,
} from 'lucide-react'
import { cn } from '../lib/cn'

const navItems = [
  { to: '/', label: 'Задачи', icon: CheckSquare, color: '#6366f1' },
  { to: '/shop', label: 'Магазин', icon: ShoppingBag, color: '#f59e0b' },
  { to: '/inventory', label: 'Инвентарь', icon: Package, color: '#8b5cf6' },
  { to: '/reflection', label: 'Рефлексия', icon: Brain, color: '#14b8a6' },
  { to: '/status', label: 'Статус', icon: Activity, color: '#3b82f6' },
  { to: '/achievements', label: 'Трофеи', icon: Trophy, color: '#eab308' },
  { to: '/settings', label: 'Настройки', icon: Settings, color: '#64748b' },
] as const

export default function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden glass border-t border-[var(--border)] safe-area-bottom">
      <div className="flex overflow-x-auto scrollbar-hide">
        {navItems.map(({ to, label, icon: Icon, color }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors min-w-[80px] h-14 px-2',
                isActive
                  ? 'text-[var(--accent)] font-medium'
                  : 'text-[var(--fg-muted)]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                    isActive && 'bg-[var(--accent-subtle)]'
                  )}
                >
                  <Icon
                    className="h-4.5 w-4.5"
                    style={isActive ? { color } : undefined}
                  />
                </div>
                <span className="truncate max-w-full">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
