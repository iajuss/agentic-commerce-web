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
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = window.localStorage.getItem(TOKEN_KEY)
  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Tente novamente em instantes.', 0)
  }

  const hasJson = response.headers.get('content-type')?.includes('application/json')
  const payload = hasJson ? await response.json() : undefined

  if (!response.ok) {
    if (response.status === 401 && token) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    const message = payload?.erro || 'Não foi possível concluir a solicitação.'
    throw new ApiError(message, response.status, payload?.detalhes)
  }

  return payload as T
}
