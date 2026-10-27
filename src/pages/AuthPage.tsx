import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { demoMode } from '../api/auth'
import { ApiError } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

// Junta a mensagem geral da API com os erros de cada campo do formulário.
function errorMessage(caught: unknown) {
  if (caught instanceof ApiError && caught.details) {
    return [caught.message, ...Object.values(caught.details)].join(' ')
  }
  return caught instanceof Error ? caught.message : 'Não foi possível continuar.'
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { isAuthenticated, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (isAuthenticated) return <Navigate to="/inicio" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') await register(name, email, password)
      else await login(email, password)
      const destination = (location.state as { from?: string } | null)?.from || '/inicio'
      navigate(destination, { replace: true })
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setLoading(false)
    }
  }

  const isRegister = mode === 'register'

  return (
    <div className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="auth-story-copy">
          <span className="eyebrow">COMPRAS COM AUTONOMIA CONTROLADA</span>
          <h1>Você define os limites.<br />O agente cuida do resto.</h1>
          <p>Transforme uma intenção em uma compra segura, explicável e alinhada ao seu orçamento.</p>
        </div>
        <div className="intent-card" aria-hidden="true">
          <div className="intent-prompt">
            <span className="spark">✦</span>
            <p>“Preciso de um fone confortável para trabalhar, até R$ 450.”</p>
          </div>
          <div className="intent-route">
            <span>Intenção entendida</span><i />
            <span>4 ofertas comparadas</span><i />
            <strong>Dentro da sua política</strong>
          </div>
        </div>
        <p className="auth-caption">Decisões transparentes. Autorizações de uso único. Controle sempre seu.</p>
      </section>

      <section className="auth-panel">
        <div className="mobile-brand"><Brand /></div>
        <div className="auth-form-wrap">
          <span className="step-label">ACESSO SEGURO</span>
          <h2>{isRegister ? 'Crie sua conta' : 'Que bom ter você de volta'}</h2>
          <p className="auth-subtitle">
            {isRegister ? 'Comece definindo como seu agente pode comprar.' : 'Entre para acompanhar suas intenções e decisões.'}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {isRegister && (
              <label>
                Nome
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Como podemos chamar você?" required />
              </label>
            )}
            <label>
              E-mail
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" autoComplete="email" required />
            </label>
            <label>
              Senha
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" minLength={8} autoComplete={isRegister ? 'new-password' : 'current-password'} required />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" disabled={loading}>
              {loading ? 'Preparando seu acesso…' : isRegister ? 'Criar conta' : 'Entrar'}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
            <Link to={isRegister ? '/entrar' : '/cadastro'}>{isRegister ? 'Entrar' : 'Criar agora'}</Link>
          </p>
          {demoMode && <div className="demo-note"><span>i</span> Modo de demonstração ativo no ambiente local.</div>}
        </div>
      </section>
    </div>
  )
}
