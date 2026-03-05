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
  const gap = 5
  const height = 100
  const maxMood = 5

  return (
    <div className="overflow-x-auto">
      <svg
        width={data.length * (barWidth + gap) + 8}
        height={height + 30}
        className="block"
      >
        <defs>
          {data.map((d) => {
            if (!d.mood) return null
            const color = MOOD_CONFIG[d.mood].color
            return (
              <linearGradient key={`grad-${d.dateKey}`} id={`bar-${d.dateKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                <stop offset="100%" stopColor={color} stopOpacity={0.5} />
              </linearGradient>
            )
          })}
        </defs>
        {data.map((d, i) => {
          const x = i * (barWidth + gap) + 4
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
                rx={barWidth / 4}
                fill="var(--border)"
                opacity={0.2}
              />
              {/* Mood bar with gradient */}
              {d.mood && (
                <>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    rx={barWidth / 4}
                    fill={`url(#bar-${d.dateKey})`}
                  >
                    <title>{MOOD_CONFIG[d.mood].label}</title>
                  </rect>
                  {/* Inset highlight */}
                  <rect
                    x={x + 1}
                    y={y + 1}
                    width={barWidth - 2}
                    height={Math.max(0, barH - 2)}
                    rx={barWidth / 4 - 1}
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={0.5}
                  />
                  {/* Glow effect */}
                  <rect
                    x={x - 1}
                    y={y - 1}
                    width={barWidth + 2}
                    height={barH + 2}
                    rx={barWidth / 4 + 1}
                    fill="none"
                    stroke={color}
                    strokeWidth={0.5}
                    opacity={0.3}
                  />
                </>
              )}
              {/* Emoji on top */}
              {d.mood && (
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
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
