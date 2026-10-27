import { useEffect, useRef, useState } from 'react'
import { CircleAlert, Info, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { createPolicy, deletePolicy, listPolicies, policyToInput, updatePolicy, type Policy, type PolicyInput } from '../api/politicas'
import { PolicyForm } from '../components/PolicyForm'
import { StatusBadge } from '../components/StatusBadge'
import { useResource } from '../hooks/useResource'
import { categoryLabel } from '../utils/categories'
import { formatBRL, formatDateTime, titleCase } from '../utils/format'

// "nova" abre o formulário em branco no topo; um id abre a edição no lugar do card.
type Editing = 'nova' | string | null

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : 'Não foi possível concluir. Tente de novo.'
}

function TagList({ values, empty, format = (value: string) => value }: { values: string[]; empty: string; format?: (value: string) => string }) {
  if (!values.length) return <span className="text-small text-muted">{empty}</span>
  return <div className="row">{values.map((value) => <span className="tag" key={value}>{format(value)}</span>)}</div>
}

type PolicyCardProps = {
  policy: Policy
  onEdit: () => void
  onChange: (policy: Policy) => void
  onDeleted: () => void
}

function PolicyCard({ policy, onEdit, onChange, onDeleted }: PolicyCardProps) {
  const [toggling, setToggling] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const keepRef = useRef<HTMLButtonElement>(null)
  const deleteRef = useRef<HTMLButtonElement>(null)
  const wasConfirming = useRef(false)

  // Ao abrir a confirmação, o foco vai para "Manter"; ao fechar, volta para "Excluir".
  useEffect(() => {
    if (confirming) keepRef.current?.focus()
    else if (wasConfirming.current) deleteRef.current?.focus()
    wasConfirming.current = confirming
  }, [confirming])

  async function toggleActive() {
    if (toggling) return
    setError('')
    setToggling(true)
    try {
      onChange(await updatePolicy(policy.id, { ...policyToInput(policy), ativa: !policy.ativa }))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setToggling(false)
    }
  }

  async function confirmDelete() {
    setError('')
    setDeleting(true)
    try {
      await deletePolicy(policy.id)
      onDeleted()
    } catch (caught) {
      setError(errorMessage(caught))
      setDeleting(false)
    }
  }

  const titleId = `politica-${policy.id}-nome`

  return (
    <article className="card policy-card" aria-labelledby={titleId}>
      <div className="policy-card-head">
        <h3 id={titleId}>{policy.nome}</h3>
        <div className="row">
          <StatusBadge kind="politica" status={policy.ativa ? 'ativa' : 'inativa'} />
          <StatusBadge kind="autonomia" status={policy.nivel_autonomia} />
        </div>
      </div>

      <div className="policy-limit"><span>Teto por compra</span><strong className="price">{formatBRL(policy.teto_por_compra)}</strong></div>

      <dl className="policy-rules">
        <div><dt>Categorias</dt><dd><TagList values={policy.categorias} empty="Qualquer categoria" format={categoryLabel} /></dd></div>
        <div><dt>Lojas</dt><dd><TagList values={policy.lojas} empty="Qualquer loja" format={titleCase} /></dd></div>
      </dl>

      <p className="text-small text-muted">
        {policy.nivel_autonomia === 'automatica'
          ? 'O agente compra sozinho quando a oferta cabe nesta política.'
          : 'Você aprova cada compra com a sua senha.'}
      </p>

      {error && (
        <div className="alert alert-danger" role="alert"><CircleAlert aria-hidden="true" /><p>{error}</p></div>
      )}

      {confirming ? (
        <div className="policy-confirm" role="group" aria-labelledby={`${titleId}-confirmar`}>
          <p id={`${titleId}-confirmar`}>
            <strong>Excluir a política {policy.nome}?</strong> O agente para de usar estas regras nas próximas compras. Não dá para desfazer.
          </p>
          <div className="row">
            <button className="btn btn-danger btn-sm" type="button" onClick={confirmDelete} aria-busy={deleting} disabled={deleting}>
              {deleting ? 'Excluindo…' : 'Excluir política'}
            </button>
            <button ref={keepRef} className="btn btn-secondary btn-sm" type="button" onClick={() => setConfirming(false)} disabled={deleting}>Manter</button>
          </div>
        </div>
      ) : (
        <div className="policy-card-actions">
          <label className="switch">
            {/* Sem disabled enquanto salva: desabilitar tiraria o foco de quem usa o teclado. */}
            <input type="checkbox" role="switch" checked={policy.ativa} onChange={toggleActive} aria-disabled={toggling} aria-busy={toggling} />
            {toggling ? 'Salvando…' : 'Ativa'}
          </label>
          <div className="row">
            <button id={`editar-${policy.id}`} className="btn btn-secondary btn-sm" type="button" onClick={onEdit}>
              <Pencil aria-hidden="true" />Editar
            </button>
            <button ref={deleteRef} className="btn btn-ghost btn-sm" type="button" onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden="true" />Excluir
            </button>
          </div>
        </div>
      )}

      <p className="text-caption">Atualizada em {formatDateTime(policy.atualizada_em)}</p>
    </article>
  )
}

