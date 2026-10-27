import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CircleAlert } from 'lucide-react'
import { POLICY_FIELDS, type Policy, type PolicyInput } from '../api/politicas'
import { categoryLabel, SUGGESTED_CATEGORIES } from '../utils/categories'
import { parseBRL, titleCase, toBRLInput } from '../utils/format'
import { formErrors, type FormErrors } from '../utils/forms'
import { FieldError } from './FieldError'
import { TagInput } from './TagInput'

type Field = (typeof POLICY_FIELDS)[number]

type PolicyFormProps = {
  policy?: Policy
  onSubmit: (input: PolicyInput) => Promise<void>
  onCancel: () => void
}

const AUTONOMY = [
  { value: 'manual', title: 'Manual', text: 'O agente recomenda e você aprova cada compra com a sua senha.' },
  { value: 'automatica', title: 'Automática', text: 'O agente compra sozinho quando a oferta cabe nesta política. Você é avisado e pode revogar.' },
] as const

export function PolicyForm({ policy, onSubmit, onCancel }: PolicyFormProps) {
  const prefix = `politica-${policy?.id ?? 'nova'}`
  const [name, setName] = useState(policy?.nome ?? '')
  const [ceiling, setCeiling] = useState(policy ? toBRLInput(policy.teto_por_compra) : '')
  const [categories, setCategories] = useState(policy?.categorias ?? [])
  const [stores, setStores] = useState(policy?.lojas ?? [])
  const [autonomy, setAutonomy] = useState(policy?.nivel_autonomia ?? 'manual')
  const [active, setActive] = useState(policy?.ativa ?? true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<FormErrors<Field> | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const fieldError = errors?.fields ?? {}

  // Quem usa o teclado continua daqui: o foco vai para o título do formulário que abriu.
  useEffect(() => { headingRef.current?.focus() }, [])

  // Depois de um erro, o foco vai para o primeiro campo a corrigir (ou para a mensagem geral).
  useEffect(() => {
    if (!errors) return
    const form = formRef.current
    const target = form?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form?.querySelector<HTMLElement>('[role="alert"]')
    target?.focus()
  }, [errors])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors(null)
    setSaving(true)
    try {
      await onSubmit({
        nome: name,
        teto_por_compra: parseBRL(ceiling),
        categorias: categories,
        lojas: stores,
        nivel_autonomia: autonomy,
        ativa: active,
      })
    } catch (caught) {
      setErrors(formErrors(caught, POLICY_FIELDS))
      setSaving(false)
    }
  }

  const title = policy ? `Editar ${policy.nome}` : 'Nova política'

  return (
    <section className="panel" aria-labelledby={`${prefix}-titulo`}>
      <div className="panel-header">
        <h2 id={`${prefix}-titulo`} ref={headingRef} tabIndex={-1}>{title}</h2>
      </div>
      <form
        ref={formRef}
        className="panel-body stack-lg"
        onSubmit={handleSubmit}
        onKeyDown={(event) => { if (event.key === 'Escape' && !saving) onCancel() }}
        noValidate
      >
        {errors?.message && (
          <div className="alert alert-danger" role="alert" tabIndex={-1}>
            <CircleAlert aria-hidden="true" />
            <p>{errors.message}</p>
          </div>
        )}

        <div className="policy-form-grid">
          <div className="field">
            <label className="field-label" htmlFor={`${prefix}-nome`}>Nome</label>
            <input
              className="input"
              id={`${prefix}-nome`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="Ex.: Casa, Trabalho, Presentes"
              aria-invalid={Boolean(fieldError.nome)}
              aria-describedby={fieldError.nome ? `${prefix}-nome-erro` : undefined}
              required
            />
            <FieldError id={`${prefix}-nome-erro`} text={fieldError.nome} />
          </div>

          <div className="field">
            <label className="field-label" htmlFor={`${prefix}-teto`}>Teto por compra</label>
            <div className="input-group">
              <span className="input-group-addon">R$</span>
              <input
                className="input num"
                id={`${prefix}-teto`}
                inputMode="decimal"
                value={ceiling}
                onChange={(event) => setCeiling(event.target.value)}
                placeholder="500,00"
                aria-invalid={Boolean(fieldError.teto_por_compra)}
                aria-describedby={fieldError.teto_por_compra ? `${prefix}-teto-erro` : `${prefix}-teto-dica`}
                required
              />
            </div>
            {fieldError.teto_por_compra
              ? <FieldError id={`${prefix}-teto-erro`} text={fieldError.teto_por_compra} />
              : <span className="field-hint" id={`${prefix}-teto-dica`}>Inclui o frete. Uma oferta acima disso fica fora da política.</span>}
          </div>
        </div>

        <TagInput
          id={`${prefix}-categorias`}
          label="Categorias"
          values={categories}
          onChange={setCategories}
          format={categoryLabel}
          suggestions={SUGGESTED_CATEGORIES}
          placeholder="Digite e tecle Enter"
          hint="Deixe vazio para aceitar qualquer categoria."
          error={fieldError.categorias}
        />

        <TagInput
          id={`${prefix}-lojas`}
          label="Lojas"
          values={stores}
          onChange={setStores}
          format={titleCase}
          placeholder="Ex.: Loja Sonora"
          hint="Deixe vazio para aceitar qualquer loja."
          error={fieldError.lojas}
        />

        <fieldset className="field policy-fieldset" aria-describedby={fieldError.nivel_autonomia ? `${prefix}-autonomia-erro` : undefined}>
          <legend className="field-label">Nível de autonomia</legend>
          <div className="policy-choices">
            {AUTONOMY.map((option) => (
              <label className="choice" key={option.value}>
                <input
                  type="radio"
                  name={`${prefix}-autonomia`}
                  value={option.value}
                  checked={autonomy === option.value}
                  onChange={() => setAutonomy(option.value)}
                />
                <strong>{option.title}</strong>
                <p>{option.text}</p>
              </label>
            ))}
          </div>
          <FieldError id={`${prefix}-autonomia-erro`} text={fieldError.nivel_autonomia} />
        </fieldset>

        <div className="field">
          <label className="switch">
            <input type="checkbox" role="switch" checked={active} onChange={(event) => setActive(event.target.checked)} />
            Política ativa
          </label>
          <FieldError id={`${prefix}-ativa-erro`} text={fieldError.ativa} />
        </div>

        <div className="section-actions">
          <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" type="submit" aria-busy={saving} disabled={saving}>
            {saving ? (policy ? 'Salvando…' : 'Criando…') : policy ? 'Salvar alterações' : 'Criar política'}
          </button>
        </div>
      </form>
    </section>
  )
}
