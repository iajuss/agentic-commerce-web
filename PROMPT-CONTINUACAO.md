# Prompt para continuar o front-end do Agentic Commerce em outra IA

Copie tudo a partir da linha abaixo e cole como primeira mensagem na nova conversa.

---

Você vai me ajudar a terminar o front-end de um projeto da faculdade. Eu sou o Davi e cuido **só do front-end**
(React). O backend (Flask + MongoDB Atlas), os testes do backend e o deploy na AWS são de outros colegas do grupo.
Até agora fiz tudo com outro assistente, que conhecia bem o projeto. Abaixo está o contexto que você precisa.
**Antes de escrever qualquer código, leia os arquivos indicados na seção 3 e me confirme em poucas linhas o que
entendeu do estado atual e o que pretende fazer.**

## 1. O projeto

**Agentic Commerce** é uma compra de mercado "por intenção" com autonomia controlada. A pessoa escreve uma lista em
texto livre ("arroz 5kg, 2 leites integrais e detergente"). A API separa os itens, busca ofertas num catálogo
externo, filtra pelas **políticas** do usuário (teto por compra, categorias, lojas, nível de autonomia), ranqueia e
devolve **uma cesta recomendada** com explicação, com uma oferta por item e até 4 alternativas. Depois:

1. A pessoa aprova a cesta inteira com a senha (`POST /solicitacoes/{id}/autorizacoes`) e recebe uma **autorização
   limitada**, que vale 15 minutos e um uso.
2. O front cria o **pedido** na hora (`POST /pedidos {autorizacao_id}`), que gera um **Pix simulado**.
3. A pessoa clica em "Simular pagamento", e envio, entrega e devolução avançam sozinhos com o tempo.
4. Se uma política `automatica` aceita a cesta, o próprio `POST /solicitacoes` já aprova e cria o pedido, e o front
   leva direto ao pedido.
5. Tudo fica registrado numa **trilha de auditoria**.

### Requisitos e rubrica da disciplina

- Servidor Flask RESTful (nível 2 de Richardson) com MongoDB Atlas e ao menos uma API externa. Isso é do backend.
- Cliente React que usa **todas as rotas da API** por alguma tela. Esse requisito é meu.
- Repositórios separados para API e front, e nenhuma credencial commitada (usar `.env`).
- Rubrica:
  - **C+:** tudo funcionando.
  - **B:** API na EC2 com link no README.
  - **B+:** testes de unidade das rotas.
  - **A:** autenticação no Flask e no React.
  - **A+:** **deploy do React na AWS**.
- A nota individual depende de **commits no meu nome** e da avaliação por pares. Então eu preciso fazer os commits e
  PRs. Quando você escrever o código comigo, o commit sai no meu nome, com `Co-authored-by` se fizer sentido.

## 2. Repositórios, ambientes e pessoas

- Front: `https://github.com/iajuss/agentic-commerce-web`, clonado em `C:\Users\damaz\Desktop\agentic-commerce-web`.
  Uso Windows, PowerShell e Git Bash, com **pnpm**.
- API: `https://github.com/iajuss/agentic-commerce-api`. O contrato oficial está em
  `docs/plano-backend/00-contrato-de-integracao.md`, seção 10.
- API em produção: `http://54.209.228.101/api` (`GET /api/health` → `{"status":"ok","banco":"ok"}`).
  - **O banco de produção é compartilhado com o desenvolvimento.** Use só e-mails de teste únicos
    (`davi+teste1@exemplo.com`) e nunca dados reais. Não há HTTPS: nada de senha real.
- O **Lucas** cuida do backend e publica o build do front na EC2 (`dist/` → `/var/www/agentic-commerce-web`; o nginx
  já serve o front e faz o proxy de `/api`). Lacunas do backend são avisadas a ele, **não contornadas no front**.

## 3. Leia antes de tudo (estão no repositório do front)

1. `AGENTS.md`: regras do projeto (arquitetura, convenções, checklist de PR).
2. `docs/identidade-visual.md`: **obrigatório** para qualquer mudança visual.
   - Só tokens de `src/styles/tokens.css`.
   - Classes de `src/styles/components.css`.
   - Selos com `<StatusBadge>` e ícones do `lucide-react`.
   - Textos em pt-BR, no tom de voz e no glossário do documento.
   - O guia visual com telas de referência está em <https://claude.ai/artifact/1wdQJad6MAc7B2UUxdAogj>. Talvez você
     não consiga abrir esse link; o documento em Markdown basta.
3. `docs/integracao-backend.md`: **a fonte da verdade do contrato da API.** Traz as 27 rotas com respostas reais,
   as máquinas de estado de solicitação, autorização e pedido, os prazos, o roteiro de validação (seção 10), as
   lacunas do backend (seção 11) e as armadilhas (seção 12).
4. `README.md`: como rodar e as variáveis de ambiente.

## 4. Stack e comandos

- React 19, Vite 8, TypeScript, React Router 7 e CSS puro. Não há Tailwind nem biblioteca de componentes.
  - Ícones vêm do `lucide-react`.
  - Dependências entram com versão exata: `pnpm add -E`.
- `src/api/`: um módulo por recurso (`auth`, `perfil`, `politicas`, `solicitacoes`, `autorizacoes`, `pedidos`,
  `auditoria`).
  - Todos usam `apiRequest` de `client.ts`.
  - Cada um tem um bloco de **modo demonstração** (`VITE_USE_MOCK_API=true`, só em `pnpm dev`), que imita o backend
    em memória.
