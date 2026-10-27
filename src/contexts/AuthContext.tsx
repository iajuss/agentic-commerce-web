import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { demoMode, signIn, signUp, type AuthResponse, type User } from '../api/auth'
import { SESSION_EXPIRED_EVENT, TOKEN_KEY } from '../api/client'

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  // Atualiza nome e e-mail exibidos depois de salvar o perfil, sem novo login.
  updateUser: (changes: Partial<User>) => void
}

const STORAGE_KEY = 'agentic-commerce:user'
const AuthContext = createContext<AuthContextValue | null>(null)

function tokenExpired(token: string) {
  if (demoMode) return false
  try {
    // O JWT é base64url; o campo exp está em segundos.
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

function clearSession() {
  window.localStorage.removeItem(STORAGE_KEY)
  window.localStorage.removeItem(TOKEN_KEY)
}

function readStoredUser(): User | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const token = window.localStorage.getItem(TOKEN_KEY)
    if (!stored || !token || tokenExpired(token)) {
      clearSession()
      return null
    }
    return JSON.parse(stored) as User
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser)

  useEffect(() => {
    function handleExpired() {
      clearSession()
      setUser(null)
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired)
  }, [])

  function saveSession({ usuario, token }: AuthResponse) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(usuario))
    window.localStorage.setItem(TOKEN_KEY, token)
    setUser(usuario)
  }

  async function login(email: string, password: string) {
    saveSession(await signIn(email, password))
  }

  async function register(name: string, email: string, password: string) {
    saveSession(await signUp(name, email, password))
  }

  function logout() {
    clearSession()
    setUser(null)
  }

  function updateUser(changes: Partial<User>) {
    setUser((current) => {
      if (!current) return current
      const next = { ...current, ...changes }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, register, logout, updateUser }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  return context
}
