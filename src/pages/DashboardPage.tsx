import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Search, ShieldCheck } from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'

const journey = [
  { number: '01', title: 'Diga o que precisa', text: 'Descreva a compra do seu jeito, com contexto e limites.' },
  { number: '02', title: 'Compare com clareza', text: 'Veja ofertas ranqueadas e entenda cada recomendação.' },
  { number: '03', title: 'Aprove ou automatize', text: 'Você confirma ou deixa o agente agir dentro das políticas.' },
]

const examples = ['Fone confortável para reuniões, até R$ 450', 'Cadeira de escritório até R$ 900']

export function DashboardPage() {
  const { user } = useAuth()
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
            <Link className="btn btn-ghost btn-sm" to="/politicas">Editar</Link>
          </div>
          <div className="panel-body stack">
            <div className="policy-limit"><span>Teto por compra</span><strong className="price">R$ 500</strong></div>
            <div className="row"><span className="tag">Eletrônicos</span><span className="tag">Casa</span><span className="tag">Livros</span></div>
            <div className="autonomy-row">
              <StatusBadge kind="autonomia" status="manual" />
              <p className="text-small text-muted">Você confirma cada compra antes do pagamento.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
