import { demoMode } from './auth'
import { ApiError, apiRequest } from './client'
import { demoId, notFound, nowIso, recordDemoEvent, wait } from './demo'
import { demoPoliciesSnapshot, type Policy } from './politicas'

// Contrato em docs/contrato-api.md, que resume o contrato de integração do backend (seções 4, 5 e 10).

export type RequestStatus = 'aguardando_aprovacao' | 'sem_resultado' | 'aprovada' | 'concluida' | 'expirada'

// Oferta do catálogo já ranqueada. Campos que a fonte não informa chegam como null.
export type Offer = {
  id_externo: string
  // No MVP: "fixo" (catálogo local) ou "dummyjson" (catálogo externo).
  fonte: string
  titulo: string
  marca?: string | null
  preco: number
  // null: a loja não informou o frete (a explicação diz "Frete estimado").
  frete: number | null
  frete_gratis?: boolean
  prazo_dias: number | null
  categoria: string
  categorias_caminho: string[]
  loja: string
  avaliacao: number | null
  // Quantidade disponível (aproximada quando a fonte só informa faixas).
  estoque?: number | null
  preco_por_unidade?: number | null
  unidade?: string | null
  link?: string | null
  imagem?: string | null
  // Frases curtas, com números, que explicam a posição da oferta no ranking.
  explicacao: string[]
}

export type RequestItem = {
  descricao: string
  // Embalagens da recomendada a comprar, a mesma que entra no subtotal ("2 kg de feijão" com o pacote de 1 kg vira 2).
  quantidade: number
  status: 'com_oferta' | 'sem_oferta'
  recomendada: Offer | null
  alternativas: Offer[]
  // Quantas ofertas as políticas tiraram da lista deste item.
  descartadas: number
  explicacao: string[]
}

export type Basket = { subtotal: number; frete: number; total: number; lojas: string[] }

// Avaliação da cesta inteira pelas políticas: é ela que decide se dá para aprovar.
export type Evaluation = {
  permitida: boolean
  compra_automatica: boolean
  politica_id: string | null
  motivos: string[]
}

// Preenchido quando o agente comprou sozinho: a autorização e o pedido com o Pix já criados.
export type AutoPurchase = { autorizacao_id: string; pedido_id: string }

export type PurchaseRequest = {
  id: string
  // null quando a solicitação veio com os itens já separados.
  texto: string | null
  itens: RequestItem[]
  cesta: Basket
  avaliacao: Evaluation
  status: RequestStatus
  compra_automatica: AutoPurchase | null
  criada_em: string
  atualizada_em: string
}

// Item do histórico (GET /solicitacoes).
export type RequestSummary = {
  id: string
  texto: string | null
  itens: string[]
  status: RequestStatus
  total: number
  criada_em: string
}

export const REQUEST_FIELDS = ['texto'] as const
export const REQUEST_MAX_LENGTH = 500

export function createRequest(texto: string) {
  if (demoMode) return demo.create(texto)
  return apiRequest<PurchaseRequest>('/solicitacoes', { method: 'POST', body: { texto } })
}

export function listRequests() {
  if (demoMode) return demo.list()
  return apiRequest<RequestSummary[]>('/solicitacoes')
}

export function getRequest(id: string) {
  if (demoMode) return demo.get(id)
  return apiRequest<PurchaseRequest>(`/solicitacoes/${id}`)
}

// O DELETE remove a solicitação: ela sai do histórico.
export function cancelRequest(id: string) {
  if (demoMode) return demo.cancel(id)
  return apiRequest<void>(`/solicitacoes/${id}`, { method: 'DELETE' })
}

// A API só remove antes da aprovação.
export function canCancel(status: RequestStatus) {
  return status === 'aguardando_aprovacao' || status === 'sem_resultado'
}

export function canApprove(request: Pick<PurchaseRequest, 'status' | 'avaliacao'>) {
  return request.status === 'aguardando_aprovacao' && request.avaliacao.permitida
}

// O que a pessoa escreveu; sem texto, a lista dos itens.
export function requestTitle(request: { texto: string | null; itens: (RequestItem | string)[] }) {
  return request.texto ?? request.itens.map((item) => (typeof item === 'string' ? item : item.descricao)).join(', ')
}

export function itemTotal(item: Pick<RequestItem, 'quantidade' | 'recomendada'>) {
  return (item.recomendada?.preco ?? 0) * item.quantidade
}

// ---- Modo de demonstração: catálogo fixo de supermercado e políticas como no backend ------

