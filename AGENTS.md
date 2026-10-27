# Regras do projeto (para pessoas e assistentes de código)

Front-end React do Agentic Commerce. Leia isto antes de mexer no código.

## Interface: identidade visual obrigatória

Toda tela, componente ou ajuste visual segue [`docs/identidade-visual.md`](docs/identidade-visual.md).
Leia o documento inteiro antes de criar ou alterar uma tela. O resumo:

- Cores, fontes e medidas só por variáveis de `src/styles/tokens.css`. Nada de hex, `rgb()` ou fonte escrita à mão.
- Reaproveite as classes de `src/styles/components.css` (`.btn`, `.field`, `.input`, `.card`, `.panel`, `.badge`...).
- Status do domínio usam `<StatusBadge>`; o logo usa `<Brand>`; ícones vêm do `lucide-react`.
- Status nunca só por cor, foco sempre visível, um `<h1>` por tela, texto com no mínimo 12px.
- Textos em português do Brasil, no tom de voz e no glossário do documento.
- `pnpm lint` verifica parte dessas regras e precisa passar.

## Arquitetura

- React 19 + Vite + TypeScript, CSS puro (sem Tailwind e sem biblioteca de componentes).
- `src/api/`: chamadas HTTP. O React só fala com a API Flask, nunca com banco ou APIs externas.
- `src/contexts/`: estado global (sessão em `AuthContext`).
- `src/components/`: componentes reutilizáveis. `src/pages/`: uma tela por arquivo, registrada em `src/App.tsx`.
- `src/styles/`: `tokens.css` → `components.css` → `global.css`, importados nessa ordem em `src/main.tsx`.

## Convenções

- Componentes em função com export nomeado (`export function PolicyPage()`), props tipadas na assinatura.
- Nomes de código em inglês; textos da interface e comentários em português, curtos e só quando explicam o porquê.
- Dependências com versão exata no `package.json`, instaladas com `pnpm add -E`.
- Uma branch por tarefa (`feat/politicas`, `fix/ranking-frete`) e PR para a `main` com revisão de outra pessoa.
- Nenhuma credencial no Git: valores reais ficam no `.env`, que é ignorado.

## Antes de abrir um PR

```bash
pnpm lint
pnpm build
```

E confira a tela no celular (375px), no teclado e no modo escuro.
