import {
  Ban,
  CheckCheck,
  CircleCheck,
  CirclePause,
  CircleX,
  Clock,
  CreditCard,
  Hand,
  KeyRound,
  ListOrdered,
  LoaderCircle,
  PackageCheck,
  SearchX,
  ShieldCheck,
  ShieldX,
  Sparkle,
  Truck,
  Undo2,
  Zap,
  type LucideIcon,
} from 'lucide-react'

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand' | 'accent' | 'attention'
type Badge = { label: string; tone: Tone; icon: LucideIcon }

// Único lugar com texto, cor e ícone de cada status do domínio. As chaves seguem os valores da API.
// Tons: success "está certo", attention "precisa de você", accent "o agente agiu ou apontou",
// danger "bloqueado", info "registrado", neutral "parado".
const badges = {
  politica: {
    ativa: { label: 'Ativa', tone: 'success', icon: CircleCheck },
    inativa: { label: 'Inativa', tone: 'neutral', icon: CirclePause },
  },
  autonomia: {
    manual: { label: 'Manual', tone: 'attention', icon: Hand },
    automatica: { label: 'Automática', tone: 'accent', icon: Zap },
  },
  oferta: {
    dentro: { label: 'Dentro da política', tone: 'success', icon: ShieldCheck },
    fora: { label: 'Fora da política', tone: 'danger', icon: ShieldX },
    recomendada: { label: 'Recomendada', tone: 'accent', icon: Sparkle },
  },
  solicitacao: {
    processando: { label: 'Buscando ofertas', tone: 'info', icon: LoaderCircle },
    com_resultado: { label: 'Esperando você', tone: 'attention', icon: ListOrdered },
    sem_resultado: { label: 'Sem resultado', tone: 'neutral', icon: SearchX },
    aprovada: { label: 'Aprovada', tone: 'success', icon: CircleCheck },
    cancelada: { label: 'Cancelada', tone: 'neutral', icon: CircleX },
  },
  autorizacao: {
    ativa: { label: 'Ativa', tone: 'success', icon: KeyRound },
    usada: { label: 'Usada', tone: 'info', icon: CheckCheck },
    revogada: { label: 'Revogada', tone: 'danger', icon: Ban },
    expirada: { label: 'Expirada', tone: 'neutral', icon: Clock },
  },
  pedido: {
    pago: { label: 'Pago', tone: 'info', icon: CreditCard },
    enviado: { label: 'Enviado', tone: 'brand', icon: Truck },
    entregue: { label: 'Entregue', tone: 'success', icon: PackageCheck },
    cancelado: { label: 'Cancelado', tone: 'neutral', icon: CircleX },
    devolvido: { label: 'Devolvido', tone: 'warning', icon: Undo2 },
  },
} satisfies Record<string, Record<string, Badge>>

type Badges = typeof badges
export type StatusKind = keyof Badges

export function StatusBadge<K extends StatusKind>({ kind, status }: { kind: K; status: keyof Badges[K] }) {
  const { label, tone, icon: Icon } = badges[kind][status] as Badge
  return (
    <span className={tone === 'neutral' ? 'badge' : `badge badge-${tone}`}>
      <Icon aria-hidden="true" />
      {label}
    </span>
  )
}
