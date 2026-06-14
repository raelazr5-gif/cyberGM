import { useEffect, useState } from 'react'
import { playerService } from '../services/playerService'
import type { Player } from '../types/player'

export const usePlayer = (userId?: string) => {
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const loadPlayer = async () => {
      setLoading(true)
      const { data, error } = await playerService.getPlayer(userId)

      if (error) {
        setError(error)
      } else {
        setPlayer(data as Player)
      }

      setLoading(false)
    }

    loadPlayer()

    // Subscribe untuk real-time updates
    const subscription = playerService.subscribeToPlayer(userId, (updatedPlayer) => {
      setPlayer(updatedPlayer)
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [userId])

  return { player, loading, error }
}
