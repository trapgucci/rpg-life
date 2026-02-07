import { Coins, Gem, Package, Info, Minus, Plus } from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import Modal from './Modal'

interface TaskRewardsModalProps {
  isOpen: boolean
  coinReward: number
  gemReward: number
  onUpdateCoins: (value: number) => void
  onUpdateGems: (value: number) => void
  onClose: () => void
}

export default function TaskRewardsModal({
  isOpen,
  coinReward,
  gemReward,
  onUpdateCoins,
  onUpdateGems,
  onClose,
}: TaskRewardsModalProps) {
  const getCraftRecipes = useRpgStore((s) => s.getCraftRecipes)
  const recipes = getCraftRecipes()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title="Вознаграждения"
      showCloseButton
      closeOnBackdropClick
      closeOnEscape
    >
      <div className="px-4 pb-4 pt-3 overflow-y-auto space-y-5">
        {/* Валюта */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
            </div>
            Валюта
          </h3>
          <div className="space-y-3">
            {/* Монеты */}
            <div className={cn(
              'rounded-xl border p-3.5 transition-all',
              coinReward > 0
                ? 'border-amber-400/40 bg-gradient-to-r from-amber-500/5 to-amber-400/10'
                : 'border-[var(--border)] bg-[var(--surface)]'
            )}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                  coinReward > 0
                    ? 'bg-amber-500/20'
                    : 'bg-[var(--surface-elevated)]'
                )}>
                  <Coins className={cn(
                    'h-4 w-4 transition-colors',
                    coinReward > 0 ? 'text-amber-500' : 'text-[var(--fg-muted)]'
                  )} />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-[var(--fg)]">Монеты</span>
                </div>
                {coinReward > 0 && (
                  <span className="text-xs font-bold text-amber-500 bg-amber-500/10 rounded-md px-2 py-0.5">
                    +{coinReward}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateCoins(Math.max(0, coinReward - 10))}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all active:scale-90',
                    coinReward > 0
                      ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                      : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)] hover:bg-[var(--surface-overlay)]'
                  )}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={0}
                  value={coinReward}
                  onChange={(e) => onUpdateCoins(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="input flex-1 text-center h-10 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => onUpdateCoins(coinReward + 10)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 transition-all active:scale-90"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Кристаллы */}
            <div className={cn(
              'rounded-xl border p-3.5 transition-all',
              gemReward > 0
                ? 'border-cyan-400/40 bg-gradient-to-r from-cyan-500/5 to-cyan-400/10'
                : 'border-[var(--border)] bg-[var(--surface)]'
            )}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                  gemReward > 0
                    ? 'bg-cyan-500/20'
                    : 'bg-[var(--surface-elevated)]'
                )}>
                  <Gem className={cn(
                    'h-4 w-4 transition-colors',
                    gemReward > 0 ? 'text-cyan-500' : 'text-[var(--fg-muted)]'
                  )} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-[var(--fg)]">Кристаллы</span>
                </div>
                {gemReward > 0 && (
                  <span className="text-xs font-bold text-cyan-500 bg-cyan-500/10 rounded-md px-2 py-0.5">
                    +{gemReward}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateGems(Math.max(0, gemReward - 1))}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all active:scale-90',
                    gemReward > 0
                      ? 'bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20'
                      : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)] hover:bg-[var(--surface-overlay)]'
                  )}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={0}
                  value={gemReward}
                  onChange={(e) => onUpdateGems(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="input flex-1 text-center h-10 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => onUpdateGems(gemReward + 1)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-white shadow-md shadow-cyan-500/25 hover:bg-cyan-600 transition-all active:scale-90"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Фрагменты */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-2 flex items-center gap-2">
            <Package className="h-4 w-4 text-purple-500" />
            Фрагменты
          </h3>
          <div className="rounded-xl border border-[var(--border)] bg-blue-500/5 p-3">
            <div className="flex items-start gap-3 mb-3">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
                Настроить получение фрагментов можно в окне <span className="font-semibold text-[var(--fg)]">Предметы → Фрагменты</span>
              </p>
            </div>
            {recipes.length > 0 ? (
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {recipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg"
                      style={{ backgroundColor: `${recipe.fragmentColor}20` }}
                    >
                      {recipe.fragmentIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--fg)] truncate">
                        {recipe.fragmentName}
                      </p>
                      <p className="text-xs text-[var(--fg-muted)]">
                        {recipe.fragmentsCollected}/{recipe.fragmentsRequired}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--fg-muted)] text-center py-3">
                Фрагментов пока нет
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
