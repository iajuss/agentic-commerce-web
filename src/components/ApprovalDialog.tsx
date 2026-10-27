import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CircleAlert, CircleCheck, Info, Lock, ShieldX, X } from 'lucide-react'
import { demoMode } from '../api/auth'
import {
  AUTHORIZATION_TTL_MINUTES,
  createAuthorization,
  DEMO_WRONG_PASSWORD,
  isWrongPassword,
  policyReasons,
  type Authorization,
} from '../api/autorizacoes'
import { offerTotal, type Offer } from '../api/solicitacoes'
import { atStore, formatBRL, formatDateTime, formatTime } from '../utils/format'
import { FieldError } from './FieldError'
import { StatusBadge } from './StatusBadge'

type ApprovalDialogProps = {
  requestId: string
  offer: Offer
  onClose: () => void
  onApproved: (authorization: Authorization) => void
}

type Failure = { kind: 'senha'; text: string } | { kind: 'politica'; text: string; reasons: string[] } | { kind: 'geral'; text: string }

function describe(caught: unknown): Failure {
  if (isWrongPassword(caught)) {
    const details = (caught as { details?: Record<string, string> }).details
    return { kind: 'senha', text: details?.senha ?? 'Senha incorreta. Confira e tente de novo.' }
  }
  const reasons = policyReasons(caught)
  if (reasons) return { kind: 'politica', text: caught instanceof Error ? caught.message : 'Esta oferta não cabe nas suas políticas.', reasons }
  return { kind: 'geral', text: caught instanceof Error ? caught.message : 'Não foi possível aprovar agora. Tente de novo.' }
}

