// Utilitários do modo de demonstração (VITE_USE_MOCK_API=true). Os dados ficam só na memória
// da aba: recarregar a página volta ao estado inicial, como o README promete ("nada é salvo").
import { ApiError } from './client'

export function wait(ms = 350) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function demoId() {
  return Math.random().toString(16).slice(2, 10) + Date.now().toString(16)
}

export function nowIso(offsetMinutes = 0) {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString()
}

export function notFound(message: string): never {
  throw new ApiError(message, 404)
}

// Trilha de auditoria simulada, no formato de GET /auditoria: cada ação do modo demo grava um
// evento com o mesmo tipo e recurso que o backend grava (seção 7 do contrato de integração).
export type DemoEvent = {
  id: string
  tipo: string
  recurso: { tipo: string; id: string } | null
  dados: Record<string, unknown>
  criado_em: string
}

export const demoEvents: DemoEvent[] = []

export function recordDemoEvent(tipo: string, recurso: DemoEvent['recurso'] = null, dados: Record<string, unknown> = {}) {
  demoEvents.push({ id: demoId(), tipo, recurso, dados, criado_em: nowIso() })
}
