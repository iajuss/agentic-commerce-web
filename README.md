# Agentic Commerce Web

Front-end React do projeto Agentic Commerce: uma experiência de compra por intenção com autonomia controlada.

**Produção:** o front está no ar em <http://54.209.228.101/>, servido pelo nginx na EC2, que também faz o proxy de
`/api` para a API Flask ([`agentic-commerce-api`](https://github.com/iajuss/agentic-commerce-api)). Para entrar, crie
uma conta em "Criar conta" com um e-mail de teste; o site é HTTP, então não use uma senha real.

Antes de criar ou alterar uma tela, leia [`docs/identidade-visual.md`](docs/identidade-visual.md): cores, tipografia,
componentes, ícones e tom de voz são obrigatórios. As regras gerais do projeto estão em [`AGENTS.md`](AGENTS.md).

## Executar localmente

```bash
pnpm install
pnpm dev
```

O app conversa com a API Flask (`agentic-commerce-api`), que por padrão precisa estar rodando em `http://localhost:5000`. Para usar a API de produção sem rodar o backend, copie `.env.example` para `.env` e use `VITE_API_URL=http://54.209.228.101/api` (o banco é compartilhado: use e-mails de teste, nunca dados reais).

Sem a API, dá para navegar no modo de demonstração com `VITE_USE_MOCK_API=true`: o login aceita qualquer e-mail e senha e nada é salvo. Esse modo nunca vale no build de produção.

## Variáveis de ambiente

```env
VITE_API_URL=http://localhost:5000
VITE_USE_MOCK_API=false
```

O build de produção lê o `.env.production` versionado (`VITE_API_URL=/api`), porque na EC2 o nginx serve o front e
faz o proxy de `/api` para a API. Não passe `VITE_API_URL=/api` na linha de comando do Git Bash: o MSYS converte o
valor em `C:/Program Files/Git/api` e nenhuma chamada funciona.

## Sessão

- O login (`POST /sessoes`) devolve um JWT, guardado no `localStorage` e enviado em `Authorization: Bearer`.
- O cadastro (`POST /usuarios`) faz o login logo em seguida.
- Se a API responder 401 a uma requisição com token, ou se o token expirar, a sessão é encerrada e o usuário volta para `/entrar`. A exceção é a senha errada na aprovação (401 com `detalhes.senha`): a pessoa continua logada e tenta de novo.

Nenhuma credencial deve ser commitada. O arquivo `.env` está ignorado pelo Git.

## Comandos

- `pnpm dev`: servidor de desenvolvimento
- `pnpm build`: valida os tipos e gera o build de produção
- `pnpm lint`: executa a análise estática e confere as regras da identidade visual
- `pnpm preview`: abre localmente o build de produção

## Contrato com a API

O formato de cada rota que o front usa está resumido em [`docs/contrato-api.md`](docs/contrato-api.md), a partir do contrato de integração do backend. O guia completo, com o roteiro de validação contra a API, está em [`docs/integracao-backend.md`](docs/integracao-backend.md).

## Rotas já preparadas

- `/entrar` e `/cadastro`: autenticação
- `/inicio`: visão geral da jornada
- `/compras/nova`: lista de compras em texto livre
- `/compras/{id}`: cesta montada, alternativas de cada item e aprovação com senha
- `/politicas`: regras e autonomia
- `/perfil`: preferências, orçamento e entrega
- `/autorizacoes`: autorizações limitadas
- `/pedidos`: lista de pedidos
- `/pedidos/{id}`: Pix simulado, comprovante, acompanhamento, cancelamento, devolução e chamados
- `/auditoria`: histórico de decisões
