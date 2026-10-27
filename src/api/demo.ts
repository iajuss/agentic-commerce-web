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

// Trilha de auditoria simulada: cada ação do modo demo grava um evento, como a API fará.
export type DemoActor = 'voce' | 'agente' | 'politica' | 'sistema'
export type DemoEvent = {
  id: string
  tipo: string
  ator: DemoActor
  descricao: string
  criado_em: string
  dados: Record<string, unknown>
}

export const demoEvents: DemoEvent[] = []

export function recordDemoEvent(tipo: string, ator: DemoActor, descricao: string, dados: Record<string, unknown> = {}, criadoEm = nowIso()) {
  demoEvents.push({ id: demoId(), tipo, ator, descricao, criado_em: criadoEm, dados })
}
