import { demoMode } from './auth'
import { apiRequest } from './client'
import { demoEvents, wait, type DemoActor } from './demo'

// Contrato em docs/contrato-api.md (GET /auditoria).

// Quem agiu: você, o agente, uma política (bloqueio) ou o sistema (expiração, pagamento).
export type AuditActor = DemoActor

export type AuditEvent = {
  id: string
  tipo: string
  ator: AuditActor
  descricao: string
  criado_em: string
  dados: Record<string, unknown>
}

// GET /auditoria: a trilha da pessoa, da mais recente para a mais antiga.
export function listAuditEvents() {
  if (demoMode) return demo.list()
  return apiRequest<AuditEvent[]>('/auditoria')
}

// Se a API não mandar "ator", dá para deduzir pelo começo do tipo.
export function actorOf(event: Pick<AuditEvent, 'tipo'> & { ator?: AuditActor }): AuditActor {
  if (event.ator) return event.ator
  if (event.tipo.startsWith('politica.')) return 'politica'
  if (event.tipo.startsWith('ofertas.') || event.tipo === 'compra.automatica') return 'agente'
  if (event.tipo === 'autorizacao.expirada' || event.tipo === 'autorizacao.usada') return 'sistema'
  return 'voce'
}

const demo = {
  async list(): Promise<AuditEvent[]> {
    await wait()
    return [...demoEvents].sort((a, b) => b.criado_em.localeCompare(a.criado_em)).map((event) => structuredClone(event))
  },
}
