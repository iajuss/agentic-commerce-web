# Identidade visual do agentic

Regras obrigatórias para qualquer tela, componente ou ajuste no front-end. Se algo que você precisa
não está aqui, siga o que estiver mais próximo e proponha a regra nova no PR (veja
[Quando faltar algo](#quando-faltar-algo)).

- **Fonte da verdade no código:** `src/styles/tokens.css` (cores, fontes, medidas) e
  `src/styles/components.css` (componentes).
- **Guia visual com exemplos e telas de referência:** <https://claude.ai/artifact/1wdQJad6MAc7B2UUxdAogj>
  (peça acesso ao Davi se não abrir).
- **Verificação automática:** `pnpm lint` reprova cor fixa, fonte fixa, texto menor que 12px e
  caractere usado como ícone (`scripts/check-design-tokens.mjs`).

## Conceito

O agente é uma lupa na mão do usuário, não um robô que decide por ele. A interface parece um
documento organizado: papel claro, tinta escura, verde-floresta para confiança e ação. O lima é
um marca-texto: aparece pouco, só onde o agente aponta algo.

Três palavras guiam as decisões: **Clareza** (toda decisão tem motivo e número visíveis),
**Controle** (o usuário define os limites e aprova o que importa) e **Calma** (pouca cor, muito
espaço, nenhum alarme à toa). Nada de neon, gradientes, robôs ou faíscas mágicas.

## Checklist de toda tela nova

Antes de abrir o PR, confira:

- [ ] Nenhuma cor, fonte ou medida escrita à mão: só `var(--...)` de `tokens.css`.
- [ ] Usei as classes de `components.css` (`.btn`, `.field`, `.input`, `.card`, `.panel`, `.badge`...)
      em vez de criar parecidas.
- [ ] Status do domínio usam `<StatusBadge>`, nunca um selo montado na mão.
- [ ] Ícones vêm do `lucide-react`, nunca de caracteres (✦ → ✓) nem emoji.
- [ ] A página começa com `<div className="page page-enter">` e um `<header className="page-header">` com um único `<h1>`.
- [ ] Todo campo tem `<label>`; erros usam `aria-invalid` e `.field-error` ligado por `aria-describedby`.
- [ ] Botões com ação demorada mostram `aria-busy` e um texto no gerúndio ("Salvando…").
- [ ] Estado vazio, carregando e erro foram pensados, não só o caminho feliz.
- [ ] Textos seguem o [tom de voz](#tom-de-voz) e o [glossário](#glossário).
- [ ] Testei no celular (375px), com teclado (Tab mostra o foco) e no modo escuro.
- [ ] `pnpm lint` e `pnpm build` passam.

## Onde cada coisa fica

| Arquivo | O que vai nele | O que não vai |
|---|---|---|
| `src/styles/tokens.css` | Todas as cores (claro e escuro), fontes, escala tipográfica, espaçamentos, raios, sombras | Classes |
| `src/styles/components.css` | Componentes reutilizáveis: botão, campo, alerta, card, painel, selo, trilha de auditoria, card de oferta | Layout de uma tela específica |
| `src/styles/global.css` | Estrutura do app (menu, página) e estilos que só uma tela usa, agrupados por tela | Cores e fontes literais |
| `src/components/` | Componentes React reutilizáveis (`Brand`, `StatusBadge`, `AppLayout`) | Lógica de uma tela só |

A ordem de importação em `src/main.tsx` é `tokens.css` → `components.css` → `global.css`. Não use
CSS inline (`style={{...}}`) para cor ou espaçamento; crie uma classe em `global.css`.

## Cores

Use sempre a variável, pelo papel que ela cumpre. Todos os pares de texto e fundo abaixo passam no
contraste WCAG AA nos dois temas.

| Variável | Papel | Regra |
|---|---|---|
| `--ink` | Texto principal | |
| `--muted` | Texto secundário, legendas, placeholder | Não use para texto essencial à tarefa |
| `--paper` | Fundo da página | |
| `--white` | Superfície de cards, painéis e campos | No escuro vira verde-escuro: não é "branco" |
| `--surface-2` | Tags, cabeçalho de tabela, trilho de barras | |
| `--line` | Divisórias e borda de card | Decorativa: não use em campo |
| `--line-strong` | Borda de campo, botão secundário, controles | |
| `--green` / `--on-green` | Ação: botão primário, links, foco / texto sobre ela | No escuro vira lima; por isso o texto por cima é `--on-green`, nunca `white` |
| `--green-soft` | Fundo de item selecionado, hover do botão fantasma | |
| `--mint`, `--lime` | Sinal do agente: "Recomendada", modo automático | Só como fundo (com `--on-accent`) ou sobre fundo escuro. Mint em fundo claro some (1,2:1) |
| `--orange` | "Precisa de você": aprovação manual, pendência | Só como fundo, com `--on-accent` por cima. Nunca como texto |
| `--sidebar-bg`, `--sidebar-active`, `--on-dark`, `--on-dark-muted` | Menu lateral, painel do login, hero | |
| `--success`, `--warning`, `--danger`, `--info`, `--neutral` (+ `-bg`, `-line`) | Estados | Sempre com ícone e texto, nunca só a cor |

Significado dos tons, que vale para selos, alertas e marcadores:

| Tom | Significa | Exemplos |
|---|---|---|
| success (verde) | Está certo | Política ativa, dentro da política, entregue |
| attention (laranja) | Precisa de você | Aprovação manual |
| accent (lima) | O agente agiu ou apontou | Recomendada, compra automática |
| danger (vermelho) | Bloqueado ou destrutivo | Fora da política, revogada, excluir |
| info (azul) | Registrado | Pago, autorização usada |
| warning (âmbar) | Atenção, mas não bloqueia | Devolvido, oferta perto do teto |
| neutral (cinza) | Parado | Inativa, expirada, cancelado |

## Tipografia

Manrope para títulos e números grandes; DM Sans para todo o resto. Ambas vêm de `tokens.css`.

| Uso | Como | Especificação |
|---|---|---|
| Destaque (login) | `className="text-display"` | Manrope 800, 52px (38px no celular) |
| Título da página | `<h1>` | Manrope 700, 36px (30px no celular). Um por tela |
| Título de seção | `<h2>` | Manrope 700, 26px (23px no celular) |
| Título de card ou painel | `<h3>` ou `.panel-header h2` | Manrope 700, 19px |
| Corpo | padrão do `<body>` | DM Sans 400, 16px, altura de linha 1,6 |
| Texto menor | `.text-small` | 14px |
| Legenda, data, metadado | `.text-caption` | 13px, peso 500, cor `--muted` |
| Rótulo acima do título | `.text-label` | 12px, peso 700, caixa alta via CSS |
| Preço | `.price` | Manrope 700 com números tabulares |

- Mínimo de 12px em qualquer texto.
- Escreva o rótulo normalmente ("Nova compra") e deixe o CSS pôr em caixa alta. Texto digitado
  em maiúsculas é lido letra por letra por alguns leitores de tela.
- Números que se comparam (preços, quantidades) usam `.num` ou `.price`.

## Espaço, raios e sombras

- Espaçamento em múltiplos de 4px: `--space-1` (4) até `--space-16` (64). Entre blocos de uma página,
  `--space-6`; dentro de um card, `--space-4` a `--space-6`.
- Raios: `--radius-md` (8px) em botões e campos, `--radius-lg` (12px) em cards e painéis,
  `--radius-pill` em selos. Não invente raios novos.
- Sombras só em objetos destacados: `--shadow-sm` em card, `--shadow-md` em hover, `--shadow-lg` em
  menus flutuantes e modais.
- Controles têm no mínimo 44px de altura (`--control-h`); 36px (`.btn-sm`) só em listas e cards.
- Agrupe elementos com `display: grid` ou `flex` e `gap` (`.stack`, `.stack-lg`, `.row`), não com margens soltas.

## Componentes

### Botões

```tsx
<button className="btn btn-primary">Aprovar compra de R$ 389,90</button>
<button className="btn btn-secondary">Ver detalhes</button>
<button className="btn btn-danger">Revogar autorização</button>
<Link className="btn btn-ghost btn-sm" to="/pedidos">Ver todos</Link>
<button className="btn btn-primary" aria-busy={saving} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
```

- Um botão primário por área. O texto diz exatamente o que acontece; em compra, inclui o valor.
- `.btn-accent` (lima) só sobre fundo escuro (hero, login).
- Ação destrutiva usa `.btn-danger` e pede confirmação na própria tela, dizendo a consequência.
- Ícone dentro do botão vai depois do texto quando indica avanço (`ArrowRight`) e antes quando
  identifica a ação (`Plus`, `Trash2`).

### Campos e mensagens

```tsx
<div className="field">
  <label className="field-label" htmlFor="teto">Teto por compra</label>
  <div className="input-group">
    <span className="input-group-addon">R$</span>
    <input className="input num" id="teto" inputMode="decimal"
      aria-invalid={Boolean(erro)} aria-describedby={erro ? 'teto-erro' : 'teto-dica'} />
  </div>
  {erro
    ? <p className="field-error" id="teto-erro"><CircleAlert aria-hidden="true" />{erro}</p>
    : <span className="field-hint" id="teto-dica">Inclui o frete.</span>}
</div>
```

- Erro de um campo vai embaixo dele (`.field-error`); erro do formulário inteiro vai no topo, em
  `<div className="alert alert-danger" role="alert">`. Os erros por campo da API chegam em
  `ApiError.details` (veja `AuthPage`).
- Também existem `.alert-success`, `.alert-warning`, `.alert-info`, `.choice` (opção em cartão),
  `.switch` (liga/desliga), `.chip` (sugestão clicável) e `.tag` (rótulo não clicável).
- Use `<FieldError id text />` para o erro de um campo e `formErrors(erro, CAMPOS)` (em
  `src/utils/forms.ts`) para separar os erros por campo da mensagem geral.
- Lista de textos curtos (categorias, lojas) usa `<TagInput>`: a pessoa digita e tecla Enter ou
  toca numa sugestão; cada item escolhido vira um `.chip` com botão de remover.
- Depois de um erro ao enviar, o foco vai para o primeiro campo com `aria-invalid`. Não desabilite
  um controle que está com o foco enquanto salva (use `aria-disabled`): o foco se perderia.

### Cards e painéis

- `.panel` é uma região da página com `.panel-header` (título + ação leve) e `.panel-body`.
- `.card` é um objeto independente (uma política, um pedido). Se o card inteiro é clicável, use um
  `<Link className="card card-interactive">`.
- Carregando: `<span className="skeleton" />` no lugar do conteúdo, com `aria-busy="true"` no contêiner.
- Vazio: `.empty-state` com ícone, frase curta do que vai aparecer e a ação para começar.

### Selos de status

Use sempre o componente; ele garante cor, ícone e texto iguais em todas as telas.

```tsx
<StatusBadge kind="politica" status="ativa" />        // ativa | inativa
<StatusBadge kind="autonomia" status="manual" />      // manual | automatica
<StatusBadge kind="oferta" status="dentro" />         // dentro | fora | recomendada
<StatusBadge kind="autorizacao" status="usada" />     // ativa | usada | revogada | expirada
<StatusBadge kind="pedido" status="enviado" />        // pago | enviado | entregue | cancelado | devolvido
```

Status novo? Acrescente em `src/components/StatusBadge.tsx`, escolhendo o tom pela tabela de cores.

### Trilha de auditoria

```tsx
<ol className="timeline">
  <li className="timeline-item">
    <span className="timeline-marker" data-actor="agente"><ListOrdered aria-hidden="true" /></span>
    <div className="timeline-content">
      <div className="timeline-meta"><span className="actor">Agente</span><time dateTime="2026-10-27T14:03">hoje, 14:03</time></div>
      <p className="timeline-title">Ranqueou 3 ofertas</p>
      <p className="timeline-text">Headset Vox Office 30 em 1º: o mais barato entre os que chegam até sexta.</p>
      <details className="timeline-details"><summary>Ver dados registrados</summary><pre>{json}</pre></details>
    </div>
  </li>
</ol>
```

`data-actor`: `agente` (lima), `voce` (verde), `bloqueio` (vermelho, decisão da política) ou nenhum
(sistema, cinza). O nome de quem agiu aparece sempre em texto. O título é uma frase no passado.

### Card de oferta ranqueada

Estrutura: `.offer` (com `data-top="true"` na 1ª e `data-fora="true"` nas fora da política) →
`.offer-rank` (posição) e `.offer-main` → `.offer-head` (nome, loja, preço) → `.offer-badges` →
`.offer-why` (motivo em uma frase com números + `.criteria` com uma barra por critério) →
`.offer-actions`. A oferta fora da política aparece no fim, com o motivo e o botão desabilitado.
Veja a tela "Ofertas ranqueadas" no guia visual.

## Ícones

Biblioteca: `lucide-react`. Tamanho e traço já vêm do CSS (`.lucide`): 20px na interface, 18px em
botões, 14px em selos, traço de 1,75.

```tsx
import { ShieldCheck } from 'lucide-react'
<ShieldCheck aria-hidden="true" />
```

- Ícone ao lado de texto leva `aria-hidden="true"`. Botão só com ícone leva `aria-label`.
- Mantenha o mesmo ícone para o mesmo conceito:

| Conceito | Ícone | Conceito | Ícone |
|---|---|---|---|
| Início | `LayoutDashboard` | Manual | `Hand` |
| Nova compra, busca | `Search` | Automática | `Zap` |
| Pedidos | `Package` | Recomendada | `Sparkle` |
| Políticas | `ShieldCheck` | Fora da política | `ShieldX` |
| Autorizações | `KeyRound` | Ranking | `ListOrdered` |
| Auditoria | `ScrollText` | Explicação do agente | `MessageSquareText` |
| Perfil | `UserRound` | Chamado | `LifeBuoy` |
| Sair | `LogOut` | Senha | `Lock` |

- Evite robôs, cérebros e faíscas: o agente é representado pela lupa da marca.

## Logo

Use o componente `<Brand />` (ou `<Brand compact />` para só o símbolo). O traço herda a cor do
texto; o ponto usa `--brand-dot`, que já é mint no menu lateral e no login. Não use imagem do logo,
não troque o wordmark por texto digitado e não mude as cores do ponto.

## Acessibilidade

- Foco sempre visível: não remova `outline` sem pôr outro indicador no lugar.
- Status nunca só por cor: ícone e texto juntos.
- Toda imagem informativa tem texto alternativo; ícones decorativos, `aria-hidden`.
- Um `<h1>` por tela e títulos em ordem (`h1` → `h2` → `h3`).
- Alvo de toque com pelo menos 44px.
- Animação respeita `prefers-reduced-motion` (os tokens já zeram a duração).

## Modo escuro

Segue o sistema automaticamente. Se você usou só os tokens, a tela já funciona no escuro; confira
mesmo assim. Para testar, troque o tema do sistema ou ponha `data-theme="dark"` no `<html>`.

## Tom de voz

Próximo e direto, em "você". O agente fala em primeira pessoa ("encontrei", "comprei") para deixar
claro quem fez o quê.

1. **Diga o que aconteceu e o que fazer agora** (erros).
   Faça: "O banco recusou o cartão final 4821. Tente outro cartão ou fale com o banco."
   Não faça: "Erro 402: falha no processamento do pagamento."
2. **Valor, loja e consequência antes do botão** (confirmações).
   Faça: "Comprar o Headset Vox Office 30 por R$ 389,90 na Loja Sonora? O valor é cobrado agora." + botão "Aprovar compra de R$ 389,90".
   Não faça: "Tem certeza que deseja prosseguir?" + "OK".
3. **Explique com critério e número, não com adjetivo** (explicações do agente).
   Faça: "Ficou em 1º: custa R$ 39,10 menos que a 2ª e chega um dia antes."
   Não faça: "Esta é a melhor oferta para você! Imperdível."
4. **Você decide; o agente propõe e presta contas** (compras automáticas).
   Faça: "Comprei panos de microfibra por R$ 39,90 porque cabiam na sua política Casa. Se não quiser, cancele até amanhã às 12:00."
   Não faça: "Já cuidei de tudo para você, relaxa!"
5. **Sem jargão, sem culpa, sem drama** (erros, bloqueios e avisos).
   Faça: "Sua sessão terminou. Entre de novo para continuar."
   Não faça: "Token JWT expirado.", "Você não tem permissão!", "Ops! Algo deu errado 😢".

### Glossário

| Use | Evite | Por quê |
|---|---|---|
| descrição, "o que você precisa" | intenção, prompt | "Intenção" é termo do projeto; para quem compra, é o que ele escreveu |
| pedido (P-10482) | "pedido" para o texto do usuário | Na API, pedido é a compra feita (`/pedidos`) |
| teto, política, aprovação, autorização | limite de gasto, regra de negócio, checkout | São os nomes das telas e da API |
| R$ 389,90 · 30/out · 14:03 | 389.9 · 2026-10-30 · 2:03 PM | Formato brasileiro sempre |

## Quando faltar algo

1. Procure um componente parecido em `components.css` e reaproveite.
2. Se precisar de cor ou medida nova, adicione um token em `tokens.css` com comentário dizendo o
   uso, defina o valor do modo escuro nos dois blocos escuros e confira o contraste (4,5:1 para
   texto, 3:1 para bordas e ícones).
3. Se for um componente reutilizável, ele vai em `components.css` (e em `src/components/` se tiver
   lógica), e este documento ganha uma seção curta.
4. Explique a decisão na descrição do PR.
