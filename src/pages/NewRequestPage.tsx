import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight, CircleAlert, History, Info, Search } from 'lucide-react'
import { isNotConnected } from '../api/client'
import { createRequest, listRequests, REQUEST_FIELDS } from '../api/solicitacoes'
import { FieldError } from '../components/FieldError'
import { StatusBadge } from '../components/StatusBadge'
import { useResource } from '../hooks/useResource'
import { formatDateTime } from '../utils/format'
import { formErrors, type FormErrors } from '../utils/forms'

const EXAMPLES = [
  'Fone confortável para reuniões, até R$ 450',
  'Panos de microfibra para a cozinha',
  'Cadeira de escritório até R$ 900',
]

const MAX_LENGTH = 500

function RequestHistory() {
  const { data: requests, error, loading, reload } = useResource(listRequests)

  return (
    <section className="panel" aria-labelledby="historico">
      <div className="panel-header"><h2 id="historico">Suas solicitações</h2></div>
      {loading && !requests && (
        <div className="panel-body stack" aria-busy="true" aria-label="Carregando o histórico">
          <span className="skeleton" />
          <span className="skeleton skeleton-short" />
        </div>
      )}
      {Boolean(error) && !requests && (
        <div className="panel-body">
          {isNotConnected(error) ? (
            <div className="empty-state">
              <span className="empty-state-icon"><History aria-hidden="true" /></span>
              <strong>Esta parte ainda está sendo conectada.</strong>
              <p>O histórico das suas solicitações vai aparecer aqui assim que a API tiver essa rota.</p>
            </div>
          ) : (
            <div className="alert alert-danger" role="alert">
              <CircleAlert aria-hidden="true" />
              <div className="stack">
                <p><strong>Não consegui carregar o histórico.</strong> {error instanceof Error ? error.message : ''}</p>
                <div><button className="btn btn-secondary btn-sm" type="button" onClick={reload}>Tentar de novo</button></div>
              </div>
            </div>
          )}
        </div>
      )}
      {requests && requests.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon"><History aria-hidden="true" /></span>
          <strong>Nenhuma solicitação ainda.</strong>
          <p>Quando você descrever uma compra, ela aparece aqui com as ofertas que encontrei.</p>
        </div>
      )}
      {requests && requests.length > 0 && (
        <ul className="request-list">
          {requests.map((request) => (
            <li key={request.id}>
              <Link className="request-item" to={`/compras/${request.id}`}>
                <span className="request-item-text">
                  <strong>{request.intencao}</strong>
                  <span className="text-caption">
                    {formatDateTime(request.criada_em)}
                    {request.quantidade_ofertas > 0 && ` · ${request.quantidade_ofertas} ${request.quantidade_ofertas === 1 ? 'oferta' : 'ofertas'}`}
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
  // O painel inicial envia o texto já digitado em state.description.
  const [description, setDescription] = useState((location.state as { description?: string } | null)?.description ?? '')
  const [sending, setSending] = useState(false)
  const [errors, setErrors] = useState<FormErrors<(typeof REQUEST_FIELDS)[number]> | null>(null)
  const [notConnected, setNotConnected] = useState(false)
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const fieldError = errors?.fields.intencao

  useEffect(() => { if (errors) fieldRef.current?.focus() }, [errors])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors(null)
    setNotConnected(false)
    setSending(true)
    try {
      const request = await createRequest(description)
      navigate(`/compras/${request.id}`)
    } catch (caught) {
      if (isNotConnected(caught)) setNotConnected(true)
      else setErrors(formErrors(caught, REQUEST_FIELDS))
      setSending(false)
    }
  }

  return (
    <div className="page page-enter">
      <header className="page-header">
        <div>
          <span className="text-label">Nova compra</span>
          <h1>Descreva o que você precisa</h1>
          <p>Escreva como falaria com alguém de confiança: para que serve, quanto quer gastar e o que não pode faltar. Eu busco, comparo e explico.</p>
        </div>
      </header>

      <section className="panel" aria-label="Descrição da compra">
        <form className="panel-body stack-lg" onSubmit={handleSubmit} noValidate>
          {notConnected && (
            <div className="alert alert-info" role="status">
              <Info aria-hidden="true" />
              <p>Esta parte ainda está sendo conectada: a API ainda não recebe solicitações. Dá para testar no modo de demonstração.</p>
            </div>
          )}
          {errors?.message && (
            <div className="alert alert-danger" role="alert">
              <CircleAlert aria-hidden="true" />
              <p>{errors.message}</p>
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="descricao">O que você precisa</label>
            <textarea
              ref={fieldRef}
              className="input"
              id="descricao"
              rows={4}
              maxLength={MAX_LENGTH}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex.: um fone sem fio confortável para reuniões, com cancelamento de ruído e até R$ 450."
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? 'descricao-erro' : 'descricao-dica'}
              required
            />
            {fieldError
              ? <FieldError id="descricao-erro" text={fieldError} />
              : <span className="field-hint" id="descricao-dica">Só compro o que couber nas suas políticas. {description.length}/{MAX_LENGTH}</span>}
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
              {sending ? 'Enviando…' : <>Buscar ofertas <ArrowRight aria-hidden="true" /></>}
            </button>
          </div>
        </form>
      </section>

      <RequestHistory />
    </div>
  )
}
