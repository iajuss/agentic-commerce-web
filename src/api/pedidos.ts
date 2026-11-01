import { demoMode } from './auth'
import { ApiError, apiRequest } from './client'
import { demoId, notFound, nowIso, recordDemoEvent, wait } from './demo'
import { demoConsumeAuthorization, demoEmitAuthorization, type AuthorizedItem } from './autorizacoes'
import { demoHooks, demoSetRequestStatus } from './solicitacoes'

// Contrato em docs/contrato-api.md (POST, GET e PATCH /pedidos, /simulador-pix/pagamentos e chamados).

export type OrderStatus =
  | 'aguardando_pagamento'
  | 'pago'
  | 'enviado'
  | 'entregue'
  | 'expirado'
  | 'cancelado'
  | 'devolucao_solicitada'
  | 'devolvido'

// copia_e_cola e expira_em só vêm enquanto o pedido aguarda pagamento.
export type Pix = {
  txid: string
  copia_e_cola?: string
  qr_code_base64?: string | null
  expira_em?: string
  pago_em: string | null
}

export type OrderHistoryEntry = { status: OrderStatus; em: string }

export type Refund = { valor: number; status: 'simulado'; em: string }

// Comprovante: os mesmos itens e o valor da autorização usada.
export type Order = {
  id: string
  solicitacao_id: string
  autorizacao_id: string
  status: OrderStatus
  itens: AuthorizedItem[]
  total: number
  pix: Pix
  historico: OrderHistoryEntry[]
  entrega: { simulada: boolean }
  reembolso?: Refund
  devolucao?: { motivo: string }
  criado_em: string
}

// Item da lista (GET /pedidos).
export type OrderSummary = { id: string; status: OrderStatus; total: number; quantidade_itens: number; criado_em: string }

export type Ticket = {
  id: string
  pedido_id: string
  assunto: string
  mensagem: string
  status: 'aberto'
  criado_em: string
  atualizado_em: string
}

export type TicketInput = { assunto: string; mensagem: string }

export const TICKET_FIELDS = ['assunto', 'mensagem'] as const
export const RETURN_FIELDS = ['motivo'] as const
export const TICKET_LIMITS = { assunto: [3, 80], mensagem: [10, 1000] } as const
export const RETURN_REASON_LIMITS = [3, 300] as const
// Direito de arrependimento (CDC, art. 49): a devolução vale até 7 dias depois da entrega.
export const RETURN_WINDOW_DAYS = 7

// Usa a autorização (uso único) e cria o pedido com o Pix simulado.
export function createOrder(authorizationId: string) {
  if (demoMode) return demo.create(authorizationId)
  return apiRequest<Order>('/pedidos', { method: 'POST', body: { autorizacao_id: authorizationId } })
}

export function listOrders() {
  if (demoMode) return demo.list()
  return apiRequest<OrderSummary[]>('/pedidos')
}

// Envio e entrega acontecem sozinhos e aparecem na próxima leitura do pedido.
export function getOrder(id: string) {
  if (demoMode) return demo.get(id)
  return apiRequest<Order>(`/pedidos/${id}`)
}

// Simula o banco confirmando o Pix. Devolve o pedido já pago.
export function payPix(txid: string) {
  if (demoMode) return demo.pay(txid)
  return apiRequest<Order>('/simulador-pix/pagamentos', { method: 'POST', body: { txid } })
}

export function cancelOrder(id: string) {
  if (demoMode) return demo.change(id, 'cancelado')
  return apiRequest<Order>(`/pedidos/${id}`, { method: 'PATCH', body: { status: 'cancelado' } })
}

export function requestReturn(id: string, motivo: string) {
  if (demoMode) return demo.change(id, 'devolucao_solicitada', motivo)
  return apiRequest<Order>(`/pedidos/${id}`, { method: 'PATCH', body: { status: 'devolucao_solicitada', motivo } })
}

export function listTickets(orderId: string) {
  if (demoMode) return demo.tickets(orderId)
  return apiRequest<Ticket[]>(`/pedidos/${orderId}/chamados`)
}

export function getTicket(orderId: string, ticketId: string) {
  if (demoMode) return demo.ticket(orderId, ticketId)
  return apiRequest<Ticket>(`/pedidos/${orderId}/chamados/${ticketId}`)
}

export function createTicket(orderId: string, input: TicketInput) {
  if (demoMode) return demo.createTicket(orderId, input)
  return apiRequest<Ticket>(`/pedidos/${orderId}/chamados`, { method: 'POST', body: input })
}

// Código curto para a pessoa falar do pedido (glossário: "pedido P-10482"). Só para a tela.
export function orderCode(id: string) {
  return `P-${id.slice(-6).toUpperCase()}`
}

export function canCancelOrder(status: OrderStatus) {
  return status === 'aguardando_pagamento' || status === 'pago' || status === 'enviado'
}

