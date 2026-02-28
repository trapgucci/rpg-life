import { Brain, Sparkles } from 'lucide-react'

export default function ReflectionPage() {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-6">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30">
          <Brain className="h-5 w-5 md:h-6 md:w-6 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-[var(--fg)]">Рефлексия</h1>
          <p className="text-xs md:text-sm text-[var(--fg-muted)]">
            Самоанализ и размышления
          </p>
        </div>
      </div>

      {/* Coming soon message */}
      <div className="flex flex-1 items-center justify-center">
        <div className="glass-card flex flex-col items-center justify-center rounded-2xl px-8 py-16 max-w-md text-center">
          <div className="mb-6 relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30">
              <Brain className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-[var(--fg)] mb-2">
            В следующем обновлении
          </h2>

          <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
            Раздел рефлексии находится в разработке. Скоро здесь появится возможность вести дневник, анализировать свой прогресс и ставить цели!
          </p>
        </div>
      </div>
    </div>
  )
}
