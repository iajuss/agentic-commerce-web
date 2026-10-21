# Agentic Commerce Web

Front-end React do projeto Agentic Commerce: uma experiência de compra por intenção com autonomia controlada.

## Executar localmente

```bash
pnpm install
pnpm dev
```

Durante o desenvolvimento, o app usa um modo de demonstração local quando `VITE_USE_MOCK_API` não é definido. Para integrar com o Flask, copie `.env.example` para `.env`, informe a URL da API e defina `VITE_USE_MOCK_API=false`.

## Variáveis de ambiente

```env
VITE_API_URL=http://localhost:5000
VITE_USE_MOCK_API=true
```

Nenhuma credencial deve ser commitada. O arquivo `.env` está ignorado pelo Git.

## Comandos

- `pnpm dev`: servidor de desenvolvimento
- `pnpm build`: valida os tipos e gera o build de produção
- `pnpm lint`: executa a análise estática
- `pnpm preview`: abre localmente o build de produção

## Rotas já preparadas

- `/entrar` e `/cadastro`: autenticação
- `/inicio`: visão geral da jornada
- `/compras/nova`: criação de uma compra por intenção
- `/politicas`: regras e autonomia
- `/perfil`: preferências, orçamento e entrega
- `/autorizacoes`: autorizações limitadas
- `/pedidos`: pedidos e pós-compra
- `/auditoria`: histórico de decisões
