import { demoMode } from './auth'
import { ApiError, apiRequest } from './client'
import { nowIso, recordDemoEvent, wait } from './demo'

// Contrato em docs/contrato-api.md (GET e PATCH /usuarios/me).

// O ranking sobe as marcas preferidas e desce as evitadas. Textos em minúsculas.
export type Preferences = {
  marcas_preferidas: string[]
  marcas_evitadas: string[]
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

// Campo não preenchido chega como null (ou lista vazia nas preferências).
export type Profile = {
  id: string
  nome: string
  email: string
  // AAAA-MM-DD. Sem ela, o agente não oferece bebidas alcoólicas.
  data_nascimento: string | null
  endereco: Address | null
  preferencias: Preferences
  // Acima dele, o agente não compra sozinho: pede a sua aprovação.
  orcamento_mensal: number | null
  criado_em: string
  atualizado_em?: string | null
}

// O PATCH aceita qualquer subconjunto destes campos; o que não vai fica como está.
export type ProfileInput = {
  nome?: string
  data_nascimento?: string
  preferencias?: Preferences
  orcamento_mensal?: number | null
  endereco?: AddressInput
}

// Chaves de "detalhes" que a API pode devolver no PATCH. O CEP não encontrado vem em "cep".
export const PROFILE_FIELDS = [
  'nome', 'data_nascimento', 'orcamento_mensal', 'preferencias.marcas_preferidas', 'preferencias.marcas_evitadas',
  'cep', 'endereco.cep', 'endereco.numero', 'endereco.complemento',
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
  '01001000': { logradouro: 'Praça da Sé', bairro: 'Sé', cidade: 'São Paulo', uf: 'SP' },
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
      data_nascimento: null,
      preferencias: { marcas_preferidas: [], marcas_evitadas: [] },
      orcamento_mensal: 800,
      endereco: { cep: '04546042', numero: '300', complemento: '', ...DEMO_CEPS['04546042'] },
      criado_em: nowIso(-60 * 24 * 3),
      atualizado_em: nowIso(-60 * 24),
    }
  }
  return demoProfile
}

const normalize = (list: string[]) => [...new Set(list.map((item) => item.trim().toLowerCase()).filter(Boolean))]

const demo = {
  async get() {
    await wait()
    return structuredClone(currentDemo())
  },
  async update(input: ProfileInput) {
    await wait(600)
    const errors: Record<string, string> = {}
    const current = currentDemo()
    const nome = input.nome?.trim() ?? current.nome
    if (!nome || nome.length > 80) errors.nome = 'Informe um nome de até 80 caracteres.'
    if (input.data_nascimento !== undefined && !(/^\d{4}-\d{2}-\d{2}$/.test(input.data_nascimento) && new Date(input.data_nascimento) < new Date())) {
      errors.data_nascimento = 'Informe uma data no passado.'
    }
    if (input.orcamento_mensal !== undefined && input.orcamento_mensal !== null && !(input.orcamento_mensal > 0)) {
      errors.orcamento_mensal = 'Informe um valor maior que zero ou deixe vazio.'
    }
    let endereco = current.endereco
    if (input.endereco) {
      const cep = onlyDigits(input.endereco.cep)
      const found = DEMO_CEPS[cep]
      if (!found) errors.cep = 'Confira o CEP. No modo de demonstração, use 04546-042, 01310-100 ou 01001-000.'
      if (!input.endereco.numero.trim()) errors['endereco.numero'] = 'Informe o número.'
      if (found) endereco = { ...input.endereco, cep, ...found }
    }
    if (Object.keys(errors).length) throw new ApiError(errors.cep ? 'CEP não encontrado.' : 'Perfil inválido.', 400, errors)
    demoProfile = {
      ...current,
      nome,
      data_nascimento: input.data_nascimento ?? current.data_nascimento,
      preferencias: input.preferencias
        ? { marcas_preferidas: normalize(input.preferencias.marcas_preferidas), marcas_evitadas: normalize(input.preferencias.marcas_evitadas) }
        : current.preferencias,
      orcamento_mensal: input.orcamento_mensal === undefined ? current.orcamento_mensal : input.orcamento_mensal,
      endereco,
      atualizado_em: nowIso(),
    }
    recordDemoEvent('perfil_atualizado', { tipo: 'usuario', id: 'demo' }, { campos: Object.keys(input) })
    return structuredClone(demoProfile)
  },
}
