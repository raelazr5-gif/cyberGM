import React, { useState } from 'react'
import { authService } from '../../services/authService'
import { playerService } from '../../services/playerService'

export const SignupForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const [fullname, setFullname] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    const { data, error } = await authService.signUp(email, password, username, fullname)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data?.user) {
      setError('Terjadi kesalahan saat membuat akun. Coba lagi.')
      setLoading(false)
      return
    }

    const { data: playerData, error: playerError } = await playerService.upsertPlayer(data.user.id, {
      username,
      fullname,
      email,
      name: username,
      avatar: '🕵️',
      spec: 'analyst',
      level: 1,
      exp: 0,
      exp_needed: 100,
      hp: 100,
      max_hp: 100,
      stamina: 100,
      max_stamina: 100,
      credits: 500,
      skill_points: 2,
      learned_skills: [],
      inventory: ['s6', 's7', 's8'],
      completed_missions: [],
      unlocked_achievements: [],
      streak: 0,
      research_data: {
        totalSessions: 0,
        missionsCompleted: 0,
        totalCorrect: 0,
        totalWrong: 0,
        falsePositive: 0,
        falseNegative: 0,
        responseTimes: [],
        fastestResponse: 999,
        decisionLog: [],
        threatTypeStats: {
          phishing: 0,
          social: 0,
          web: 0,
          malware: 0,
          scam: 0,
        },
        threatTypeCorrect: {
          phishing: 0,
          social: 0,
          web: 0,
          malware: 0,
          scam: 0,
        },
        shopPurchases: 0,
      },
    })

    if (playerError) {
      setError(playerError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    console.log('Sign up berhasil:', data)
    console.log('Player profile dibuat:', playerData)
    setFullname('')
    setEmail('')
    setPassword('')
    setUsername('')
    onSuccess?.()
    setLoading(false)
  }

  return (
    <div className="signup-form">
      <h2>Daftar Akun</h2>
      <form onSubmit={handleSignup}>
        <div className="form-group">
          <label htmlFor="fullname">Full Name:</label>
          <input
            id="fullname"
            type="text"
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
            placeholder="Masukkan nama lengkap"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Pilih username"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Masukkan email Anda"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan password (min 6 karakter)"
            minLength={6}
            required
          />
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Mendaftar...' : 'Daftar'}
        </button>
      </form>
    </div>
  )
}
