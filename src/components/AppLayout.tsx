import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Brand } from './Brand'

const navigation = [
  { to: '/inicio', label: 'Visão geral', icon: '⌂' },
  { to: '/compras/nova', label: 'Nova compra', icon: '✦' },
  { to: '/politicas', label: 'Políticas', icon: '◎' },
  { to: '/perfil', label: 'Perfil', icon: '◇' },
  { to: '/autorizacoes', label: 'Autorizações', icon: '✓' },
  { to: '/pedidos', label: 'Pedidos', icon: '□' },
  { to: '/auditoria', label: 'Auditoria', icon: '↗' },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/entrar')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <Brand />
          <span className="environment-badge">MVP</span>
        </div>
        <nav className="main-nav" aria-label="Navegação principal">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-avatar">{user?.name?.charAt(0).toUpperCase() || 'U'}</div>
          <div className="user-summary">
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
          <button className="icon-button" onClick={handleLogout} title="Sair" aria-label="Sair">↪</button>
        </div>
      </aside>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
