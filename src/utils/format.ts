// Formato brasileiro sempre (glossário da identidade visual): R$ 389,90 · 30/out · 14:03.

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function formatBRL(value: number) {
  // O Intl já separa "R$" do número com espaço inquebrável, então o valor nunca quebra de linha.
  return currency.format(value)
}

// Aceita "500", "499,90" e "1.234,56". Devolve null se não for um número.
export function parseBRL(text: string): number | null {
  const clean = text.replace(/[R$\s]/g, '')
  if (!clean) return null
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

// O contrário de parseBRL, para preencher o campo ao editar: 499.9 vira "499,90".
export function toBRLInput(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace('.', ',')
}

// A API guarda lojas em minúsculas para comparar; na tela, "loja sonora" vira "Loja Sonora".
export function titleCase(text: string) {
  return text.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
}

// "na Loja Sonora", mas "na loja Mercado da Casa": evita "na Mercado da Casa" e "na loja Loja Sonora".
export function atStore(store: string) {
  return /^loja\s/i.test(store) ? `na ${store}` : `na loja ${store}`
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function formatDate(iso: string) {
  const date = new Date(iso)
  return `${pad(date.getDate())}/${MONTHS[date.getMonth()]}`
}

export function formatTime(iso: string) {
  const date = new Date(iso)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)} · ${formatTime(iso)}`
}
