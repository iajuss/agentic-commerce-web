import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ScrollText,
  Search,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Brand } from './Brand'

type NavItem = { to: string; label: string; short?: string; icon: LucideIcon }

// A ordem importa: no celular, os 4 primeiros ficam na barra inferior e o resto vai para "Mais".
const navigation: NavItem[] = [
  { to: '/inicio', label: 'Início', icon: LayoutDashboard },
  { to: '/compras/nova', label: 'Nova compra', short: 'Comprar', icon: Search },
  { to: '/pedidos', label: 'Pedidos', icon: Package },
  { to: '/politicas', label: 'Políticas', icon: ShieldCheck },
  { to: '/autorizacoes', label: 'Autorizações', icon: KeyRound },
  { to: '/auditoria', label: 'Auditoria', icon: ScrollText },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
]

const MOBILE_SLOTS = 4

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const initial = user?.nome?.charAt(0).toUpperCase() || 'U'

  function handleLogout() {
    logout()
    navigate('/entrar')
  }

  return (
    <div className="app-shell">
      <header className="mobile-bar">
        <NavLink to="/inicio" aria-label="agentic, ir para o início"><Brand /></NavLink>
        <span className="avatar" aria-hidden="true">{initial}</span>
      </header>

      <aside className="sidebar">
        <div className="sidebar-top">
          <NavLink to="/inicio" className="sidebar-brand" aria-label="agentic, ir para o início">
            <Brand className="brand-full" />
            <Brand compact className="brand-compact" />
          </NavLink>
          <span className="environment-badge">MVP</span>
        </div>

        <nav className="main-nav" aria-label="Navegação principal">
          {navigation.map(({ to, label, short, icon: Icon }, index) => (
            <NavLink key={to} to={to} className={index >= MOBILE_SLOTS ? 'nav-extra' : undefined}>
              <Icon aria-hidden="true" />
              <span className={short ? 'nav-label has-short' : 'nav-label'}>{label}</span>
              {short && <span className="nav-short">{short}</span>}
            </NavLink>
          ))}
          <button
            type="button"
            className="nav-more"
            aria-expanded={moreOpen}
            aria-controls="mais-opcoes"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <Menu aria-hidden="true" />
            <span>Mais</span>
          </button>
        </nav>

        {moreOpen && (
          <div className="more-sheet" id="mais-opcoes">
            {navigation.slice(MOBILE_SLOTS).map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={() => setMoreOpen(false)}>
                <Icon aria-hidden="true" />{label}
              </NavLink>
            ))}
            <button type="button" onClick={handleLogout}><LogOut aria-hidden="true" />Sair</button>
          </div>
        )}

        <div className="sidebar-foot">
          <span className="avatar" aria-hidden="true">{initial}</span>
          <div className="user-summary">
            <strong>{user?.nome}</strong>
            <span>{user?.email}</span>
          </div>
          <button className="icon-button" type="button" onClick={handleLogout} title="Sair" aria-label="Sair">
            <LogOut aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
