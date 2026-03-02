import { cn } from '../../lib/cn'
import { MOOD_CONFIG, type MoodLevel } from '../../types/domain'

interface MoodTrackerProps {
  value: MoodLevel | null
  onChange: (mood: MoodLevel) => void
}

const LEVELS: MoodLevel[] = [1, 2, 3, 4, 5]

export default function MoodTracker({ value, onChange }: MoodTrackerProps) {
  return (
    <div className="flex items-center gap-2">
      {LEVELS.map((level) => {
        const cfg = MOOD_CONFIG[level]
        const isSelected = value === level
        return (
          <button
            key={level}
            onClick={() => onChange(level)}
            title={cfg.label}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition-all duration-200',
              isSelected
                ? 'scale-125 shadow-lg ring-2'
                : 'opacity-50 hover:opacity-100 hover:scale-110',
            )}
            style={{
              backgroundColor: isSelected ? cfg.color + '20' : undefined,
              ringColor: isSelected ? cfg.color : undefined,
              boxShadow: isSelected ? `0 0 12px ${cfg.color}40` : undefined,
            }}
          >
            {cfg.emoji}
          </button>
        )
      })}
    </div>
  )
}
