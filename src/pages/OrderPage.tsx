import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Check, CircleAlert, CircleCheck, Copy, LifeBuoy, Package, QrCode, RotateCcw } from 'lucide-react'
import { ApiError } from '../api/client'
import { itemCount } from '../api/autorizacoes'
import {
  cancelOrder,
  canCancelOrder,
  canReturn,
  createTicket,
  getOrder,
  isMoving,
  listTickets,
  orderCode,
  payPix,
  requestReturn,
  RETURN_FIELDS,
  RETURN_REASON_LIMITS,
  returnDeadline,
  statusTime,
  TICKET_FIELDS,
  TICKET_LIMITS,
  type Order,
  type OrderStatus,
  type Ticket,
} from '../api/pedidos'
import { FieldError } from '../components/FieldError'
import { StatusBadge, statusIcon } from '../components/StatusBadge'
import { useResource } from '../hooks/useResource'
import { formatBRL, formatDateTime, formatTime, joinList, plural } from '../utils/format'
import { formErrors, type FormErrors } from '../utils/forms'

// Enquanto o pedido ainda muda sozinho (Pix vencendo, envio, entrega), a tela relê a API.
const REFRESH_MS = 20_000

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : 'Não foi possível concluir. Tente de novo.'
}

const TITLES: Record<OrderStatus, string> = {
  aguardando_pagamento: 'Falta pagar o Pix',
  pago: 'Pagamento confirmado',
  enviado: 'Seu pedido está a caminho',
  entregue: 'Pedido entregue',
  expirado: 'O Pix venceu',
  cancelado: 'Pedido cancelado',
  devolucao_solicitada: 'Devolução pedida',
  devolvido: 'Pedido devolvido',
}

// Uma frase por passo do histórico, no passado.
function historyTitle(status: OrderStatus, order: Order) {
  switch (status) {
    case 'aguardando_pagamento': return `Pedido criado, com Pix de ${formatBRL(order.total)}`
    case 'pago': return 'O Pix foi pago'
    case 'enviado': return 'A loja enviou o pedido'
    case 'entregue': return 'O pedido foi entregue'
    case 'expirado': return 'O Pix venceu sem pagamento, então nada foi cobrado'
    case 'cancelado': return 'Você cancelou o pedido'
    case 'devolucao_solicitada': return 'Você pediu a devolução'
    case 'devolvido': return 'A devolução chegou e o reembolso foi feito'
  }
}

// O que acontece a seguir, para a pessoa não ficar esperando sem saber.
function nextStep(order: Order) {
  switch (order.status) {
    case 'pago': return 'O envio acontece sozinho em alguns minutos. Esta tela se atualiza.'
    case 'enviado': return 'A entrega acontece sozinha em alguns minutos. Esta tela se atualiza.'
    case 'devolucao_solicitada': return 'O reembolso sai quando a devolução chegar, em alguns minutos.'
    default: return null
  }
}

