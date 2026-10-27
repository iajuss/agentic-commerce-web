import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CircleAlert, CircleCheck, MapPin } from 'lucide-react'
import { isNotConnected } from '../api/client'
import { getProfile, maskCep, onlyDigits, PROFILE_FIELDS, updateProfile, type Profile, type RankingPriority } from '../api/perfil'
import { FieldError } from '../components/FieldError'
import { NotConnected } from '../components/NotConnected'
import { TagInput } from '../components/TagInput'
import { useAuth } from '../contexts/AuthContext'
import { useResource } from '../hooks/useResource'
import { formatDateTime, parseBRL, titleCase, toBRLInput } from '../utils/format'
import { formErrors, type FormErrors } from '../utils/forms'

type Field = (typeof PROFILE_FIELDS)[number]

const PRIORITIES: { value: RankingPriority; title: string; text: string }[] = [
  { value: 'preco', title: 'Menor preço', text: 'O total com frete pesa mais no ranking.' },
  { value: 'prazo', title: 'Entrega mais rápida', text: 'O prazo de entrega pesa mais no ranking.' },
  { value: 'avaliacao', title: 'Melhor avaliação', text: 'A nota de quem já comprou pesa mais no ranking.' },
]

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : 'Não foi possível concluir. Tente de novo.'
}

