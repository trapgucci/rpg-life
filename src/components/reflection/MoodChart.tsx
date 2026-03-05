import { useMemo, useRef, useState, useEffect } from 'react'
import { MOOD_CONFIG, type MoodLevel, type DailyReport } from '../../types/domain'

interface MoodChartProps {
  reports: DailyReport[]
  days?: number
}

export default function MoodChart({ reports, days = 14 }: MoodChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setContainerWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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
      <div ref={containerRef} className="flex items-center justify-center py-8 text-sm text-[var(--fg-muted)]">
        Нет данных о настроении
      </div>
    )
  }

  const padding = 4
  const availableWidth = Math.max(containerWidth - padding * 2, 0)
  const gap = Math.max(2, Math.min(5, availableWidth / data.length * 0.2))
  const barWidth = Math.max(4, (availableWidth - gap * (data.length - 1)) / data.length)
  const height = 100
  const maxMood = 5
  const svgWidth = containerWidth || data.length * 20
  const svgHeight = height + 30

  return (
    <div ref={containerRef} className="w-full">
      {containerWidth > 0 && (
        <svg
          width={svgWidth}
          height={svgHeight}
          className="block"
        >
          <defs>
            {data.map((d) => {
              if (!d.mood) return null
              const color = MOOD_CONFIG[d.mood].color
              return (
                <linearGradient key={`grad-${d.dateKey}`} id={`bar-${d.dateKey}-${days}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                </linearGradient>
              )
            })}
          </defs>
          {data.map((d, i) => {
            const x = padding + i * (barWidth + gap)
            const barH = d.mood ? (d.mood / maxMood) * height : 0
            const y = height - barH
            const color = d.mood ? MOOD_CONFIG[d.mood].color : '#374151'
            const rx = Math.min(barWidth / 4, 6)
            const showLabel = barWidth >= 10 || i % Math.ceil(10 / Math.max(barWidth, 1)) === 0

            return (
              <g key={d.dateKey}>
                {/* Background bar */}
                <rect
                  x={x}
                  y={0}
                  width={barWidth}
                  height={height}
                  rx={rx}
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
                      rx={rx}
                      fill={`url(#bar-${d.dateKey}-${days})`}
                    >
                      <title>{MOOD_CONFIG[d.mood].label}</title>
                    </rect>
                    {/* Inset highlight */}
                    <rect
                      x={x + 1}
                      y={y + 1}
                      width={Math.max(0, barWidth - 2)}
                      height={Math.max(0, barH - 2)}
                      rx={Math.max(0, rx - 1)}
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
                      rx={rx + 1}
                      fill="none"
                      stroke={color}
                      strokeWidth={0.5}
                      opacity={0.3}
                    />
                  </>
                )}
                {/* Emoji on top */}
                {d.mood && barWidth >= 10 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    fontSize={Math.min(10, barWidth * 0.8)}
                  >
                    {MOOD_CONFIG[d.mood].emoji}
                  </text>
                )}
                {/* Day label */}
                {showLabel && (
                  <text
                    x={x + barWidth / 2}
                    y={height + 16}
                    textAnchor="middle"
                    fontSize={Math.min(10, barWidth * 0.9)}
                    fill="var(--fg-muted)"
                  >
                    {d.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}
