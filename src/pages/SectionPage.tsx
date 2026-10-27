import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, KeyRound, Package, ScrollText, Search, type LucideIcon } from 'lucide-react'

type Section = 'request' | 'authorizations' | 'orders' | 'audit'

const content: Record<Section, { eyebrow: string; title: string; text: string; action: string; icon: LucideIcon }> = {
  request: { eyebrow: 'Nova compra', title: 'Descreva o que você precisa', text: 'Escreva como falaria com alguém de confiança: para que serve, quanto quer gastar e o que não pode faltar.', action: 'Buscar ofertas', icon: Search },
  authorizations: { eyebrow: 'Aprovação e pagamento', title: 'Autorizações', text: 'Acompanhe e revogue permissões limitadas antes que sejam usadas.', action: 'Ver como funciona', icon: KeyRound },
  orders: { eyebrow: 'Pós-compra', title: 'Seus pedidos', text: 'Comprovantes, status, cancelamentos, devoluções e chamados.', action: 'Atualizar pedidos', icon: Package },
  audit: { eyebrow: 'Transparência', title: 'Auditoria', text: 'Cada decisão do agente e cada ação sua, em ordem, com o motivo.', action: 'Filtrar eventos', icon: ScrollText },
}

export function SectionPage({ section }: { section: Section }) {
  const item = content[section]
  const isRequest = section === 'request'
  const location = useLocation()
  // O painel inicial envia o texto já digitado em state.description.
  const initialDescription = (location.state as { description?: string } | null)?.description ?? ''
  const Icon = item.icon

  return (
    <div className="page page-enter">
      <header className="page-header">
        <div><span className="text-label">{item.eyebrow}</span><h1>{item.title}</h1><p>{item.text}</p></div>
      </header>
      <section className="panel">
        <div className="panel-body stack-lg">
          {isRequest ? (
            <div className="field">
              <label className="field-label" htmlFor="descricao">O que você precisa</label>
              <textarea
                className="input"
                id="descricao"
                rows={4}
                defaultValue={initialDescription}
                placeholder="Ex.: um fone sem fio confortável para reuniões, com cancelamento de ruído e até R$ 450."
              />
              <div className="row"><span className="field-hint">Se quiser, inclua:</span><span className="tag">Prazo</span><span className="tag">Categoria</span><span className="tag">Loja preferida</span></div>
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon"><Icon aria-hidden="true" /></span>
              <strong>Esta etapa já tem uma rota reservada.</strong>
              <p>A interface funcional entra no próximo incremento, conectada ao contrato da API.</p>
            </div>
          )}
          <div className="section-actions">
            <Link to="/inicio" className="btn btn-secondary">Voltar</Link>
            <button className="btn btn-primary" type="button">{item.action} <ArrowRight aria-hidden="true" /></button>
          </div>
        </div>
      </section>
    </div>
  )
}
