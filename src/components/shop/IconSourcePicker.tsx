import { Smile, ImagePlus } from 'lucide-react'

interface IconSourcePickerProps {
  onSelectIcon: () => void
  onSelectPhoto: () => void
  onClose: () => void
}

export default function IconSourcePicker({ onSelectIcon, onSelectPhoto, onClose }: IconSourcePickerProps) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-xs">
        <p className="text-sm font-semibold text-[var(--fg)] mb-3">Выбрать иконку</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onSelectIcon}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)]">
              <Smile className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--fg)]">Выбрать иконку</p>
              <p className="text-xs text-[var(--fg-muted)]">Из набора Lucide</p>
            </div>
          </button>
          <button
            type="button"
            onClick={onSelectPhoto}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
              <ImagePlus className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--fg)]">Своё фото</p>
              <p className="text-xs text-[var(--fg-muted)]">Загрузить изображение</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
