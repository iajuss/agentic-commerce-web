import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Ban,
  CircleAlert,
  CircleX,
  Clock,
  CreditCard,
  KeyRound,
  LifeBuoy,
  Lock,
  LogIn,
  Package,
  PackageCheck,
  ScrollText,
  Search,
  ShieldCheck,
  Undo2,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { listAuditEvents, type AuditEvent, type AuditPage as AuditPageData } from '../api/auditoria'
import { useResource } from '../hooks/useResource'
import { formatBRL, formatDateTime, formatTime } from '../utils/format'

// Quem agiu: você, o agente, um bloqueio de segurança ou o sistema (pagamento, entrega, prazo).
type Actor = 'voce' | 'agente' | 'bloqueio' | 'sistema'

const ACTORS: Record<Actor, { label: string; marker?: string }> = {
  voce: { label: 'Você', marker: 'voce' },
  agente: { label: 'Agente', marker: 'agente' },
  bloqueio: { label: 'Segurança', marker: 'bloqueio' },
  sistema: { label: 'Sistema' },
}

type Described = { actor: Actor; icon: LucideIcon; title: string }

function money(dados: AuditEvent['dados']) {
  return typeof dados?.total === 'number' ? ` de ${formatBRL(dados.total)}` : ''
}

// Frase no passado para cada tipo de evento da API (seção 7 do contrato de integração).
function describe(event: AuditEvent): Described {
  const { dados } = event
  switch (event.tipo) {
    case 'usuario_cadastrado': return { actor: 'voce', icon: UserRound, title: 'Você criou sua conta' }
    case 'sessao_iniciada': return { actor: 'voce', icon: LogIn, title: 'Você entrou na sua conta' }
    case 'login_recusado': return { actor: 'bloqueio', icon: Lock, title: 'Uma tentativa de entrar na sua conta foi recusada: a senha não conferia' }
    case 'perfil_atualizado': return { actor: 'voce', icon: UserRound, title: 'Você atualizou o perfil' }
    case 'politica_criada': return { actor: 'voce', icon: ShieldCheck, title: 'Você criou uma política' }
    case 'politica_substituida': return { actor: 'voce', icon: ShieldCheck, title: 'Você alterou uma política' }
    case 'politica_removida': return { actor: 'voce', icon: ShieldCheck, title: 'Você excluiu uma política' }
    case 'solicitacao_criada': {
      const items = typeof dados?.itens === 'number' ? ` com ${dados.itens} ${dados.itens === 1 ? 'item' : 'itens'}` : ''
      return { actor: 'voce', icon: Search, title: `Você mandou uma lista${items}` }
    }
    case 'solicitacao_cancelada': return { actor: 'voce', icon: CircleX, title: 'Você cancelou uma lista' }
    case 'autorizacao_emitida':
      return dados?.origem === 'automatica'
        ? { actor: 'agente', icon: Zap, title: 'Aprovei a cesta sozinho, dentro da sua política automática' }
        : { actor: 'voce', icon: KeyRound, title: 'Você aprovou uma cesta com a senha' }
    case 'reautenticacao_recusada': return { actor: 'bloqueio', icon: Lock, title: 'A senha não conferiu, então nada foi aprovado' }
    case 'autorizacao_revogada': return { actor: 'voce', icon: Ban, title: 'Você revogou uma autorização' }
    case 'pedido_criado': return { actor: 'sistema', icon: Package, title: `Pedido criado, com cobrança Pix${money(dados)}` }
    case 'pagamento_confirmado': return { actor: 'sistema', icon: CreditCard, title: `O Pix${money(dados)} foi pago` }
    case 'pedido_expirado': return { actor: 'sistema', icon: Clock, title: 'O Pix venceu sem pagamento e o pedido expirou' }
    case 'pedido_cancelado': return { actor: 'voce', icon: CircleX, title: 'Você cancelou um pedido' }
    case 'pedido_entregue': return { actor: 'sistema', icon: PackageCheck, title: 'O pedido foi entregue' }
    case 'devolucao_solicitada': return { actor: 'voce', icon: Undo2, title: 'Você pediu a devolução de um pedido' }
    case 'chamado_aberto': return { actor: 'voce', icon: LifeBuoy, title: 'Você abriu um chamado de pós-venda' }
    default: return { actor: 'sistema', icon: ScrollText, title: event.tipo.replace(/_/g, ' ') }
  }
}

