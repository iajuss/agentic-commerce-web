import type { ReactNode } from 'react'
import { MessageSquareText, Star, Store, Truck } from 'lucide-react'
import type { Offer } from '../api/solicitacoes'
import { formatBRL } from '../utils/format'
import { StatusBadge } from './StatusBadge'

type OfferCardProps = {
  offer: Offer
  // Lugar no ranking do item: 1 é a recomendada, as alternativas vêm depois.
  position: number
  quantity: number
  actions?: ReactNode
}

// "R$ 5,58/kg": o preço por unidade é o que o ranking compara entre embalagens diferentes.
function unitPrice(offer: Offer) {
  if (!offer.preco_por_unidade || !offer.unidade) return null
  const unit = offer.unidade === 'l' ? 'L' : offer.unidade
  return `${formatBRL(offer.preco_por_unidade)}/${unit}`
}

function freight(offer: Offer) {
  if (offer.frete === null) return 'Frete a confirmar'
  return offer.frete ? `+ ${formatBRL(offer.frete)} de frete` : 'Frete grátis'
}

// Card de oferta ranqueada da identidade visual: posição, preço, selos e o motivo em frases curtas.
export function OfferCard({ offer, position, quantity, actions }: OfferCardProps) {
  const titleId = `oferta-${offer.id_externo}`
  const isTop = position === 1
  const perUnit = unitPrice(offer)

  return (
    <article className="offer" data-top={isTop || undefined} aria-labelledby={titleId}>
      <div className="offer-rank" aria-hidden="true">
        <b>{position}</b>
        <span>Lugar</span>
      </div>

      <div className="offer-main">
        <div className="offer-head">
          <div className="offer-identity">
            {offer.imagem && <img className="offer-thumb" src={offer.imagem} alt="" loading="lazy" />}
            <div>
              <h4 className="offer-title" id={titleId}>
                <span className="sr-only">{position}º lugar: </span>
                {offer.titulo}
              </h4>
              <div className="offer-store">
                <span className="offer-fact"><Store aria-hidden="true" />{offer.loja}</span>
                {offer.marca && <span className="tag">{offer.marca}</span>}
                {offer.prazo_dias !== null && (
                  <span className="offer-fact"><Truck aria-hidden="true" />Chega em {offer.prazo_dias} {offer.prazo_dias === 1 ? 'dia' : 'dias'}</span>
                )}
                {offer.avaliacao !== null && (
                  <span className="offer-fact"><Star aria-hidden="true" />{String(offer.avaliacao).replace('.', ',')} de 5</span>
                )}
              </div>
            </div>
          </div>
          <div className="offer-price">
            <span className="price">{formatBRL(offer.preco * quantity)}</span>
            <small>
              {quantity > 1 ? `${quantity} × ${formatBRL(offer.preco)}` : perUnit ?? formatBRL(offer.preco)}
              {' · '}{freight(offer)}
            </small>
          </div>
        </div>

        {isTop && <div className="offer-badges"><StatusBadge kind="oferta" status="recomendada" /></div>}

        {offer.explicacao.length > 0 && (
          <div className="offer-why">
            <h4><MessageSquareText aria-hidden="true" />{isTop ? 'Por que escolhi esta' : `Por que ficou em ${position}º`}</h4>
            <ul className="offer-reasons">{offer.explicacao.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          </div>
        )}

        {actions && <div className="offer-actions">{actions}</div>}
      </div>
    </article>
  )
}
