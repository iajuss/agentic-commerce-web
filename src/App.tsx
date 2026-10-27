import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { PoliciesPage } from './pages/PoliciesPage'
import { SectionPage } from './pages/SectionPage'

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<AuthPage mode="login" />} />
      <Route path="/cadastro" element={<AuthPage mode="register" />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/inicio" element={<DashboardPage />} />
          <Route path="/compras/nova" element={<SectionPage section="request" />} />
          <Route path="/politicas" element={<PoliciesPage />} />
          <Route path="/perfil" element={<SectionPage section="profile" />} />
          <Route path="/autorizacoes" element={<SectionPage section="authorizations" />} />
          <Route path="/pedidos" element={<SectionPage section="orders" />} />
          <Route path="/auditoria" element={<SectionPage section="audit" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  )
}