// Quando o pedido entrou pela última vez em `status`, pelo histórico.
export function statusTime(order: Pick<Order, 'historico'>, status: OrderStatus) {
  return [...order.historico].reverse().find((entry) => entry.status === status)?.em ?? null
}

// Último dia para pedir a devolução, ou null se o pedido não foi entregue.
export function returnDeadline(order: Pick<Order, 'historico'>) {
  const delivered = statusTime(order, 'entregue')
  return delivered ? new Date(new Date(delivered).getTime() + RETURN_WINDOW_DAYS * 86_400_000).toISOString() : null
}

export function canReturn(order: Pick<Order, 'status' | 'historico'>, now = Date.now()) {
  const deadline = returnDeadline(order)
  return order.status === 'entregue' && deadline !== null && now <= new Date(deadline).getTime()
}

// Status que ainda mudam sozinhos: a tela relê o pedido de tempos em tempos.
export function isMoving(status: OrderStatus) {
  return status === 'aguardando_pagamento' || status === 'pago' || status === 'enviado' || status === 'devolucao_solicitada'
}

// ---- Modo de demonstração: as mesmas regras do backend, com prazos curtos -----------------

// O backend usa 30 min (Pix), 2 min (envio) e 5 min (entrega); no demo o envio e a entrega são
// mais rápidos para dar para ver o pedido andar numa apresentação.
const PIX_MINUTES = 30
const SHIPPING_MINUTES = 1
const DELIVERY_MINUTES = 2

type DemoOrder = Order & { pix: Required<Pick<Pix, 'copia_e_cola' | 'expira_em'>> & Pix }

const demoOrders: DemoOrder[] = []
const demoTickets: Ticket[] = []

const addMinutes = (iso: string, minutes: number) => new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()

function move(order: DemoOrder, status: OrderStatus, em = nowIso()) {
  order.status = status
  order.historico.push({ status, em })
}

// Mesma ideia de pos_compra.regras.transicoes_devidas: grava, na leitura, o que já devia ter acontecido.
function applyTransitions(order: DemoOrder) {
  const now = nowIso()
  if (order.status === 'aguardando_pagamento' && now >= order.pix.expira_em) {
    move(order, 'expirado', order.pix.expira_em)
    demoSetRequestStatus(order.solicitacao_id, 'aprovada', 'expirada')
    recordDemoEvent('pedido_expirado', { tipo: 'pedido', id: order.id })
  }
  if (order.status === 'pago' && order.pix.pago_em) {
    const shipped = addMinutes(order.pix.pago_em, SHIPPING_MINUTES)
    if (now >= shipped) move(order, 'enviado', shipped)
  }
  if (order.status === 'enviado') {
    const delivered = addMinutes(statusTime(order, 'enviado') ?? now, DELIVERY_MINUTES)
    if (now >= delivered) {
      move(order, 'entregue', delivered)
      recordDemoEvent('pedido_entregue', { tipo: 'pedido', id: order.id })
    }
  }
  if (order.status === 'devolucao_solicitada') {
    const returned = addMinutes(statusTime(order, 'devolucao_solicitada') ?? now, DELIVERY_MINUTES)
    if (now >= returned) {
      move(order, 'devolvido', returned)
      order.reembolso = { valor: order.total, status: 'simulado', em: returned }
    }
  }
  return order
}

// Como pedido_para_json: depois de pago, o Pix mostra só txid e pago_em.
function toJson(order: DemoOrder): Order {
  const copy = structuredClone(order) as Order
  if (order.status !== 'aguardando_pagamento') copy.pix = { txid: order.pix.txid, pago_em: order.pix.pago_em }
  return copy
}

function findOrder(id: string) {
  const order = demoOrders.find((item) => item.id === id) ?? notFound('Pedido não encontrado.')
  return applyTransitions(order)
}

function createDemoOrder(authorization: ReturnType<typeof demoConsumeAuthorization>) {
  const now = nowIso()
  const txid = demoId() + demoId()
  const order: DemoOrder = {
    id: demoId(),
    solicitacao_id: authorization.solicitacao_id,
    autorizacao_id: authorization.id,
    status: 'aguardando_pagamento',
    itens: authorization.itens.map((item) => ({ ...item })),
    total: authorization.valor_maximo,
    pix: { txid, copia_e_cola: `PIX-SIMULADO-${txid}`, qr_code_base64: null, expira_em: nowIso(PIX_MINUTES), pago_em: null },
    historico: [{ status: 'aguardando_pagamento', em: now }],
    entrega: { simulada: true },
    criado_em: now,
  }
  demoOrders.push(order)
  recordDemoEvent('pedido_criado', { tipo: 'pedido', id: order.id }, { total: order.total })
  return order
}

