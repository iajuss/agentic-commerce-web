import { demoMode } from './auth'
import { ApiError, apiRequest } from './client'
import { demoId, nowIso, recordDemoEvent, wait } from './demo'
import { demoEvaluate, demoFindOffer, demoMarkApproved, offerTotal, type Offer } from './solicitacoes'

// Contrato em docs/contrato-api.md (POST /solicitacoes/{id}/autorizacoes).

export type AuthorizationStatus = 'ativa' | 'usada' | 'revogada' | 'expirada'

// Autorização limitada: vale para uma oferta, até um valor, numa loja e por pouco tempo.
export type Authorization = {
  id: string
  solicitacao_id: string
  oferta_id: string
  titulo: string
  valor_maximo: number
  loja: string
  politica_nome: string | null
  expira_em: string
  status: AuthorizationStatus
  automatica: boolean
  criada_em: string
}

// Quanto tempo a autorização vale depois de criada. A API decide; a tela só avisa antes.
export const AUTHORIZATION_TTL_MINUTES = 30

export function createAuthorization(requestId: string, offerId: string, password?: string) {
  if (demoMode) return demo.create(requestId, offerId, password)
  return apiRequest<Authorization>(`/solicitacoes/${requestId}/autorizacoes`, {
    method: 'POST',
    body: password === undefined ? { oferta_id: offerId } : { oferta_id: offerId, senha: password },
  })
}

// GET /autorizacoes: todas as da pessoa, da mais recente para a mais antiga.
export function listAuthorizations() {
  if (demoMode) return demo.list()
  return apiRequest<Authorization[]>('/autorizacoes')
}

export function revokeAuthorization(id: string) {
  if (demoMode) return demo.revoke(id)
  return apiRequest<void>(`/autorizacoes/${id}`, { method: 'DELETE' })
}

// A API marca a expiração, mas a tela não espera por ela: passou do horário, já não vale.
export function effectiveStatus(authorization: Authorization, now = Date.now()): AuthorizationStatus {
  if (authorization.status === 'ativa' && new Date(authorization.expira_em).getTime() <= now) return 'expirada'
  return authorization.status
}

// 401 com detalhes.senha: senha errada. A sessão continua (veja apiRequest).
export function isWrongPassword(caught: unknown) {
  return caught instanceof ApiError && caught.status === 401 && Boolean(caught.details?.senha)
}

// 422: a oferta não cabe mais nas políticas. Os motivos vêm em detalhes.motivos.
export function policyReasons(caught: unknown): string[] | null {
  if (!(caught instanceof ApiError) || caught.status !== 422) return null
  const body = caught.body as { detalhes?: { motivos?: unknown } } | undefined
  const reasons = body?.detalhes?.motivos
  return Array.isArray(reasons) ? reasons.filter((reason): reason is string => typeof reason === 'string') : []
}

// ---- Modo de demonstração ----------------------------------------------------------------

// Simula a senha errada sem precisar de conta: qualquer outra senha aprova.
export const DEMO_WRONG_PASSWORD = 'senhaerrada'

export const demoAuthorizations: Authorization[] = []

function seed(titulo: string, valor: number, loja: string, politica: string, status: AuthorizationStatus, automatic: boolean, minutesAgo: number) {
  const createdAt = nowIso(-minutesAgo)
  const authorization: Authorization = {
    // Exemplos sem solicitação na memória: a tela esconde o link "Ver solicitação".
    id: demoId(), solicitacao_id: '', oferta_id: demoId(), titulo, valor_maximo: valor, loja, politica_nome: politica,
    expira_em: nowIso(-minutesAgo + AUTHORIZATION_TTL_MINUTES), status, automatica: automatic, criada_em: createdAt,
  }
  demoAuthorizations.push(authorization)
  recordDemoEvent(automatic ? 'compra.automatica' : 'autorizacao.criada', automatic ? 'agente' : 'voce',
    automatic ? `Comprei ${titulo} sozinho, dentro da política ${politica}` : `Você aprovou a compra de ${titulo}`,
    { autorizacao_id: authorization.id, valor_maximo: valor, loja }, createdAt)
  if (status === 'usada') recordDemoEvent('autorizacao.usada', 'sistema', `O pedido de ${titulo} foi pago com a autorização`, { autorizacao_id: authorization.id }, nowIso(-minutesAgo + 2))
  if (status === 'revogada') recordDemoEvent('autorizacao.revogada', 'voce', `Você revogou a autorização de ${titulo}`, { autorizacao_id: authorization.id }, nowIso(-minutesAgo + 10))
}

