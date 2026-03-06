import { useState } from 'react'
import { KeyRound, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { licenseService } from '../lib/licenseService'

interface LicenseGateProps {
  onActivated: () => void
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code: 'Неверный код активации',
  already_used: 'Этот код уже использован на другом устройстве',
  network_error: 'Нет подключения к интернету. Для активации нужен одноразовый доступ к сети',
  missing_fields: 'Введите код активации',
  unknown_error: 'Произошла ошибка, попробуйте позже',
}

export default function LicenseGate({ onActivated }: LicenseGateProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const formatCode = (input: string) => {
    // Auto-format: RPGL-XXXX-XXXX-XXXX
    const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const parts: string[] = []
    // First part: RPGL (4 chars)
    if (clean.length > 0) parts.push(clean.slice(0, 4))
    if (clean.length > 4) parts.push(clean.slice(4, 8))
    if (clean.length > 8) parts.push(clean.slice(8, 12))
    if (clean.length > 12) parts.push(clean.slice(12, 16))
    return parts.join('-')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setCode(formatCode(e.target.value))
  }

  const handleActivate = async () => {
    if (!code.trim()) return
    setLoading(true)
    setError(null)

    const result = await licenseService.activate(code)

    if (result.ok) {
      setSuccess(true)
      setTimeout(() => onActivated(), 1200)
    } else {
      setError(ERROR_MESSAGES[result.error || 'unknown_error'] || ERROR_MESSAGES.unknown_error)
    }

    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleActivate()
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-2xl p-8">
        {!success ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] mb-5">
              <KeyRound className="h-8 w-8 text-[var(--accent)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--fg)] mb-2">
              Активация RPG Life
            </h2>
            <p className="text-sm text-[var(--fg-muted)] mb-6 max-w-[320px]">
              Введите код активации для использования приложения. Код одноразовый и привязывается к вашему устройству.
            </p>

            <input
              type="text"
              value={code}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="RPGL-XXXX-XXXX-XXXX"
              maxLength={19}
              disabled={loading}
              autoFocus
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-center text-lg font-mono tracking-wider text-[var(--fg)] placeholder:text-[var(--fg-muted)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] disabled:opacity-50"
            />

            {error && (
              <div className="flex items-center gap-2 mt-3 text-sm text-red-500">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleActivate}
              disabled={loading || code.length < 19}
              className="btn-primary w-full py-3 mt-5 flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Проверка...
                </>
              ) : (
                'Активировать'
              )}
            </button>

            <p className="text-xs text-[var(--fg-muted)] mt-4 opacity-60">
              Для активации требуется подключение к интернету
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 mb-5">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-[var(--fg)] mb-2">
              Активация успешна!
            </h2>
            <p className="text-sm text-[var(--fg-muted)]">
              Приложение готово к использованию
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