type CatalogItem = Omit<Offer, 'explicacao' | 'fonte' | 'id_externo'> & { palavras: string[] }

const CATALOG: CatalogItem[] = [
  { titulo: 'Arroz Branco Tipo 1 5kg', marca: 'Grão Dourado', preco: 27.9, frete: 0, prazo_dias: 2, avaliacao: 4.7, categoria: 'Arroz', categorias_caminho: ['Alimentos e Bebidas', 'Mercearia', 'Arroz'], loja: 'Mercado Exemplo', preco_por_unidade: 5.58, unidade: 'kg', palavras: ['arroz'] },
  { titulo: 'Arroz Parboilizado 5kg', marca: 'Sabor do Campo', preco: 24.9, frete: 9.9, prazo_dias: 4, avaliacao: 4.3, categoria: 'Arroz', categorias_caminho: ['Alimentos e Bebidas', 'Mercearia', 'Arroz'], loja: 'Atacado Bom Preço', preco_por_unidade: 4.98, unidade: 'kg', palavras: ['arroz'] },
  { titulo: 'Feijão Carioca Tipo 1 1kg', marca: 'Sabor do Campo', preco: 8.99, frete: 0, prazo_dias: 2, avaliacao: 4.6, categoria: 'Feijão', categorias_caminho: ['Alimentos e Bebidas', 'Mercearia', 'Feijão'], loja: 'Mercado Exemplo', palavras: ['feijao'] },
  { titulo: 'Feijão Preto Tipo 1 1kg', marca: 'Grão Dourado', preco: 9.49, frete: 0, prazo_dias: 2, avaliacao: 4.4, categoria: 'Feijão', categorias_caminho: ['Alimentos e Bebidas', 'Mercearia', 'Feijão'], loja: 'Mercado Exemplo', palavras: ['feijao'] },
  { titulo: 'Leite Integral UHT 1L', marca: 'Vale Verde', preco: 5.29, frete: 0, prazo_dias: 1, avaliacao: 4.8, categoria: 'Leite', categorias_caminho: ['Alimentos e Bebidas', 'Laticínios', 'Leite'], loja: 'Mercado Exemplo', preco_por_unidade: 5.29, unidade: 'l', palavras: ['leite'] },
  { titulo: 'Leite Integral UHT 1L', marca: 'Fazenda Feliz', preco: 4.99, frete: 7.9, prazo_dias: 3, avaliacao: 4.1, categoria: 'Leite', categorias_caminho: ['Alimentos e Bebidas', 'Laticínios', 'Leite'], loja: 'Super Econômico', preco_por_unidade: 4.99, unidade: 'l', palavras: ['leite'] },
  { titulo: 'Café Torrado e Moído Tradicional 500g', marca: 'Bom Dia', preco: 19.9, frete: 0, prazo_dias: 2, avaliacao: 4.7, categoria: 'Café', categorias_caminho: ['Alimentos e Bebidas', 'Mercearia', 'Café'], loja: 'Mercado Exemplo', palavras: ['cafe'] },
  { titulo: 'Café Torrado e Moído Extraforte 500g', marca: 'Serra Alta', preco: 17.5, frete: 9.9, prazo_dias: 4, avaliacao: 4.4, categoria: 'Café', categorias_caminho: ['Alimentos e Bebidas', 'Mercearia', 'Café'], loja: 'Atacado Bom Preço', palavras: ['cafe'] },
  { titulo: 'Açúcar Refinado 1kg', marca: 'Doce Vida', preco: 4.99, frete: 0, prazo_dias: 2, avaliacao: 4.6, categoria: 'Açúcar', categorias_caminho: ['Alimentos e Bebidas', 'Mercearia', 'Açúcar'], loja: 'Mercado Exemplo', palavras: ['acucar'] },
  { titulo: 'Macarrão Espaguete 500g', marca: 'Nonna', preco: 4.29, frete: 0, prazo_dias: 2, avaliacao: 4.5, categoria: 'Massas', categorias_caminho: ['Alimentos e Bebidas', 'Mercearia', 'Massas'], loja: 'Mercado Exemplo', palavras: ['macarrao', 'massa', 'espaguete'] },
  { titulo: 'Detergente Líquido Neutro 500ml', marca: 'Limpex', preco: 2.49, frete: 0, prazo_dias: 2, avaliacao: 4.6, categoria: 'Detergente', categorias_caminho: ['Casa e Limpeza', 'Limpeza', 'Detergente'], loja: 'Mercado Exemplo', palavras: ['detergente'] },
  { titulo: 'Detergente Líquido Limão 500ml', marca: 'Brilho', preco: 2.19, frete: 7.9, prazo_dias: 3, avaliacao: 4.2, categoria: 'Detergente', categorias_caminho: ['Casa e Limpeza', 'Limpeza', 'Detergente'], loja: 'Super Econômico', palavras: ['detergente'] },
  { titulo: 'Sabão em Pó Multiação 1,6kg', marca: 'Brilho', preco: 21.9, frete: 0, prazo_dias: 2, avaliacao: 4.5, categoria: 'Sabão em Pó', categorias_caminho: ['Casa e Limpeza', 'Lavanderia', 'Sabão em Pó'], loja: 'Mercado Exemplo', palavras: ['sabao'] },
  { titulo: 'Papel Higiênico Folha Dupla 12 rolos', marca: 'Suave', preco: 19.9, frete: 0, prazo_dias: 2, avaliacao: 4.6, categoria: 'Papel Higiênico', categorias_caminho: ['Higiene e Cuidado Pessoal', 'Papel Higiênico'], loja: 'Mercado Exemplo', palavras: ['papel'] },
]

