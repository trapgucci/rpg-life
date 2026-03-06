import { useState } from 'react'
import { FolderOpen, Loader2, CheckCircle2 } from 'lucide-react'
import { vaultStorage } from '../lib/vaultStorage'

interface VaultSetupProps {
  onComplete: () => void
}

type SetupPhase = 'choose' | 'migrating' | 'done'

export default function VaultSetup({ onComplete }: VaultSetupProps) {
  const [phase, setPhase] = useState<SetupPhase>('choose')
  const [vaultPath, setVaultPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const migrateFromLocalStorage = async () => {
    const raw = localStorage.getItem('rpg-life-store-v2')
    if (!raw) return false

    try {
      const parsed = JSON.parse(raw)
      const state = parsed.state ?? parsed

      await Promise.all([
        vaultStorage.write('profile.json', {
          profiles: state.profiles ?? [],
          activeProfileId: state.activeProfileId ?? null,
        }),
        vaultStorage.write('settings.json', {
          settings: state.settings ?? {},
          activeShopDiscountPercent: state.activeShopDiscountPercent ?? null,
        }),
        vaultStorage.write('tasks.json', state.tasks ?? []),
        vaultStorage.write('task-groups.json', state.taskGroups ?? []),
        vaultStorage.write('shop-items.json', state.shopItems ?? []),
        vaultStorage.write('item-groups.json', state.itemGroups ?? []),
        vaultStorage.write('inventory.json', state.inventory ?? []),
        vaultStorage.write('achievements.json', state.achievements ?? []),
        vaultStorage.write('craft-recipes.json', state.craftRecipes ?? []),
        vaultStorage.write('purchase-history.json', state.purchaseHistory ?? []),
        vaultStorage.write('usage-history.json', state.usageHistory ?? []),
        vaultStorage.write('stats.json', state.stats ?? {}),
      ])

      // Clear old localStorage data after successful migration
      localStorage.removeItem('rpg-life-store-v2')
      return true
    } catch (err) {
      console.error('[vault] Migration failed:', err)
      return false
    }
  }

  const handleChoose = async () => {
    setError(null)
    try {
      const chosen = await vaultStorage.choosePath()
      if (!chosen) return // user canceled

      setPhase('migrating')
      const path = await vaultStorage.init(chosen)
      setVaultPath(path)

      // Migrate existing localStorage data if available
      if (vaultStorage.isElectron()) {
        await migrateFromLocalStorage()
      }

      setPhase('done')
    } catch (err) {
      setError(`Не удалось выбрать папку: ${err}`)
      setPhase('choose')
    }
  }

  const handleDone = () => {
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-2xl p-8">
        {phase === 'choose' && (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] mb-5">
              <FolderOpen className="h-8 w-8 text-[var(--accent)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--fg)] mb-2">
              Настройка хранилища
            </h2>
            <p className="text-sm text-[var(--fg-muted)] mb-8 max-w-[320px]">
              RPG Life хранит данные в папке на диске — читаемые JSON-файлы, которые можно копировать и бекапить.
            </p>

            {error && (
              <p className="text-sm text-red-500 mb-4">{error}</p>
            )}

            <button
              type="button"
              onClick={handleChoose}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 font-semibold"
            >
              <FolderOpen className="h-5 w-5" />
              Выбрать папку
            </button>

            <p className="text-xs text-[var(--fg-muted)] mt-4 opacity-60">
              Выберите, где хранить данные (по умолчанию откроется ~/Documents/RPGLife)
            </p>
          </div>
        )}

        {phase === 'migrating' && (
          <div className="flex flex-col items-center text-center py-8">
            <Loader2 className="h-10 w-10 text-[var(--accent)] animate-spin mb-4" />
            <h2 className="text-lg font-bold text-[var(--fg)] mb-2">
              Настройка хранилища...
            </h2>
            <p className="text-sm text-[var(--fg-muted)]">
              Переносим данные в файловое хранилище
            </p>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 mb-5">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-[var(--fg)] mb-2">
              Хранилище готово!
            </h2>
            {vaultPath && (
              <p className="text-sm text-[var(--fg-muted)] mb-6 font-mono break-all max-w-[320px]">
                {vaultPath}
              </p>
            )}
            <button
              type="button"
              onClick={handleDone}
              className="btn-primary w-full py-3 font-semibold"
            >
              Начать
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