function PixPanel({ order, onChange }: { order: Order; onChange: (order: Order) => void }) {
  const [copied, setCopied] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const code = order.pix.copia_e_cola ?? ''

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('Não consegui copiar. Selecione o código e copie manualmente.')
    }
  }

  async function pay() {
    setError('')
    setPaying(true)
    try {
      onChange(await payPix(order.pix.txid))
    } catch (caught) {
      setError(errorMessage(caught))
      // 409: o Pix venceu ou o pedido mudou; relê para mostrar o status certo.
      if (caught instanceof ApiError && caught.status === 409) getOrder(order.id).then(onChange).catch(() => undefined)
      setPaying(false)
    }
  }

  return (
    <section className="panel" aria-labelledby="pix-titulo">
      <div className="panel-header"><h2 id="pix-titulo">Pague com Pix</h2></div>
      <div className="panel-body pix">
        <div className="stack">
          <p className="price pix-total">{formatBRL(order.total)}</p>
          {order.pix.expira_em && <p className="text-small">Vence às <strong>{formatTime(order.pix.expira_em)}</strong>. Se não pagar até lá, o pedido expira e nada é cobrado.</p>}
          {order.pix.qr_code_base64 && <img className="pix-qr" src={`data:image/png;base64,${order.pix.qr_code_base64}`} alt="QR code do Pix" />}
        </div>

        <div className="stack">
          <div className="field">
            <label className="field-label" htmlFor="pix-codigo">Pix copia e cola</label>
            <div className="pix-copy">
              <input className="input pix-code" id="pix-codigo" readOnly value={code} onFocus={(event) => event.currentTarget.select()} />
              <button className="btn btn-secondary" type="button" onClick={copy}>
                {copied ? <><Check aria-hidden="true" />Copiado</> : <><Copy aria-hidden="true" />Copiar</>}
              </button>
            </div>
            <span className="sr-only" role="status">{copied ? 'Código Pix copiado.' : ''}</span>
          </div>
          <p className="text-small text-muted">Este Pix é simulado: nenhum banco recebe o código. O botão abaixo faz o papel do banco confirmando o pagamento.</p>
          {error && <div className="alert alert-danger" role="alert"><CircleAlert aria-hidden="true" /><p>{error}</p></div>}
          <div>
            <button className="btn btn-primary" type="button" onClick={pay} aria-busy={paying} disabled={paying}>
              <QrCode aria-hidden="true" />{paying ? 'Confirmando…' : `Simular pagamento de ${formatBRL(order.total)}`}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function ReceiptPanel({ order }: { order: Order }) {
  const stores = [...new Set(order.itens.map((item) => item.loja))]
  const paidAt = order.pix.pago_em

  return (
    <section className="panel" aria-labelledby="comprovante-titulo">
      <div className="panel-header"><h2 id="comprovante-titulo">Comprovante</h2></div>
      <div className="panel-body stack">
        <dl className="summary-list">
          <div><dt>Pedido</dt><dd>{orderCode(order.id)}</dd></div>
          <div><dt>Total</dt><dd className="price">{formatBRL(order.total)}</dd></div>
          <div><dt>{stores.length === 1 ? 'Loja' : 'Lojas'}</dt><dd>{joinList(stores)}</dd></div>
          <div><dt>Criado em</dt><dd>{formatDateTime(order.criado_em)}</dd></div>
          {paidAt && <div><dt>Pago em</dt><dd>{formatDateTime(paidAt)}</dd></div>}
          {order.reembolso && <div><dt>Reembolso simulado</dt><dd>{formatBRL(order.reembolso.valor)} · {formatDateTime(order.reembolso.em)}</dd></div>}
          {order.devolucao && <div><dt>Motivo da devolução</dt><dd>{order.devolucao.motivo}</dd></div>}
          {order.entrega.simulada && <div><dt>Entrega</dt><dd>Simulada</dd></div>}
        </dl>

        <details className="authorization-items" open>
          <summary>{plural(itemCount(order.itens), 'item', 'itens')} no pedido</summary>
          <ul>
            {order.itens.map((item) => (
              <li key={item.id_externo}>
                <span>{item.quantidade}× {item.titulo} <span className="text-muted">· {item.loja}</span></span>
                <span className="num">{formatBRL(item.preco * item.quantidade)}</span>
              </li>
            ))}
          </ul>
        </details>
        {paidAt && <p className="text-caption">Código da transação Pix: <span className="pix-txid">{order.pix.txid}</span></p>}
        <div><Link className="btn btn-ghost btn-sm" to={`/compras/${order.solicitacao_id}`}>Ver a lista que originou o pedido</Link></div>
      </div>
    </section>
  )
}

function HistoryPanel({ order }: { order: Order }) {
  const next = nextStep(order)
  return (
    <section className="panel" aria-labelledby="historico-titulo">
      <div className="panel-header"><h2 id="historico-titulo">Acompanhamento</h2></div>
      <div className="panel-body stack">
        <ol className="timeline">
          {order.historico.map((entry, index) => {
            const Icon = statusIcon('pedido', entry.status)
            return (
              <li className="timeline-item" key={`${entry.status}-${index}`}>
                <span className="timeline-marker"><Icon aria-hidden="true" /></span>
                <div className="timeline-content">
                  <div className="timeline-meta"><time dateTime={entry.em}>{formatDateTime(entry.em)}</time></div>
                  <p className="timeline-title">{historyTitle(entry.status, order)}</p>
                </div>
              </li>
            )
          })}
        </ol>
        {next && <p className="text-small text-muted">{next}</p>}
      </div>
    </section>
  )
}

function CancelBox({ order, onChange }: { order: Order; onChange: (order: Order) => void }) {
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const keepRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { if (confirming) keepRef.current?.focus() }, [confirming])

  async function confirm() {
    setError('')
    setSending(true)
    try {
      onChange(await cancelOrder(order.id))
    } catch (caught) {
      setError(errorMessage(caught))
      setSending(false)
    }
  }

  const consequence = order.status === 'aguardando_pagamento'
    ? 'O Pix deixa de valer e nada é cobrado.'
    : `Você recebe o reembolso simulado de ${formatBRL(order.total)}.`

  if (!confirming) {
    return (
      <div className="stack">
        <p className="text-small">Mudou de ideia? Dá para cancelar até a entrega. {consequence}</p>
        <div><button className="btn btn-secondary" type="button" onClick={() => setConfirming(true)}>Cancelar pedido</button></div>
      </div>
    )
  }

  return (
    <div className="policy-confirm" role="group" aria-labelledby="cancelar-pedido" onKeyDown={(event) => { if (event.key === 'Escape' && !sending) setConfirming(false) }}>
      <p id="cancelar-pedido"><strong>Cancelar o pedido {orderCode(order.id)}?</strong> {consequence} Isso não pode ser desfeito.</p>
      {error && <div className="alert alert-danger" role="alert"><CircleAlert aria-hidden="true" /><p>{error}</p></div>}
      <div className="row">
        <button className="btn btn-danger" type="button" onClick={confirm} aria-busy={sending} disabled={sending}>{sending ? 'Cancelando…' : 'Cancelar pedido'}</button>
        <button ref={keepRef} className="btn btn-secondary" type="button" onClick={() => setConfirming(false)} disabled={sending}>Manter pedido</button>
      </div>
    </div>
  )
}

