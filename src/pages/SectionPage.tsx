import { Link } from 'react-router-dom'
import { ArrowRight, KeyRound, Package, ScrollText, type LucideIcon } from 'lucide-react'

type Section = 'authorizations' | 'orders' | 'audit'

const content: Record<Section, { eyebrow: string; title: string; text: string; action: string; icon: LucideIcon }> = {
  authorizations: { eyebrow: 'Aprovação e pagamento', title: 'Autorizações', text: 'Acompanhe e revogue permissões limitadas antes que sejam usadas.', action: 'Ver como funciona', icon: KeyRound },
  orders: { eyebrow: 'Pós-compra', title: 'Seus pedidos', text: 'Comprovantes, status, cancelamentos, devoluções e chamados.', action: 'Atualizar pedidos', icon: Package },
  audit: { eyebrow: 'Transparência', title: 'Auditoria', text: 'Cada decisão do agente e cada ação sua, em ordem, com o motivo.', action: 'Filtrar eventos', icon: ScrollText },
}

export function SectionPage({ section }: { section: Section }) {
  const item = content[section]
  const Icon = item.icon

  return (
    <div className="page page-enter">
      <header className="page-header">
        <div><span className="text-label">{item.eyebrow}</span><h1>{item.title}</h1><p>{item.text}</p></div>
      </header>
      <section className="panel">
        <div className="panel-body stack-lg">
          <div className="empty-state">
            <span className="empty-state-icon"><Icon aria-hidden="true" /></span>
            <strong>Esta etapa já tem uma rota reservada.</strong>
            <p>A interface funcional entra no próximo incremento, conectada ao contrato da API.</p>
          </div>
          <div className="section-actions">
            <Link to="/inicio" className="btn btn-secondary">Voltar</Link>
            <button className="btn btn-primary" type="button">{item.action} <ArrowRight aria-hidden="true" /></button>
          </div>
        </div>
      </section>
    </div>
  )
}
