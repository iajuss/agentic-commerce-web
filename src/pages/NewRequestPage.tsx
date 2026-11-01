import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight, CircleAlert, CircleCheck, History, Search } from 'lucide-react'
import { createRequest, listRequests, REQUEST_FIELDS, REQUEST_MAX_LENGTH, requestTitle } from '../api/solicitacoes'
import { FieldError } from '../components/FieldError'
import { StatusBadge } from '../components/StatusBadge'
import { useResource } from '../hooks/useResource'
import { formatBRL, formatDateTime, plural } from '../utils/format'
import { formErrors, type FormErrors } from '../utils/forms'

const EXAMPLES = [
  'arroz 5kg, 2 leites integrais e detergente',
  'café, açúcar e 3 macarrões',
  'sabão em pó e papel higiênico',
]

function RequestHistory() {
  const { data: requests, error, loading, reload } = useResource(listRequests)

  return (
    <section className="panel" aria-labelledby="historico">
      <div className="panel-header"><h2 id="historico">Suas listas</h2></div>
      {loading && !requests && (
        <div className="panel-body stack" aria-busy="true" aria-label="Carregando o histórico">
          <span className="skeleton" />
          <span className="skeleton skeleton-short" />
        </div>
      )}
      {Boolean(error) && !requests && (
        <div className="panel-body">
          <div className="alert alert-danger" role="alert">
            <CircleAlert aria-hidden="true" />
            <div className="stack">
              <p><strong>Não consegui carregar o histórico.</strong> {error instanceof Error ? error.message : ''}</p>
              <div><button className="btn btn-secondary btn-sm" type="button" onClick={reload}>Tentar de novo</button></div>
            </div>
          </div>
        </div>
      )}
      {requests && requests.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon"><History aria-hidden="true" /></span>
          <strong>Nenhuma lista ainda.</strong>
          <p>Quando você mandar uma lista de compras, ela aparece aqui com a cesta que montei.</p>
        </div>
      )}
      {requests && requests.length > 0 && (
        <ul className="request-list">
          {requests.map((request) => (
            <li key={request.id}>
              <Link className="request-item" to={`/compras/${request.id}`}>
                <span className="request-item-text">
                  <strong>{requestTitle(request)}</strong>
                  <span className="text-caption">
                    {formatDateTime(request.criada_em)} · {plural(request.itens.length, 'item', 'itens')}
                    {request.total > 0 && ` · ${formatBRL(request.total)}`}
                  </span>
                </span>
                <StatusBadge kind="solicitacao" status={request.status} />
                <ChevronRight aria-hidden="true" className="request-item-arrow" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function NewRequestPage() {
  const location = useLocation()
  const navigate = useNavigate()
  // O painel inicial envia o texto já digitado em state.description; o cancelamento, um aviso em state.notice.
  const state = location.state as { description?: string; notice?: string } | null
  const [description, setDescription] = useState(state?.description ?? '')
  const [sending, setSending] = useState(false)
  const [errors, setErrors] = useState<FormErrors<(typeof REQUEST_FIELDS)[number]> | null>(null)
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const fieldError = errors?.fields.texto

  useEffect(() => { if (errors) fieldRef.current?.focus() }, [errors])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors(null)
    setSending(true)
    try {
      const request = await createRequest(description)
      navigate(`/compras/${request.id}`)
    } catch (caught) {
      setErrors(formErrors(caught, REQUEST_FIELDS))
      setSending(false)
    }
  }

  return (
    <div className="page page-enter">
      <header className="page-header">
        <div>
          <span className="text-label">Nova compra</span>
          <h1>O que vai na sua lista?</h1>
          <p>Escreva os itens como numa lista de mercado, separados por vírgula, com a quantidade na frente quando for mais de um. Eu busco cada item, comparo as ofertas e monto a cesta.</p>
        </div>
      </header>

      {state?.notice && (
        <div className="alert alert-success" role="status"><CircleCheck aria-hidden="true" /><p>{state.notice}</p></div>
      )}

      <section className="panel" aria-label="Lista de compras">
        <form className="panel-body stack-lg" onSubmit={handleSubmit} noValidate>
          {errors?.message && (
            <div className="alert alert-danger" role="alert">
              <CircleAlert aria-hidden="true" />
              <p>{errors.message}</p>
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="descricao">Lista de compras</label>
            <textarea
              ref={fieldRef}
              className="input"
              id="descricao"
              rows={4}
              maxLength={REQUEST_MAX_LENGTH}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex.: arroz 5kg, 2 leites integrais, café e detergente"
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? 'descricao-erro' : 'descricao-dica'}
              required
            />
            {fieldError
              ? <FieldError id="descricao-erro" text={fieldError} />
              : <span className="field-hint" id="descricao-dica">Só compro o que couber nas suas políticas. {description.length}/{REQUEST_MAX_LENGTH}</span>}
          </div>
          <div className="row" role="group" aria-label="Exemplos">
            {EXAMPLES.map((example) => (
              <button key={example} className="chip" type="button" onClick={() => { setDescription(example); fieldRef.current?.focus() }}>
                <Search aria-hidden="true" />{example}
              </button>
            ))}
          </div>
          <div className="section-actions">
            <Link to="/inicio" className="btn btn-secondary">Voltar</Link>
            <button className="btn btn-primary" type="submit" aria-busy={sending} disabled={sending}>
              {sending ? 'Montando a cesta…' : <>Montar a cesta <ArrowRight aria-hidden="true" /></>}
            </button>
          </div>
        </form>
      </section>

      <RequestHistory />
    </div>
  )
}
