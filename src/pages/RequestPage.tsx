import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCheck, CircleAlert, CircleCheck, Clock, Search, SearchX, ShieldCheck, ShieldX, Zap } from 'lucide-react'
import type { Authorization } from '../api/autorizacoes'
import { ApiError } from '../api/client'
import { listPolicies } from '../api/politicas'
import { canApprove, cancelRequest, canCancel, getRequest, requestTitle, type PurchaseRequest, type RequestItem } from '../api/solicitacoes'
import { ApprovalDialog } from '../components/ApprovalDialog'
import { OfferCard } from '../components/OfferCard'
import { StatusBadge } from '../components/StatusBadge'
import { useResource } from '../hooks/useResource'
import { formatBRL, formatDateTime, joinList, plural } from '../utils/format'

function title(request: PurchaseRequest) {
  switch (request.status) {
    case 'aguardando_aprovacao': return request.avaliacao.permitida ? 'Sua cesta está pronta' : 'Sua cesta precisa de ajuste'
    case 'sem_resultado': return 'Não encontrei nada da lista'
    case 'aprovada': return request.compra_automatica ? 'Comprei dentro da sua política' : 'Compra aprovada'
    case 'concluida': return 'Compra concluída'
    case 'expirada': return 'Esta compra expirou'
  }
}

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : 'Não foi possível concluir. Tente de novo.'
}

function CancelBox({ request, onClose }: { request: PurchaseRequest; onClose: () => void }) {
  const navigate = useNavigate()
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const keepRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { keepRef.current?.focus() }, [])

  async function confirm() {
    setError('')
    setCancelling(true)
    try {
      await cancelRequest(request.id)
      navigate('/compras/nova', { state: { notice: 'Solicitação cancelada. Ela saiu do seu histórico.' } })
    } catch (caught) {
      setError(errorMessage(caught))
      setCancelling(false)
    }
  }

  return (
    <div className="policy-confirm" role="group" aria-labelledby="cancelar-texto" onKeyDown={(event) => { if (event.key === 'Escape' && !cancelling) onClose() }}>
      <p id="cancelar-texto"><strong>Cancelar esta solicitação?</strong> Ela sai do seu histórico e nada desta cesta poderá ser aprovado. Não dá para desfazer.</p>
      {error && <p className="field-error" role="alert"><CircleAlert aria-hidden="true" />{error}</p>}
      <div className="row">
        <button className="btn btn-danger btn-sm" type="button" onClick={confirm} aria-busy={cancelling} disabled={cancelling}>
          {cancelling ? 'Cancelando…' : 'Cancelar solicitação'}
        </button>
        <button ref={keepRef} className="btn btn-secondary btn-sm" type="button" onClick={onClose} disabled={cancelling}>Manter</button>
      </div>
    </div>
  )
}

// O que aconteceu depois da aprovação, em uma frase com o próximo passo.
function StatusNotice({ request, policyName }: { request: PurchaseRequest; policyName: string | null }) {
  const total = formatBRL(request.cesta.total)
  if (request.status === 'aprovada' && request.compra_automatica) {
    return (
      <div className="alert alert-success">
        <Zap aria-hidden="true" />
        <p>
          Comprei esta cesta por {total} sozinho, porque ela cabia na sua política {policyName ?? 'automática'}.
          {' '}O Pix já foi gerado; se não quiser, cancele o pedido antes de pagar. Acompanhe em <Link to="/pedidos">Pedidos</Link>.
        </p>
      </div>
    )
  }
  if (request.status === 'aprovada') {
    return (
      <div className="alert alert-success">
        <CircleCheck aria-hidden="true" />
        <p>Você aprovou esta cesta de {total}. A autorização vale por pouco tempo e para um uso só: acompanhe em <Link to="/autorizacoes">Autorizações</Link>.</p>
      </div>
    )
  }
  if (request.status === 'concluida') {
    return (
      <div className="alert alert-info">
        <CheckCheck aria-hidden="true" />
        <p>O pagamento de {total} foi confirmado. O comprovante e a entrega estão em <Link to="/pedidos">Pedidos</Link>.</p>
      </div>
    )
  }
  if (request.status === 'expirada') {
    return (
      <div className="alert alert-warning">
        <Clock aria-hidden="true" />
        <p>O Pix venceu ou o pedido foi cancelado antes do pagamento, então nada foi cobrado. Para comprar de novo, <Link to="/compras/nova" state={{ description: requestTitle(request) }}>faça uma nova lista</Link>.</p>
      </div>
    )
  }
  return null
}

