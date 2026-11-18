import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

// Mesma chave lida pelo script em index.html, que aplica o tema antes da primeira pintura (sem piscar).
const THEME_KEY = 'agentic-commerce:tema'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readSaved(): Theme | null {
  try {
    const saved = window.localStorage.getItem(THEME_KEY)
    return saved === 'light' || saved === 'dark' ? saved : null
  } catch {
    return null
  }
}

// Sem escolha salva, o tema segue o sistema. Ao usar o interruptor, a escolha vale para este navegador.
export function useTheme() {
  const [saved, setSaved] = useState<Theme | null>(readSaved)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches)
  const isDark = saved ? saved === 'dark' : systemDark

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const onChange = () => setSystemDark(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (saved) document.documentElement.dataset.theme = saved
    else delete document.documentElement.dataset.theme
  }, [saved])

  function toggleTheme() {
    const next: Theme = isDark ? 'light' : 'dark'
    setSaved(next)
    try {
      window.localStorage.setItem(THEME_KEY, next)
    } catch {
      // Sem storage, a escolha vale só até recarregar a página.
    }
  }

  return { isDark, toggleTheme }
}
