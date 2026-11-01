import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CircleAlert, KeyRound, Search } from 'lucide-react'
import { effectiveStatus, itemCount, listAuthorizations, revokeAuthorization, type Authorization } from '../api/autorizacoes'
import { GeneratePixButton } from '../components/GeneratePixButton'
import { StatusBadge } from '../components/StatusBadge'
import { useResource } from '../hooks/useResource'
import { atStores, formatBRL, formatDateTime, formatTime, joinList, plural } from '../utils/format'

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : 'Não foi possível concluir. Tente de novo.'
}

type CardProps = {
  authorization: Authorization
  onRevoked: (authorization: Authorization) => void
  // Ação principal da autorização ativa (ex.: gerar o Pix do pedido).
  action?: ReactNode
}

function AuthorizationCard({ authorization, onRevoked, action }: CardProps) {
  const [confirming, setConfirming] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState('')
  const keepRef = useRef<HTMLButtonElement>(null)
  const revokeRef = useRef<HTMLButtonElement>(null)
  const wasConfirming = useRef(false)
  const titleId = `autorizacao-${authorization.id}`
  const units = itemCount(authorization.itens)

  // Ao abrir a confirmação, o foco vai para "Manter"; ao fechar, volta para "Revogar".
  useEffect(() => {
    if (confirming) keepRef.current?.focus()
    else if (wasConfirming.current) revokeRef.current?.focus()
    wasConfirming.current = confirming
  }, [confirming])

  async function confirm() {
    setError('')
    setRevoking(true)
    try {
      await revokeAuthorization(authorization.id)
      onRevoked(authorization)
    } catch (caught) {
      setError(errorMessage(caught))
      setRevoking(false)
    }
  }

  return (
    <article className="card authorization-card" aria-labelledby={titleId}>
      <div className="policy-card-head">
        <h3 id={titleId}>Cesta com {plural(units, 'item', 'itens')}</h3>
        <div className="row">
          <StatusBadge kind="autorizacao" status={effectiveStatus(authorization)} />
          <StatusBadge kind="autonomia" status={authorization.origem} />
        </div>
      </div>

      <dl className="summary-list">
        <div><dt>Valor máximo</dt><dd className="price">{formatBRL(authorization.valor_maximo)}</dd></div>
        <div><dt>{authorization.lojas.length === 1 ? 'Loja' : 'Lojas'}</dt><dd>{joinList(authorization.lojas)}</dd></div>
        <div><dt>Vale até</dt><dd>{formatDateTime(authorization.expira_em)}</dd></div>
      </dl>

      <details className="authorization-items">
        <summary>Ver os {plural(units, 'item', 'itens')} autorizados</summary>
        <ul>
          {authorization.itens.map((item) => (
            <li key={item.id_externo}>
              <span>{item.quantidade}× {item.titulo}</span>
              <span className="num">{formatBRL(item.preco * item.quantidade)}</span>
            </li>
          ))}
        </ul>
      </details>

      {error && <div className="alert alert-danger" role="alert"><CircleAlert aria-hidden="true" /><p>{error}</p></div>}

      {confirming ? (
        <div className="policy-confirm" role="group" aria-labelledby={`${titleId}-confirmar`} onKeyDown={(event) => { if (event.key === 'Escape' && !revoking) setConfirming(false) }}>
          <p id={`${titleId}-confirmar`}>
            <strong>Revogar a autorização de {formatBRL(authorization.valor_maximo)} {atStores(authorization.lojas)}?</strong>
            {' '}O valor deixa de estar reservado e a lista volta a esperar a sua aprovação.
          </p>
          <div className="row">
            <button className="btn btn-danger btn-sm" type="button" onClick={confirm} aria-busy={revoking} disabled={revoking}>
              {revoking ? 'Revogando…' : 'Revogar autorização'}
            </button>
            <button ref={keepRef} className="btn btn-secondary btn-sm" type="button" onClick={() => setConfirming(false)} disabled={revoking}>Manter</button>
          </div>
        </div>
      ) : (
        <div className="policy-card-actions">
          <div className="row">
            <Link className="btn btn-ghost btn-sm" to={`/compras/${authorization.solicitacao_id}`}>Ver lista</Link>
            <button ref={revokeRef} className="btn btn-secondary btn-sm" type="button" onClick={() => setConfirming(true)}>
              <Ban aria-hidden="true" />Revogar
            </button>
          </div>
          {action}
        </div>
      )}
    </article>
  )
}

