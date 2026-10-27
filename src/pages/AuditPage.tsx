import {
  Ban,
  CheckCheck,
  CircleAlert,
  CircleX,
  Clock,
  KeyRound,
  ListOrdered,
  Lock,
  ScrollText,
  Search,
  SearchX,
  ShieldX,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { actorOf, listAuditEvents, type AuditActor, type AuditEvent } from '../api/auditoria'
import { isNotConnected } from '../api/client'
import { NotConnected } from '../components/NotConnected'
import { useResource } from '../hooks/useResource'
import { formatDateTime, formatTime } from '../utils/format'

// Ícone de cada tipo de evento; um tipo novo cai no ícone da auditoria.
const ICONS: Record<string, LucideIcon> = {
  'solicitacao.criada': Search,
  'solicitacao.cancelada': CircleX,
  'ofertas.ranqueadas': ListOrdered,
  'ofertas.sem_resultado': SearchX,
  'politica.bloqueou': ShieldX,
  'autorizacao.criada': KeyRound,
  'autorizacao.senha_incorreta': Lock,
  'autorizacao.revogada': Ban,
  'autorizacao.expirada': Clock,
  'autorizacao.usada': CheckCheck,
  'compra.automatica': Zap,
}

// data-actor da trilha: "bloqueio" é a política decidindo; o sistema fica sem marcador colorido.
const ACTORS: Record<AuditActor, { label: string; marker?: string }> = {
  voce: { label: 'Você', marker: 'voce' },
  agente: { label: 'Agente', marker: 'agente' },
  politica: { label: 'Política', marker: 'bloqueio' },
  sistema: { label: 'Sistema' },
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
  const actor = ACTORS[actorOf(event)] ?? ACTORS.sistema
  const Icon = ICONS[event.tipo] ?? ScrollText
  const hasData = event.dados && Object.keys(event.dados).length > 0

  return (
    <li className="timeline-item">
      <span className="timeline-marker" data-actor={actor.marker}><Icon aria-hidden="true" /></span>
      <div className="timeline-content">
        <div className="timeline-meta">
          <span className="actor">{actor.label}</span>
          <time dateTime={event.criado_em}>{dayLabel(event.criado_em)}</time>
        </div>
        <p className="timeline-title">{event.descricao}</p>
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
  const { data: events, error, loading, reload } = useResource(listAuditEvents)
  // A API já manda em ordem, mas a tela garante: do mais recente para o mais antigo.
  const ordered = events && [...events].sort((a, b) => b.criado_em.localeCompare(a.criado_em))

  return (
    <div className="page page-enter">
      <header className="page-header">
        <div>
          <span className="text-label">Transparência</span>
          <h1>Auditoria</h1>
          <p>Cada decisão do agente, cada bloqueio das políticas e cada ação sua, do mais recente para o mais antigo. Nada aqui pode ser apagado.</p>
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

      {Boolean(error) && !events && (isNotConnected(error) ? <NotConnected message="A trilha de auditoria vai aparecer aqui assim que a API tiver essa rota." /> : (
        <div className="alert alert-danger" role="alert">
          <CircleAlert aria-hidden="true" />
          <div className="stack">
            <p><strong>Não consegui carregar a trilha.</strong> {error instanceof Error ? error.message : ''}</p>
            <div><button className="btn btn-secondary btn-sm" type="button" onClick={reload}>Tentar de novo</button></div>
          </div>
        </div>
      ))}

      {ordered && ordered.length === 0 && (
        <section className="panel">
          <div className="empty-state">
            <span className="empty-state-icon"><ScrollText aria-hidden="true" /></span>
            <strong>Nada registrado ainda.</strong>
            <p>Quando você descrever uma compra, cada passo (busca, ranking, bloqueios e aprovações) fica registrado aqui.</p>
          </div>
        </section>
      )}

      {ordered && ordered.length > 0 && (
        <section className="panel" aria-label="Trilha de auditoria">
          <div className="panel-body">
            <ol className="timeline">
              {ordered.map((event) => <TimelineItem key={event.id} event={event} />)}
            </ol>
          </div>
        </section>
      )}
    </div>
  )
}
