import { useMemo, useState } from 'react'
import { useRpgStore } from '../store/useRpgStore'
import { xpForLevelStandard } from '../types/domain'
import {
  CheckCircle2, Coins, Hammer,
  Gem, Sparkles, TrendingUp, ShieldCheck
} from 'lucide-react'

// ─── Title by level ────────────────────────────────────────────────────────

const RANKS = [
  { title: 'Новичок',       minLevel: 1,  color: '#9ca3af', icon: '🌱' },
  { title: 'Подмастерье',   minLevel: 5,  color: '#8b5cf6', icon: '🔨' },
  { title: 'Следопыт',      minLevel: 10, color: '#06b6d4', icon: '🧭' },
  { title: 'Воин',          minLevel: 15, color: '#ef4444', icon: '⚔️' },
  { title: 'Ветеран',       minLevel: 20, color: '#10b981', icon: '🛡️' },
  { title: 'Эксперт',       minLevel: 25, color: '#3b82f6', icon: '🎯' },
  { title: 'Мастер',        minLevel: 30, color: '#6366f1', icon: '👑' },
  { title: 'Грандмастер',   minLevel: 40, color: '#a855f7', icon: '🏆' },
  { title: 'Легенда',       minLevel: 50, color: '#f59e0b', icon: '⭐' },
] as const

function getTitleByLevel(level: number): string {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (level >= RANKS[i].minLevel) return RANKS[i].title
  }
  return RANKS[0].title
}

function getTitleColor(level: number): string {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (level >= RANKS[i].minLevel) return RANKS[i].color
  }
  return RANKS[0].color
}

// ─── Ranks Modal ───────────────────────────────────────────────────────────