function ReturnForm({ order, onChange }: { order: Order; onChange: (order: Order) => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [errors, setErrors] = useState<FormErrors<(typeof RETURN_FIELDS)[number]> | null>(null)
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const deadline = returnDeadline(order)
  const fieldError = errors?.fields.motivo

  useEffect(() => { if (open) fieldRef.current?.focus() }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = reason.trim()
    if (text.length < RETURN_REASON_LIMITS[0]) {
      setErrors({ message: '', fields: { motivo: 'Conte em poucas palavras o motivo da devolução.' } })
      fieldRef.current?.focus()
      return
    }
    setErrors(null)
    setSending(true)
    try {
      onChange(await requestReturn(order.id, text))
    } catch (caught) {
      setErrors(formErrors(caught, RETURN_FIELDS))
      setSending(false)
    }
  }

  if (!open) {
    return (
      <div className="stack">
        <p className="text-small">Não ficou bom? Você pode devolver até {deadline ? formatDateTime(deadline) : 'sete dias depois da entrega'} e recebe o reembolso simulado de {formatBRL(order.total)}.</p>
        <div><button className="btn btn-secondary" type="button" onClick={() => setOpen(true)}><RotateCcw aria-hidden="true" />Pedir devolução</button></div>
      </div>
    )
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      {errors?.message && <div className="alert alert-danger" role="alert"><CircleAlert aria-hidden="true" /><p>{errors.message}</p></div>}
      <div className="field">
        <label className="field-label" htmlFor="devolucao-motivo">Por que você quer devolver?</label>
        <textarea
          ref={fieldRef}
          className="input"
          id="devolucao-motivo"
          value={reason}
          maxLength={RETURN_REASON_LIMITS[1]}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? 'devolucao-motivo-erro' : 'devolucao-motivo-dica'}
        />
        {fieldError
          ? <FieldError id="devolucao-motivo-erro" text={fieldError} />
          : <span className="field-hint" id="devolucao-motivo-dica">Ex.: "o leite veio com a embalagem amassada". {reason.length}/{RETURN_REASON_LIMITS[1]}</span>}
      </div>
      <div className="row">
        <button className="btn btn-primary" type="submit" aria-busy={sending} disabled={sending}>{sending ? 'Enviando…' : 'Pedir devolução'}</button>
        <button className="btn btn-secondary" type="button" onClick={() => { setOpen(false); setErrors(null) }} disabled={sending}>Desistir</button>
      </div>
    </form>
  )
}

