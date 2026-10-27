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

// A rota ainda não existe na API (outra pessoa do grupo está fazendo): o Flask responde 404 ou 405.
// Só use em rotas de lista ou de "me"; num recurso com id, 404 também quer dizer "não encontrado".
export function isNotConnected(caught: unknown) {
  return caught instanceof ApiError && (caught.status === 404 || caught.status === 405)
}

async function apiIsUp() {
  try {
    return (await fetch(`${API_URL}/health`)).ok
  } catch {
    return false
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
    // Uma rota que ainda não existe responde 404 também ao preflight do CORS, e o navegador só
    // mostra "falha de rede". Se a API responde no /health, a falha foi a rota, não a conexão.
    if (await apiIsUp()) throw new ApiError('Esta parte ainda está sendo conectada.', 404)
    throw new ApiError('Não foi possível conectar ao servidor. Tente novamente em instantes.', 0)
  }

  const hasJson = response.headers.get('content-type')?.includes('application/json')
  const payload = hasJson ? await response.json() : undefined

  if (!response.ok) {
    // Um 401 com detalhes.senha é a senha errada na reautenticação (aprovar compra), não a
    // sessão vencida: a pessoa continua logada e tenta de novo.
    const wrongPassword = Boolean(payload?.detalhes?.senha)
    if (response.status === 401 && token && !wrongPassword) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    const message = payload?.erro || 'Não foi possível concluir a solicitação.'
    throw new ApiError(message, response.status, payload?.detalhes, payload)
  }

  return payload as T
}