function RanksModal({ currentLevel, onClose }: { currentLevel: number; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="neu-card relative z-10 w-full max-w-sm p-5 animate-[scale-in_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--fg)]">Ранги</h3>
          <button
            onClick={onClose}
            className="text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors text-lg leading-none px-1"
          >
            &times;
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {RANKS.map((rank, i) => {
            const isActive = currentLevel >= rank.minLevel
            const isCurrent = getTitleByLevel(currentLevel) === rank.title
            return (
              <div
                key={rank.title}
                className="neu-convex flex items-center gap-3 p-3 transition-all duration-200"
                style={{
                  opacity: isActive ? 1 : 0.4,
                  ...(isCurrent ? {
                    boxShadow: `4px 4px 10px var(--neu-shadow-dark), -3px -3px 8px var(--neu-shadow-light), inset 0 1px 0 var(--neu-inset-item-light), 0 0 16px ${rank.color}25`,
                    border: `1px solid ${rank.color}30`,
                  } : {}),
                }}
              >
                <span className="text-xl w-8 text-center">{rank.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: isActive ? rank.color : 'var(--fg-muted)' }}
                    >
                      {rank.title}
                    </span>
                    {isCurrent && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: `${rank.color}20`, color: rank.color }}
                      >
                        СЕЙЧАС
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--fg-muted)]">
                    {rank.minLevel === 1 ? 'Начальный ранг' : `Уровень ${rank.minLevel}+`}
                  </span>
                </div>
                {isActive ? (
                  <span className="text-sm" style={{ color: rank.color }}>✓</span>
                ) : (
                  <span className="text-[10px] text-[var(--fg-muted)]">
                    ещё {rank.minLevel - currentLevel} ур.
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Radar Chart ───────────────────────────────────────────────────────────

interface RadarChartProps {
  data: { label: string; value: number; max: number; color: string; icon: string }[]
}

function RadarChart({ data }: RadarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const count = data.length
  // Scale down for many attributes so labels don't overlap
  const radius = count <= 6 ? 140 : count <= 8 ? 120 : count <= 10 ? 105 : 90
  const padding = count <= 6 ? 65 : count <= 8 ? 58 : 52
  const labelFontSize = count <= 6 ? 20 : count <= 8 ? 17 : 14
  const levelFontSize = count <= 6 ? 10 : count <= 8 ? 9 : 8
  const levels = 5
  const center = radius + padding
  const size = center * 2

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
    <div className="relative flex items-center justify-center w-full">
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${size} ${size}`}
        style={{ maxWidth: size, overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <filter id="pointGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background glow */}
        <circle cx={center} cy={center} r={radius + 10} fill="url(#radarBg)" />

        {/* Grid polygons */}
        {[...Array(levels)].map((_, lvl) => {
          const r = (radius / levels) * (lvl + 1)
          const pts = data
            .map((_, i) => {
              const angle = angleSlice * i - Math.PI / 2
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`
            })
            .join(' ')
          return (
            <polygon
              key={lvl}
              points={pts}
              fill="none"
              stroke="var(--border)"
              strokeWidth="0.8"
              opacity={0.4 + lvl * 0.05}
            />
          )
        })}

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
              strokeWidth="0.8"
              opacity={0.3}
            />
          )
        })}

        {/* Data polygon with pulse */}
        <polygon
          points={pathPoints}
          fill="url(#radarFill)"
          stroke="url(#radarStroke)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          className="radar-fill-pulse"
          filter="url(#softGlow)"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const point = getPoint(i, d.value, d.max)
          const isHovered = hoveredIndex === i
          return (
            <g key={i}>
              {/* Outer glow ring */}
              <circle
                cx={point.x}
                cy={point.y}
                r={isHovered ? 14 : 10}
                fill={d.color}
                opacity={isHovered ? 0.2 : 0.1}
                style={{ transition: 'all 0.3s ease' }}
              />
              {/* Point */}
              <circle
                cx={point.x}
                cy={point.y}
                r={isHovered ? 7 : 5}
                fill={d.color}
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="2"
                filter="url(#pointGlow)"
                style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          )
        })}

        {/* Labels */}
        {data.map((d, i) => {
          const angle = angleSlice * i - Math.PI / 2
          const labelRadius = radius + (count <= 6 ? 44 : count <= 8 ? 38 : 34)
          const x = center + labelRadius * Math.cos(angle)
          const y = center + labelRadius * Math.sin(angle)
          const isHovered = hoveredIndex === i
          return (
            <g
              key={`label-${i}`}
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <text
                x={x}
                y={y - 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={isHovered ? labelFontSize + 4 : labelFontSize}
                style={{ transition: 'font-size 0.3s ease' }}
              >
                {d.icon}
              </text>
              <text
                x={x}
                y={y + (count <= 6 ? 17 : 14)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isHovered ? d.color : 'var(--fg-muted)'}
                fontSize={levelFontSize}
                fontWeight="600"
                style={{ transition: 'fill 0.3s ease' }}
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

// ─── Stat Pill ─────────────────────────────────────────────────────────────

interface StatPillProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  color: string
}

function StatPill({ icon, label, value, subValue, color }: StatPillProps) {
  return (
    <div className="neu-pill p-4 flex items-center gap-3">
      <div
        className="neu-icon-well flex h-11 w-11 shrink-0 items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${color}18, ${color}08)`,
          color,
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-[var(--fg)] leading-tight">{value}</p>
        <p className="text-xs text-[var(--fg-muted)] truncate">{label}</p>
        {subValue && (
          <p className="text-[10px] font-medium mt-0.5" style={{ color }}>
            {subValue}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Attribute Slot ────────────────────────────────────────────────────────

interface AttributeSlotProps {
  icon: string
  name: string
  attrKey: string
  level: number
  currentXp: number
  requiredXp: number
  color: string
}

function AttributeSlot({ icon, name, attrKey, level, currentXp, requiredXp, color }: AttributeSlotProps) {
  const progress = requiredXp > 0 ? Math.min((currentXp / requiredXp) * 100, 100) : 0

  return (
    <div className="neu-convex p-3.5 transition-all duration-200 hover:translate-y-[-1px]">
      <div className="flex items-center gap-3">
        {/* Icon well */}
        <div
          className="neu-icon-well flex h-12 w-12 shrink-0 items-center justify-center text-2xl"
          style={{
            background: `linear-gradient(145deg, ${color}20, ${color}0a)`,
            boxShadow: `inset 2px 2px 6px var(--neu-item-dark), inset -1px -1px 4px var(--neu-item-light), 0 0 12px ${color}15`,
          }}
        >
          {icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[var(--fg)]">{name}</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  background: `${color}15`,
                  color,
                }}
              >
                {attrKey}
              </span>
            </div>
            <span
              className="text-sm font-bold"
              style={{ color }}
            >
              {level}
            </span>
          </div>

          {/* Progress */}
          <div className="neu-progress-track h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full attr-bar-animate relative"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${color}cc, ${color})`,
                boxShadow: `0 0 8px ${color}50`,
              }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 60%)',
                }}
              />
            </div>
          </div>

          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[var(--fg-muted)]">
              {currentXp.toLocaleString('ru-RU')} XP
            </span>
            <span className="text-[10px] text-[var(--fg-muted)]">
              {requiredXp.toLocaleString('ru-RU')} XP
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Status Page ──────────────────────────────────────────────────────

export default function StatusPage() {
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const stats = useRpgStore((s) => s.stats)
  const [showRanks, setShowRanks] = useState(false)

  const profile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null
  const attributes = profile?.attributes ?? []

  const dominantClass = useMemo(() => {
    if (!attributes.length) return null
    const sorted = [...attributes].sort((a, b) => {
      const totalA = xpForLevelStandard(a.level) + a.current_xp
      const totalB = xpForLevelStandard(b.level) + b.current_xp
      return totalB - totalA
    })
    return sorted[0]
  }, [attributes])

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="neu-convex flex h-16 w-16 mx-auto items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-[var(--accent)]" />
          </div>
          <p className="text-[var(--fg-muted)]">Загрузка...</p>
        </div>
      </div>
    )
  }

  const xpForNext = xpForLevelStandard(profile.level + 1) - xpForLevelStandard(profile.level)
  const profileProgress = xpForNext > 0 ? Math.min((profile.xp / xpForNext) * 100, 100) : 0
  const title = getTitleByLevel(profile.level)
  const titleColor = getTitleColor(profile.level)

  const totalXpEarned = useMemo(() => {
    return xpForLevelStandard(profile.level) + profile.xp
  }, [profile.level, profile.xp])

  const radarData = attributes.map((attr) => ({
    label: attr.name,
    value: attr.level,
    max: Math.max(attr.level + 5, 10),
    color: attr.color,
    icon: attr.icon,
  }))

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto pb-6">

      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div className="neu-card status-glow p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="neu-avatar flex h-24 w-24 md:h-28 md:w-28 items-center justify-center text-5xl md:text-6xl"
              style={{
                background: 'linear-gradient(145deg, var(--surface-elevated), var(--surface))',
              }}
            >
              {dominantClass?.icon ?? '👤'}
            </div>
            {/* Level badge */}
            <div
              className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${titleColor}, ${titleColor}cc)`,
                boxShadow: `0 4px 12px ${titleColor}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
              }}
            >
              {profile.level}
            </div>
          </div>

          {/* Profile info */}
          <div className="flex-1 w-full text-center sm:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--fg)]">{profile.name}</h1>

            <div className="mt-1.5 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              {/* Title badge */}
              <button
                onClick={() => setShowRanks(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all duration-200 hover:scale-105"
                style={{
                  background: `${titleColor}18`,
                  color: titleColor,
                  boxShadow: `inset 0 0 12px ${titleColor}10`,
                }}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {title}
              </button>

            </div>

            {/* XP Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[var(--fg-secondary)]">
                  Уровень {profile.level}
                </span>
                <span className="text-xs text-[var(--fg-muted)]">
                  {profile.xp.toLocaleString('ru-RU')} / {xpForNext.toLocaleString('ru-RU')} XP
                </span>
              </div>
              <div className="neu-progress-track h-3.5 overflow-hidden">
                <div
                  className="status-xp-bar h-full rounded-full relative"
                  style={{ width: `${profileProgress}%` }}
                >
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 50%)',
                    }}
                  />
                </div>
              </div>
              <p className="mt-1 text-[10px] text-[var(--fg-muted)]">
                Осталось {(xpForNext - profile.xp).toLocaleString('ru-RU')} XP до уровня {profile.level + 1}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatPill
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Задач выполнено"
          value={stats.totalTasksCompleted}
          color="#10b981"
        />
        {dominantClass && (
          <StatPill
            icon={<span className="text-lg leading-none">{dominantClass.icon}</span>}
            label="Топ атрибут"
            value={`${dominantClass.name}`}
            subValue={`Ур. ${dominantClass.level}`}
            color={dominantClass.color}
          />
        )}
        <StatPill
          icon={<Coins className="h-5 w-5" />}
          label="Монет заработано"
          value={stats.totalCoinsEarned.toLocaleString('ru-RU')}
          color="#eab308"
        />
        <StatPill
          icon={<Gem className="h-5 w-5" />}
          label="Кристаллов заработано"
          value={stats.totalGemsEarned}
          color="#8b5cf6"
        />
        <StatPill
          icon={<Hammer className="h-5 w-5" />}
          label="Скрафчено"
          value={stats.totalItemsCrafted}
          color="#06b6d4"
        />
        <StatPill
          icon={<TrendingUp className="h-5 w-5" />}
          label="Общий опыт"
          value={totalXpEarned.toLocaleString('ru-RU')}
          subValue="XP"
          color="#6366f1"
        />
      </div>

      {/* ── Radar Chart & Attributes ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Radar */}
        {radarData.length >= 3 && (
          <div className="neu-card p-5 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="text-base font-semibold text-[var(--fg)]">Диаграмма навыков</h3>
            </div>
            <div className="flex-1 flex items-center justify-center w-full py-2">
              <RadarChart data={radarData} />
            </div>
          </div>
        )}

        {/* Attributes */}
        <div className="neu-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-base font-semibold text-[var(--fg)]">Атрибуты</h3>
          </div>
          <div className="flex flex-col gap-2.5 max-h-[440px] overflow-y-auto pr-1">
            {attributes.map((attr) => {
              const required = xpForLevelStandard(attr.level + 1) - xpForLevelStandard(attr.level)
              return (
                <AttributeSlot
                  key={attr.id}
                  icon={attr.icon}
                  name={attr.name}
                  attrKey={attr.key}
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

      {showRanks && (
        <RanksModal currentLevel={profile.level} onClose={() => setShowRanks(false)} />
      )}
    </div>
  )
}
