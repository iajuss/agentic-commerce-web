import { Link } from 'react-router-dom'
import { ChevronRight, CircleAlert, Package, Search } from 'lucide-react'
import { listOrders, orderCode } from '../api/pedidos'
import { StatusBadge } from '../components/StatusBadge'
import { useResource } from '../hooks/useResource'
import { formatBRL, formatDateTime, plural } from '../utils/format'

export function OrdersPage() {
  const { data: orders, error, loading, reload } = useResource(listOrders)
  const waiting = orders?.filter((order) => order.status === 'aguardando_pagamento').length ?? 0

  return (
    <div className="page page-enter">
      <header className="page-header">
        <div>
          <span className="text-label">Pós-compra</span>
          <h1>Pedidos</h1>
          <p>Cada cesta aprovada vira um pedido com Pix. Aqui ficam o comprovante, a entrega, o cancelamento, a devolução e os chamados.</p>
        </div>
      </header>

      {waiting > 0 && (
        <div className="alert alert-warning">
          <CircleAlert aria-hidden="true" />
          <p>{waiting === 1 ? 'Um pedido espera' : `${waiting} pedidos esperam`} o pagamento do Pix. Sem pagar, nada é cobrado e o pedido vence sozinho.</p>
        </div>
      )}

      {loading && !orders && (
        <section className="panel" aria-busy="true" aria-label="Carregando pedidos">
          <div className="panel-body stack"><span className="skeleton skeleton-title" /><span className="skeleton" /><span className="skeleton skeleton-short" /></div>
        </section>
      )}

      {Boolean(error) && !orders && (
        <div className="alert alert-danger" role="alert">
          <CircleAlert aria-hidden="true" />
          <div className="stack">
            <p><strong>Não consegui carregar seus pedidos.</strong> {error instanceof Error ? error.message : ''}</p>
            <div><button className="btn btn-secondary btn-sm" type="button" onClick={reload}>Tentar de novo</button></div>
          </div>
        </div>
      )}

      {orders && orders.length === 0 && (
        <section className="panel">
          <div className="empty-state">
            <span className="empty-state-icon"><Package aria-hidden="true" /></span>
            <strong>Nenhum pedido ainda.</strong>
            <p>Quando você aprovar uma cesta e gerar o Pix, ou quando eu comprar sozinho dentro de uma política automática, o pedido aparece aqui.</p>
            <Link className="btn btn-primary" to="/compras/nova"><Search aria-hidden="true" />Nova compra</Link>
          </div>
        </section>
      )}

      {orders && orders.length > 0 && (
        <section className="panel" aria-label="Seus pedidos">
          <ul className="request-list">
            {orders.map((order) => (
              <li key={order.id}>
                <Link className="request-item" to={`/pedidos/${order.id}`}>
                  <span className="request-item-text">
                    <strong>Pedido {orderCode(order.id)} · <span className="num">{formatBRL(order.total)}</span></strong>
                    <span className="text-caption">{formatDateTime(order.criado_em)} · {plural(order.quantidade_itens, 'item', 'itens')}</span>
                  </span>
                  <StatusBadge kind="pedido" status={order.status} />
                  <ChevronRight aria-hidden="true" className="request-item-arrow" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
