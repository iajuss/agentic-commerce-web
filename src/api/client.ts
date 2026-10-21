const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5000'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown }

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = window.localStorage.getItem('agentic-commerce:token')
  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const hasJson = response.headers.get('content-type')?.includes('application/json')
  const payload = hasJson ? await response.json() : undefined

  if (!response.ok) {
    const message = payload?.message || payload?.erro || 'Não foi possível concluir a solicitação.'
    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}
