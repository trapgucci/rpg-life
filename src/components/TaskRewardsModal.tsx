import { Coins, Package, Info } from 'lucide-react'
// import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
// import { CURRENCY_IDS } from '../types/domain'
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
      <div className="px-4 pb-4 pt-3 overflow-y-auto space-y-4">
        {/* Деньги */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-2 flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-500" />
            Деньги
          </h3>
          <div className="space-y-3">
            {/* Монеты */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">
                🪙 Монеты
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateCoins(Math.max(0, coinReward - 10))}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-elevated)]"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  value={coinReward}
                  onChange={(e) => onUpdateCoins(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="input flex-1 text-center h-10"
                />
                <button
                  type="button"
                  onClick={() => onUpdateCoins(coinReward + 10)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Гемы */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">
                💎 Кристаллы
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateGems(Math.max(0, gemReward - 1))}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-elevated)]"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  value={gemReward}
                  onChange={(e) => onUpdateGems(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="input flex-1 text-center h-10"
                />
                <button
                  type="button"
                  onClick={() => onUpdateGems(gemReward + 1)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                >
                  +
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
