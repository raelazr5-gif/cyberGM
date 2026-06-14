import React, { useState } from 'react'
import { playerService } from '../services/playerService'
import type { Player } from '../types/player'

export const PlayerLeaderboard: React.FC<{ limit?: number }> = ({ limit = 10 }) => {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    const loadLeaderboard = async () => {
      const { data, error } = await playerService.getLeaderboard(limit)
      if (!error && data) {
        setPlayers(data as Player[])
      }
      setLoading(false)
    }

    loadLeaderboard()
  }, [limit])

  if (loading) return <div>Loading leaderboard...</div>

  return (
    <div className="leaderboard">
      <h2>Leaderboard Top {limit}</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Avatar</th>
            <th>Name</th>
            <th>Spec</th>
            <th>Level</th>
            <th>EXP</th>
            <th>Credits</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr key={player.id}>
              <td>{index + 1}</td>
              <td>{player.avatar}</td>
              <td>{player.name}</td>
              <td>{player.spec}</td>
              <td>{player.level}</td>
              <td>{player.exp}</td>
              <td>{player.credits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
