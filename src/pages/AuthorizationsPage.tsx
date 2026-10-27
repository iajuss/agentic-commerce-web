import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CircleAlert, KeyRound, Search } from 'lucide-react'
import { isNotConnected } from '../api/client'
import { effectiveStatus, listAuthorizations, revokeAuthorization, type Authorization } from '../api/autorizacoes'
import { NotConnected } from '../components/NotConnected'
import { StatusBadge } from '../components/StatusBadge'
import { useResource } from '../hooks/useResource'
import { atStore, formatBRL, formatDateTime } from '../utils/format'

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : 'Não foi possível concluir. Tente de novo.'
}

type CardProps = { authorization: Authorization; onRevoked: (authorization: Authorization) => void }

function AuthorizationCard({ authorization, onRevoked }: CardProps) {
  const [confirming, setConfirming] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState('')
  const keepRef = useRef<HTMLButtonElement>(null)
  const revokeRef = useRef<HTMLButtonElement>(null)
  const wasConfirming = useRef(false)
  const status = effectiveStatus(authorization)
  const titleId = `autorizacao-${authorization.id}`

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
      onRevoked({ ...authorization, status: 'revogada' })
    } catch (caught) {
      setError(errorMessage(caught))
      setRevoking(false)
    }
  }

  return (
    <article className="card authorization-card" aria-labelledby={titleId}>
      <div className="policy-card-head">
        <h3 id={titleId}>{authorization.titulo}</h3>
        <div className="row">
          <StatusBadge kind="autorizacao" status={status} />
          <StatusBadge kind="autonomia" status={authorization.automatica ? 'automatica' : 'manual'} />
        </div>
      </div>

      <dl className="summary-list">
        <div><dt>Valor máximo</dt><dd className="price">{formatBRL(authorization.valor_maximo)}</dd></div>
        <div><dt>Loja</dt><dd>{authorization.loja}</dd></div>
        <div><dt>{status === 'ativa' ? 'Vale até' : 'Validade'}</dt><dd>{formatDateTime(authorization.expira_em)}</dd></div>
        {authorization.politica_nome && <div><dt>Política</dt><dd>{authorization.politica_nome}</dd></div>}
      </dl>

      {error && <div className="alert alert-danger" role="alert"><CircleAlert aria-hidden="true" /><p>{error}</p></div>}

      {confirming ? (
        <div className="policy-confirm" role="group" aria-labelledby={`${titleId}-confirmar`} onKeyDown={(event) => { if (event.key === 'Escape' && !revoking) setConfirming(false) }}>
          <p id={`${titleId}-confirmar`}>
            <strong>Revogar a autorização de {formatBRL(authorization.valor_maximo)} {atStore(authorization.loja)}?</strong>
            {' '}Esse valor deixa de estar reservado e a compra não acontece. Não dá para desfazer.
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
          <span className="text-caption">Criada em {formatDateTime(authorization.criada_em)}</span>
          <div className="row">
            {authorization.solicitacao_id && <Link className="btn btn-ghost btn-sm" to={`/compras/${authorization.solicitacao_id}`}>Ver solicitação</Link>}
            {status === 'ativa' && (
              <button ref={revokeRef} className="btn btn-secondary btn-sm" type="button" onClick={() => setConfirming(true)}>
                <Ban aria-hidden="true" />Revogar
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

export function AuthorizationsPage() {
  const { data: authorizations, error, loading, reload, setData } = useResource(listAuthorizations)
  const [notice, setNotice] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)

  function handleRevoked(updated: Authorization) {
    setData((current) => current?.map((item) => (item.id === updated.id ? updated : item)))
    setNotice(`Autorização de ${updated.titulo} revogada.`)
    // O card sai de "Ativas"; o foco vai para o título da página para não se perder.
    window.requestAnimationFrame(() => headingRef.current?.focus())
  }

  const now = Date.now()
  const active = authorizations?.filter((item) => effectiveStatus(item, now) === 'ativa') ?? []
  const past = authorizations?.filter((item) => effectiveStatus(item, now) !== 'ativa') ?? []

  return (
    <div className="page page-enter">
      <header className="page-header">
        <div>
          <span className="text-label">Aprovação e pagamento</span>
          <h1 ref={headingRef} tabIndex={-1}>Autorizações</h1>
          <p>Cada aprovação vira uma autorização limitada: um valor máximo, uma loja, uso único e validade curta. Enquanto estiver ativa, você pode revogar.</p>
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

      {Boolean(error) && !authorizations && (isNotConnected(error) ? <NotConnected message="Suas autorizações, com valor, loja e validade, vão aparecer aqui assim que a API tiver essa rota." /> : (
        <div className="alert alert-danger" role="alert">
          <CircleAlert aria-hidden="true" />
          <div className="stack">
            <p><strong>Não consegui carregar suas autorizações.</strong> {errorMessage(error)}</p>
            <div><button className="btn btn-secondary btn-sm" type="button" onClick={reload}>Tentar de novo</button></div>
          </div>
        </div>
      ))}

      {authorizations && (
        <>
          <section className="stack" aria-labelledby="autorizacoes-ativas">
            <h2 id="autorizacoes-ativas">Ativas agora</h2>
            {active.length ? (
              <div className="policy-grid">
                {active.map((item) => <AuthorizationCard key={item.id} authorization={item} onRevoked={handleRevoked} />)}
              </div>
            ) : (
              <section className="panel">
                <div className="empty-state">
                  <span className="empty-state-icon"><KeyRound aria-hidden="true" /></span>
                  <strong>Nenhuma autorização ativa.</strong>
                  <p>Quando você aprovar uma compra, ou o agente comprar dentro de uma política automática, a autorização aparece aqui.</p>
                  <Link className="btn btn-primary" to="/compras/nova"><Search aria-hidden="true" />Nova compra</Link>
                </div>
              </section>
            )}
          </section>

          {past.length > 0 && (
            <section className="stack" aria-labelledby="autorizacoes-anteriores">
              <h2 id="autorizacoes-anteriores">Anteriores</h2>
              <div className="policy-grid">
                {past.map((item) => <AuthorizationCard key={item.id} authorization={item} onRevoked={handleRevoked} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