function ActionsPanel({ order, onChange }: { order: Order; onChange: (order: Order) => void }) {
  const cancel = canCancelOrder(order.status)
  const devolve = canReturn(order)
  if (!cancel && !devolve) return null
  return (
    <section className="panel" aria-labelledby="acoes-titulo">
      <div className="panel-header"><h2 id="acoes-titulo">{devolve ? 'Devolução' : 'Cancelamento'}</h2></div>
      <div className="panel-body">
        {devolve ? <ReturnForm order={order} onChange={onChange} /> : <CancelBox order={order} onChange={onChange} />}
      </div>
    </section>
  )
}

function TicketsSection({ orderId }: { orderId: string }) {
  const load = useCallback(() => listTickets(orderId), [orderId])
  const { data: tickets, error, loading, reload, setData } = useResource(load)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [errors, setErrors] = useState<FormErrors<(typeof TICKET_FIELDS)[number]> | null>(null)
  const subjectRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields: FormErrors<(typeof TICKET_FIELDS)[number]>['fields'] = {}
    if (subject.trim().length < TICKET_LIMITS.assunto[0]) fields.assunto = 'Escreva o assunto em poucas palavras.'
    if (message.trim().length < TICKET_LIMITS.mensagem[0]) fields.mensagem = 'Conte o que aconteceu com pelo menos 10 caracteres.'
    if (fields.assunto || fields.mensagem) {
      setErrors({ message: '', fields })
      ;(fields.assunto ? subjectRef : messageRef).current?.focus()
      return
    }
    setErrors(null)
    setNotice('')
    setSending(true)
    try {
      const ticket = await createTicket(orderId, { assunto: subject, mensagem: message })
      setData((current) => [ticket, ...(current ?? [])])
      setSubject('')
      setMessage('')
      setNotice(`Chamado "${ticket.assunto}" aberto. Ele fica registrado com o pedido e na auditoria.`)
    } catch (caught) {
      setErrors(formErrors(caught, TICKET_FIELDS))
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="panel" aria-labelledby="chamados-titulo">
      <div className="panel-header"><h2 id="chamados-titulo">Chamados</h2></div>
      <div className="panel-body stack-lg">
        {Boolean(error) && !tickets && (
          <div className="alert alert-danger" role="alert">
            <CircleAlert aria-hidden="true" />
            <div className="stack">
              <p>Não consegui carregar os chamados. {errorMessage(error)}</p>
              <div><button className="btn btn-secondary btn-sm" type="button" onClick={reload}>Tentar de novo</button></div>
            </div>
          </div>
        )}
        {loading && !tickets && <span className="skeleton" aria-label="Carregando chamados" />}
        {tickets && tickets.length > 0 && (
          <ul className="ticket-list">
            {tickets.map((ticket: Ticket) => (
              <li className="ticket" key={ticket.id}>
                <div className="ticket-head">
                  <strong>{ticket.assunto}</strong>
                  <StatusBadge kind="chamado" status={ticket.status} />
                </div>
                <p className="text-small">{ticket.mensagem}</p>
                <span className="text-caption">Aberto em {formatDateTime(ticket.criado_em)}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="sr-only" role="status">{notice}</p>
        {notice && <div className="alert alert-success" aria-hidden="true"><CircleCheck aria-hidden="true" /><p>{notice}</p></div>}

        <form className="stack" onSubmit={handleSubmit} noValidate aria-labelledby="novo-chamado">
          <h3 id="novo-chamado">{tickets?.length ? 'Abrir outro chamado' : 'Algum problema com o pedido?'}</h3>
          {errors?.message && <div className="alert alert-danger" role="alert"><CircleAlert aria-hidden="true" /><p>{errors.message}</p></div>}
          <div className="field">
            <label className="field-label" htmlFor="chamado-assunto">Assunto</label>
            <input
              ref={subjectRef}
              className="input"
              id="chamado-assunto"
              value={subject}
              maxLength={TICKET_LIMITS.assunto[1]}
              placeholder="Ex.: Item faltando"
              onChange={(event) => setSubject(event.target.value)}
              aria-invalid={Boolean(errors?.fields.assunto)}
              aria-describedby={errors?.fields.assunto ? 'chamado-assunto-erro' : undefined}
            />
            <FieldError id="chamado-assunto-erro" text={errors?.fields.assunto} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="chamado-mensagem">O que aconteceu?</label>
            <textarea
              ref={messageRef}
              className="input"
              id="chamado-mensagem"
              value={message}
              maxLength={TICKET_LIMITS.mensagem[1]}
              onChange={(event) => setMessage(event.target.value)}
              aria-invalid={Boolean(errors?.fields.mensagem)}
              aria-describedby={errors?.fields.mensagem ? 'chamado-mensagem-erro' : 'chamado-mensagem-dica'}
            />
            {errors?.fields.mensagem
              ? <FieldError id="chamado-mensagem-erro" text={errors.fields.mensagem} />
              : <span className="field-hint" id="chamado-mensagem-dica">{message.length}/{TICKET_LIMITS.mensagem[1]}</span>}
          </div>
          <div>
            <button className="btn btn-secondary" type="submit" aria-busy={sending} disabled={sending}>
              <LifeBuoy aria-hidden="true" />{sending ? 'Abrindo…' : 'Abrir chamado'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export function OrderPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const justCreated = Boolean((location.state as { created?: boolean } | null)?.created)
  const load = useCallback(() => getOrder(id), [id])
  const { data: order, error, loading, reload, setData } = useResource(load)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const status = order?.status

  useEffect(() => {
    if (!status || !isMoving(status)) return
    const timer = window.setInterval(() => { getOrder(id).then(setData).catch(() => undefined) }, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [id, status, setData])

  // Pagou, cancelou ou pediu devolução: o título muda e recebe o foco.
  function handleChange(updated: Order) {
    setData(updated)
    window.requestAnimationFrame(() => headingRef.current?.focus())
  }

  if (loading && !order) {
    return (
      <div className="page page-enter" aria-busy="true">
        <header className="page-header"><div><span className="text-label">Pedido</span><h1>Carregando…</h1></div></header>
        <section className="panel"><div className="panel-body stack"><span className="skeleton skeleton-title" /><span className="skeleton" /><span className="skeleton skeleton-short" /></div></section>
      </div>
    )
  }

  if (!order) {
    const missing = error instanceof ApiError && error.status === 404
    return (
      <div className="page page-enter">
        <header className="page-header"><div><span className="text-label">Pedido</span><h1>{missing ? 'Não encontrei este pedido' : 'Não consegui carregar'}</h1></div></header>
        <section className="panel">
          <div className="empty-state">
            <span className="empty-state-icon"><Package aria-hidden="true" /></span>
            <strong>{missing ? 'Ele pode ser de outra conta.' : errorMessage(error)}</strong>
            <div className="row">
              {!missing && <button className="btn btn-secondary" type="button" onClick={reload}>Tentar de novo</button>}
              <Link className="btn btn-primary" to="/pedidos">Ver pedidos</Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  const paidAt = statusTime(order, 'pago')

  return (
    <div className="page page-enter">
      <header className="page-header">
        <div>
          <span className="text-label">Pedido {orderCode(order.id)}</span>
          <h1 ref={headingRef} tabIndex={-1}>{TITLES[order.status]}</h1>
          <p>{plural(itemCount(order.itens), 'item', 'itens')} · {formatBRL(order.total)} · criado em {formatDateTime(order.criado_em)}</p>
        </div>
        <div className="request-header-side">
          <StatusBadge kind="pedido" status={order.status} />
          <Link className="btn btn-ghost btn-sm" to="/pedidos">Todos os pedidos</Link>
        </div>
      </header>

      {justCreated && order.status === 'aguardando_pagamento' && (
        <div className="alert alert-success" role="status">
          <CircleCheck aria-hidden="true" />
          <p>Usei a sua autorização e gerei o Pix de {formatBRL(order.total)}. Agora é só pagar.</p>
        </div>
      )}
      {order.status === 'pago' && paidAt && (
        <div className="alert alert-success" role="status">
          <CircleCheck aria-hidden="true" />
          <p>Recebi o pagamento de {formatBRL(order.total)} às {formatTime(paidAt)}. A lista foi concluída.</p>
        </div>
      )}
      {order.status === 'expirado' && (
        <div className="alert alert-warning">
          <CircleAlert aria-hidden="true" />
          <p>O Pix venceu sem pagamento, então nada foi cobrado. Para comprar de novo, <Link to="/compras/nova">faça uma nova lista</Link>.</p>
        </div>
      )}

      {order.status === 'aguardando_pagamento' && <PixPanel order={order} onChange={handleChange} />}

      <div className="order-grid">
        <HistoryPanel order={order} />
        <ReceiptPanel order={order} />
      </div>

      <ActionsPanel order={order} onChange={handleChange} />
      <TicketsSection orderId={order.id} />
    </div>
  )
}
