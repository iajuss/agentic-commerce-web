import { Unplug } from 'lucide-react'

// Estado vazio para quando a rota ainda não existe na API (404/405): a tela não quebra.
// `message` diz o que vai aparecer, ex.: "Suas autorizações vão aparecer aqui assim que a API tiver essa rota."
export function NotConnected({ message }: { message: string }) {
  return (
    <section className="panel">
      <div className="empty-state">
        <span className="empty-state-icon"><Unplug aria-hidden="true" /></span>
        <strong>Esta parte ainda está sendo conectada.</strong>
        <p>{message} Enquanto isso, dá para ver como fica no modo de demonstração.</p>
      </div>
    </section>
  )
}
