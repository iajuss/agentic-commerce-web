import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'

type Resource<T> = {
  data: T | undefined
  error: unknown
  loading: boolean
  reload: () => void
  setData: Dispatch<SetStateAction<T | undefined>>
}

// Carrega um recurso da API ao montar a tela e quando `load` muda. `setData` atualiza a tela
// depois de uma ação (criar, excluir) sem buscar tudo de novo.
export function useResource<T>(load: () => Promise<T>): Resource<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    load()
      .then((result) => { if (active) setData(result) })
      .catch((caught: unknown) => { if (active) setError(caught) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [load, attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])
  return { data, error, loading, reload, setData }
}
