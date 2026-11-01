import {
  Ban,
  CheckCheck,
  CircleCheck,
  CircleDashed,
  CirclePause,
  CircleX,
  Clock,
  CreditCard,
  Hand,
  KeyRound,
  LifeBuoy,
  ListOrdered,
  PackageCheck,
  QrCode,
  RotateCcw,
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
    aguardando_aprovacao: { label: 'Esperando você', tone: 'attention', icon: ListOrdered },
    sem_resultado: { label: 'Sem resultado', tone: 'neutral', icon: SearchX },
    aprovada: { label: 'Aprovada', tone: 'success', icon: CircleCheck },
    concluida: { label: 'Concluída', tone: 'info', icon: CheckCheck },
    expirada: { label: 'Expirada', tone: 'neutral', icon: Clock },
  },
  autorizacao: {
    ativa: { label: 'Ativa', tone: 'success', icon: KeyRound },
    usada: { label: 'Usada', tone: 'info', icon: CheckCheck },
    revogada: { label: 'Revogada', tone: 'danger', icon: Ban },
    expirada: { label: 'Expirada', tone: 'neutral', icon: Clock },
  },
  pedido: {
    aguardando_pagamento: { label: 'Falta pagar', tone: 'attention', icon: QrCode },
    pago: { label: 'Pago', tone: 'info', icon: CreditCard },
    enviado: { label: 'Enviado', tone: 'brand', icon: Truck },
    entregue: { label: 'Entregue', tone: 'success', icon: PackageCheck },
    expirado: { label: 'Pix vencido', tone: 'neutral', icon: Clock },
    cancelado: { label: 'Cancelado', tone: 'neutral', icon: CircleX },
    devolucao_solicitada: { label: 'Devolução pedida', tone: 'info', icon: RotateCcw },
    devolvido: { label: 'Devolvido', tone: 'warning', icon: Undo2 },
  },
  chamado: {
    aberto: { label: 'Aberto', tone: 'info', icon: LifeBuoy },
  },
} satisfies Record<string, Record<string, Badge>>

type Badges = typeof badges
export type StatusKind = keyof Badges

// Status que a tela ainda não conhece (a API mudou antes do front) vira um selo neutro, sem derrubar a tela.
function badgeFor(kind: StatusKind, status: PropertyKey): Badge {
  const known = (badges[kind] as Record<PropertyKey, Badge | undefined>)[status]
  return known ?? { label: String(status).replace(/_/g, ' '), tone: 'neutral', icon: CircleDashed }
}

// Ícone do status, para quem precisa dele fora do selo (ex.: o histórico do pedido).
export function statusIcon<K extends StatusKind>(kind: K, status: keyof Badges[K]) {
  return badgeFor(kind, status).icon
}

export function StatusBadge<K extends StatusKind>({ kind, status }: { kind: K; status: keyof Badges[K] }) {
  const { label, tone, icon: Icon } = badgeFor(kind, status)
  return (
    <span className={tone === 'neutral' ? 'badge' : `badge badge-${tone}`}>
      <Icon aria-hidden="true" />
      {label}
    </span>
  )
}
