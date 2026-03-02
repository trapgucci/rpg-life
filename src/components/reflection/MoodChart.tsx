import { useMemo } from 'react'
import { MOOD_CONFIG, type MoodLevel, type DailyReport } from '../../types/domain'

interface MoodChartProps {
  reports: DailyReport[]
  days?: number
}

export default function MoodChart({ reports, days = 14 }: MoodChartProps) {
  const data = useMemo(() => {
    const today = new Date()
    const result: { dateKey: string; label: string; mood: MoodLevel | null }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const report = reports.find((r) => r.dateKey === key)
      result.push({
        dateKey: key,
        label: `${d.getDate()}`,
        mood: report?.mood ?? null,
      })
    }
    return result
  }, [reports, days])

  const hasData = data.some((d) => d.mood !== null)

  if (!hasData) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-[var(--fg-muted)]">
        Нет данных о настроении
      </div>
    )
  }

  const barWidth = Math.max(16, Math.min(32, Math.floor(400 / days)))
  const height = 100
  const maxMood = 5

  return (
    <div className="overflow-x-auto">
      <svg
        width={data.length * (barWidth + 4) + 8}
        height={height + 28}
        className="block"
      >
        {data.map((d, i) => {
          const x = i * (barWidth + 4) + 4
          const barH = d.mood ? (d.mood / maxMood) * height : 0
          const y = height - barH
          const color = d.mood ? MOOD_CONFIG[d.mood].color : '#374151'

          return (
            <g key={d.dateKey}>
              {/* Background bar */}
              <rect
                x={x}
                y={0}
                width={barWidth}
                height={height}
                rx={4}
                fill="var(--border)"
                opacity={0.3}
              />
              {/* Mood bar */}
              {d.mood && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={4}
                  fill={color}
                  opacity={0.8}
                >
                  <title>{MOOD_CONFIG[d.mood].label}</title>
                </rect>
              )}
              {/* Emoji on top */}
              {d.mood && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={10}
                >
                  {MOOD_CONFIG[d.mood].emoji}
                </text>
              )}
              {/* Day label */}
              <text
                x={x + barWidth / 2}
                y={height + 16}
                textAnchor="middle"
                fontSize={10}
                fill="var(--fg-muted)"
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
