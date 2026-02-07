import { useState, useLayoutEffect, useEffect } from 'react'
import { X, Coins, Gem, Package, Info } from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import { CURRENCY_IDS } from '../types/domain'

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
  const [animatedOpen, setAnimatedOpen] = useState(false)
  const getCraftRecipes = useRpgStore((s) => s.getCraftRecipes)
  const recipes = getCraftRecipes()

  useLayoutEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => setAnimatedOpen(true))
      return () => cancelAnimationFrame(id)
    }
    setAnimatedOpen(false)
  }, [isOpen])

  useEffect(() => {
    if (!animatedOpen && isOpen) {
      const t = setTimeout(onClose, 300)
      return () => clearTimeout(t)
    }
  }, [animatedOpen, isOpen, onClose])

  const handleClose = () => setAnimatedOpen(false)

  if (!isOpen) return null

  return (
    <>
      <div
        role="presentation"
        onClick={handleClose}
        className={cn(
          'fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300',
          animatedOpen ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Настройка вознаграждений"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-white dark:bg-[var(--surface-overlay)] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out max-h-[70vh] overflow-hidden flex flex-col',
          animatedOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--fg)]">Вознаграждения</h2>
          <button
            type="button"
            onClick={handleClose}
            className="icon-btn h-9 w-9 shrink-0 rounded-full p-0 text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 pb-6 pt-4 overflow-y-auto space-y-6">
          {/* Деньги */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--fg)] mb-3 flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" />
              Деньги
            </h3>
            <div className="space-y-3">
              {/* Монеты */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
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
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
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
            <h3 className="text-sm font-semibold text-[var(--fg)] mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-500" />
              Фрагменты
            </h3>
            <div className="rounded-xl border border-[var(--border)] bg-blue-500/5 p-4">
              <div className="flex items-start gap-3 mb-3">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
                  Настроить получение фрагментов можно в окне <span className="font-semibold text-[var(--fg)]">Предметы → Фрагменты</span>
                </p>
              </div>
              {recipes.length > 0 ? (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
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
      </div>
    </>
  )
}