- `src/pages/`: uma tela por arquivo, registrada em `src/App.tsx`. `src/components/`: componentes reutilizáveis.
- Comandos:
  - `pnpm dev`: servidor de desenvolvimento.
  - `pnpm lint`: ESLint mais `scripts/check-design-tokens.mjs`, que reprova cor fixa, fonte fixa, texto menor que
    12px e caractere usado como ícone.
  - `pnpm build`: `tsc -b` e `vite build`.
- `.env` local: `VITE_API_URL=http://54.209.228.101/api` e `VITE_USE_MOCK_API=false`, para usar a API real sem rodar
  o backend. O CORS já libera `http://localhost:5173`.
- O build de produção usa o `.env.production` versionado (`VITE_API_URL=/api`). **Não** rode
  `VITE_API_URL=/api pnpm build` no Git Bash: o MSYS transforma o valor em `C:/Program Files/Git/api`.

### Comportamentos que não podem ser "simplificados"

- Um `401` **com `detalhes.senha`** é senha errada na aprovação: a pessoa continua logada. Qualquer outro `401`
  encerra a sessão e volta para `/entrar`. O `client.ts` já faz isso.
- Não existe status `processando` na solicitação, então não há polling nela. O **pedido** tem polling leve enquanto
  ainda pode mudar sozinho.
- Não existe status `cancelada`: o `DELETE /solicitacoes/{id}` apaga a solicitação.
- Status desconhecido nunca pode derrubar uma tela: o `StatusBadge` tem um fallback neutro.

## 5. Estado atual (31/10/2026)

- **Todas as telas estão implementadas e mergeadas na `main`** (PRs #1 a #10):
  - login e cadastro;
  - Início;
  - Políticas (criar, editar, excluir e ativar);
  - Perfil (marcas, nascimento, orçamento e endereço via CEP);
  - Nova compra e histórico;
  - Resultado da solicitação (cesta por item, alternativas, avaliação e aprovação com senha num modal);
  - Autorizações (Gerar Pix e Revogar);
  - Pedidos e Pedido (Pix copia e cola, simular pagamento, linha do tempo, cancelar, devolver e chamados);
  - Auditoria (com "Carregar mais").
- O front já foi alinhado ao contrato real da API de 31/10 (branch `fix/contrato-backend`, PR #9).
- `pnpm lint` e `pnpm build` passam na `main`, e a API de produção está no ar.
- **O React ainda não está publicado na EC2:** `http://54.209.228.101/` mostra uma página provisória ("O frontend
  será publicado aqui em breve"). Isso trava o **A+**.
- A branch `prints` é órfã (sem base comum com a `main`) e só guarda prints usados nas descrições dos PRs. Não faça
  merge dela.

## 6. O que falta (em ordem de prioridade)

1. **Deploy do front (A+).**
   - Combinar com o Lucas a publicação do `dist/` da `main`.
   - Depois conferir que `http://54.209.228.101/` abre o app, que um link direto como `/pedidos` funciona ao
     recarregar (o nginx precisa do `try_files ... /index.html`) e que as chamadas vão para `/api`.
   - Pôr o link do front publicado no `README.md`, o que a rubrica exige.
2. **Rodar o roteiro de validação** (seção 10 de `docs/integracao-backend.md`) pela interface, contra a API de
   produção, nos dois fluxos (manual e automático).
   - Corrigir no front o que falhar.
   - O que for problema do backend vira um aviso para o Lucas.
3. **Acessibilidade e responsividade:** conferir todas as telas no celular (375px), só com teclado e no modo escuro,
   como pede o checklist da identidade visual.
4. **Limpeza de documentação:** `docs/contrato-api.md` ainda tem a tabela "Situação em 30/10" dizendo que Perfil e
   Auditoria "ainda não existem". Atualizar ou reduzir o arquivo a um ponteiro para `docs/integracao-backend.md`.
5. **Lacunas conhecidas do backend** (seção 11 do guia): já têm contorno no front. Só mexer se o backend mudar.

## 7. Como quero trabalhar com você

- Uma branch por tarefa (`feat/...`, `fix/...`, `docs/...`) e PR para a `main`. A `main` é protegida e precisa da
  revisão de outra pessoa. Use o template em `.github/pull_request_template.md`.
- Antes de cada PR, `pnpm lint` e `pnpm build` precisam passar.
- Mensagens de commit em português, no padrão `feat:`/`fix:`/`docs:`, curtas e dizendo o porquê.
- Nomes de código em inglês. Textos da interface e comentários em português, e comentário só quando explica o porquê.
- Siga o estilo do código vizinho e reaproveite o que já existe:
  - `useResource`, `FieldError`, `formErrors`, `TagInput`;
  - `OfferCard`, `ApprovalDialog`, `GeneratePixButton`;
  - `formatBRL` e os demais formatadores de `utils/format.ts`.
- **Não altere o backend** nem invente campos que a API não devolve. Na dúvida, confira em
  `docs/integracao-backend.md` ou chamando a API de produção.
- Nunca commite `.env` nem credenciais.
- Se algo neste prompt contradisser o código ou os documentos do repositório, confie no repositório e me avise.
