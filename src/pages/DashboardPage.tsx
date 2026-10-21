import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const journey = [
  { number: '01', title: 'Diga o que precisa', text: 'Descreva a compra do seu jeito, com contexto e limites.' },
  { number: '02', title: 'Compare com clareza', text: 'Veja ofertas ranqueadas e entenda cada recomendação.' },
  { number: '03', title: 'Aprove ou automatize', text: 'Você confirma ou deixa o agente agir dentro das políticas.' },
]

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="dashboard page-enter">
      <header className="page-header">
        <div>
          <span className="eyebrow">CENTRAL DE COMPRAS</span>
          <h1>Olá, {user?.name?.split(' ')[0]}.</h1>
          <p>O que você quer resolver hoje?</p>
        </div>
        <div className="safety-pill"><span>●</span> Proteções ativas</div>
      </header>

      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-kicker">NOVA INTENÇÃO</span>
          <h2>Conte o que você precisa.<br />Sem procurar produto por produto.</h2>
          <p>Seu agente compara preço, frete, prazo e reputação — sempre respeitando as suas regras.</p>
          <Link to="/compras/nova" className="primary-button hero-action">Começar uma compra <span>→</span></Link>
        </div>
        <div className="orbital-visual" aria-hidden="true">
          <div className="orbit orbit-one"><span>R$</span></div>
          <div className="orbit orbit-two"><span>✓</span></div>
          <div className="orbit-core">✦</div>
          <p>Decisão<br /><strong>explicável</strong></p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel journey-panel">
          <div className="panel-heading"><div><span className="eyebrow">COMO FUNCIONA</span><h3>Da intenção à compra</h3></div></div>
          <div className="journey-list">
            {journey.map((item) => (
              <div className="journey-item" key={item.number}>
                <span>{item.number}</span>
                <div><strong>{item.title}</strong><p>{item.text}</p></div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel policy-panel">
          <div className="panel-heading"><div><span className="eyebrow">SEUS LIMITES</span><h3>Política principal</h3></div><Link to="/politicas">Editar</Link></div>
          <div className="policy-limit"><span>Limite por compra</span><strong>R$ 500</strong></div>
          <div className="meter"><i /></div>
          <div className="policy-tags"><span>Eletrônicos</span><span>Casa</span><span>Livros</span></div>
          <div className="autonomy-row"><span className="status-dot" /><div><strong>Aprovação manual</strong><p>Você confirma antes do pagamento.</p></div></div>
        </article>
      </section>
    </div>
  )
}
