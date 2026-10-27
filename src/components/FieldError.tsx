import { CircleAlert } from 'lucide-react'

// Erro de um campo, ligado ao input por aria-describedby={id}.
export function FieldError({ id, text }: { id: string; text?: string }) {
  if (!text) return null
  return <p className="field-error" id={id}><CircleAlert aria-hidden="true" />{text}</p>
}
