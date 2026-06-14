// Player types/interfaces
export interface ThreatTypeStats {
  phishing: number
  social: number
  web: number
  malware: number
  scam: number
}

export interface ResearchData {
  totalSessions: number
  missionsCompleted: number
  totalCorrect: number
  totalWrong: number
  falsePositive: number
  falseNegative: number
  responseTimes: number[]
  fastestResponse: number
  decisionLog: any[]
  threatTypeStats: ThreatTypeStats
  threatTypeCorrect: ThreatTypeStats
  shopPurchases: number
}

export interface Player {
  id?: string // UUID dari Supabase
  user_id?: string // UUID dari auth.users
  username: string
  fullname: string
  email: string
  name: string
  avatar: string
  spec: string // 'analyst', 'hacker', etc.
  level: number
  exp: number
  exp_needed: number
  hp: number
  max_hp: number
  stamina: number
  max_stamina: number
  credits: number
  skill_points: number
  learned_skills: string[]
  inventory: string[]
  completed_missions: string[]
  unlocked_achievements: string[]
  streak: number
  research_data: ResearchData
  created_at?: string
  updated_at?: string
}

export interface PlayerStats {
  totalPlayers: number
  averageLevel: number
  topPlayers: Player[]
  recentUpdates: Player[]
}