function LoadingCards() {
  return (
    <div className="policy-grid" aria-busy="true" aria-label="Carregando políticas">
      {[0, 1].map((item) => (
        <div className="card stack" key={item}>
          <span className="skeleton skeleton-title" />
          <span className="skeleton" />
          <span className="skeleton skeleton-short" />
        </div>
      ))}
    </div>
  )
}

export function PoliciesPage() {
  const { data: policies, error, loading, reload, setData } = useResource(listPolicies)
  const [editing, setEditing] = useState<Editing>(null)
  const [notice, setNotice] = useState('')
  const newButtonRef = useRef<HTMLButtonElement>(null)
  const focusAfterRender = useRef<string | null>(null)

  // Depois que a tela atualiza, o foco volta para o botão que abriu o formulário (ou o do card criado).
  useEffect(() => {
    if (!focusAfterRender.current) return
    const target = document.getElementById(focusAfterRender.current) ?? newButtonRef.current
    focusAfterRender.current = null
    target?.focus()
  }, [editing, policies])

  function closeForm(focusId?: string) {
    focusAfterRender.current = focusId ?? (editing && editing !== 'nova' ? `editar-${editing}` : 'nova-politica')
    setEditing(null)
  }

  async function handleCreate(input: PolicyInput) {
    const created = await createPolicy(input)
    setData((current) => [...(current ?? []), created])
    setNotice(`Política ${created.nome} criada.`)
    closeForm(`editar-${created.id}`)
  }

  async function handleUpdate(id: string, input: PolicyInput) {
    const updated = await updatePolicy(id, input)
    replace(updated)
    setNotice(`Política ${updated.nome} atualizada.`)
    closeForm()
  }

  function replace(updated: Policy) {
    setData((current) => current?.map((policy) => (policy.id === updated.id ? updated : policy)))
  }

  function handleDeleted(policy: Policy) {
    setData((current) => current?.filter((item) => item.id !== policy.id))
    setNotice(`Política ${policy.nome} excluída.`)
    focusAfterRender.current = 'nova-politica'
  }

  const hasActive = policies?.some((policy) => policy.ativa)

  return (
    <div className="page page-enter">
      <header className="page-header">
        <div>
          <span className="text-label">Perfil e governança</span>
          <h1>Políticas de compra</h1>
          <p>Defina o teto, as categorias, as lojas e quando o agente pode comprar sozinho. Ele só compra o que couber em uma política ativa.</p>
        </div>
        <button ref={newButtonRef} id="nova-politica" className="btn btn-primary" type="button" onClick={() => { setNotice(''); setEditing('nova') }} disabled={editing === 'nova'}>
          <Plus aria-hidden="true" />Nova política
        </button>
      </header>

      <p className="sr-only" role="status">{notice}</p>
      {notice && (
        <div className="alert alert-success" aria-hidden="true"><ShieldCheck aria-hidden="true" /><p>{notice}</p></div>
      )}

      {editing === 'nova' && <PolicyForm onSubmit={handleCreate} onCancel={() => closeForm()} />}

      {loading && !policies && <LoadingCards />}

      {error && !policies ? (
        <div className="alert alert-danger" role="alert">
          <CircleAlert aria-hidden="true" />
          <div className="stack">
            <p><strong>Não consegui carregar suas políticas.</strong> {errorMessage(error)}</p>
            <div><button className="btn btn-secondary btn-sm" type="button" onClick={reload}>Tentar de novo</button></div>
          </div>
        </div>
      ) : null}

      {policies && policies.length > 0 && !hasActive && (
        <div className="alert alert-info">
          <Info aria-hidden="true" />
          <p>Nenhuma política está ativa. O agente pode sugerir qualquer oferta, mas toda compra vai precisar da sua aprovação.</p>
        </div>
      )}

      {policies && policies.length === 0 && editing !== 'nova' && (
        <section className="panel">
          <div className="empty-state">
            <span className="empty-state-icon"><ShieldCheck aria-hidden="true" /></span>
            <strong>Você ainda não tem políticas.</strong>
            <p>Com uma política, você diz quanto o agente pode gastar, em quais categorias e lojas, e se ele precisa da sua aprovação.</p>
            <button className="btn btn-primary" type="button" onClick={() => setEditing('nova')}><Plus aria-hidden="true" />Criar a primeira política</button>
          </div>
        </section>
      )}

      {policies && policies.length > 0 && (
        <div className="policy-grid">
          {policies.map((policy) =>
            editing === policy.id ? (
              <PolicyForm key={policy.id} policy={policy} onSubmit={(input) => handleUpdate(policy.id, input)} onCancel={() => closeForm()} />
            ) : (
              <PolicyCard
                key={policy.id}
                policy={policy}
                onEdit={() => { setNotice(''); setEditing(policy.id) }}
                onChange={(updated) => {
                  replace(updated)
                  setNotice(`Política ${updated.nome} ${updated.ativa ? 'ativada' : 'desativada'}.`)
                }}
                onDeleted={() => handleDeleted(policy)}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}
