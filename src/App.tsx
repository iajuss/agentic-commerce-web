import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuditPage } from './pages/AuditPage'
import { AuthorizationsPage } from './pages/AuthorizationsPage'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { NewRequestPage } from './pages/NewRequestPage'
import { PoliciesPage } from './pages/PoliciesPage'
import { ProfilePage } from './pages/ProfilePage'
import { RequestPage } from './pages/RequestPage'
import { SectionPage } from './pages/SectionPage'

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<AuthPage mode="login" />} />
      <Route path="/cadastro" element={<AuthPage mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/inicio" element={<DashboardPage />} />
          <Route path="/compras/nova" element={<NewRequestPage />} />
          <Route path="/compras/:id" element={<RequestPage />} />
          <Route path="/politicas" element={<PoliciesPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/autorizacoes" element={<AuthorizationsPage />} />
          <Route path="/pedidos" element={<SectionPage section="orders" />} />
          <Route path="/auditoria" element={<AuditPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  )
}
