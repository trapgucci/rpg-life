import { memo, useMemo } from 'react'
import { cn } from '../lib/cn'
import type { ShopItem } from '../types/domain'
import { getItemIcon, getItemTypeColor } from './shop/shopUtils'
import { HabitIcon } from './HabitIcon'

// ─── Size config ────────────────────────────────────────────────────────────

interface SizeConfig {
  container: string     // w/h classes
  icon: number          // HabitIcon size
  radius: string        // border-radius class
  shadow: string        // box-shadow value
  hoverShadow: string   // box-shadow on hover
}

const SIZES: Record<string, SizeConfig> = {
  xs: {
    container: 'h-4 w-4',
    icon: 10,
    radius: 'rounded',
    shadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 3px rgba(0,0,0,0.2)',
    hoverShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 6px rgba(0,0,0,0.25)',
  },
  sm: {
    container: 'h-8 w-8',
    icon: 16,
    radius: 'rounded-lg',
    shadow: 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.2)',
    hoverShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.25), 0 3px 10px rgba(0,0,0,0.3)',
  },
  md: {
    container: 'h-12 w-12',
    icon: 22,
    radius: 'rounded-xl',
    shadow: 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.2)',
    hoverShadow: 'inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.25), 0 4px 14px rgba(0,0,0,0.3)',
  },
  lg: {
    container: 'h-14 w-14',
    icon: 24,
    radius: 'rounded-2xl',
    shadow: 'inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)',
    hoverShadow: 'inset 0 2px 0 rgba(255,255,255,0.45), inset 0 -2px 0 rgba(0,0,0,0.3), 0 6px 20px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.2)',
  },
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface ItemIconBadgeProps {
  item: ShopItem
  size?: 'xs' | 'sm' | 'md' | 'lg'
  groupColor?: string
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export const ItemIconBadge = memo(function ItemIconBadge({
  item, size = 'lg', groupColor, className, onClick,
}: ItemIconBadgeProps) {
  const cfg = SIZES[size]
  const typeColor = getItemTypeColor(item)
  // Hierarchy: item type color first (if not default gray), then group color, then fallback
  const baseColor = (typeColor !== '#9ca3af' ? typeColor : null) ?? groupColor ?? typeColor

  const style = useMemo(() => ({
    background: `linear-gradient(145deg, ${baseColor}ee, ${baseColor}99)`,
    boxShadow: cfg.shadow,
  }), [baseColor, cfg.shadow])

  if (item.iconImage) {
    return (
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden transition-all duration-300 shrink-0',
          cfg.container, cfg.radius,
          onClick && 'cursor-pointer',
          className,
        )}
        style={{
          boxShadow: cfg.shadow,
        }}
        onClick={onClick}
      >
        <img src={item.iconImage} alt="" className="h-full w-full object-cover" style={{ imageRendering: 'auto' }} />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden transition-all duration-300 shrink-0',
        'text-white',
        cfg.container, cfg.radius,
        onClick && 'cursor-pointer hover:scale-105',
        className,
      )}
      style={style}
      onClick={onClick}
    >
      <HabitIcon iconName={getItemIcon(item)} size={cfg.icon} />
    </div>
  )
})
