import { useRef, useState, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { FieldError } from './FieldError'

type TagInputProps = {
  id: string
  label: string
  values: string[]
  onChange: (values: string[]) => void
  hint: string
  placeholder?: string
  error?: string
  suggestions?: string[]
  format?: (value: string) => string
}

// Lista de textos curtos (categorias, lojas): digite e tecle Enter ou vírgula, ou toque numa sugestão.
export function TagInput({ id, label, values, onChange, hint, placeholder, error, suggestions = [], format = (value) => value }: TagInputProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const pending = suggestions.filter((suggestion) => !values.includes(suggestion))

  function add(text: string) {
    const items = text.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)
    const next = [...new Set([...values, ...items])]
    if (next.length !== values.length) onChange(next)
    setDraft('')
  }

  // O botão tocado some da lista; o foco volta para o campo em vez de se perder.
  function pick(next: string[]) {
    onChange(next)
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if ((event.key === 'Enter' || event.key === ',') && draft.trim()) {
      event.preventDefault()
      add(draft)
    } else if (event.key === 'Backspace' && !draft && values.length) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label} <span className="optional">(opcional)</span></label>
      {values.length > 0 && (
        <ul className="tag-input-list" aria-label={`${label} escolhidas`}>
          {values.map((value) => (
            <li key={value}>
              <button type="button" className="chip" onClick={() => pick(values.filter((item) => item !== value))} aria-label={`Remover ${format(value)}`}>
                {format(value)}<X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={inputRef}
        className="input"
        id={id}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => draft.trim() && add(draft)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-erro` : `${id}-dica`}
      />
      {error ? <FieldError id={`${id}-erro`} text={error} /> : <span className="field-hint" id={`${id}-dica`}>{hint}</span>}
      {pending.length > 0 && (
        <div className="row tag-input-suggestions" role="group" aria-label={`Sugestões de ${label.toLowerCase()}`}>
          {pending.map((suggestion) => (
            <button key={suggestion} type="button" className="chip" onClick={() => { add(suggestion); inputRef.current?.focus() }}>
              <Plus aria-hidden="true" />{format(suggestion)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