// Compra automática do demo (o gancho que o M3 registra no backend): aprova sem senha e gera o Pix.
demoHooks.autoPurchase = (request) => {
  try {
    const authorization = demoEmitAuthorization(request, 'automatica')
    const order = createDemoOrder(demoConsumeAuthorization(authorization.id))
    return { autorizacao_id: authorization.id, pedido_id: order.id }
  } catch {
    return null
  }
}

function invalid(message: string, field: string, problem: string): never {
  throw new ApiError(message, 400, { [field]: problem })
}

const demo = {
  async create(authorizationId: string) {
    await wait(600)
    if (!authorizationId) invalid('Pedido inválido.', 'autorizacao_id', 'Informe a autorização.')
    return toJson(createDemoOrder(demoConsumeAuthorization(authorizationId)))
  },
  async list(): Promise<OrderSummary[]> {
    await wait()
    return demoOrders
      .map(applyTransitions)
      .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
      .map(({ id, status, total, itens, criado_em }) => ({ id, status, total, quantidade_itens: itens.reduce((sum, item) => sum + item.quantidade, 0), criado_em }))
  },
  async get(id: string) {
    await wait(250)
    return toJson(findOrder(id))
  },
  async pay(txid: string) {
    await wait(700)
    const found = demoOrders.find((item) => item.pix.txid === txid) ?? notFound('Cobrança Pix não encontrada.')
    const order = applyTransitions(found)
    if (order.status === 'expirado') throw new ApiError('Esta cobrança Pix expirou.', 409)
    if (order.status !== 'aguardando_pagamento') throw new ApiError('Este pedido não está aguardando pagamento.', 409)
    const now = nowIso()
    order.pix.pago_em = now
    move(order, 'pago', now)
    demoSetRequestStatus(order.solicitacao_id, 'aprovada', 'concluida')
    recordDemoEvent('pagamento_confirmado', { tipo: 'pedido', id: order.id }, { total: order.total })
    return toJson(order)
  },
  async change(id: string, status: 'cancelado' | 'devolucao_solicitada', motivo?: string) {
    await wait(600)
    const order = findOrder(id)
    const current = order.status
    if (status === 'devolucao_solicitada') {
      const reason = motivo?.trim() ?? ''
      if (reason.length < RETURN_REASON_LIMITS[0] || reason.length > RETURN_REASON_LIMITS[1]) {
        invalid('Mudança de pedido inválida.', 'motivo', 'Informe o motivo, de 3 a 300 caracteres.')
      }
      if (current !== 'entregue') throw new ApiError(`Não é possível mudar o pedido de ${current} para ${status}.`, 409)
      if (!canReturn(order)) throw new ApiError('O prazo de 7 dias para devolução terminou.', 409)
      order.devolucao = { motivo: reason }
      move(order, status)
      recordDemoEvent('devolucao_solicitada', { tipo: 'pedido', id })
      return toJson(order)
    }
    if (!canCancelOrder(current)) throw new ApiError(`Não é possível mudar o pedido de ${current} para ${status}.`, 409)
    move(order, 'cancelado')
    if (current === 'aguardando_pagamento') demoSetRequestStatus(order.solicitacao_id, 'aprovada', 'expirada')
    else order.reembolso = { valor: order.total, status: 'simulado', em: nowIso() }
    recordDemoEvent('pedido_cancelado', { tipo: 'pedido', id })
    return toJson(order)
  },
  async tickets(orderId: string) {
    await wait()
    findOrder(orderId)
    return demoTickets
      .filter((ticket) => ticket.pedido_id === orderId)
      .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
      .map((ticket) => structuredClone(ticket))
  },
  async ticket(orderId: string, ticketId: string) {
    await wait()
    findOrder(orderId)
    const ticket = demoTickets.find((item) => item.pedido_id === orderId && item.id === ticketId) ?? notFound('Chamado não encontrado.')
    return structuredClone(ticket)
  },
  async createTicket(orderId: string, input: TicketInput) {
    await wait(600)
    findOrder(orderId)
    const assunto = input.assunto.trim()
    const mensagem = input.mensagem.trim()
    const errors: Record<string, string> = {}
    if (assunto.length < TICKET_LIMITS.assunto[0] || assunto.length > TICKET_LIMITS.assunto[1]) errors.assunto = 'Informe o assunto, de 3 a 80 caracteres.'
    if (mensagem.length < TICKET_LIMITS.mensagem[0] || mensagem.length > TICKET_LIMITS.mensagem[1]) errors.mensagem = 'Informe a mensagem, de 10 a 1000 caracteres.'
    if (Object.keys(errors).length) throw new ApiError('Chamado inválido.', 400, errors)
    const now = nowIso()
    const ticket: Ticket = { id: demoId(), pedido_id: orderId, assunto, mensagem, status: 'aberto', criado_em: now, atualizado_em: now }
    demoTickets.push(ticket)
    recordDemoEvent('chamado_aberto', { tipo: 'chamado', id: ticket.id })
    return structuredClone(ticket)
  },
}