// Aprovação com reautenticação: mostra valor, loja e validade, pede a senha de novo e cria a
// autorização limitada. Se a oferta cabe numa política automática, a senha não é pedida.
export function ApprovalDialog({ requestId, offer, onClose, onApproved }: ApprovalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLHeadingElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [authorization, setAuthorization] = useState<Authorization | null>(null)
  const total = offerTotal(offer)
  const automatic = offer.compra_automatica
  const sendingRef = useRef(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    // O showModal põe o foco no primeiro botão (Fechar); quem aprova começa pela senha.
    ;(passwordRef.current ?? submitRef.current)?.focus()
    return () => dialog?.close()
  }, [])

  useEffect(() => { if (authorization) resultRef.current?.focus() }, [authorization])
  useEffect(() => { if (failure?.kind === 'senha') passwordRef.current?.focus() }, [failure])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFailure(null)
    setSending(true)
    sendingRef.current = true
    try {
      const created = await createAuthorization(requestId, offer.id, automatic ? undefined : password)
      setAuthorization(created)
      onApproved(created)
    } catch (caught) {
      setFailure(describe(caught))
    } finally {
      setSending(false)
      sendingRef.current = false
    }
  }

  const titleId = 'aprovacao-titulo'

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      // Esc e o botão Fechar avisam a tela; enquanto envia, o modal não fecha.
      onCancel={(event) => { event.preventDefault(); if (!sendingRef.current) onClose() }}
    >
      {authorization ? (
        <>
          <div className="modal-header">
            <h2 id={titleId} ref={resultRef} tabIndex={-1}>{authorization.automatica ? 'Comprei dentro da sua política' : 'Compra aprovada'}</h2>
            <button className="btn btn-ghost btn-sm" type="button" onClick={onClose} aria-label="Fechar"><X aria-hidden="true" /></button>
          </div>
          <div className="modal-body">
            <div className="alert alert-success" role="status">
              <CircleCheck aria-hidden="true" />
              <p>
                {authorization.automatica
                  ? `Comprei ${authorization.titulo} por ${formatBRL(authorization.valor_maximo)} ${atStore(authorization.loja)} sozinho, porque cabia na sua política ${authorization.politica_nome ?? 'automática'}. Se não quiser, revogue até ${formatTime(authorization.expira_em)}.`
                  : `Autorizei até ${formatBRL(authorization.valor_maximo)} ${atStore(authorization.loja)}, para um uso só. Vale até ${formatTime(authorization.expira_em)}.`}
              </p>
            </div>
            <dl className="summary-list">
              <div><dt>Valor máximo</dt><dd className="price">{formatBRL(authorization.valor_maximo)}</dd></div>
              <div><dt>Loja</dt><dd>{authorization.loja}</dd></div>
              <div><dt>Vale até</dt><dd>{formatDateTime(authorization.expira_em)}</dd></div>
              <div><dt>Como foi aprovada</dt><dd><StatusBadge kind="autonomia" status={authorization.automatica ? 'automatica' : 'manual'} /></dd></div>
            </dl>
            <div className="modal-actions">
              <Link className="btn btn-secondary" to="/autorizacoes">Ver autorizações</Link>
              <button className="btn btn-primary" type="button" onClick={onClose}>Fechar</button>
            </div>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-header">
            <h2 id={titleId}>Aprovar compra</h2>
            <button className="btn btn-ghost btn-sm" type="button" onClick={onClose} disabled={sending} aria-label="Fechar"><X aria-hidden="true" /></button>
          </div>
          <div className="modal-body">
            <p>
              Comprar <strong>{offer.titulo}</strong> por <strong>{formatBRL(total)}</strong> {atStore(offer.loja)}?
              {' '}Eu reservo esse valor agora e ele só pode ser usado nesta compra.
            </p>
            <dl className="summary-list">
              <div><dt>Valor máximo</dt><dd className="price">{formatBRL(total)}</dd></div>
              <div><dt>Loja</dt><dd>{offer.loja}</dd></div>
              <div><dt>Validade</dt><dd>{AUTHORIZATION_TTL_MINUTES} minutos, uso único</dd></div>
            </dl>

            {failure?.kind === 'politica' && (
              <div className="alert alert-danger" role="alert">
                <ShieldX aria-hidden="true" />
                <div className="stack">
                  <p><strong>{failure.text}</strong> Nada foi aprovado. Ajuste a política ou escolha outra oferta.</p>
                  {failure.reasons.length > 0 && <ul className="offer-reasons">{failure.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
                </div>
              </div>
            )}
            {failure?.kind === 'geral' && (
              <div className="alert alert-danger" role="alert"><CircleAlert aria-hidden="true" /><p>{failure.text}</p></div>
            )}

            {automatic ? (
              <div className="alert alert-info">
                <Info aria-hidden="true" />
                <p>Esta oferta cabe numa política automática, então não preciso da sua senha. Você é avisado e pode revogar depois.</p>
              </div>
            ) : (
              <div className="field">
                <label className="field-label" htmlFor="aprovacao-senha">Sua senha</label>
                <div className="input-group">
                  <span className="input-group-addon"><Lock aria-hidden="true" /></span>
                  <input
                    ref={passwordRef}
                    className="input"
                    id="aprovacao-senha"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={failure?.kind === 'senha'}
                    aria-describedby={failure?.kind === 'senha' ? 'aprovacao-senha-erro' : 'aprovacao-senha-dica'}
                    required
                  />
                </div>
                {failure?.kind === 'senha'
                  ? <FieldError id="aprovacao-senha-erro" text={failure.text} />
                  : (
                    <span className="field-hint" id="aprovacao-senha-dica">
                      A mesma senha de entrar. Peço de novo para ter certeza de que é você.
                      {demoMode && ` No modo de demonstração, qualquer senha aprova; "${DEMO_WRONG_PASSWORD}" simula uma senha errada.`}
                    </span>
                  )}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" type="button" onClick={onClose} disabled={sending}>Cancelar</button>
              <button ref={submitRef} className="btn btn-primary" type="submit" aria-busy={sending} disabled={sending || failure?.kind === 'politica'}>
                {sending ? 'Aprovando…' : `Aprovar compra de ${formatBRL(total)}`}
              </button>
            </div>
          </div>
        </form>
      )}
    </dialog>
  )
}