function ProfileForm({ profile, onSaved }: { profile: Profile; onSaved: (profile: Profile) => void }) {
  const [name, setName] = useState(profile.nome)
  const [priority, setPriority] = useState(profile.preferencias.prioridade)
  const [stores, setStores] = useState(profile.preferencias.lojas_preferidas)
  const [budget, setBudget] = useState(profile.orcamento_mensal === null ? '' : toBRLInput(profile.orcamento_mensal))
  const [cep, setCep] = useState(profile.endereco?.cep ?? '')
  const [number, setNumber] = useState(profile.endereco?.numero ?? '')
  const [complement, setComplement] = useState(profile.endereco?.complemento ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<FormErrors<Field> | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const fieldError = errors?.fields ?? {}

  useEffect(() => {
    if (!errors) return
    const form = formRef.current
    const target = form?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form?.querySelector<HTMLElement>('[role="alert"]')
    target?.focus()
  }, [errors])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors(null)
    setSaved(false)
    setSaving(true)
    const hasAddress = Boolean(onlyDigits(cep) || number.trim() || complement.trim())
    try {
      const updated = await updateProfile({
        nome: name,
        preferencias: { prioridade: priority, lojas_preferidas: stores },
        orcamento_mensal: budget.trim() ? parseBRL(budget) : null,
        endereco: hasAddress ? { cep, numero: number, complemento: complement } : null,
      })
      onSaved(updated)
      setCep(updated.endereco?.cep ?? '')
      setSaved(true)
    } catch (caught) {
      setErrors(formErrors(caught, PROFILE_FIELDS))
    } finally {
      setSaving(false)
    }
  }

  // O endereço completo só vale para o CEP salvo; se a pessoa trocar o CEP, ele some até salvar de novo.
  const address = profile.endereco && onlyDigits(profile.endereco.cep) === onlyDigits(cep) ? profile.endereco : null

  return (
    <form ref={formRef} className="stack-lg" onSubmit={handleSubmit} noValidate>
      {errors?.message && (
        <div className="alert alert-danger" role="alert" tabIndex={-1}>
          <CircleAlert aria-hidden="true" />
          <p>{errors.message}</p>
        </div>
      )}

      <section className="panel" aria-labelledby="perfil-voce">
        <div className="panel-header"><h2 id="perfil-voce">Você</h2></div>
        <div className="panel-body profile-grid">
          <div className="field">
            <label className="field-label" htmlFor="perfil-nome">Nome</label>
            <input
              className="input"
              id="perfil-nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              maxLength={80}
              aria-invalid={Boolean(fieldError.nome)}
              aria-describedby={fieldError.nome ? 'perfil-nome-erro' : undefined}
              required
            />
            <FieldError id="perfil-nome-erro" text={fieldError.nome} />
          </div>
          <div className="field">
            <span className="field-label">E-mail</span>
            <p className="profile-static">{profile.email}</p>
            <span className="field-hint">É o e-mail que você usa para entrar.</span>
          </div>
        </div>
      </section>

      <section className="panel" aria-labelledby="perfil-preferencias">
        <div className="panel-header"><h2 id="perfil-preferencias">Preferências</h2></div>
        <div className="panel-body stack-lg">
          <fieldset className="field policy-fieldset" aria-describedby={fieldError['preferencias.prioridade'] ? 'perfil-prioridade-erro' : 'perfil-prioridade-dica'}>
            <legend className="field-label">O que mais importa quando o agente compara ofertas</legend>
            <div className="profile-choices">
              {PRIORITIES.map((option) => (
                <label className="choice" key={option.value}>
                  <input type="radio" name="perfil-prioridade" value={option.value} checked={priority === option.value} onChange={() => setPriority(option.value)} />
                  <strong>{option.title}</strong>
                  <p>{option.text}</p>
                </label>
              ))}
            </div>
            {fieldError['preferencias.prioridade']
              ? <FieldError id="perfil-prioridade-erro" text={fieldError['preferencias.prioridade']} />
              : <span className="field-hint" id="perfil-prioridade-dica">As políticas continuam valendo: isto só muda a ordem das ofertas.</span>}
          </fieldset>
          <TagInput
            id="perfil-lojas"
            label="Lojas preferidas"
            values={stores}
            onChange={setStores}
            format={titleCase}
            placeholder="Ex.: Loja Sonora"
            hint="Em caso de empate, o agente coloca estas lojas na frente."
            error={fieldError['preferencias.lojas_preferidas']}
          />
        </div>
      </section>

      <section className="panel" aria-labelledby="perfil-orcamento">
        <div className="panel-header"><h2 id="perfil-orcamento">Orçamento</h2></div>
        <div className="panel-body profile-grid">
          <div className="field">
            <label className="field-label" htmlFor="perfil-orcamento-valor">Orçamento por mês <span className="optional">(opcional)</span></label>
            <div className="input-group">
              <span className="input-group-addon">R$</span>
              <input
                className="input num"
                id="perfil-orcamento-valor"
                inputMode="decimal"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="1.200,00"
                aria-invalid={Boolean(fieldError.orcamento_mensal)}
                aria-describedby={fieldError.orcamento_mensal ? 'perfil-orcamento-erro' : 'perfil-orcamento-dica'}
              />
            </div>
            {fieldError.orcamento_mensal
              ? <FieldError id="perfil-orcamento-erro" text={fieldError.orcamento_mensal} />
              : <span className="field-hint" id="perfil-orcamento-dica">Quanto você quer gastar por mês com o agente. O teto de cada compra fica nas políticas.</span>}
          </div>
        </div>
      </section>

      <section className="panel" aria-labelledby="perfil-endereco">
        <div className="panel-header"><h2 id="perfil-endereco">Endereço de entrega</h2></div>
        <div className="panel-body stack-lg">
          <div className="profile-address-grid">
            <div className="field">
              <label className="field-label" htmlFor="perfil-cep">CEP</label>
              <input
                className="input num"
                id="perfil-cep"
                inputMode="numeric"
                autoComplete="postal-code"
                value={cep}
                onChange={(event) => setCep(maskCep(event.target.value))}
                placeholder="00000-000"
                aria-invalid={Boolean(fieldError['endereco.cep'])}
                aria-describedby={fieldError['endereco.cep'] ? 'perfil-cep-erro' : 'perfil-cep-dica'}
              />
              {fieldError['endereco.cep']
                ? <FieldError id="perfil-cep-erro" text={fieldError['endereco.cep']} />
                : <span className="field-hint" id="perfil-cep-dica">Ao salvar, eu completo rua, bairro e cidade pelo CEP.</span>}
            </div>
            <div className="field">
              <label className="field-label" htmlFor="perfil-numero">Número</label>
              <input
                className="input num"
                id="perfil-numero"
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                autoComplete="address-line2"
                aria-invalid={Boolean(fieldError['endereco.numero'])}
                aria-describedby={fieldError['endereco.numero'] ? 'perfil-numero-erro' : undefined}
              />
              <FieldError id="perfil-numero-erro" text={fieldError['endereco.numero']} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="perfil-complemento">Complemento <span className="optional">(opcional)</span></label>
              <input
                className="input"
                id="perfil-complemento"
                value={complement}
                onChange={(event) => setComplement(event.target.value)}
                placeholder="Apto, bloco, sala"
                aria-invalid={Boolean(fieldError['endereco.complemento'])}
                aria-describedby={fieldError['endereco.complemento'] ? 'perfil-complemento-erro' : undefined}
              />
              <FieldError id="perfil-complemento-erro" text={fieldError['endereco.complemento']} />
            </div>
          </div>

          {address ? (
            <div className="profile-address">
              <MapPin aria-hidden="true" />
              <p>
                <strong>{address.logradouro}, {address.numero}{address.complemento ? ` · ${address.complemento}` : ''}</strong>
                <span className="text-small text-muted">{address.bairro} · {address.cidade}/{address.uf} · CEP {address.cep}</span>
              </p>
            </div>
          ) : (
            <p className="text-small text-muted">
              {onlyDigits(cep).length === 8 ? 'Salve para ver o endereço completo.' : 'Sem endereço, o agente não calcula frete nem prazo de entrega.'}
            </p>
          )}
        </div>
      </section>

      <p className="sr-only" role="status">{saved ? 'Perfil salvo.' : ''}</p>
      <div className="profile-actions">
        {saved && <p className="text-small profile-saved" aria-hidden="true"><CircleCheck aria-hidden="true" />Perfil salvo.</p>}
        <button className="btn btn-primary" type="submit" aria-busy={saving} disabled={saving}>{saving ? 'Salvando…' : 'Salvar perfil'}</button>
      </div>
    </form>
  )
}

