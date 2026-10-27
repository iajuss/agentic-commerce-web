import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Plus, Search, ShieldCheck } from 'lucide-react'
import { listPolicies, mainPolicy, type Policy } from '../api/politicas'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { useResource } from '../hooks/useResource'
import { categoryLabel } from '../utils/categories'
import { formatBRL } from '../utils/format'

const journey = [
  { number: '01', title: 'Diga o que precisa', text: 'Descreva a compra do seu jeito, com contexto e limites.' },
  { number: '02', title: 'Compare com clareza', text: 'Veja ofertas ranqueadas e entenda cada recomendação.' },
  { number: '03', title: 'Aprove ou automatize', text: 'Você confirma ou deixa o agente agir dentro das políticas.' },
]

const examples = ['Fone confortável para reuniões, até R$ 450', 'Cadeira de escritório até R$ 900']

type MainPolicyProps = { policy?: Policy; loading: boolean; error: unknown; hasPolicies: boolean }

function MainPolicy({ policy, loading, error, hasPolicies }: MainPolicyProps) {
  if (loading) {
    return (
      <div className="panel-body stack" aria-busy="true" aria-label="Carregando a política principal">
        <span className="skeleton skeleton-title" />
        <span className="skeleton" />
        <span className="skeleton skeleton-short" />
      </div>
    )
  }
  if (error) {
    return <div className="panel-body"><p className="text-small text-muted">Não consegui carregar suas políticas agora. Abra a tela de políticas para tentar de novo.</p></div>
  }
  if (!policy) {
    return (
      <div className="panel-body dashboard-policy-empty">
        <p className="text-small text-muted">
          {hasPolicies
            ? 'Nenhuma política está ativa. O agente pode sugerir qualquer oferta, mas toda compra vai precisar da sua aprovação.'
            : 'Você ainda não definiu limites. Crie uma política para dizer quanto o agente pode gastar e onde.'}
        </p>
        <Link className="btn btn-secondary btn-sm" to="/politicas"><Plus aria-hidden="true" />{hasPolicies ? 'Ativar uma política' : 'Criar política'}</Link>
      </div>
    )
  }
  return (
    <div className="panel-body stack">
      <p className="text-small"><strong>{policy.nome}</strong></p>
      <div className="policy-limit"><span>Teto por compra</span><strong className="price">{formatBRL(policy.teto_por_compra)}</strong></div>
      <div className="row">
        {policy.categorias.length
          ? policy.categorias.map((category) => <span className="tag" key={category}>{categoryLabel(category)}</span>)
          : <span className="tag">Qualquer categoria</span>}
      </div>
      <div className="autonomy-row">
        <StatusBadge kind="autonomia" status={policy.nivel_autonomia} />
        <p className="text-small text-muted">
          {policy.nivel_autonomia === 'automatica'
            ? 'O agente compra sozinho quando a oferta cabe nesta política.'
            : 'Você confirma cada compra antes do pagamento.'}
        </p>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data: policies, loading, error } = useResource(listPolicies)
  const policy = policies && mainPolicy(policies)
  const navigate = useNavigate()
  const [description, setDescription] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    navigate('/compras/nova', { state: { description } })
  }

  return (
    <div className="page page-enter">
      <header className="page-header">
        <div>
          <h1>Olá, {user?.nome?.split(' ')[0]}.</h1>
          <p>O que você quer resolver hoje?</p>
        </div>
        <span className="badge badge-success"><ShieldCheck aria-hidden="true" />Proteções ativas</span>
      </header>

      <section className="hero" aria-labelledby="nova-compra">
        <span className="hero-ring" aria-hidden="true" />
        <span className="text-label">Nova compra</span>
        <h2 id="nova-compra">O que você precisa comprar?</h2>
        <form className="composer" onSubmit={handleSubmit}>
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="descricao">Descreva a compra</label>
          <input
            id="descricao"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex.: fone para reuniões, até R$ 450"
          />
          <button className="btn btn-primary" type="submit">Buscar ofertas <ArrowRight aria-hidden="true" /></button>
        </form>
        <div className="row">
          {examples.map((example) => (
            <button key={example} className="chip" type="button" onClick={() => setDescription(example)}>{example}</button>
          ))}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel" aria-labelledby="como-funciona">
          <div className="panel-header"><h2 id="como-funciona">Da descrição à compra</h2></div>
          <ol className="journey-list">
            {journey.map((item) => (
              <li className="journey-item" key={item.number}>
                <span className="journey-number">{item.number}</span>
                <div><strong>{item.title}</strong><p>{item.text}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel" aria-labelledby="seus-limites">
          <div className="panel-header">
            <h2 id="seus-limites">Política principal</h2>
            <Link className="btn btn-ghost btn-sm" to="/politicas">{policy ? 'Editar' : 'Ver políticas'}</Link>
          </div>
          <MainPolicy policy={policy} loading={loading} error={error} hasPolicies={Boolean(policies?.length)} />
        </section>
      </div>
    </div>
  )
}
