import { demoMode } from './auth'
import { ApiError, apiRequest } from './client'
import { demoId, notFound, nowIso, recordDemoEvent, wait } from './demo'
import { demoPoliciesSnapshot, type Policy } from './politicas'

// Contrato em docs/contrato-api.md (POST, GET e DELETE /solicitacoes).

export type RequestStatus = 'processando' | 'com_resultado' | 'sem_resultado' | 'aprovada' | 'cancelada'

// Um critério do ranking, para a barra do card: nota de 0 a 1 e o valor já formatado.
export type Criterion = { nome: string; nota: number; valor: string }

export type Offer = {
  id: string
  titulo: string
  preco: number
  frete: number
  loja: string
  categoria: string
  imagem: string | null
  posicao: number
  explicacao: string
  dentro_da_politica: boolean
  motivos_recusa: string[]
  compra_automatica: boolean
  prazo_dias: number | null
  avaliacao: number | null
  criterios: Criterion[]
}

export type PurchaseRequest = {
  id: string
  intencao: string
  status: RequestStatus
  ofertas: Offer[]
  criada_em: string
  atualizada_em: string
}

// Item do histórico (GET /solicitacoes): sem as ofertas, que vêm no GET de cada uma.
export type RequestSummary = Pick<PurchaseRequest, 'id' | 'intencao' | 'status' | 'criada_em'> & {
  quantidade_ofertas: number
}

export const REQUEST_FIELDS = ['intencao'] as const

// Enquanto a API busca e ranqueia, a tela pergunta de novo a cada 2 segundos.
export const POLL_INTERVAL_MS = 2000

export function createRequest(intencao: string) {
  if (demoMode) return demo.create(intencao)
  return apiRequest<PurchaseRequest>('/solicitacoes', { method: 'POST', body: { intencao } })
}

export function listRequests() {
  if (demoMode) return demo.list()
  return apiRequest<RequestSummary[]>('/solicitacoes')
}

export function getRequest(id: string) {
  if (demoMode) return demo.get(id)
  return apiRequest<PurchaseRequest>(`/solicitacoes/${id}`)
}

export function cancelRequest(id: string) {
  if (demoMode) return demo.cancel(id)
  return apiRequest<void>(`/solicitacoes/${id}`, { method: 'DELETE' })
}

// Só faz sentido cancelar o que ainda pode virar compra.
export function canCancel(status: RequestStatus) {
  return status === 'processando' || status === 'com_resultado'
}

export function offerTotal(offer: Pick<Offer, 'preco' | 'frete'>) {
  return offer.preco + offer.frete
}

// Dentro da política primeiro, na ordem do ranking; as recusadas vão para o fim.
export function sortOffers(offers: Offer[]) {
  return [...offers].sort((a, b) => Number(b.dentro_da_politica) - Number(a.dentro_da_politica) || a.posicao - b.posicao)
}

// ---- Modo de demonstração: catálogo fixo, ranking e políticas como no backend ----------

type CatalogItem = Pick<Offer, 'titulo' | 'preco' | 'frete' | 'loja' | 'categoria' | 'prazo_dias' | 'avaliacao'> & { palavras: string[] }

const CATALOG: CatalogItem[] = [
  { titulo: 'Headset Vox Office 30', preco: 349.9, frete: 0, loja: 'Loja Sonora', categoria: 'mobile-accessories', prazo_dias: 2, avaliacao: 4.6, palavras: ['fone', 'headset', 'reuni', 'audio', 'áudio'] },
  { titulo: 'Fone Aria Pro sem fio', preco: 389, frete: 19.9, loja: 'Mercado Tech', categoria: 'mobile-accessories', prazo_dias: 3, avaliacao: 4.8, palavras: ['fone', 'headset', 'reuni', 'sem fio'] },
  { titulo: 'Headset Nimbus com cancelamento de ruído', preco: 429.9, frete: 0, loja: 'Casa do Som', categoria: 'mobile-accessories', prazo_dias: 5, avaliacao: 4.4, palavras: ['fone', 'headset', 'reuni', 'ruído', 'ruido'] },
  { titulo: 'Fone Studio Max', preco: 899, frete: 0, loja: 'Mercado Tech', categoria: 'mobile-accessories', prazo_dias: 2, avaliacao: 4.9, palavras: ['fone', 'headset', 'audio'] },
  { titulo: 'Cadeira Office Basic', preco: 499, frete: 0, loja: 'Casa & Escritório', categoria: 'furniture', prazo_dias: 4, avaliacao: 4.1, palavras: ['cadeira', 'escritório', 'escritorio'] },
  { titulo: 'Cadeira Ergo Flex', preco: 749, frete: 49.9, loja: 'Móveis Já', categoria: 'furniture', prazo_dias: 7, avaliacao: 4.5, palavras: ['cadeira', 'escritório', 'escritorio', 'ergonômica'] },
  { titulo: 'Panos de microfibra, kit com 10', preco: 39.9, frete: 0, loja: 'Loja Limpa', categoria: 'kitchen-accessories', prazo_dias: 1, avaliacao: 4.7, palavras: ['pano', 'microfibra', 'limpeza'] },
  { titulo: 'Panos multiuso, 5 unidades', preco: 24.9, frete: 9.9, loja: 'Mercado da Casa', categoria: 'kitchen-accessories', prazo_dias: 3, avaliacao: 4.2, palavras: ['pano', 'limpeza', 'multiuso'] },
  { titulo: 'Celular Lumen A54 128 GB', preco: 1899, frete: 0, loja: 'Mercado Tech', categoria: 'smartphones', prazo_dias: 2, avaliacao: 4.6, palavras: ['celular', 'smartphone'] },
]

