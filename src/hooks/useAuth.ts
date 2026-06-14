import { useEffect, useState } from 'react'
import { authService } from '../services/authService'

export const useAuth = () => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get current user on mount
    const checkUser = async () => {
      const { data } = await authService.getCurrentUser()
      setUser(data?.user || null)
      setLoading(false)
    }

    checkUser()

    // Listen untuk perubahan auth state
    const subscription = authService.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => {
      if (subscription?.subscription) {
        subscription.subscription.unsubscribe()
      }
    }
  }, [])

  return { user, loading }
}
