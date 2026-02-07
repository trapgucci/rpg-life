import { useEffect } from 'react'

interface FloatingRewardProps {
  type: 'coins' | 'gems'
  amount: number
  onComplete: () => void
}

export default function FloatingReward({ type, amount, onComplete }: FloatingRewardProps) {
  useEffect(() => {
    const target = document.querySelector(`[data-currency="${type}"]`) as HTMLElement | null
    if (!target) {
      onComplete()
      return
    }

    // Add the pulse-grow animation class
    target.classList.add('currency-reward-pulse')

    const timer = setTimeout(() => {
      target.classList.remove('currency-reward-pulse')
      onComplete()
    }, 600)

    return () => {
      clearTimeout(timer)
      target.classList.remove('currency-reward-pulse')
    }
  }, [type, onComplete])

  // This component renders nothing visible — it only triggers the animation on the Layout currency icon
  return null
}
