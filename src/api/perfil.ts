import { demoMode } from './auth'
import { ApiError, apiRequest } from './client'
import { nowIso, wait } from './demo'

// Contrato em docs/contrato-api.md (GET e PATCH /usuarios/me).

export type RankingPriority = 'preco' | 'prazo' | 'avaliacao'

export type Preferences = {
  prioridade: RankingPriority
  lojas_preferidas: string[]
}

// O React manda só CEP, número e complemento; a API completa o resto pelo ViaCEP.
export type AddressInput = {
  cep: string
  numero: string
  complemento: string
}

export type Address = AddressInput & {
  logradouro: string
  bairro: string
  cidade: string
  uf: string
}

export type Profile = {
  id: string
  nome: string
  email: string
  preferencias: Preferences
  orcamento_mensal: number | null
  endereco: Address | null
  atualizado_em: string
}

export type ProfileInput = {
  nome: string
  preferencias: Preferences
  orcamento_mensal: number | null
  endereco: AddressInput | null
}

// Chaves de "detalhes" que a API pode devolver no PATCH.
export const PROFILE_FIELDS = [
  'nome', 'preferencias.prioridade', 'preferencias.lojas_preferidas', 'orcamento_mensal',
  'endereco.cep', 'endereco.numero', 'endereco.complemento',
] as const

export function getProfile() {
  if (demoMode) return demo.get()
  return apiRequest<Profile>('/usuarios/me')
}

export function updateProfile(input: ProfileInput) {
  if (demoMode) return demo.update(input)
  return apiRequest<Profile>('/usuarios/me', { method: 'PATCH', body: input })
}

export function onlyDigits(text: string) {
  return text.replace(/\D/g, '')
}

// Máscara 00000-000 enquanto a pessoa digita.
export function maskCep(text: string) {
  const digits = onlyDigits(text).slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

// ---- Modo de demonstração: o "ViaCEP" é uma tabela fixa ---------------------------------

const DEMO_CEPS: Record<string, Omit<Address, 'cep' | 'numero' | 'complemento'>> = {
  '04546042': { logradouro: 'Rua Quatá', bairro: 'Vila Olímpia', cidade: 'São Paulo', uf: 'SP' },
  '01310100': { logradouro: 'Avenida Paulista', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' },
  '20040020': { logradouro: 'Rua da Assembleia', bairro: 'Centro', cidade: 'Rio de Janeiro', uf: 'RJ' },
}

function storedUser() {
  try {
    return JSON.parse(window.localStorage.getItem('agentic-commerce:user') ?? '{}') as { nome?: string; email?: string }
  } catch {
    return {}
  }
}

let demoProfile: Profile | null = null

function currentDemo(): Profile {
  if (!demoProfile) {
    const user = storedUser()
    demoProfile = {
      id: 'demo',
      nome: user.nome ?? 'Pessoa',
      email: user.email ?? 'voce@exemplo.com',
      preferencias: { prioridade: 'preco', lojas_preferidas: [] },
      orcamento_mensal: 1200,
      endereco: { cep: '04546-042', numero: '300', complemento: '', ...DEMO_CEPS['04546042'] },
      atualizado_em: nowIso(-60 * 24),
    }
  }
  return demoProfile
}

const demo = {
  async get() {
    await wait()
    return structuredClone(currentDemo())
  },
  async update(input: ProfileInput) {
    await wait(600)
    const errors: Record<string, string> = {}
    const nome = input.nome.trim()
    if (!nome || nome.length > 80) errors.nome = 'Informe um nome de até 80 caracteres.'
    if (input.orcamento_mensal !== null && !(input.orcamento_mensal > 0)) {
      errors.orcamento_mensal = 'Informe um valor maior que zero ou deixe vazio.'
    }
    let endereco: Address | null = null
    if (input.endereco) {
      const cep = onlyDigits(input.endereco.cep)
      const found = DEMO_CEPS[cep]
      if (cep.length !== 8) errors['endereco.cep'] = 'Informe um CEP com 8 números.'
      else if (!found) errors['endereco.cep'] = 'Não encontrei este CEP. Confira os números. No modo de demonstração, use 04546-042 ou 01310-100.'
      if (!input.endereco.numero.trim()) errors['endereco.numero'] = 'Informe o número.'
      if (found && !errors['endereco.numero']) endereco = { ...input.endereco, cep: maskCep(cep), ...found }
    }
    if (Object.keys(errors).length) throw new ApiError('Confira os campos destacados.', 400, errors)
    demoProfile = {
      ...currentDemo(),
      nome,
      preferencias: { ...input.preferencias, lojas_preferidas: [...input.preferencias.lojas_preferidas] },
      orcamento_mensal: input.orcamento_mensal,
      endereco,
      atualizado_em: nowIso(),
    }
    return structuredClone(demoProfile)
  },
}