// Mesma comparação do backend: sem maiúsculas, sem acentos e sem espaços nas pontas.
export function comparable(text: string) {
  return text.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const brl = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`
const round = (value: number) => Math.round(value * 100) / 100

// "arroz 5kg, 2 leites integrais e detergente" vira arroz 5kg (1), leites integrais (2) e detergente (1).
function interpret(texto: string) {
  return texto
    .split(/,|;|\n|\s+e\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(\d{1,2})\s+(.+)$/)
      return match ? { descricao: match[2], quantidade: Math.max(1, Number(match[1])) } : { descricao: part, quantidade: 1 }
    })
}

function offersFor(descricao: string): Offer[] {
  const words = comparable(descricao)
  const found = CATALOG
    .filter((item) => item.palavras.some((word) => words.includes(word)))
    .sort((a, b) => a.preco + (a.frete ?? 0) - (b.preco + (b.frete ?? 0)))
  return found.map(({ palavras: _words, ...item }, index) => {
    void _words
    const explanation = [index === 0 && found.length > 1 ? `Menor preço com frete entre ${found.length} ofertas` : `Preço: ${brl(item.preco)}`]
    explanation.push(item.frete ? `Frete de ${brl(item.frete)}` : 'Frete grátis')
    if (item.prazo_dias !== null) explanation.push(`Entrega estimada em ${item.prazo_dias} ${item.prazo_dias === 1 ? 'dia' : 'dias'}`)
    if (item.avaliacao !== null) explanation.push(`Avaliação ${String(item.avaliacao).replace('.', ',')}`)
    return { ...item, fonte: 'demo', id_externo: demoId(), frete_gratis: !item.frete, explicacao: explanation }
  })
}

// Mesmas regras de app/politicas/regras.py (avaliar_cesta): uma mesma política ativa precisa
// aceitar todos os itens e o total; se mais de uma aceita, vale a que dá mais autonomia.
function evaluate(items: RequestItem[], total: number, policies: Policy[]): Evaluation {
  const offers = items.flatMap((item) => (item.recomendada ? [item.recomendada] : []))
  if (!offers.length) return { permitida: false, compra_automatica: false, politica_id: null, motivos: ['Nenhum item da lista tem oferta disponível'] }
  const active = policies.filter((policy) => policy.ativa)
  if (!active.length) return { permitida: true, compra_automatica: false, politica_id: null, motivos: [] }

  const reasons: string[] = []
  const accepted: Policy[] = []
  for (const policy of active) {
    const problems: string[] = []
    if (total > policy.teto_por_compra) problems.push(`total de ${brl(total)} passa do teto de ${brl(policy.teto_por_compra)}`)
    const categories = policy.categorias.map(comparable)
    const stores = policy.lojas.map(comparable)
    for (const offer of offers) {
      if (categories.length && !offer.categorias_caminho.some((category) => categories.includes(comparable(category)))) {
        problems.push(`categoria '${offer.categoria}' não permitida`)
      }
      if (stores.length && !stores.includes(comparable(offer.loja))) problems.push(`loja '${offer.loja}' não permitida`)
    }
    if (problems.length) reasons.push(...[...new Set(problems)].map((problem) => `${policy.nome}: ${problem}`))
    else accepted.push(policy)
  }
  if (!accepted.length) return { permitida: false, compra_automatica: false, politica_id: null, motivos: reasons }
  const chosen = accepted.find((policy) => policy.nivel_autonomia === 'automatica') ?? accepted[0]
  return { permitida: true, compra_automatica: chosen.nivel_autonomia === 'automatica', politica_id: chosen.id, motivos: [] }
}

function build(texto: string): Omit<PurchaseRequest, 'id' | 'criada_em' | 'atualizada_em'> {
  const items: RequestItem[] = interpret(texto).map(({ descricao, quantidade }) => {
    const [recomendada = null, ...alternativas] = offersFor(descricao)
    const count = alternativas.length + 1
    return {
      descricao,
      quantidade,
      status: recomendada ? 'com_oferta' : 'sem_oferta',
      recomendada,
      alternativas: alternativas.slice(0, 4),
      descartadas: 0,
      explicacao: [recomendada ? `${count} ${count === 1 ? 'oferta encontrada' : 'ofertas encontradas'}` : 'Nenhuma oferta encontrada para este item'],
    }
  })
  const chosen = items.filter((item) => item.recomendada)
  const subtotal = round(chosen.reduce((sum, item) => sum + itemTotal(item), 0))
  // O frete é cobrado uma vez por loja: vale o maior frete entre os itens daquela loja.
  const freightByStore = new Map<string, number>()
  for (const item of chosen) {
    const offer = item.recomendada as Offer
    freightByStore.set(offer.loja, Math.max(freightByStore.get(offer.loja) ?? 0, offer.frete ?? 0))
  }
  const frete = round([...freightByStore.values()].reduce((sum, value) => sum + value, 0))
  const total = round(subtotal + frete)
  return {
    texto,
    itens: items,
    cesta: { subtotal, frete, total, lojas: [...freightByStore.keys()] },
    avaliacao: evaluate(items, total, demoPoliciesSnapshot()),
    status: chosen.length ? 'aguardando_aprovacao' : 'sem_resultado',
    compra_automatica: null,
  }
}

const demoRequests: PurchaseRequest[] = []

// Gancho da compra automática no modo demo, registrado por autorizacoes.ts (como o M3 faz no backend).
export const demoHooks: { autoPurchase?: (request: PurchaseRequest) => AutoPurchase | null } = {}

export function demoFindRequest(id: string) {
  return demoRequests.find((item) => item.id === id) ?? notFound('Solicitação não encontrada.')
}

// Troca o status só se ele ainda for o esperado, como o find_one_and_update do backend.
export function demoSetRequestStatus(id: string, from: RequestStatus, to: RequestStatus) {
  const request = demoRequests.find((item) => item.id === id)
  if (!request || request.status !== from) return false
  request.status = to
  request.atualizada_em = nowIso()
  return true
}

const demo = {
  async create(texto: string) {
    await wait(700)
    const text = texto.trim()
    if (text.length < 3 || text.length > REQUEST_MAX_LENGTH) {
      throw new ApiError('Solicitação inválida.', 400, { texto: `Escreva a lista com 3 a ${REQUEST_MAX_LENGTH} caracteres.` })
    }
    const now = nowIso()
    const request: PurchaseRequest = { ...build(text), id: demoId(), criada_em: now, atualizada_em: now }
    demoRequests.push(request)
    recordDemoEvent('solicitacao_criada', { tipo: 'solicitacao', id: request.id }, { itens: request.itens.length, status: request.status })

    const { avaliacao } = request
    const allFound = request.itens.every((item) => item.status === 'com_oferta')
    if (request.status === 'aguardando_aprovacao' && avaliacao.permitida && avaliacao.compra_automatica && allFound && demoHooks.autoPurchase) {
      const result = demoHooks.autoPurchase(request)
      request.compra_automatica = result
      if (!result) avaliacao.motivos.push('Não foi possível concluir a compra automática; aprove manualmente.')
    }
    return structuredClone(request)
  },
  async list(): Promise<RequestSummary[]> {
    await wait()
    return [...demoRequests]
      .sort((a, b) => b.criada_em.localeCompare(a.criada_em))
      .map(({ id, texto, itens, status, cesta, criada_em }) => ({ id, texto, itens: itens.map((item) => item.descricao), status, total: cesta.total, criada_em }))
  },
  async get(id: string) {
    await wait(250)
    return structuredClone(demoFindRequest(id))
  },
  async cancel(id: string) {
    await wait()
    const request = demoFindRequest(id)
    if (!canCancel(request.status)) throw new ApiError('Esta solicitação já foi aprovada e não pode ser cancelada.', 409)
    demoRequests.splice(demoRequests.indexOf(request), 1)
    recordDemoEvent('solicitacao_cancelada', { tipo: 'solicitacao', id })
  },
}
