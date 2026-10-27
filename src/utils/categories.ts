// Categorias do catálogo (DummyJSON) como a API compara, com o nome que a pessoa lê.
// Uma categoria fora da lista aparece do jeito que foi digitada.
const LABELS: Record<string, string> = {
  smartphones: 'Celulares',
  'mobile-accessories': 'Acessórios de celular',
  laptops: 'Notebooks',
  tablets: 'Tablets',
  'home-decoration': 'Decoração',
  'kitchen-accessories': 'Cozinha',
  furniture: 'Móveis',
  groceries: 'Mercado',
  beauty: 'Beleza',
  'skin-care': 'Cuidados com a pele',
  fragrances: 'Perfumes',
  'sports-accessories': 'Esportes',
}

export const SUGGESTED_CATEGORIES = Object.keys(LABELS)

export function categoryLabel(slug: string) {
  return LABELS[slug] ?? slug
}
