import { useState } from 'react'
import { cn } from '../../lib/cn'
import { X } from 'lucide-react'
import { ITEM_EMOJI_OPTIONS } from './shopUtils'

interface EmojiPickerModalProps {
  currentIcon: string
  onSelect: (emoji: string) => void
  onClose: () => void
}

export default function EmojiPickerModal({ currentIcon, onSelect, onClose }: EmojiPickerModalProps) {
  const [custom, setCustom] = useState('')

  const handlePick = (emoji: string) => {
    if (emoji) {
      onSelect(emoji)
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-[var(--fg)]">Выберите иконку</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3 max-h-40 overflow-y-auto">
          {ITEM_EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handlePick(emoji)}
              className={cn(
                'h-10 w-10 rounded-xl text-xl transition-all flex items-center justify-center',
                currentIcon === emoji ? 'bg-[var(--accent)] scale-110' : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Вставьте любой эмодзи..."
            className="input flex-1 h-9 text-base"
            maxLength={4}
          />
          <button
            type="button"
            onClick={() => handlePick(custom.trim())}
            disabled={!custom.trim()}
            className="btn-primary shrink-0"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