// Link para o que o evento mexeu, quando há uma tela para ele.
function resourceLink(event: AuditEvent) {
  const resource = event.recurso
  if (!resource) return null
  if (resource.tipo === 'solicitacao' && event.tipo !== 'solicitacao_cancelada') return { to: `/compras/${resource.id}`, label: 'Ver lista' }
  if (resource.tipo === 'pedido') return { to: `/pedidos/${resource.id}`, label: 'Ver pedido' }
  if (resource.tipo === 'politica' && event.tipo !== 'politica_removida') return { to: '/politicas', label: 'Ver políticas' }
  return null
}

function dayLabel(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return `hoje, ${formatTime(iso)}`
  if (date.toDateString() === yesterday.toDateString()) return `ontem, ${formatTime(iso)}`
  return formatDateTime(iso)
}

function TimelineItem({ event }: { event: AuditEvent }) {
  const { actor, icon: Icon, title } = describe(event)
  const { label, marker } = ACTORS[actor]
  const link = resourceLink(event)
  const hasData = event.dados && Object.keys(event.dados).length > 0

  return (
    <li className="timeline-item">
      <span className="timeline-marker" data-actor={marker}><Icon aria-hidden="true" /></span>
      <div className="timeline-content">
        <div className="timeline-meta">
          <span className="actor">{label}</span>
          <time dateTime={event.criado_em}>{dayLabel(event.criado_em)}</time>
        </div>
        <p className="timeline-title">{title}</p>
        {link && <Link className="text-small" to={link.to}>{link.label}</Link>}
        {hasData && (
          <details className="timeline-details">
            <summary>Ver dados registrados</summary>
            <pre>{JSON.stringify(event.dados, null, 2)}</pre>
          </details>
        )}
      </div>
    </li>
  )
}

export function AuditPage() {
  const load = useCallback(() => listAuditEvents(), [])
  const { data, error, loading, reload, setData } = useResource<AuditPageData>(load)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState('')
  const events = data?.eventos

  async function loadMore() {
    if (!data?.proximo) return
    setMoreError('')
    setLoadingMore(true)
    try {
      const page = await listAuditEvents(data.proximo)
      setData((current) => current && { eventos: [...current.eventos, ...page.eventos], proximo: page.proximo })
    } catch (caught) {
      setMoreError(caught instanceof Error ? caught.message : 'Não consegui carregar mais eventos.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="page page-enter">
      <header className="page-header">
        <div>
          <span className="text-label">Transparência</span>
          <h1>Auditoria</h1>
          <p>Cada decisão do agente, cada bloqueio de segurança e cada ação sua, do mais recente para o mais antigo. Nada aqui pode ser apagado.</p>
        </div>
      </header>

      {loading && !events && (
        <section className="panel" aria-busy="true" aria-label="Carregando a trilha">
          <div className="panel-body stack">
            <span className="skeleton skeleton-title" />
            <span className="skeleton" />
            <span className="skeleton skeleton-short" />
          </div>
        </section>
      )}

      {Boolean(error) && !events && (
        <div className="alert alert-danger" role="alert">
          <CircleAlert aria-hidden="true" />
          <div className="stack">
            <p><strong>Não consegui carregar a trilha.</strong> {error instanceof Error ? error.message : ''}</p>
            <div><button className="btn btn-secondary btn-sm" type="button" onClick={reload}>Tentar de novo</button></div>
          </div>
        </div>
      )}

      {events && events.length === 0 && (
        <section className="panel">
          <div className="empty-state">
            <span className="empty-state-icon"><ScrollText aria-hidden="true" /></span>
            <strong>Nada registrado ainda.</strong>
            <p>Quando você mandar uma lista, cada passo (aprovação, pagamento, entrega e chamados) fica registrado aqui.</p>
          </div>
        </section>
      )}

      {events && events.length > 0 && (
        <section className="panel" aria-label="Trilha de auditoria">
          <div className="panel-body stack-lg">
            <ol className="timeline">
              {events.map((event) => <TimelineItem key={event.id} event={event} />)}
            </ol>
            {moreError && <p className="field-error" role="alert"><CircleAlert aria-hidden="true" />{moreError}</p>}
            {data?.proximo && (
              <div>
                <button className="btn btn-secondary" type="button" onClick={loadMore} aria-busy={loadingMore} disabled={loadingMore}>
                  {loadingMore ? 'Carregando…' : 'Ver eventos mais antigos'}
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
