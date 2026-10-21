import { Link } from 'react-router-dom'

const content = {
  request: { eyebrow: 'COMPRA POR INTENÇÃO', title: 'O que você precisa?', text: 'Descreva o produto, o contexto de uso e qualquer limite importante.', action: 'Buscar recomendações' },
  policies: { eyebrow: 'PERFIL E GOVERNANÇA', title: 'Políticas de compra', text: 'Defina teto, categorias, lojas e o nível de autonomia do seu agente.', action: 'Criar política' },
  profile: { eyebrow: 'PREFERÊNCIAS', title: 'Seu perfil', text: 'Orçamento, preferências e endereço de entrega ficam centralizados aqui.', action: 'Completar perfil' },
  authorizations: { eyebrow: 'APROVAÇÃO E PAGAMENTO', title: 'Autorizações', text: 'Acompanhe e revogue permissões limitadas antes que sejam usadas.', action: 'Ver como funciona' },
  orders: { eyebrow: 'PÓS-COMPRA', title: 'Seus pedidos', text: 'Comprovantes, status, cancelamentos, devoluções e chamados.', action: 'Atualizar pedidos' },
  audit: { eyebrow: 'TRANSPARÊNCIA', title: 'Trilha de auditoria', text: 'Cada decisão do agente aparece aqui de forma clara e cronológica.', action: 'Filtrar eventos' },
} as const

export function SectionPage({ section }: { section: keyof typeof content }) {
  const item = content[section]
  const isRequest = section === 'request'

  return (
    <div className="section-page page-enter">
      <header className="page-header compact">
        <div><span className="eyebrow">{item.eyebrow}</span><h1>{item.title}</h1><p>{item.text}</p></div>
      </header>
      <section className="panel section-placeholder">
        {isRequest ? (
          <>
            <label className="intent-input-label" htmlFor="intent">Sua intenção</label>
            <textarea id="intent" placeholder="Ex.: Quero um fone sem fio confortável para reuniões, com cancelamento de ruído e até R$ 450." />
            <div className="suggestion-chips"><span>+ Definir prazo</span><span>+ Categoria</span><span>+ Loja preferida</span></div>
          </>
        ) : (
          <div className="empty-state"><span>✦</span><strong>Esta etapa já tem uma rota reservada.</strong><p>A interface funcional entra no próximo incremento, conectada ao contrato da API.</p></div>
        )}
        <div className="section-actions"><Link to="/inicio" className="secondary-button">Voltar</Link><button className="primary-button">{item.action} <span>→</span></button></div>
      </section>
    </div>
  )
}
