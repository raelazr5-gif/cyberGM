import { supabase } from '../lib/supabaseClient'
import type { Player } from '../types/player'

export const playerService = {
  // Create atau update player profile
  async upsertPlayer(userId: string, playerData: Partial<Player>) {
    try {
      const { data, error } = await supabase
        .from('players')
        .upsert(
          {
            user_id: userId,
            ...playerData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()

      if (error) throw error
      return { data: data?.[0], error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Get player by user ID
  async getPlayer(userId: string) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Update player data
  async updatePlayer(userId: string, updates: Partial<Player>) {
    try {
      const { data, error } = await supabase
        .from('players')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Get leaderboard (top players by level/exp)
  async getLeaderboard(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, avatar, spec, level, exp, credits, created_at')
        .order('level', { ascending: false })
        .order('exp', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Update player stats (exp, hp, stamina, etc)
  async updatePlayerStats(userId: string, stats: {
    exp?: number
    hp?: number
    stamina?: number
    credits?: number
    level?: number
  }) {
    try {
      const { data: player, error: getError } = await supabase
        .from('players')
        .select('exp, level, exp_needed')
        .eq('user_id', userId)
        .single()

      if (getError) throw getError

      let newLevel = player.level
      let newExp = stats.exp !== undefined ? stats.exp : player.exp

      // Level up jika exp cukup
      if (newExp >= player.exp_needed) {
        newLevel = player.level + 1
        newExp = newExp - player.exp_needed
      }

      const { data, error } = await supabase
        .from('players')
        .update({
          ...stats,
          exp: newExp,
          level: newLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Add item to inventory
  async addInventoryItem(userId: string, itemId: string) {
    try {
      const { data: player, error: getError } = await supabase
        .from('players')
        .select('inventory')
        .eq('user_id', userId)
        .single()

      if (getError) throw getError

      const inventory = player.inventory || []
      if (!inventory.includes(itemId)) {
        inventory.push(itemId)
      }

      const { data, error } = await supabase
        .from('players')
        .update({ inventory, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Complete mission
  async completeMission(userId: string, missionId: string) {
    try {
      const { data: player, error: getError } = await supabase
        .from('players')
        .select('completed_missions, research_data')
        .eq('user_id', userId)
        .single()

      if (getError) throw getError

      const completedMissions = player.completed_missions || []
      if (!completedMissions.includes(missionId)) {
        completedMissions.push(missionId)
      }

      const researchData = player.research_data || {}
      researchData.missionsCompleted = (researchData.missionsCompleted || 0) + 1

      const { data, error } = await supabase
        .from('players')
        .update({
          completed_missions: completedMissions,
          research_data: researchData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Unlock achievement
  async unlockAchievement(userId: string, achievementId: string) {
    try {
      const { data: player, error: getError } = await supabase
        .from('players')
        .select('unlocked_achievements')
        .eq('user_id', userId)
        .single()

      if (getError) throw getError

      const achievements = player.unlocked_achievements || []
      if (!achievements.includes(achievementId)) {
        achievements.push(achievementId)
      }

      const { data, error } = await supabase
        .from('players')
        .update({
          unlocked_achievements: achievements,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Listen untuk real-time updates
  subscribeToPlayer(userId: string, callback: (player: Player) => void) {
    const subscription = supabase
      .from('players')
      .on('*', (payload) => {
        if (payload.new.user_id === userId) {
          callback(payload.new as Player)
        }
      })
      .subscribe()

    return subscription
  },
}
