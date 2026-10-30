# Agentic Commerce Web

Front-end React do projeto Agentic Commerce: uma experiência de compra por intenção com autonomia controlada.

Antes de criar ou alterar uma tela, leia [`docs/identidade-visual.md`](docs/identidade-visual.md): cores, tipografia,
componentes, ícones e tom de voz são obrigatórios. As regras gerais do projeto estão em [`AGENTS.md`](AGENTS.md).

## Executar localmente

```bash
pnpm install
pnpm dev
```

O app conversa com a API Flask (`agentic-commerce-api`), que precisa estar rodando em `http://localhost:5000`. Para outra URL, copie `.env.example` para `.env` e ajuste `VITE_API_URL`.

Sem a API, dá para navegar no modo de demonstração com `VITE_USE_MOCK_API=true`: o login aceita qualquer e-mail e senha e nada é salvo. Esse modo nunca vale no build de produção.

## Variáveis de ambiente

```env
VITE_API_URL=http://localhost:5000
VITE_USE_MOCK_API=false
```

## Sessão

- O login (`POST /sessoes`) devolve um JWT, guardado no `localStorage` e enviado em `Authorization: Bearer`.
- O cadastro (`POST /usuarios`) faz o login logo em seguida.
- Se a API responder 401 a uma requisição com token, ou se o token expirar, a sessão é encerrada e o usuário volta para `/entrar`.

Nenhuma credencial deve ser commitada. O arquivo `.env` está ignorado pelo Git.

## Comandos

- `pnpm dev`: servidor de desenvolvimento
- `pnpm build`: valida os tipos e gera o build de produção
- `pnpm lint`: executa a análise estática e confere as regras da identidade visual
- `pnpm preview`: abre localmente o build de produção

## Contrato com a API

O formato de cada rota que o front usa está resumido em [`docs/contrato-api.md`](docs/contrato-api.md), a partir do contrato de integração do backend. Enquanto uma rota não existir (hoje, `/usuarios/me` e `/auditoria`), a tela mostra "Esta parte ainda está sendo conectada"; no modo de demonstração ela funciona com dados simulados.

## Rotas já preparadas

- `/entrar` e `/cadastro`: autenticação
- `/inicio`: visão geral da jornada
- `/compras/nova`: lista de compras em texto livre
- `/compras/{id}`: cesta montada, alternativas de cada item e aprovação com senha
- `/politicas`: regras e autonomia
- `/perfil`: preferências, orçamento e entrega
- `/autorizacoes`: autorizações limitadas
- `/pedidos`: pedidos e pós-compra
- `/auditoria`: histórico de decisões
