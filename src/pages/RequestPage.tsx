import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CircleAlert, CircleCheck, Info, Search, SearchX, ShieldCheck, ShieldX, TriangleAlert, Zap } from 'lucide-react'
import { ApiError } from '../api/client'
import type { Authorization } from '../api/autorizacoes'
import { cancelRequest, canCancel, getRequest, offerTotal, POLL_INTERVAL_MS, sortOffers, type Offer, type PurchaseRequest } from '../api/solicitacoes'
import { ApprovalDialog } from '../components/ApprovalDialog'
import { OfferCard } from '../components/OfferCard'
import { StatusBadge } from '../components/StatusBadge'
import { useResource } from '../hooks/useResource'
import { atStore, formatBRL, formatDateTime, formatTime } from '../utils/format'

const TITLES: Record<PurchaseRequest['status'], string> = {
  processando: 'Buscando ofertas…',
  com_resultado: 'Ofertas encontradas',
  sem_resultado: 'Não encontrei ofertas',
  aprovada: 'Compra aprovada',
  cancelada: 'Solicitação cancelada',
}

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : 'Não foi possível concluir. Tente de novo.'
}

function CancelBox({ request, onCancelled, onClose }: { request: PurchaseRequest; onCancelled: () => void; onClose: () => void }) {
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const keepRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { keepRef.current?.focus() }, [])

  async function confirm() {
    setError('')
    setCancelling(true)
    try {
      await cancelRequest(request.id)
      onCancelled()
    } catch (caught) {
      setError(errorMessage(caught))
      setCancelling(false)
    }
  }

  return (
    <div className="policy-confirm" role="group" aria-labelledby="cancelar-texto" onKeyDown={(event) => { if (event.key === 'Escape' && !cancelling) onClose() }}>
      <p id="cancelar-texto"><strong>Cancelar esta solicitação?</strong> Eu paro de buscar e nenhuma oferta dela poderá ser aprovada. Não dá para desfazer.</p>
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

function Summary({ request }: { request: PurchaseRequest }) {
  const inside = request.ofertas.filter((offer) => offer.dentro_da_politica).length
  const total = request.ofertas.length

  if (request.status === 'aprovada') {
    const authorization = request.autorizacao
    return (
      <div className="alert alert-success">
        {authorization?.automatica ? <Zap aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}
        <p>
          {!authorization && 'Esta compra foi aprovada. '}
          {authorization?.automatica &&
            `Comprei ${authorization.titulo} por ${formatBRL(authorization.valor_maximo)} ${atStore(authorization.loja)} sozinho, porque cabia na sua política ${authorization.politica_nome ?? 'automática'}. Se não quiser, revogue até ${formatTime(authorization.expira_em)}. `}
          {authorization && !authorization.automatica &&
            `Você aprovou ${authorization.titulo}: até ${formatBRL(authorization.valor_maximo)} ${atStore(authorization.loja)}, válido até ${formatTime(authorization.expira_em)} e para um uso só. `}
          Acompanhe em <Link to="/autorizacoes">Autorizações</Link>.
        </p>
      </div>
    )
  }
  if (request.status === 'cancelada') {
    return (
      <div className="alert alert-info">
        <Info aria-hidden="true" />
        <p>Você cancelou esta solicitação em {formatDateTime(request.atualizada_em)}. As ofertas ficam aqui só para consulta.</p>
      </div>
    )
  }
  if (!inside) {
    return (
      <div className="alert alert-warning">
        <TriangleAlert aria-hidden="true" />
        <p>Encontrei {total} {total === 1 ? 'oferta' : 'ofertas'}, mas nenhuma cabe nas suas políticas. Ajuste uma <Link to="/politicas">política</Link> ou descreva a compra de outro jeito.</p>
      </div>
    )
  }
  return (
    <p className="request-summary">
      <ShieldCheck aria-hidden="true" />
      Encontrei {total} {total === 1 ? 'oferta' : 'ofertas'}; {inside === total ? (total === 1 ? 'ela cabe' : 'todas cabem') : `${inside} ${inside === 1 ? 'cabe' : 'cabem'}`} nas suas políticas.
    </p>
  )
}

export function RequestPage() {
  const { id = '' } = useParams()
  const load = useCallback(() => getRequest(id), [id])
  const { data: request, error, loading, reload, setData } = useResource(load)
  const [confirming, setConfirming] = useState(false)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [approving, setApproving] = useState<Offer | null>(null)

  // Enquanto a API busca e ranqueia, pergunta de novo até sair de "processando".
  useEffect(() => {
    if (request?.status !== 'processando') return
    const timer = window.setTimeout(() => {
      getRequest(id).then(setData).catch(() => undefined)
    }, POLL_INTERVAL_MS)
    return () => window.clearTimeout(timer)
  }, [id, request, setData])

  if (loading && !request) {
    return (
      <div className="page page-enter" aria-busy="true">
        <header className="page-header"><div><span className="text-label">Resultado da busca</span><h1>Carregando…</h1></div></header>
        <div className="offer-list">
          {[0, 1].map((item) => (
            <div className="card stack" key={item}><span className="skeleton skeleton-title" /><span className="skeleton" /><span className="skeleton skeleton-short" /></div>
          ))}
        </div>
      </div>
    )
  }

  if (!request) {
    const missing = error instanceof ApiError && error.status === 404
    return (
      <div className="page page-enter">
        <header className="page-header"><div><span className="text-label">Resultado da busca</span><h1>{missing ? 'Não encontrei esta solicitação' : 'Não consegui carregar'}</h1></div></header>
        <section className="panel">
          <div className="empty-state">
            <span className="empty-state-icon"><SearchX aria-hidden="true" /></span>
            <strong>{missing ? 'Ela pode ser de outra conta, ou esta parte ainda está sendo conectada na API.' : errorMessage(error)}</strong>
            <div className="row">
              {!missing && <button className="btn btn-secondary" type="button" onClick={reload}>Tentar de novo</button>}
              <Link className="btn btn-primary" to="/compras/nova"><Search aria-hidden="true" />Nova compra</Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  function handleApproved(authorization: Authorization) {
    setData((current) => current && { ...current, status: 'aprovada', autorizacao: authorization, atualizada_em: authorization.criada_em })
  }

  function closeApproval() {
    const offerId = approving?.id
    setApproving(null)
    // Volta para o botão que abriu o modal; se a compra foi aprovada, ele sumiu e o foco vai para o título.
    window.requestAnimationFrame(() => {
      const button = offerId ? document.getElementById(`aprovar-${offerId}`) : null
      ;(button ?? headingRef.current)?.focus()
    })
  }

  function offerActions(offer: Offer, isTop: boolean) {
    if (request?.status !== 'com_resultado') return undefined
    if (!offer.dentro_da_politica) {
      return <button className="btn btn-secondary" type="button" disabled><ShieldX aria-hidden="true" />Fora da política</button>
    }
    return (
      <button id={`aprovar-${offer.id}`} className={isTop ? 'btn btn-primary' : 'btn btn-secondary'} type="button" onClick={() => setApproving(offer)}>
        Aprovar compra de {formatBRL(offerTotal(offer))}
      </button>
    )
  }

  const offers = sortOffers(request.ofertas)
  const topId = request.status === 'com_resultado' || request.status === 'aprovada' ? offers.find((offer) => offer.dentro_da_politica)?.id : undefined

  return (
    <div className="page page-enter">
      <header className="page-header">
        <div>
          <span className="text-label">Resultado da busca</span>
          <h1 ref={headingRef} tabIndex={-1}>{TITLES[request.status]}</h1>
          <p>Você pediu: <q>{request.intencao}</q> · {formatDateTime(request.criada_em)}</p>
        </div>
        <div className="request-header-side">
          <StatusBadge kind="solicitacao" status={request.status} />
          {canCancel(request.status) && !confirming && (
            <button ref={cancelButtonRef} className="btn btn-secondary btn-sm" type="button" onClick={() => setConfirming(true)}>Cancelar solicitação</button>
          )}
        </div>
      </header>

      {confirming && (
        <CancelBox
          request={request}
          onCancelled={() => {
            setConfirming(false)
            setData({ ...request, status: 'cancelada', atualizada_em: new Date().toISOString() })
            // O botão de cancelar some; o foco vai para o título, que agora diz "Solicitação cancelada".
            window.requestAnimationFrame(() => headingRef.current?.focus())
          }}
          onClose={() => { setConfirming(false); window.requestAnimationFrame(() => cancelButtonRef.current?.focus()) }}
        />
      )}

      <p className="sr-only" role="status">{request.status === 'processando' ? 'Buscando ofertas.' : TITLES[request.status]}</p>

      {request.status === 'processando' && (
        <section className="panel" aria-busy="true">
          <div className="panel-body stack">
            <p className="text-small text-muted">Estou consultando o catálogo e comparando preço, frete, prazo e avaliação. Isso leva alguns segundos.</p>
            <span className="skeleton skeleton-title" />
            <span className="skeleton" />
            <span className="skeleton skeleton-short" />
          </div>
        </section>
      )}

      {request.status === 'sem_resultado' && (
        <section className="panel">
          <div className="empty-state">
            <span className="empty-state-icon"><SearchX aria-hidden="true" /></span>
            <strong>Não encontrei nada no catálogo para essa descrição.</strong>
            <p>Tente com outras palavras, diga a categoria ("fone", "cadeira") ou deixe o pedido menos específico.</p>
            <Link className="btn btn-primary" to="/compras/nova" state={{ description: request.intencao }}><Search aria-hidden="true" />Descrever de outro jeito</Link>
          </div>
        </section>
      )}

      {offers.length > 0 && (
        <>
          <Summary request={request} />
          <ol className="offer-list" aria-label="Ofertas ranqueadas">
            {offers.map((offer) => (
              <li key={offer.id}><OfferCard offer={offer} isTop={offer.id === topId} actions={offerActions(offer, offer.id === topId)} /></li>
            ))}
          </ol>
        </>
      )}

      {approving && <ApprovalDialog requestId={request.id} offer={approving} onClose={closeApproval} onApproved={handleApproved} />}
    </div>
  )
}
