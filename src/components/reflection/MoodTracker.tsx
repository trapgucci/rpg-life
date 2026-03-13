import { cn } from '../../lib/cn'
import { MOOD_CONFIG, type MoodLevel } from '../../types/domain'

interface MoodTrackerProps {
  value: MoodLevel | null
  onChange: (mood: MoodLevel | null) => void
}

const LEVELS: MoodLevel[] = [1, 2, 3, 4, 5]

export default function MoodTracker({ value, onChange }: MoodTrackerProps) {
  return (
    <div className="flex items-center gap-3">
      {LEVELS.map((level) => {
        const cfg = MOOD_CONFIG[level]
        const isSelected = value === level
        return (
          <button
            key={level}
            onClick={() => onChange(isSelected ? null : level)}
            title={cfg.label}
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-all duration-200',
              isSelected
                ? 'scale-125'
                : 'opacity-40 hover:opacity-80 hover:scale-110',
            )}
            style={isSelected ? {
              background: `linear-gradient(145deg, ${cfg.color}30, ${cfg.color}15)`,
              boxShadow: `0 0 16px ${cfg.color}35, inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 8px ${cfg.color}20`,
              border: `1.5px solid ${cfg.color}40`,
            } : {
              background: 'var(--surface-elevated)',
              boxShadow: 'inset 0 1px 0 var(--neu-inset-light), 0 2px 4px var(--neu-shadow-dark)',
              border: '1px solid var(--border)',
            }}
          >
            {cfg.emoji}
          </button>
        )
      })}
    </div>
  )
}
