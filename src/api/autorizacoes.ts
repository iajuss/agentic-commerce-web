import { demoMode } from './auth'
import { ApiError, apiRequest } from './client'
import { demoId, nowIso, recordDemoEvent, wait } from './demo'
import { demoFindRequest, demoSetRequestStatus, type PurchaseRequest } from './solicitacoes'

// Contrato em docs/contrato-api.md (POST /solicitacoes/{id}/autorizacoes e /autorizacoes).

// A API grava ativa, usada ou revogada; "expirada" é a ativa que passou do horário (a tela calcula).
export type AuthorizationStatus = 'ativa' | 'usada' | 'revogada' | 'expirada'

export type AuthorizationOrigin = 'manual' | 'automatica'

// Cópia do item aprovado: o pedido usa exatamente estes itens e preços.
export type AuthorizedItem = { id_externo: string; titulo: string; preco: number; quantidade: number; loja: string }

// Autorização limitada à cesta aprovada: valor, lojas e itens fixos, uso único e validade curta.
export type Authorization = {
  id: string
  solicitacao_id: string
  origem: AuthorizationOrigin
  politica_id: string | null
  valor_maximo: number
  lojas: string[]
  itens: AuthorizedItem[]
  status: AuthorizationStatus
  expira_em: string
  criada_em: string
  atualizada_em: string
}

// Quanto tempo a autorização vale (AUTORIZACAO_VALIDADE_MINUTOS da API). A tela só avisa antes.
export const AUTHORIZATION_TTL_MINUTES = 15

// Sempre pede a senha: a compra automática não passa por aqui, ela acontece no POST /solicitacoes.
export function createAuthorization(requestId: string, password: string) {
  if (demoMode) return demo.create(requestId, password)
  return apiRequest<Authorization>(`/solicitacoes/${requestId}/autorizacoes`, { method: 'POST', body: { senha: password } })
}

// GET /autorizacoes: só as ativas e no prazo, da mais recente para a mais antiga.
export function listAuthorizations() {
  if (demoMode) return demo.list()
  return apiRequest<Authorization[]>('/autorizacoes')
}

export function revokeAuthorization(id: string) {
  if (demoMode) return demo.revoke(id)
  return apiRequest<void>(`/autorizacoes/${id}`, { method: 'DELETE' })
}

// A API filtra as vencidas, mas a tela não espera por ela: passou do horário, já não vale.
export function effectiveStatus(authorization: Pick<Authorization, 'status' | 'expira_em'>, now = Date.now()): AuthorizationStatus {
  if (authorization.status === 'ativa' && new Date(authorization.expira_em).getTime() <= now) return 'expirada'
  return authorization.status
}

export function itemCount(items: Pick<AuthorizedItem, 'quantidade'>[]) {
  return items.reduce((sum, item) => sum + item.quantidade, 0)
}

// Na aprovação, o 401 com detalhes.senha é a senha errada (a sessão continua; veja apiRequest).
export function isWrongPassword(caught: unknown) {
  return caught instanceof ApiError && caught.status === 401 && Boolean(caught.details?.senha)
}

// 422: nenhuma política permite a cesta. Os motivos vêm em detalhes.motivos.
export function policyReasons(caught: unknown): string[] | null {
  if (!(caught instanceof ApiError) || caught.status !== 422) return null
  const body = caught.body as { detalhes?: { motivos?: unknown } } | undefined
  const reasons = body?.detalhes?.motivos
  return Array.isArray(reasons) ? reasons.filter((reason): reason is string => typeof reason === 'string') : []
}

// ---- Modo de demonstração ----------------------------------------------------------------

// Simula a senha errada sem precisar de conta: qualquer outra senha aprova.
export const DEMO_WRONG_PASSWORD = 'senhaerrada'

const demoAuthorizations: Authorization[] = []

// Mesmo caso de uso do backend (servicos.emitir_autorizacao): troca o status de forma atômica e emite.
export function demoEmitAuthorization(request: PurchaseRequest, origem: AuthorizationOrigin) {
  if (!demoSetRequestStatus(request.id, 'aguardando_aprovacao', 'aprovada')) {
    throw new ApiError('Esta solicitação não está aguardando aprovação.', 409)
  }
  const now = nowIso()
  const authorization: Authorization = {
    id: demoId(),
    solicitacao_id: request.id,
    origem,
    politica_id: request.avaliacao.politica_id,
    valor_maximo: request.cesta.total,
    lojas: [...request.cesta.lojas],
    itens: request.itens.flatMap((item) => item.recomendada
      ? [{ id_externo: item.recomendada.id_externo, titulo: item.recomendada.titulo, preco: item.recomendada.preco, quantidade: item.quantidade, loja: item.recomendada.loja }]
      : []),
    status: 'ativa',
    expira_em: nowIso(AUTHORIZATION_TTL_MINUTES),
    criada_em: now,
    atualizada_em: now,
  }
  demoAuthorizations.push(authorization)
  recordDemoEvent('autorizacao_emitida', { tipo: 'autorizacao', id: authorization.id }, { origem })
  return authorization
}

// Uso único: marca como usada só se estiver ativa e no prazo (usado pelo POST /pedidos do demo).
export function demoConsumeAuthorization(id: string) {
  const authorization = demoAuthorizations.find((item) => item.id === id)
  if (!authorization) throw new ApiError('Autorização não encontrada.', 404)
  if (effectiveStatus(authorization) !== 'ativa') throw new ApiError('Autorização expirada, revogada ou já usada.', 409)
  authorization.status = 'usada'
  authorization.atualizada_em = nowIso()
  return structuredClone(authorization)
}

const demo = {
  async list() {
    await wait()
    return demoAuthorizations
      .filter((item) => effectiveStatus(item) === 'ativa')
      .sort((a, b) => b.criada_em.localeCompare(a.criada_em))
      .map((item) => structuredClone(item))
  },
  async revoke(id: string) {
    await wait()
    const authorization = demoAuthorizations.find((item) => item.id === id)
    if (!authorization) throw new ApiError('Autorização não encontrada.', 404)
    if (authorization.status === 'usada') throw new ApiError('Esta autorização já foi usada em um pedido.', 409)
    if (authorization.status === 'revogada') return
    authorization.status = 'revogada'
    authorization.atualizada_em = nowIso()
    demoSetRequestStatus(authorization.solicitacao_id, 'aprovada', 'aguardando_aprovacao')
    recordDemoEvent('autorizacao_revogada', { tipo: 'autorizacao', id })
  },
  async create(requestId: string, password: string) {
    await wait(700)
    if (!password) throw new ApiError('Aprovação inválida.', 400, { senha: 'Informe a senha.' })
    const request = demoFindRequest(requestId)
    if (request.status !== 'aguardando_aprovacao') throw new ApiError('Esta solicitação não está aguardando aprovação.', 409)
    if (password === DEMO_WRONG_PASSWORD) {
      recordDemoEvent('reautenticacao_recusada', { tipo: 'solicitacao', id: requestId })
      throw new ApiError('Senha incorreta.', 401, { senha: 'Senha incorreta. Confira e tente de novo.' })
    }
    if (!request.avaliacao.permitida) {
      throw new ApiError('Nenhuma política permite esta compra.', 422, undefined, { detalhes: { motivos: request.avaliacao.motivos } })
    }
    return structuredClone(demoEmitAuthorization(request, 'manual'))
  },
}
