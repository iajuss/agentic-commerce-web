import { useEffect, useState } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

// Mesma chave lida pelo script em index.html, que aplica o tema antes da primeira pintura (sem piscar).
const THEME_KEY = 'agentic-commerce:tema'

function readPreference(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(THEME_KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

// "system" tira o data-theme do <html> e o CSS volta a seguir o prefers-color-scheme.
// A escolha vale para este navegador, não para a conta.
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference)

  useEffect(() => {
    const root = document.documentElement
    if (preference === 'system') delete root.dataset.theme
    else root.dataset.theme = preference
    try {
      if (preference === 'system') window.localStorage.removeItem(THEME_KEY)
      else window.localStorage.setItem(THEME_KEY, preference)
    } catch {
      // Sem storage, a escolha vale só até recarregar a página.
    }
  }, [preference])

  return { preference, setPreference }
}
