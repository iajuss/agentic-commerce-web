import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CircleAlert } from 'lucide-react'
import { effectiveStatus, getAuthorization, type Authorization, type AuthorizationStatus } from '../api/autorizacoes'
import { createOrder } from '../api/pedidos'
import { formatBRL } from '../utils/format'

// Por que a autorização não gera mais o Pix, quando ela deixou de estar ativa.
const UNUSABLE: Record<Exclude<AuthorizationStatus, 'ativa'>, string> = {
  expirada: 'Esta autorização venceu antes de virar pedido. Abra a lista de compras e aprove de novo.',
  revogada: 'Esta autorização foi revogada. Abra a lista de compras e aprove de novo.',
  usada: 'Esta autorização já virou um pedido. Ele está em Pedidos.',
}

type GeneratePixButtonProps = {
  authorization: Pick<Authorization, 'id' | 'valor_maximo'>
  // Botão secundário ao lado (ex.: "Pagar depois" no modal).
  secondary?: ReactNode
  // Classe da linha de botões: "modal-actions" no modal, "row" no card.
  actionsClassName?: string
}

// Usa a autorização e cria o pedido com o Pix; depois abre o pedido para pagar.
export function GeneratePixButton({ authorization, secondary, actionsClassName = 'row' }: GeneratePixButtonProps) {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    setError('')
    setCreating(true)
    try {
      // Confere a autorização antes de usá-la: ela pode ter vencido ou sido revogada em outra aba.
      const status = effectiveStatus(await getAuthorization(authorization.id))
      if (status !== 'ativa') {
        setError(UNUSABLE[status])
        setCreating(false)
        return
      }
      const order = await createOrder(authorization.id)
      navigate(`/pedidos/${order.id}`, { state: { created: true } })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não consegui gerar o Pix. Tente de novo.')
      setCreating(false)
    }
  }

  return (
    <div className="stack">
      {error && <div className="alert alert-danger" role="alert"><CircleAlert aria-hidden="true" /><p>{error}</p></div>}
      <div className={actionsClassName}>
        {secondary}
        <button className="btn btn-primary" type="button" onClick={generate} aria-busy={creating} disabled={creating}>
          {creating ? 'Gerando o Pix…' : <>Gerar Pix de {formatBRL(authorization.valor_maximo)}<ArrowRight aria-hidden="true" /></>}
        </button>
      </div>
    </div>
  )
}
