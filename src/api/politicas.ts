import { demoMode } from './auth'
import { ApiError, apiRequest } from './client'
import { demoId, notFound, nowIso, recordDemoEvent, wait } from './demo'

export type AutonomyLevel = 'manual' | 'automatica'

// Corpo de POST e PUT /politicas. Categorias e lojas vazias aceitam qualquer uma.
export type PolicyInput = {
  nome: string
  teto_por_compra: number | null
  categorias: string[]
  lojas: string[]
  nivel_autonomia: AutonomyLevel
  ativa: boolean
}

export type Policy = Omit<PolicyInput, 'teto_por_compra'> & {
  id: string
  teto_por_compra: number
  criada_em: string
  atualizada_em: string
}

export const POLICY_FIELDS = ['nome', 'teto_por_compra', 'categorias', 'lojas', 'nivel_autonomia', 'ativa'] as const

export function listPolicies() {
  if (demoMode) return demo.list()
  return apiRequest<Policy[]>('/politicas')
}

export function createPolicy(input: PolicyInput) {
  if (demoMode) return demo.create(input)
  return apiRequest<Policy>('/politicas', { method: 'POST', body: input })
}

export function updatePolicy(id: string, input: PolicyInput) {
  if (demoMode) return demo.update(id, input)
  return apiRequest<Policy>(`/politicas/${id}`, { method: 'PUT', body: input })
}

export function deletePolicy(id: string) {
  if (demoMode) return demo.remove(id)
  return apiRequest<void>(`/politicas/${id}`, { method: 'DELETE' })
}

// A política que o painel inicial mostra: a primeira ativa, na ordem de criação (a da API).
export function mainPolicy(policies: Policy[]) {
  return policies.find((policy) => policy.ativa)
}

export function policyToInput({ nome, teto_por_compra, categorias, lojas, nivel_autonomia, ativa }: Policy): PolicyInput {
  return { nome, teto_por_compra, categorias, lojas, nivel_autonomia, ativa }
}

// ---- Modo de demonstração: repete as regras de app/politicas/validacao.py ----------------

let demoPolicies: Policy[] = [
  {
    id: 'demo-politica-1',
    nome: 'Mercado do mês',
    teto_por_compra: 400,
    categorias: [],
    lojas: [],
    nivel_autonomia: 'manual',
    ativa: true,
    criada_em: nowIso(-60 * 24 * 3),
    atualizada_em: nowIso(-60 * 24 * 3),
  },
  {
    id: 'demo-politica-2',
    nome: 'Limpeza da casa',
    teto_por_compra: 60,
    categorias: ['casa e limpeza'],
    lojas: [],
    nivel_autonomia: 'automatica',
    ativa: true,
    criada_em: nowIso(-60 * 24 * 2),
    atualizada_em: nowIso(-60 * 24 * 2),
  },
]

function normalize(list: string[]) {
  return [...new Set(list.map((item) => item.trim().toLowerCase()).filter(Boolean))]
}

function validate(input: PolicyInput) {
  const errors: Record<string, string> = {}
  const nome = input.nome.trim()
  if (!nome) errors.nome = 'Informe um nome.'
  else if (nome.length > 80) errors.nome = 'Use no máximo 80 caracteres.'
  if (input.teto_por_compra === null || !(input.teto_por_compra > 0)) {
    errors.teto_por_compra = 'Informe um valor maior que zero.'
  }
  if (Object.keys(errors).length) throw new ApiError('Política inválida.', 400, errors)
  return {
    ...input,
    nome,
    teto_por_compra: input.teto_por_compra as number,
    categorias: normalize(input.categorias),
    lojas: normalize(input.lojas),
  }
}

export function demoPoliciesSnapshot() {
  return demoPolicies
}

const demo = {
  async list() {
    await wait()
    return demoPolicies.map((policy) => ({ ...policy }))
  },
  async create(input: PolicyInput) {
    await wait()
    const now = nowIso()
    const policy: Policy = { ...validate(input), id: demoId(), criada_em: now, atualizada_em: now }
    demoPolicies = [...demoPolicies, policy]
    recordDemoEvent('politica_criada', { tipo: 'politica', id: policy.id })
    return { ...policy }
  },
  async update(id: string, input: PolicyInput) {
    await wait()
    const current = demoPolicies.find((policy) => policy.id === id) ?? notFound('Política não encontrada.')
    const policy: Policy = { ...current, ...validate(input), atualizada_em: nowIso() }
    demoPolicies = demoPolicies.map((item) => (item.id === id ? policy : item))
    recordDemoEvent('politica_substituida', { tipo: 'politica', id })
    return { ...policy }
  },
  async remove(id: string) {
    await wait()
    if (!demoPolicies.some((policy) => policy.id === id)) notFound('Política não encontrada.')
    demoPolicies = demoPolicies.filter((policy) => policy.id !== id)
    recordDemoEvent('politica_removida', { tipo: 'politica', id })
  },
}
