import { useGameStore } from '../store/useGameStore'

function Progress({ value, max, color }: { value: number; max: number; color: string }) {
  const width = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div style={{ background: 'rgba(255,255,255,0.12)', height: 8, borderRadius: 6, width: 120 }}>
      <div style={{ width: `${width}%`, height: '100%', background: color, borderRadius: 6 }} />
    </div>
  )
}

function CharacterBar() {
  const stats = useGameStore(s => s.character.stats)
  const xpForLevel = 100 + (stats.level - 1) * 50

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontWeight: 600 }}>Lv {stats.level}</span>
      <Progress value={stats.xp} max={xpForLevel} color="#7aa2f7" />
      <span style={{ fontSize: 12, opacity: 0.8 }}>{stats.xp}/{xpForLevel} XP</span>
      <Progress value={stats.hp} max={stats.maxHp} color="#f7768e" />
      <span style={{ fontSize: 12, opacity: 0.8 }}>{stats.hp}/{stats.maxHp} HP</span>
      <span style={{ marginLeft: 8 }}>🪙 {stats.gold}</span>
    </div>
  )
}

export default CharacterBar