export function AuthorizationsPage() {
  const { data: authorizations, error, loading, reload, setData } = useResource(listAuthorizations)
  const [notice, setNotice] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  // A API já filtra as vencidas; a tela também esconde as que venceram enquanto estava aberta.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  function handleRevoked(revoked: Authorization) {
    setData((current) => current?.filter((item) => item.id !== revoked.id))
    setNotice(`Autorização de ${formatBRL(revoked.valor_maximo)} revogada. A lista voltou a esperar a sua aprovação.`)
    // O card some; o foco vai para o título da página para não se perder.
    window.requestAnimationFrame(() => headingRef.current?.focus())
  }

  const active = authorizations?.filter((item) => effectiveStatus(item, now) === 'ativa') ?? []

  return (
    <div className="page page-enter">
      <header className="page-header">
        <div>
          <span className="text-label">Aprovação e pagamento</span>
          <h1 ref={headingRef} tabIndex={-1}>Autorizações</h1>
          <p>Cada aprovação vira uma autorização limitada: um valor máximo, as lojas e os itens da cesta, uso único e validade curta. Enquanto ela estiver ativa, você gera o Pix do pedido ou revoga.</p>
        </div>
      </header>

      <p className="sr-only" role="status">{notice}</p>
      {notice && <div className="alert alert-success" aria-hidden="true"><Ban aria-hidden="true" /><p>{notice}</p></div>}

      {loading && !authorizations && (
        <div className="policy-grid" aria-busy="true" aria-label="Carregando autorizações">
          {[0, 1].map((item) => (
            <div className="card stack" key={item}><span className="skeleton skeleton-title" /><span className="skeleton" /><span className="skeleton skeleton-short" /></div>
          ))}
        </div>
      )}

      {Boolean(error) && !authorizations && (
        <div className="alert alert-danger" role="alert">
          <CircleAlert aria-hidden="true" />
          <div className="stack">
            <p><strong>Não consegui carregar suas autorizações.</strong> {errorMessage(error)}</p>
            <div><button className="btn btn-secondary btn-sm" type="button" onClick={reload}>Tentar de novo</button></div>
          </div>
        </div>
      )}

      {authorizations && (active.length ? (
        <section className="stack" aria-labelledby="autorizacoes-ativas">
          <h2 id="autorizacoes-ativas">Ativas agora</h2>
          <div className="policy-grid">
            {active.map((item) => <AuthorizationCard key={item.id} authorization={item} onRevoked={handleRevoked} action={<GeneratePixButton authorization={item} />} />)}
          </div>
          <p className="text-small text-muted">A primeira vence às {formatTime(active[active.length - 1].expira_em)}. As usadas viram pedidos; as revogadas e vencidas ficam na <Link to="/auditoria">auditoria</Link>.</p>
        </section>
      ) : (
        <section className="panel">
          <div className="empty-state">
            <span className="empty-state-icon"><KeyRound aria-hidden="true" /></span>
            <strong>Nenhuma autorização ativa.</strong>
            <p>Quando você aprovar uma cesta, a autorização aparece aqui por alguns minutos, até virar pedido. As usadas, revogadas e vencidas ficam na auditoria.</p>
            <Link className="btn btn-primary" to="/compras/nova"><Search aria-hidden="true" />Nova compra</Link>
          </div>
        </section>
      ))}
    </div>
  )
}
