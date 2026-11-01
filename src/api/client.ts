const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5000'

export const TOKEN_KEY = 'agentic-commerce:token'
// Disparado quando a API recusa o token; o AuthContext escuta e encerra a sessão.
export const SESSION_EXPIRED_EVENT = 'agentic-commerce:sessao-expirada'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    // Erros por campo, no formato {"campo": "problema"} que a API devolve em "detalhes".
    public readonly details?: Record<string, string>,
    // Corpo inteiro da resposta, para erros com dados a mais (ex.: os motivos de um 422).
    public readonly body?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// GET /health: 200 com {"status": "ok", "banco": "ok"}; sem banco, a API responde 503.
export type Health = { status: string; banco: string }

export function getHealth() {
  return apiRequest<Health>('/health')
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

export async function apiRequest<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const token = window.localStorage.getItem(TOKEN_KEY)
  const headers = new Headers(init.headers)

  headers.set('Accept', 'application/json')
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Tente novamente em instantes.', 0)
  }

  const hasJson = response.headers.get('content-type')?.includes('application/json')
  const payload = hasJson ? await response.json() : undefined

  if (!response.ok) {
    // O 401 com detalhes.senha é a senha errada na aprovação: a pessoa continua logada para tentar de novo.
    // Qualquer outro 401 (token ausente, inválido ou vencido) encerra a sessão.
    if (response.status === 401 && token && !payload?.detalhes?.senha) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    const message = payload?.erro || 'Não foi possível concluir a solicitação.'
    throw new ApiError(message, response.status, payload?.detalhes, payload)
  }

  return payload as T
}