export function ProfilePage() {
  const { updateUser } = useAuth()
  const { data: profile, error, loading, reload, setData } = useResource(getProfile)

  function handleSaved(updated: Profile) {
    setData(updated)
    updateUser({ nome: updated.nome, email: updated.email })
  }

  return (
    <div className="page page-enter">
      <header className="page-header">
        <div>
          <span className="text-label">Preferências</span>
          <h1>Seu perfil</h1>
          <p>Seus dados, o que pesa no ranking das ofertas, seu orçamento e onde as compras chegam.</p>
        </div>
        {profile && <p className="text-caption">Atualizado em {formatDateTime(profile.atualizado_em)}</p>}
      </header>

      {loading && !profile && (
        <section className="panel" aria-busy="true" aria-label="Carregando o perfil">
          <div className="panel-body stack">
            <span className="skeleton skeleton-title" />
            <span className="skeleton" />
            <span className="skeleton skeleton-short" />
          </div>
        </section>
      )}

      {Boolean(error) && !profile && (isNotConnected(error) ? <NotConnected what="Seu perfil, com preferências, orçamento e endereço," /> : (
        <div className="alert alert-danger" role="alert">
          <CircleAlert aria-hidden="true" />
          <div className="stack">
            <p><strong>Não consegui carregar seu perfil.</strong> {errorMessage(error)}</p>
            <div><button className="btn btn-secondary btn-sm" type="button" onClick={reload}>Tentar de novo</button></div>
          </div>
        </div>
      ))}

      {profile && (
        <ProfileForm profile={profile} onSaved={handleSaved} />
      )}
    </div>
  )
}
