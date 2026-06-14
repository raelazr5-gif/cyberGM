# Supabase Integration Guide

## Setup yang sudah dilakukan:

1. ✅ Install `@supabase/supabase-js`
2. ✅ Membuat `.env.local` dengan Supabase credentials
3. ✅ Membuat `supabaseClient.ts` untuk koneksi Supabase
4. ✅ Membuat `authService.ts` dengan fungsi authentication
5. ✅ Membuat komponen `LoginForm` dan `SignupForm`
6. ✅ Membuat hook `useAuth` untuk manage auth state

---

## Cara Menggunakan

### 1. **Gunakan LoginForm & SignupForm di App.tsx**

```tsx
import { LoginForm } from './components/Auth/LoginForm'
import { SignupForm } from './components/Auth/SignupForm'
import { useAuth } from './hooks/useAuth'

function App() {
  const { user, loading } = useAuth()

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {user ? (
        <div>
          <h1>Welcome, {user.email}!</h1>
          <button onClick={() => authService.signOut()}>Logout</button>
        </div>
      ) : (
        <div>
          <LoginForm />
          <SignupForm />
        </div>
      )}
    </div>
  )
}

export default App
```

### 2. **Gunakan authService langsung**

```typescript
import { authService } from './services/authService'

// Login
const { data, error } = await authService.signIn('user@example.com', 'password')

// Logout
await authService.signOut()

// Get current user
const { data } = await authService.getCurrentUser()
console.log(data.user)
```

### 3. **Gunakan useAuth Hook**

```tsx
import { useAuth } from './hooks/useAuth'

function UserProfile() {
  const { user, loading } = useAuth()

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <h2>{user?.email}</h2>
    </div>
  )
}
```

---

## Environment Variables

File `.env.local` sudah dibuat dengan format:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxx
```

**⚠️ PENTING:** Jangan commit `.env.local` ke Git! Tambahkan ke `.gitignore`:
```
.env.local
.env
```

---

## API yang Tersedia di authService

| Fungsi | Deskripsi |
|--------|-----------|
| `signUp(email, password, username)` | Register user baru |
| `signIn(email, password)` | Login user |
| `signOut()` | Logout user |
| `getCurrentUser()` | Get user yang sedang login |
| `onAuthStateChange(callback)` | Listen perubahan auth state |
| `resetPassword(email)` | Reset password |

---

## Langkah Berikutnya (Optional)

### 1. **Simpan Player Data ke Supabase Database**

Buat tabel `players` di Supabase dengan kolom:
- `id` (UUID)
- `user_id` (UUID, foreign key ke auth.users)
- `username` (text)
- `level` (int)
- `exp` (int)
- `credits` (int)
- dst...

Kemudian update `authService.ts` untuk simpan data player:

```typescript
async createPlayerProfile(userId: string, username: string) {
  const { data, error } = await supabase
    .from('players')
    .insert([{
      user_id: userId,
      username,
      level: 1,
      exp: 0,
      credits: 500,
      // ... field lainnya
    }])
  return { data, error }
}
```

### 2. **Real-time Updates**

Untuk live leaderboard atau multiplayer:

```typescript
supabase
  .from('players')
  .on('*', payload => {
    console.log('Update:', payload)
  })
  .subscribe()
```

---

## Troubleshooting

### Error: "Supabase URL dan key tidak ditemukan"
- Pastikan `.env.local` sudah dibuat dengan credentials yang benar
- Restart dev server: `npm run dev`

### Error: "Email already registered"
- Email sudah terdaftar di Supabase
- Gunakan email lain atau reset password

### Error: "Invalid login credentials"
- Email atau password salah
- Pastikan user sudah terverifikasi (cek email)

---

## Testing

Coba login dengan email test account yang sudah dibuat di Supabase dashboard.

Atau daftar akun baru -> cek email untuk verifikasi -> login dengan akun itu.

Good luck! 🚀
