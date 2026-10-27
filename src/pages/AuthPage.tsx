import { useState, type FormEvent } from 'react'
import { NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, CircleAlert, Info } from 'lucide-react'
import { Brand } from '../components/Brand'
import { demoMode } from '../api/auth'
import { ApiError } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

type Field = 'nome' | 'email' | 'senha'
type FormErrors = { message: string; fields: Partial<Record<Field, string>> }

const FIELDS: Field[] = ['nome', 'email', 'senha']

// Os erros por campo da API ("detalhes") vão para baixo de cada campo; o resto vai para a mensagem geral.
function formErrors(caught: unknown): FormErrors {
  if (!(caught instanceof ApiError)) {
    return { message: caught instanceof Error ? caught.message : 'Não foi possível continuar.', fields: {} }
  }
  const fields: FormErrors['fields'] = {}
  const others: string[] = []
  for (const [field, problem] of Object.entries(caught.details ?? {})) {
    if (FIELDS.includes(field as Field)) fields[field as Field] = problem
    else others.push(problem)
  }
  return { message: [caught.message, ...others].join(' '), fields }
}

function FieldError({ id, text }: { id: string; text?: string }) {
  if (!text) return null
  return <p className="field-error" id={id}><CircleAlert aria-hidden="true" />{text}</p>
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { isAuthenticated, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors | null>(null)

  if (isAuthenticated) return <Navigate to="/inicio" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors(null)
    setLoading(true)
    try {
      if (mode === 'register') await register(name, email, password)
      else await login(email, password)
      const destination = (location.state as { from?: string } | null)?.from || '/inicio'
      navigate(destination, { replace: true })
    } catch (caught) {
      setErrors(formErrors(caught))
    } finally {
      setLoading(false)
    }
  }

  const isRegister = mode === 'register'
  const fieldError = errors?.fields ?? {}

  return (
    <div className="auth-page">
      <section className="auth-story" aria-label="Sobre o agentic">
        <span className="auth-ring" aria-hidden="true" />
        <Brand className="auth-brand" />
        <div className="auth-story-copy">
          <span className="text-label">Compra por intenção</span>
          <h1 className="text-display">Você diz o que precisa. O agente busca, compara e explica.</h1>
          <p>Ele compra só dentro das regras que você define: teto por compra, categorias, lojas e quando pode agir sozinho.</p>
        </div>
        <div className="auth-example" aria-hidden="true">
          <p className="auth-example-prompt">Um fone confortável para reuniões, até R$ 450.</p>
          <div className="auth-route">
            <span>Sua descrição</span><ArrowRight />
            <span>Ofertas explicadas</span><ArrowRight />
            <strong>Você aprova</strong>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <Brand className="mobile-brand" />
          <nav className="segmented" aria-label="Acesso">
            <NavLink to="/entrar" replace>Entrar</NavLink>
            <NavLink to="/cadastro" replace>Criar conta</NavLink>
          </nav>

          <div className="auth-heading">
            <h2>{isRegister ? 'Crie sua conta' : 'Que bom ver você'}</h2>
            <p className="text-muted">
              {isRegister ? 'Leva um minuto. Depois você define suas políticas de compra.' : 'Entre para acompanhar suas compras e políticas.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {errors?.message && (
              <div className="alert alert-danger" role="alert">
                <CircleAlert aria-hidden="true" />
                <p>{errors.message}</p>
              </div>
            )}
            {isRegister && (
              <div className="field">
                <label className="field-label" htmlFor="nome">Nome</label>
                <input
                  className="input"
                  id="nome"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Como podemos chamar você?"
                  autoComplete="name"
                  aria-invalid={Boolean(fieldError.nome)}
                  aria-describedby={fieldError.nome ? 'nome-erro' : undefined}
                  required
                />
                <FieldError id="nome-erro" text={fieldError.nome} />
              </div>
            )}
            <div className="field">
              <label className="field-label" htmlFor="email">E-mail</label>
              <input
                className="input"
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                autoComplete="email"
                aria-invalid={Boolean(fieldError.email)}
                aria-describedby={fieldError.email ? 'email-erro' : undefined}
                required
              />
              <FieldError id="email-erro" text={fieldError.email} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="senha">Senha</label>
              <input
                className="input"
                id="senha"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                aria-invalid={Boolean(fieldError.senha)}
                aria-describedby={fieldError.senha ? 'senha-erro' : isRegister ? 'senha-dica' : undefined}
                required
              />
              {isRegister && !fieldError.senha && (
                <span className="field-hint" id="senha-dica">Pelo menos 8 caracteres. É com ela que você aprova compras.</span>
              )}
              <FieldError id="senha-erro" text={fieldError.senha} />
            </div>
            <button className="btn btn-primary btn-block" aria-busy={loading} disabled={loading}>
              {loading ? (isRegister ? 'Criando conta…' : 'Entrando…') : isRegister ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          {demoMode && (
            <div className="alert alert-info">
              <Info aria-hidden="true" />
              <p>Modo de demonstração: qualquer e-mail e senha entram, e nada é salvo.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