seed('Panos de microfibra, kit com 10', 39.9, 'Loja Limpa', 'Casa', 'usada', true, 60 * 50)
seed('Capa para notebook 14"', 89.9, 'Mercado Tech', 'Eletrônicos do dia a dia', 'revogada', false, 60 * 30)
seed('Carregador USB-C 20 W', 79.9, 'Loja Sonora', 'Eletrônicos do dia a dia', 'expirada', false, 60 * 6)

function build(offer: Offer, requestId: string, automatic: boolean, policyName: string | null): Authorization {
  return {
    id: demoId(),
    solicitacao_id: requestId,
    oferta_id: offer.id,
    titulo: offer.titulo,
    valor_maximo: offerTotal(offer),
    loja: offer.loja,
    politica_nome: policyName,
    expira_em: nowIso(AUTHORIZATION_TTL_MINUTES),
    status: 'ativa',
    automatica: automatic,
    criada_em: nowIso(),
  }
}

const demo = {
  async list() {
    await wait()
    return [...demoAuthorizations].sort((a, b) => b.criada_em.localeCompare(a.criada_em)).map((item) => structuredClone(item))
  },
  async revoke(id: string) {
    await wait()
    const authorization = demoAuthorizations.find((item) => item.id === id)
    if (!authorization) throw new ApiError('Não encontrei esta autorização.', 404)
    if (effectiveStatus(authorization) !== 'ativa') throw new ApiError('Esta autorização não está mais ativa: ela já foi usada, revogada ou expirou.', 409)
    authorization.status = 'revogada'
    recordDemoEvent('autorizacao.revogada', 'voce', `Você revogou a autorização de ${authorization.titulo}`, { autorizacao_id: id, valor_maximo: authorization.valor_maximo })
  },
  async create(requestId: string, offerId: string, password?: string) {
    await wait(700)
    const { request, offer } = demoFindOffer(requestId, offerId)
    if (!offer) throw new ApiError('Não encontrei esta oferta.', 404)
    if (request.status !== 'com_resultado') {
      throw new ApiError('Esta solicitação não aceita mais aprovação: ela já foi aprovada ou cancelada.', 409)
    }
    const check = demoEvaluate(offer)
    if (!check.allowed) {
      recordDemoEvent('politica.bloqueou', 'politica', `Suas políticas bloquearam a compra de ${offer.titulo}`, { solicitacao_id: requestId, motivos: check.reasons })
      throw new ApiError('Esta oferta não cabe nas suas políticas.', 422, undefined, { detalhes: { motivos: check.reasons } })
    }
    if (!check.automatic) {
      if (!password) throw new ApiError('Digite sua senha para aprovar.', 401, { senha: 'Digite sua senha.' })
      if (password === DEMO_WRONG_PASSWORD) {
        recordDemoEvent('autorizacao.senha_incorreta', 'sistema', 'A senha não confere. Nada foi aprovado.', { solicitacao_id: requestId })
        throw new ApiError('A senha não confere.', 401, { senha: 'Senha incorreta. Confira e tente de novo.' })
      }
    }
    const authorization = build(offer, requestId, check.automatic, check.policyName)
    demoAuthorizations.push(authorization)
    demoMarkApproved(requestId, authorization)
    if (check.automatic) {
      recordDemoEvent('compra.automatica', 'agente', `Comprei ${offer.titulo} sozinho, dentro da política ${check.policyName}`, { autorizacao_id: authorization.id, valor_maximo: authorization.valor_maximo, loja: offer.loja })
    } else {
      recordDemoEvent('autorizacao.criada', 'voce', `Você aprovou a compra de ${offer.titulo}`, { autorizacao_id: authorization.id, valor_maximo: authorization.valor_maximo, loja: offer.loja, expira_em: authorization.expira_em })
    }
    return structuredClone(authorization)
  },
}
