import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { signIn, signUp, type User } from '../api/auth'

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const STORAGE_KEY = 'agentic-commerce:user'
const TOKEN_KEY = 'agentic-commerce:token'
const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): User | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser)

  function saveSession(nextUser: User, token: string) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
    window.localStorage.setItem(TOKEN_KEY, token)
    setUser(nextUser)
  }

  async function login(email: string, password: string) {
    const response = await signIn(email, password)
    const nextUser = response.usuario ?? response.user
    if (!nextUser) throw new Error('A API não devolveu os dados do usuário.')
    saveSession(nextUser, response.token)
  }

  async function register(name: string, email: string, password: string) {
    const response = await signUp(name, email, password)
    const nextUser = response.usuario ?? response.user
    if (!nextUser) throw new Error('A API não devolveu os dados do usuário.')
    saveSession(nextUser, response.token)
  }

  function logout() {
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, register, logout }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  return context
}