function BasketPanel({ request, policyName, action }: { request: PurchaseRequest; policyName: string | null; action: ReactNode }) {
  const { cesta, avaliacao } = request
  const found = request.itens.filter((item) => item.recomendada).length

  return (
    <section className="panel" aria-labelledby="cesta-titulo">
      <div className="panel-header"><h2 id="cesta-titulo">Cesta</h2></div>
      <div className="panel-body basket">
        <dl className="summary-list">
          <div><dt>Itens com oferta</dt><dd>{found} de {request.itens.length}</dd></div>
          <div><dt>Produtos</dt><dd className="num">{formatBRL(cesta.subtotal)}</dd></div>
          <div><dt>Frete</dt><dd className="num">{cesta.frete ? formatBRL(cesta.frete) : 'Grátis'}</dd></div>
          <div><dt>{cesta.lojas.length === 1 ? 'Loja' : 'Lojas'}</dt><dd>{joinList(cesta.lojas)}</dd></div>
          <div><dt>Total</dt><dd className="price">{formatBRL(cesta.total)}</dd></div>
        </dl>

        <div className="basket-side">
          {avaliacao.permitida ? (
            <p className="basket-policy">
              <ShieldCheck aria-hidden="true" />
              <span>
                {!avaliacao.politica_id && 'Nenhuma política ativa: posso comprar, mas só com a sua aprovação.'}
                {avaliacao.politica_id && (policyName ? <>Cabe na sua política <strong>{policyName}</strong>.</> : 'Cabe nas suas políticas.')}
                {avaliacao.compra_automatica && request.status === 'aguardando_aprovacao' && ' Ela permite compra automática, mas desta vez preciso da sua aprovação.'}
              </span>
            </p>
          ) : (
            <div className="alert alert-warning">
              <ShieldX aria-hidden="true" />
              <div className="stack">
                <p><strong>Nenhuma política permite esta cesta.</strong> Ajuste uma <Link to="/politicas">política</Link> ou mude a lista.</p>
                {avaliacao.motivos.length > 0 && <ul className="offer-reasons">{avaliacao.motivos.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
              </div>
            </div>
          )}
          {avaliacao.permitida && avaliacao.motivos.length > 0 && (
            <ul className="offer-reasons">{avaliacao.motivos.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          )}
          {action}
        </div>
      </div>
    </section>
  )
}

function ItemSection({ item, index }: { item: RequestItem; index: number }) {
  const headingId = `item-${index}`
  const notes = [...item.explicacao]
  if (item.descartadas) notes.push(`${plural(item.descartadas, 'oferta descartada', 'ofertas descartadas')} pelas políticas`)
  // A quantidade é de embalagens da oferta, não a que a pessoa escreveu ("2 kg de feijão" vira 2 pacotes de 1 kg).
  // Quando a API ajustou, a explicação já conta; senão, a tela diz quantas embalagens entram na cesta.
  if (item.recomendada && !notes.some((note) => /embalage/i.test(note))) notes.unshift(`${plural(item.quantidade, 'embalagem', 'embalagens')} na cesta`)

  return (
    <li className="basket-item" aria-labelledby={headingId}>
      <div className="basket-item-head">
        <h3 id={headingId}>{item.descricao}</h3>
        {notes.length > 0 && <span className="text-caption">{notes.join(' · ')}</span>}
      </div>
      {item.recomendada ? (
        <>
          <OfferCard offer={item.recomendada} position={1} quantity={item.quantidade} />
          {item.alternativas.length > 0 && (
            <details className="alternatives">
              <summary>Ver {plural(item.alternativas.length, 'alternativa')}</summary>
              <ol className="offer-list">
                {item.alternativas.map((offer, position) => (
                  <li key={offer.id_externo}><OfferCard offer={offer} position={position + 2} quantity={item.quantidade} /></li>
                ))}
              </ol>
            </details>
          )}
        </>
      ) : (
        <p className="basket-missing"><SearchX aria-hidden="true" />Não encontrei oferta para este item, então ele ficou fora da cesta.</p>
      )}
    </li>
  )
}

export function RequestPage() {
  const { id = '' } = useParams()
  const load = useCallback(() => getRequest(id), [id])
  const { data: request, error, loading, reload, setData } = useResource(load)
  const { data: policies } = useResource(listPolicies)
  const [confirming, setConfirming] = useState(false)
  const [approving, setApproving] = useState(false)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const approveButtonRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  if (loading && !request) {
    return (
      <div className="page page-enter" aria-busy="true">
        <header className="page-header"><div><span className="text-label">Sua lista</span><h1>Carregando…</h1></div></header>
        <section className="panel"><div className="panel-body stack"><span className="skeleton skeleton-title" /><span className="skeleton" /><span className="skeleton skeleton-short" /></div></section>
      </div>
    )
  }

  if (!request) {
    const missing = error instanceof ApiError && error.status === 404
    return (
      <div className="page page-enter">
        <header className="page-header"><div><span className="text-label">Sua lista</span><h1>{missing ? 'Não encontrei esta solicitação' : 'Não consegui carregar'}</h1></div></header>
        <section className="panel">
          <div className="empty-state">
            <span className="empty-state-icon"><SearchX aria-hidden="true" /></span>
            <strong>{missing ? 'Ela pode ter sido cancelada ou ser de outra conta.' : errorMessage(error)}</strong>
            <div className="row">
              {!missing && <button className="btn btn-secondary" type="button" onClick={reload}>Tentar de novo</button>}
              <Link className="btn btn-primary" to="/compras/nova"><Search aria-hidden="true" />Nova compra</Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  const policyName = policies?.find((policy) => policy.id === request.avaliacao.politica_id)?.nome ?? null

  function handleApproved(authorization: Authorization) {
    setData((current) => current && { ...current, status: 'aprovada', atualizada_em: authorization.criada_em })
  }

  function closeApproval() {
    setApproving(false)
    // Se aprovou, o botão sumiu e o foco vai para o título, que agora diz "Compra aprovada".
    window.requestAnimationFrame(() => (approveButtonRef.current ?? headingRef.current)?.focus())
  }

  const approveAction = canApprove(request) ? (
    <button ref={approveButtonRef} className="btn btn-primary" type="button" onClick={() => setApproving(true)}>
      Aprovar compra de {formatBRL(request.cesta.total)}
    </button>
  ) : null

  return (
    <div className="page page-enter">
      <header className="page-header">
        <div>
          <span className="text-label">Sua lista</span>
          <h1 ref={headingRef} tabIndex={-1}>{title(request)}</h1>
          <p>Você pediu: <q>{requestTitle(request)}</q> · {formatDateTime(request.criada_em)}</p>
        </div>
        <div className="request-header-side">
          <StatusBadge kind="solicitacao" status={request.status} />
          {request.avaliacao.compra_automatica && request.avaliacao.permitida && <StatusBadge kind="autonomia" status="automatica" />}
          {canCancel(request.status) && !confirming && (
            <button ref={cancelButtonRef} className="btn btn-secondary btn-sm" type="button" onClick={() => setConfirming(true)}>Cancelar solicitação</button>
          )}
        </div>
      </header>

      {confirming && (
        <CancelBox request={request} onClose={() => { setConfirming(false); window.requestAnimationFrame(() => cancelButtonRef.current?.focus()) }} />
      )}

      <StatusNotice request={request} policyName={policyName} />

      {request.status === 'sem_resultado' ? (
        <section className="panel">
          <div className="empty-state">
            <span className="empty-state-icon"><SearchX aria-hidden="true" /></span>
            <strong>Não encontrei no catálogo nenhum item desta lista.</strong>
            <p>Escreva um item por vez, separados por vírgula, com o nome que aparece na prateleira: "arroz 5kg, 2 leites, detergente".</p>
            <Link className="btn btn-primary" to="/compras/nova" state={{ description: requestTitle(request) }}><Search aria-hidden="true" />Escrever de outro jeito</Link>
          </div>
        </section>
      ) : (
        <>
          <BasketPanel request={request} policyName={policyName} action={approveAction} />
          <section className="stack" aria-labelledby="itens-titulo">
            <h2 id="itens-titulo">Itens da lista</h2>
            <ol className="basket-items">
              {request.itens.map((item, index) => <ItemSection key={`${item.descricao}-${index}`} item={item} index={index} />)}
            </ol>
          </section>
        </>
      )}

      {approving && <ApprovalDialog request={request} onClose={closeApproval} onApproved={handleApproved} />}
    </div>
  )
}
