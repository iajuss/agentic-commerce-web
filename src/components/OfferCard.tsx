import type { ReactNode } from 'react'
import { MessageSquareText, ShieldX, Star, Store, Truck } from 'lucide-react'
import { offerTotal, type Offer } from '../api/solicitacoes'
import { categoryLabel } from '../utils/categories'
import { formatBRL } from '../utils/format'
import { StatusBadge } from './StatusBadge'

type OfferCardProps = {
  offer: Offer
  // A posição na tela (1º, 2º...) pode diferir de offer.posicao quando há ofertas fora da política.
  isTop: boolean
  actions?: ReactNode
}

// Card de oferta ranqueada da identidade visual: posição, preço, selos, motivo e ações.
export function OfferCard({ offer, isTop, actions }: OfferCardProps) {
  const titleId = `oferta-${offer.id}`
  const outside = !offer.dentro_da_politica

  return (
    <article className="offer" data-top={isTop || undefined} data-fora={outside || undefined} aria-labelledby={titleId}>
      <div className="offer-rank" aria-hidden={outside || undefined}>
        <b>{outside ? '–' : offer.posicao}</b>
        <span>{outside ? 'Fora' : 'Lugar'}</span>
      </div>

      <div className="offer-main">
        <div className="offer-head">
          <div className="offer-identity">
            {offer.imagem && <img className="offer-thumb" src={offer.imagem} alt="" loading="lazy" />}
            <div>
              <h3 className="offer-title" id={titleId}>
                {!outside && <span className="sr-only">{offer.posicao}º lugar: </span>}
                {offer.titulo}
              </h3>
              <div className="offer-store">
                <span className="offer-fact"><Store aria-hidden="true" />{offer.loja}</span>
                <span className="tag">{categoryLabel(offer.categoria)}</span>
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
            <span className="price">{formatBRL(offerTotal(offer))}</span>
            <small>{offer.frete ? `${formatBRL(offer.preco)} + ${formatBRL(offer.frete)} de frete` : 'Frete grátis'}</small>
          </div>
        </div>

        <div className="offer-badges">
          {isTop && <StatusBadge kind="oferta" status="recomendada" />}
          <StatusBadge kind="oferta" status={outside ? 'fora' : 'dentro'} />
          {!outside && offer.compra_automatica && <StatusBadge kind="autonomia" status="automatica" />}
        </div>

        {outside ? (
          <div className="offer-why">
            <h4><ShieldX aria-hidden="true" />Por que está fora da política</h4>
            <p>{offer.explicacao}</p>
            {offer.motivos_recusa.length > 0 && (
              <ul className="offer-reasons">{offer.motivos_recusa.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            )}
          </div>
        ) : (
          <div className="offer-why">
            <h4><MessageSquareText aria-hidden="true" />Por que ficou em {offer.posicao}º</h4>
            <p>{offer.explicacao}</p>
            {offer.criterios.length > 0 && (
              <ul className="criteria">
                {offer.criterios.map((criterion) => (
                  <li key={criterion.nome}>
                    <span>{criterion.nome}</span>
                    <span className="bar" role="img" aria-label={`${criterion.nome}: nota ${Math.round(criterion.nota * 10)} de 10`}>
                      <i style={{ width: `${Math.round(Math.min(Math.max(criterion.nota, 0), 1) * 100)}%` }} />
                    </span>
                    <span className="value">{criterion.valor}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {actions && <div className="offer-actions">{actions}</div>}
      </div>
    </article>
  )
}
