import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
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

// Preferência de cada pessoa neste navegador; sem acesso ao storage, o menu começa aberto.
const COLLAPSED_KEY = 'agentic-commerce:menu-recolhido'

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function saveCollapsed(collapsed: boolean) {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
  } catch {
    // Sem storage, a escolha vale só até recarregar a página.
  }
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const initial = user?.nome?.charAt(0).toUpperCase() || 'U'

  function toggleCollapsed() {
    setCollapsed((current) => {
      saveCollapsed(!current)
      return !current
    })
  }

  function handleLogout() {
    logout()
    navigate('/entrar')
  }

  return (
    <div className={collapsed ? 'app-shell is-collapsed' : 'app-shell'}>
      <header className="mobile-bar">
        <NavLink to="/inicio" aria-label="agentic, ir para o início"><Brand /></NavLink>
        <span className="avatar" aria-hidden="true">{initial}</span>
      </header>

      <aside className="sidebar" id="menu-lateral">
        <div className="sidebar-top">
          <NavLink to="/inicio" className="sidebar-brand" aria-label="agentic, ir para o início">
            <Brand className="brand-full" />
            <Brand compact className="brand-compact" />
          </NavLink>
          <button
            className="icon-button sidebar-toggle"
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="menu-lateral"
            aria-label={collapsed ? 'Expandir o menu' : 'Recolher o menu'}
            title={collapsed ? 'Expandir o menu' : 'Recolher o menu'}
          >
            {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </button>
        </div>

        <nav className="main-nav" aria-label="Navegação principal">
          {navigation.map(({ to, label, short, icon: Icon }, index) => (
            <NavLink key={to} to={to} className={index >= MOBILE_SLOTS ? 'nav-extra' : undefined} title={collapsed ? label : undefined}>
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
