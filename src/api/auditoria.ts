import { demoMode } from './auth'
import { apiRequest } from './client'
import { demoEvents, wait } from './demo'

// Contrato em docs/contrato-api.md (GET /auditoria). Os tipos de evento estão na seção 7 do
// contrato de integração do backend.

export type ResourceType = 'usuario' | 'politica' | 'solicitacao' | 'autorizacao' | 'pedido' | 'chamado'

export type AuditEvent = {
  id: string
  tipo: string
  recurso: { tipo: ResourceType | string; id: string } | null
  // Dados pequenos do evento (ex.: total, origem). Nunca senha nem token.
  dados: Record<string, unknown> | null
  criado_em: string
}

export type AuditPage = {
  eventos: AuditEvent[]
  // Id para pedir a página seguinte (mais antiga); null quando acabou.
  proximo: string | null
}

export const AUDIT_PAGE_SIZE = 50

// GET /auditoria?limite=50&antes_de=<id>: do mais recente para o mais antigo.
export function listAuditEvents(antesDe?: string) {
  if (demoMode) return demo.list(antesDe)
  const query = new URLSearchParams({ limite: String(AUDIT_PAGE_SIZE) })
  if (antesDe) query.set('antes_de', antesDe)
  return apiRequest<AuditPage>(`/auditoria?${query}`)
}

const demo = {
  async list(antesDe?: string): Promise<AuditPage> {
    await wait()
    const ordered = [...demoEvents].reverse()
    const start = antesDe ? ordered.findIndex((event) => event.id === antesDe) + 1 : 0
    const page = ordered.slice(start, start + AUDIT_PAGE_SIZE)
    const more = start + AUDIT_PAGE_SIZE < ordered.length
    return { eventos: structuredClone(page), proximo: more ? page[page.length - 1].id : null }
  },
}
