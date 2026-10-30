// Categorias do catálogo de supermercado. A política aceita qualquer nível do caminho da oferta
// ("mercearia" aceita Arroz e Café; "bebidas" aceita Cervejas), e a API compara sem maiúsculas
// nem acentos. Uma categoria fora da lista aparece do jeito que foi digitada.
const LABELS: Record<string, string> = {
  'alimentos e bebidas': 'Alimentos e Bebidas',
  mercearia: 'Mercearia',
  'laticínios': 'Laticínios',
  padaria: 'Padaria',
  ovos: 'Ovos',
  bebidas: 'Bebidas',
  'bebidas alcoólicas': 'Bebidas Alcoólicas',
  'casa e limpeza': 'Casa e Limpeza',
  limpeza: 'Limpeza',
  lavanderia: 'Lavanderia',
  'higiene e cuidado pessoal': 'Higiene e Cuidado Pessoal',
}

export const SUGGESTED_CATEGORIES = Object.keys(LABELS)

export function categoryLabel(category: string) {
  return LABELS[category.trim().toLowerCase()] ?? category
}
