import { apiRequest } from './client'

export type User = {
  id: string
  nome: string
  email: string
}

type AuthResponse = {
  token: string
  usuario?: User
  user?: User
}

const demoMode = import.meta.env.VITE_USE_MOCK_API !== 'false' && import.meta.env.DEV

function demoUser(name: string, email: string): AuthResponse {
  return {
    token: 'demo-token-local',
    usuario: { id: 'demo', nome: name, email },
  }
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  if (demoMode) {
    await new Promise((resolve) => window.setTimeout(resolve, 450))
    if (!email || !password) throw new Error('Preencha e-mail e senha.')
    return demoUser('Davi', email)
  }

  return apiRequest<AuthResponse>('/sessoes', {
    method: 'POST',
    body: { email, senha: password },
  })
}

export async function signUp(name: string, email: string, password: string): Promise<AuthResponse> {
  if (demoMode) {
    await new Promise((resolve) => window.setTimeout(resolve, 450))
    return demoUser(name, email)
  }

  await apiRequest('/usuarios', {
    method: 'POST',
    body: { nome: name, email, senha: password },
  })
  return signIn(email, password)
}
