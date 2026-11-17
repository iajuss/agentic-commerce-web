import { useEffect } from 'react'

const APP_NAME = 'Agentic Commerce'

// Põe o nome da tela no título da aba ("Pedidos · Agentic Commerce"). Serve para achar a aba certa
// entre várias abertas, deixa o histórico do navegador legível e é o primeiro texto que o leitor de
// tela anuncia ao trocar de página — numa SPA o navegador não faz isso sozinho.
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])
}
