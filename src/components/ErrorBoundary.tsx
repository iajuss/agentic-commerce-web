import { Component, type ErrorInfo, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

type Props = { children: ReactNode }
type State = { failed: boolean }

// Se uma tela quebra ao montar, o React desmonta o app e sobra uma página em branco, sem explicação
// e sem saída. Aqui o erro vira uma tela do app com o caminho de volta. Só existe como classe:
// capturar erro de renderização não tem equivalente em componente de função.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // O detalhe fica no console, para quem for investigar; a pessoa vê só a mensagem da tela.
    console.error('A tela não carregou:', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children

    // Fora do menu lateral, a página precisa do espaçamento de `.app-content` por conta própria.
    // Os links são comuns, e não os do router: o erro pode ter vindo justamente da navegação.
    return (
      <main className="app-content">
        <div className="page page-enter">
          <header className="page-header">
            <div>
              <span className="text-label">Erro</span>
              <h1>Esta tela não carregou</h1>
            </div>
          </header>
          <section className="panel">
            <div className="empty-state">
              <span className="empty-state-icon"><TriangleAlert aria-hidden="true" /></span>
              <strong>Nenhuma compra foi feita e nada que você salvou se perdeu.</strong>
              <p>Abra a tela de novo. Se ela continuar assim, volte para o início e siga por outro caminho.</p>
              <div className="row">
                <button className="btn btn-primary" type="button" onClick={() => window.location.reload()}>
                  Abrir de novo
                </button>
                <a className="btn btn-secondary" href="/inicio">Ir para o início</a>
              </div>
            </div>
          </section>
        </div>
      </main>
    )
  }
}