const brl = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`
const ordinal = (position: number) => `${position}º`
// "a 2ª": a comparação é com outra oferta (feminino).
const ordinalOffer = (position: number) => `${position}ª`
const days = (value: number) => `${value} ${value === 1 ? 'dia' : 'dias'}`

// Mesmas regras de app/politicas/regras.py: basta uma política ativa aceitar.
function evaluate(item: CatalogItem, policies: Policy[]) {
  const active = policies.filter((policy) => policy.ativa)
  if (!active.length) return { allowed: true, automatic: false, reasons: [] as string[] }
  const reasons: string[] = []
  const accepted: Policy[] = []
  for (const policy of active) {
    const problems: string[] = []
    const total = item.preco + item.frete
    if (total > policy.teto_por_compra) problems.push(`total de ${brl(total)} passa do teto de ${brl(policy.teto_por_compra)}`)
    if (policy.categorias.length && !policy.categorias.includes(item.categoria)) problems.push(`categoria '${item.categoria}' não permitida`)
    if (policy.lojas.length && !policy.lojas.includes(item.loja.toLowerCase())) problems.push(`loja '${item.loja}' não permitida`)
    if (problems.length) reasons.push(...problems.map((problem) => `${policy.nome}: ${problem}`))
    else accepted.push(policy)
  }
  if (!accepted.length) return { allowed: false, automatic: false, reasons }
  return { allowed: true, automatic: accepted.some((policy) => policy.nivel_autonomia === 'automatica'), reasons: [] }
}

function compare(offer: CatalogItem, other: CatalogItem, otherPosition: number) {
  const diff = offer.preco + offer.frete - (other.preco + other.frete)
  const parts = [diff <= 0 ? `custa ${brl(-diff)} menos que a ${ordinalOffer(otherPosition)}` : `custa ${brl(diff)} a mais que a ${ordinalOffer(otherPosition)}`]
  const dayDiff = (offer.prazo_dias ?? 0) - (other.prazo_dias ?? 0)
  if (dayDiff < 0) parts.push(`chega ${days(-dayDiff)} antes`)
  else if (dayDiff > 0) parts.push(`chega ${days(dayDiff)} depois`)
  else parts.push('chega no mesmo dia')
  return parts.join(' e ')
}

function rank(intencao: string): Offer[] {
  const text = intencao.toLowerCase()
  const found = CATALOG.filter((item) => item.palavras.some((word) => text.includes(word)))
  if (!found.length) return []

  const totals = found.map((item) => item.preco + item.frete)
  const [minTotal, maxTotal] = [Math.min(...totals), Math.max(...totals)]
  const deadlines = found.map((item) => item.prazo_dias ?? 0)
  const [minDays, maxDays] = [Math.min(...deadlines), Math.max(...deadlines)]
  const spread = (value: number, min: number, max: number) => (max === min ? 1 : 1 - (value - min) / (max - min))
  const policies = demoPoliciesSnapshot()

  const scored = found.map((item) => {
    const price = spread(item.preco + item.frete, minTotal, maxTotal)
    const deadline = spread(item.prazo_dias ?? 0, minDays, maxDays)
    const rating = (item.avaliacao ?? 0) / 5
    return { item, price, deadline, rating, score: price * 0.6 + deadline * 0.2 + rating * 0.2, check: evaluate(item, policies) }
  })
  const ordered = [...scored.filter((entry) => entry.check.allowed).sort((a, b) => b.score - a.score), ...scored.filter((entry) => !entry.check.allowed).sort((a, b) => b.score - a.score)]
  const inside = ordered.filter((entry) => entry.check.allowed)

  return ordered.map((entry, index) => {
    const { item } = entry
    const position = index + 1
    let explanation: string
    if (!entry.check.allowed) {
      explanation = 'Fica fora das suas políticas, então não posso comprar. Veja o motivo abaixo.'
    } else if (inside.length === 1) {
      explanation = `Ficou em 1º: é a única que cabe nas suas políticas. Total de ${brl(item.preco + item.frete)}, chega em ${days(item.prazo_dias ?? 0)}.`
    } else {
      const reference = position === 1 ? inside[1].item : inside[0].item
      explanation = `Ficou em ${ordinal(position)}: ${compare(item, reference, position === 1 ? 2 : 1)}.`
    }
    const { palavras: _words, ...offer } = item
    void _words
    return {
      ...offer,
      id: demoId(),
      imagem: null,
      posicao: position,
      explicacao: explanation,
      dentro_da_politica: entry.check.allowed,
      motivos_recusa: entry.check.reasons,
      compra_automatica: entry.check.automatic,
      criterios: [
        { nome: 'Preço total', nota: entry.price, valor: brl(item.preco + item.frete) },
        { nome: 'Prazo', nota: entry.deadline, valor: days(item.prazo_dias ?? 0) },
        { nome: 'Avaliação', nota: entry.rating, valor: `${String(item.avaliacao).replace('.', ',')} de 5` },
      ],
    }
  })
}

type DemoRequest = PurchaseRequest & { readyAt: number }

const demoRequests: DemoRequest[] = []

function seed(intencao: string, status: RequestStatus, minutesAgo: number) {
  const createdAt = nowIso(-minutesAgo)
  const offers = status === 'sem_resultado' ? [] : rank(intencao)
  demoRequests.push({ id: demoId(), intencao, status, ofertas: offers, criada_em: createdAt, atualizada_em: createdAt, readyAt: 0 })
  recordDemoEvent('solicitacao.criada', 'voce', `Você pediu: "${intencao}"`, { status }, createdAt)
  recordDemoEvent(offers.length ? 'ofertas.ranqueadas' : 'ofertas.sem_resultado', 'agente',
    offers.length ? `Ranqueei ${offers.length} ofertas` : 'Não encontrei ofertas', { quantidade: offers.length }, nowIso(-minutesAgo + 1))
  if (status === 'cancelada') recordDemoEvent('solicitacao.cancelada', 'voce', 'Você cancelou a solicitação', { intencao }, nowIso(-minutesAgo + 30))
}

seed('Guarda-chuva de golfe com capa térmica', 'sem_resultado', 60 * 72)
seed('Cadeira de escritório até R$ 900', 'cancelada', 60 * 26)

function settle(request: DemoRequest) {
  if (request.status !== 'processando' || Date.now() < request.readyAt) return
  request.ofertas = rank(request.intencao)
  request.status = request.ofertas.length ? 'com_resultado' : 'sem_resultado'
  request.atualizada_em = nowIso()
  const outside = request.ofertas.filter((offer) => !offer.dentro_da_politica).length
  recordDemoEvent(request.ofertas.length ? 'ofertas.ranqueadas' : 'ofertas.sem_resultado', 'agente',
    request.ofertas.length ? `Ranqueei ${request.ofertas.length} ofertas` : 'Não encontrei ofertas',
    { solicitacao_id: request.id, quantidade: request.ofertas.length, fora_da_politica: outside })
  if (outside) recordDemoEvent('politica.bloqueou', 'politica', `Suas políticas bloquearam ${outside} ${outside === 1 ? 'oferta' : 'ofertas'}`, { solicitacao_id: request.id })
}

function findRequest(id: string) {
  const request = demoRequests.find((item) => item.id === id) ?? notFound('Não encontrei esta solicitação.')
  settle(request)
  return request
}

function publicRequest({ readyAt: _ready, ...request }: DemoRequest): PurchaseRequest {
  void _ready
  return structuredClone(request)
}

export function demoMarkApproved(id: string) {
  const request = findRequest(id)
  request.status = 'aprovada'
  request.atualizada_em = nowIso()
}

export function demoFindOffer(requestId: string, offerId: string) {
  const request = findRequest(requestId)
  return { request: publicRequest(request), offer: request.ofertas.find((offer) => offer.id === offerId) }
}

const demo = {
  async create(intencao: string) {
    await wait()
    const text = intencao.trim()
    if (text.length < 3) throw new ApiError('Descreva o que você precisa.', 400, { intencao: 'Escreva pelo menos 3 letras.' })
    if (text.length > 500) throw new ApiError('Descreva o que você precisa.', 400, { intencao: 'Use no máximo 500 caracteres.' })
    const now = nowIso()
    const request: DemoRequest = { id: demoId(), intencao: text, status: 'processando', ofertas: [], criada_em: now, atualizada_em: now, readyAt: Date.now() + 1800 }
    demoRequests.push(request)
    recordDemoEvent('solicitacao.criada', 'voce', `Você pediu: "${text}"`, { solicitacao_id: request.id })
    return publicRequest(request)
  },
  async list(): Promise<RequestSummary[]> {
    await wait()
    return demoRequests
      .map((request) => { settle(request); return request })
      .sort((a, b) => b.criada_em.localeCompare(a.criada_em))
      .map(({ id, intencao, status, criada_em, ofertas }) => ({ id, intencao, status, criada_em, quantidade_ofertas: ofertas.length }))
  },
  async get(id: string) {
    await wait(250)
    return publicRequest(findRequest(id))
  },
  async cancel(id: string) {
    await wait()
    const request = findRequest(id)
    if (!canCancel(request.status)) throw new ApiError('Esta solicitação não pode mais ser cancelada: ela já foi aprovada, cancelada ou terminou sem ofertas.', 409)
    request.status = 'cancelada'
    request.atualizada_em = nowIso()
    recordDemoEvent('solicitacao.cancelada', 'voce', 'Você cancelou a solicitação', { solicitacao_id: id, intencao: request.intencao })
  },
}
