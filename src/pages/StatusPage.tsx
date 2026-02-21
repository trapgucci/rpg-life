import { useRpgStore } from '../store/useRpgStore'
import { xpForLevelStandard } from '../types/domain'
import { 
  Zap, Target, Flame, TrendingUp, Award, 
  CheckCircle2, Coins, Hammer, Activity, Sparkles 
} from 'lucide-react'
import { cn } from '../lib/cn'

// ─── Radar Chart Component ──────────────────────────────────────────────────

interface RadarChartProps {
  data: { label: string; value: number; max: number; color: string; icon: string }[]
}

function RadarChart({ data }: RadarChartProps) {
  const size = 280
  const center = size / 2
  const radius = 100
  const levels = 5

  const angleSlice = (Math.PI * 2) / data.length

  const getPoint = (index: number, value: number, max: number) => {
    const angle = angleSlice * index - Math.PI / 2
    const r = (value / max) * radius
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    }
  }

  const pathPoints = data
    .map((d, i) => getPoint(i, d.value, d.max))
    .map((p) => `${p.x},${p.y}`)
    .join(' ')

  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Grid circles */}
        {[...Array(levels)].map((_, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={(radius / levels) * (i + 1)}
            fill="none"
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity={0.5}
          />
        ))}

        {/* Axis lines */}
        {data.map((_, i) => {
          const angle = angleSlice * i - Math.PI / 2
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="var(--border)"
              strokeWidth="1"
              opacity={0.5}
            />
          )
        })}

        {/* Data polygon */}
        <polygon
          points={pathPoints}
          fill="url(#radarGradient)"
          stroke="url(#radarGradient)"
          strokeWidth="2"
          filter="url(#glow)"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const point = getPoint(i, d.value, d.max)
          return (
            <g key={i}>
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill={d.color}
                stroke="white"
                strokeWidth="2"
                filter="url(#glow)"
              />
            </g>
          )
        })}

        {/* Labels */}
        {data.map((d, i) => {
          const angle = angleSlice * i - Math.PI / 2
          const labelRadius = radius + 35
          const x = center + labelRadius * Math.cos(angle)
          const y = center + labelRadius * Math.sin(angle)
          return (
            <g key={`label-${i}`}>
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="20"
              >
                {d.icon}
              </text>
              <text
                x={x}
                y={y + 18}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--fg-muted)"
                fontSize="10"
                fontWeight="500"
              >
                Ур. {d.value}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Attribute Card Component ───────────────────────────────────────────────

interface AttributeCardProps {
  icon: string
  name: string
  level: number
  currentXp: number
  requiredXp: number
  color: string
}

function AttributeCard({ icon, name, level, currentXp, requiredXp, color }: AttributeCardProps) {
  const progress = requiredXp > 0 ? (currentXp / requiredXp) * 100 : 0

  return (
    <div className="glass-card rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl shadow-lg"
          style={{ 
            background: `linear-gradient(135deg, ${color}40, ${color}20)`,
            boxShadow: `0 4px 12px ${color}30`
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--fg)] truncate">{name}</h3>
            <span
              className="text-sm font-bold"
              style={{ color }}
            >
              Ур. {level}
            </span>
          </div>
          <div className="mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}cc)`
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-[var(--fg-muted)]">
              <span>{currentXp.toLocaleString('ru-RU')} XP</span>
              <span>{requiredXp.toLocaleString('ru-RU')} XP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Stat Card Component ────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  color: string
}

function StatCard({ icon, label, value, subValue, color }: StatCardProps) {
  return (
    <div className="glass-card rounded-2xl p-4 text-center transition-all duration-200 hover:scale-[1.02]">
      <div
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl mb-3"
        style={{ 
          background: `linear-gradient(135deg, ${color}30, ${color}15)`,
          color 
        }}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold text-[var(--fg)]">{value}</p>
      <p className="text-xs text-[var(--fg-muted)] mt-1">{label}</p>
      {subValue && <p className="text-xs text-[var(--accent)] mt-0.5">{subValue}</p>}
    </div>
  )
}

// ─── Main Status Page ───────────────────────────────────────────────────────

export default function StatusPage() {
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const stats = useRpgStore((s) => s.stats)
  
  const profile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null
  const attributes = profile?.attributes ?? []

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-[var(--accent-subtle)] mb-4">
            <Sparkles className="h-8 w-8 text-[var(--accent)]" />
          </div>
          <p className="text-[var(--fg-muted)]">Загрузка...</p>
        </div>
      </div>
    )
  }

  const xpForNext = xpForLevelStandard(profile.level + 1) - xpForLevelStandard(profile.level)
  const profileProgress = xpForNext > 0 ? (profile.xp / xpForNext) * 100 : 0

  const radarData = attributes.slice(0, 6).map((attr) => ({
    label: attr.name,
    value: attr.level,
    max: Math.max(attr.level + 5, 10),
    color: attr.color,
    icon: attr.icon,
  }))

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--fg)]">Статус персонажа</h1>
          <p className="text-sm text-[var(--fg-muted)]">Ваш прогресс и достижения</p>
        </div>
      </div>

      {/* Profile overview */}
      <div className="glass-card rounded-3xl p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
          <div className="relative shrink-0">
            <div className="flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-4xl md:text-5xl shadow-2xl shadow-purple-500/30">
              👤
            </div>
            <div className="absolute -bottom-2 -right-2 flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-xs md:text-sm font-bold text-white shadow-lg">
              {profile.level}
            </div>
          </div>
          <div className="flex-1 w-full text-center sm:text-left">
            <h2 className="text-xl md:text-2xl font-bold text-[var(--fg)]">{profile.name}</h2>
            <div className="mt-1 flex items-center justify-center sm:justify-start gap-2">
              <span className="badge badge-accent text-sm">Уровень {profile.level}</span>
              <span className="text-sm text-[var(--fg-muted)]">
                {profile.xp.toLocaleString('ru-RU')} / {xpForNext.toLocaleString('ru-RU')} XP
              </span>
            </div>
            <div className="mt-3">
              <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${profileProgress}%`,
                    background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)'
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">
                Осталось {(xpForNext - profile.xp).toLocaleString('ru-RU')} XP до следующего уровня
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          icon={<CheckCircle2 className="h-6 w-6" />}
          label="Задач выполнено"
          value={stats.totalTasksCompleted}
          color="#10b981"
        />
        <StatCard
          icon={<Flame className="h-6 w-6" />}
          label="Streak"
          value={stats.currentStreak}
          subValue={`Рекорд: ${stats.bestStreak}`}
          color="#f59e0b"
        />
        <StatCard
          icon={<Coins className="h-6 w-6" />}
          label="Монет заработано"
          value={stats.totalCoinsEarned.toLocaleString('ru-RU')}
          color="#eab308"
        />
        <StatCard
          icon={<Hammer className="h-6 w-6" />}
          label="Предметов скрафчено"
          value={stats.totalItemsCrafted}
          color="#8b5cf6"
        />
      </div>

      {/* Radar chart & attributes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar */}
        {radarData.length >= 3 && (
          <div className="glass-card rounded-3xl p-6 flex flex-col items-center">
            <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">Диаграмма навыков</h3>
            <RadarChart data={radarData} />
          </div>
        )}

        {/* Attributes list */}
        <div className="glass-card rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-[var(--fg)] mb-4">Атрибуты</h3>
          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
            {attributes.map((attr) => {
              const required = xpForLevelStandard(attr.level + 1) - xpForLevelStandard(attr.level)
              return (
                <AttributeCard
                  key={attr.id}
                  icon={attr.icon}
                  name={attr.name}
                  level={attr.level}
                  currentXp={attr.current_xp}
                  requiredXp={required}
                  color={attr.color}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
