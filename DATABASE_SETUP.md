# Database Integration - SQL Setup

Copy-paste SQL commands ini ke Supabase SQL Editor untuk setup database:

## 1. Create players table

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  fullname TEXT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT,
  spec TEXT, -- 'analyst', 'hacker', etc.
  level INTEGER DEFAULT 1,
  exp INTEGER DEFAULT 0,
  exp_needed INTEGER DEFAULT 100,
  hp INTEGER DEFAULT 100,
  max_hp INTEGER DEFAULT 100,
  stamina INTEGER DEFAULT 100,
  max_stamina INTEGER DEFAULT 100,
  credits INTEGER DEFAULT 500,
  skill_points INTEGER DEFAULT 0,
  learned_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  inventory TEXT[] DEFAULT ARRAY[]::TEXT[],
  completed_missions TEXT[] DEFAULT ARRAY[]::TEXT[],
  unlocked_achievements TEXT[] DEFAULT ARRAY[]::TEXT[],
  streak INTEGER DEFAULT 0,
  research_data JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS (Row Level Security)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only see their own data
CREATE POLICY "Users can view their own player data"
  ON players FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own player data"
  ON players FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own player data"
  ON players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow anyone to view leaderboard (but not modify)
CREATE POLICY "Allow public leaderboard viewing"
  ON players FOR SELECT
  USING (true);
```

## 2. Create index untuk performance

```sql
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_players_level ON players(level DESC);
CREATE INDEX idx_players_exp ON players(exp DESC);
```

## 3. Create function untuk update timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at BEFORE UPDATE
  ON players FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Struktur research_data (JSONB)

```json
{
  "totalSessions": 0,
  "missionsCompleted": 0,
  "totalCorrect": 0,
  "totalWrong": 0,
  "falsePositive": 0,
  "falseNegative": 0,
  "responseTimes": [],
  "fastestResponse": 999,
  "decisionLog": [],
  "threatTypeStats": {
    "phishing": 0,
    "social": 0,
    "web": 0,
    "malware": 0,
    "scam": 0
  },
  "threatTypeCorrect": {
    "phishing": 0,
    "social": 0,
    "web": 0,
    "malware": 0,
    "scam": 0
  },
  "shopPurchases": 0
}
```

---

## Cara Menggunakan di Code

### 1. Create player baru saat signup

```typescript
import { authService } from './services/authService'
import { playerService } from './services/playerService'

async function handleSignup(email: string, password: string, username: string) {
  // Sign up
  const { data: authData, error: authError } = await authService.signUp(email, password, username)

  if (!authError && authData.user) {
    // Create player profile
    await playerService.upsertPlayer(authData.user.id, {
      name: username,
      avatar: '🕵️',
      spec: 'analyst',
      level: 1,
      exp: 0,
      expNeeded: 100,
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      credits: 500,
    })
  }
}
```

### 2. Load player saat login

```typescript
import { useAuth } from './hooks/useAuth'
import { usePlayer } from './hooks/usePlayer'

function GameApp() {
  const { user } = useAuth()
  const { player, loading } = usePlayer(user?.id)

  if (loading) return <div>Loading player data...</div>

  return (
    <div>
      <h1>{player?.name}</h1>
      <p>Level: {player?.level}</p>
      <p>EXP: {player?.exp}/{player?.expNeeded}</p>
      <p>Credits: {player?.credits}</p>
    </div>
  )
}
```

### 3. Update player stats

```typescript
// Update exp dan level
await playerService.updatePlayerStats(userId, {
  exp: currentExp + 50,
})

// Add item to inventory
await playerService.addInventoryItem(userId, 'sword_01')

// Complete mission
await playerService.completeMission(userId, 'mission_01')

// Unlock achievement
await playerService.unlockAchievement(userId, 'achievement_first_mission')
```

### 4. Show leaderboard

```typescript
import { PlayerLeaderboard } from './components/PlayerLeaderboard'

function App() {
  return (
    <div>
      <PlayerLeaderboard limit={10} />
    </div>
  )
}
```

---

## Real-time Updates

Player data akan auto-update jika ada perubahan dari device lain (karena subscribeToPlayer).

Contoh: jika player bermain di mobile, HP dan stamina akan real-time update di desktop juga.

---

## Migrasi Data Lama (Optional)

Jika ingin import data dari `players.json` ke Supabase:

1. Buka Supabase SQL Editor
2. Run query ini:

```sql
INSERT INTO players (user_id, name, avatar, spec, level, exp, exp_needed, hp, max_hp, stamina, max_stamina, credits, skill_points, learned_skills, inventory, completed_missions, unlocked_achievements, streak, research_data)
VALUES (
  'USER_UUID_HERE',
  'player_name',
  '🕵️',
  'analyst',
  1,
  0,
  100,
  100,
  100,
  100,
  100,
  500,
  2,
  ARRAY[]::TEXT[],
  ARRAY['s6', 's7', 's8']::TEXT[],
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  0,
  '{"totalSessions": 0, "missionsCompleted": 0}'::JSONB
);
```

Ganti `USER_UUID_HERE` dengan UUID user yang ada di `auth.users` table.

---

Good luck! 🚀
