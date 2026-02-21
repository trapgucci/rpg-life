import { useState, useEffect } from 'react'
import FloatingReward from './FloatingReward'

export interface RewardNotification {
  id: string
  type: 'coins' | 'gems'
  amount: number
}

let showRewardCallback: ((reward: Omit<RewardNotification, 'id'>) => void) | null = null

export function showReward(type: 'coins' | 'gems', amount: number) {
  if (showRewardCallback) {
    showRewardCallback({ type, amount })
  }
}

export default function RewardNotifications() {
  const [rewards, setRewards] = useState<RewardNotification[]>([])

  useEffect(() => {
    showRewardCallback = (reward) => {
      const id = crypto.randomUUID()
      setRewards((prev) => [...prev, { ...reward, id }])
    }

    return () => {
      showRewardCallback = null
    }
  }, [])

  const handleComplete = (id: string) => {
    setRewards((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <>
      {rewards.map((reward) => (
        <FloatingReward
          key={reward.id}
          type={reward.type}
          amount={reward.amount}
          onComplete={() => handleComplete(reward.id)}
        />
      ))}
    </>
  )
}
