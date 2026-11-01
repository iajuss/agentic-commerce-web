# Contrato da API usado pelo front-end

O guia completo de integração, com os exemplos de resposta capturados da API, o roteiro de validação e as lacunas
conhecidas do backend, está em [`integracao-backend.md`](integracao-backend.md).

A fonte da verdade é o **contrato de integração do backend**:
[`docs/plano-backend/00-contrato-de-integracao.md`](https://github.com/iajuss/agentic-commerce-api/blob/main/docs/plano-backend/00-contrato-de-integracao.md)
no repositório `agentic-commerce-api`. Este arquivo resume o que cada tela usa e os detalhes que
mudam o comportamento do React. Os tipos TypeScript de cada rota ficam em `src/api/` e seguem os
formatos abaixo, conferidos contra a API rodando em 30/10/2026 (main da API com o PR #15).

Se o backend mudar uma rota, campo ou status, ajuste aqui e em `src/api/` no mesmo PR.

## Convenções

- Toda rota, menos `/health`, `POST /usuarios` e `POST /sessoes`, exige `Authorization: Bearer <token>`
  e só enxerga os dados de quem fez a requisição (recurso de outra pessoa responde `404`).
- Erro sempre no formato `{"erro": "mensagem para o usuário", "detalhes": {"campo": "problema"}}`.
  A tela mostra `erro` no topo e cada item de `detalhes` embaixo do campo com o mesmo nome.
- Ids são texto, datas vêm em ISO 8601 com fuso e valores em reais são números (`51.38`).
- Criar responde `201` com `Location`; excluir ou revogar responde `204` sem corpo.

## Rotas e telas

| Rota | Tela | Módulo do backend | Situação em 30/10 |
|---|---|---|---|
| `POST /usuarios`, `POST /sessoes` | `/cadastro`, `/entrar` | M1 | Pronta |
| `GET`, `PATCH /usuarios/me` | `/perfil` | M1 | **Ainda não existe** |
| `GET`, `POST /politicas`, `PUT`, `DELETE /politicas/{id}` | `/politicas`, `/inicio` | M1 | Pronta |
| `GET /auditoria` | `/auditoria` | M1 | **Ainda não existe** |
| `POST`, `GET /solicitacoes`, `GET`, `DELETE /solicitacoes/{id}` | `/compras/nova`, `/compras/{id}` | M2 | Pronta |
| `POST /solicitacoes/{id}/autorizacoes` | modal de aprovação em `/compras/{id}` | M3 | Pronta |
| `GET /autorizacoes`, `DELETE /autorizacoes/{id}` | `/autorizacoes` | M3 | Pronta |
| `POST`, `GET /pedidos`, `GET`, `PATCH /pedidos/{id}` | `/pedidos`, `/pedidos/{id}` | M3 | Pronta |
| `POST /simulador-pix/pagamentos` | botão "Simular pagamento" em `/pedidos/{id}` | M3 | Pronta |
| `POST`, `GET /pedidos/{id}/chamados` | `/pedidos/{id}` | M3 | Pronta |

## Solicitação: a lista de compras vira uma cesta

`POST /solicitacoes` com `{"texto": "arroz 5kg, 2 leites integrais e detergente"}` (3 a 500 caracteres)
responde `201` já com a cesta pronta (não há processamento em segundo plano). A API também aceita
`{"itens": [{"descricao": "arroz 5kg", "quantidade": 1}]}` (1 a 20 itens), mas o front só usa `texto`:

```json
{
  "id": "6ae5121c...", "texto": "arroz 5kg, 2 leites integrais e detergente",
  "itens": [
    {
      "descricao": "arroz 5kg", "quantidade": 1, "status": "com_oferta",
      "recomendada": {
        "id_externo": "FIXO-001", "fonte": "fixo", "titulo": "Arroz Branco Tipo 1 5kg", "marca": "Grão Dourado",
        "preco": 27.9, "frete": 0.0, "frete_gratis": true, "prazo_dias": 2, "avaliacao": 4.7, "estoque": null,
        "categoria": "Arroz", "categorias_caminho": ["Alimentos e Bebidas", "Mercearia", "Arroz"],
        "loja": "Mercado Exemplo", "preco_por_unidade": 5.58, "unidade": "kg", "imagem": null, "link": null,
        "explicacao": ["Preço por kg: R$ 5,58/kg", "Frete grátis", "Entrega estimada em 2 dias"]
      },
      "alternativas": ["até 4 ofertas no mesmo formato"],
      "descartadas": 0, "explicacao": ["4 ofertas encontradas"]
    }
  ],
  "cesta": {"subtotal": 51.38, "frete": 0.0, "total": 51.38, "lojas": ["Mercado Exemplo", "Atacado Bom Preço"]},
  "avaliacao": {"permitida": true, "compra_automatica": false, "politica_id": "6ae5121a...", "motivos": []},
  "status": "aguardando_aprovacao",
  "compra_automatica": null,
  "criada_em": "...", "atualizada_em": "..."
}
```

- `status`: `aguardando_aprovacao` · `sem_resultado` (nenhum item com oferta) · `aprovada` · `concluida`
  (Pix pago) · `expirada` (Pix venceu ou pedido cancelado antes de pagar).
- `itens[].quantidade` é o número de **embalagens** da `recomendada`, não o que a pessoa escreveu: "2 kg de feijão"
  com o pacote de 1 kg vira `quantidade: 2`, e "dez ovos" com a caixa de 12 vira `quantidade: 1`. A `explicacao` do item
  conta o ajuste ("Você pediu 2 kg: 2 embalagens de 1 kg"), então a tela mostra a `descricao` sem multiplicar.
- `fonte` no MVP é `fixo` ou `dummyjson`; `estoque` pode vir `null`.
- Item `sem_oferta` tem `recomendada: null` e fica fora da cesta. `frete: null` quer dizer que a loja não informou.
- `avaliacao` vale para a **cesta inteira**: só dá para aprovar quando `permitida` é `true`. Os
  motivos de recusa vêm em `motivos`, já prefixados com o nome da política.
- **Compra automática:** quando a política permite, o próprio `POST` já aprova e gera o pedido com o
  Pix. A resposta vem com `status: "aprovada"` e `compra_automatica: {"autorizacao_id", "pedido_id"}`.
- `GET /solicitacoes` devolve o resumo: `[{"id", "texto", "itens": ["arroz 5kg", ...], "status", "total", "criada_em"}]`.
- `DELETE /solicitacoes/{id}` **remove** a solicitação (só em `aguardando_aprovacao` ou `sem_resultado`; senão `409`).

## Aprovação: `POST /solicitacoes/{id}/autorizacoes`

Corpo: `{"senha": "..."}`. Aprova a cesta inteira, sempre com senha.

- `201` com a autorização (formato abaixo).
- **`401` com `detalhes.senha` é senha errada, não sessão vencida**: a pessoa continua logada. Um `401` sem
  `detalhes` é sessão inválida e encerra a sessão, como em qualquer outra rota (veja `apiRequest`).
- `422` quando nenhuma política permite a cesta: `{"erro": "...", "detalhes": {"motivos": ["..."]}}`.
- `409` quando a solicitação não está mais aguardando aprovação.

Autorização:

```json
{
  "id": "6ae51223...", "solicitacao_id": "6ae5121c...", "origem": "manual", "politica_id": "6ae5121a...",
  "valor_maximo": 51.38, "lojas": ["Mercado Exemplo", "Atacado Bom Preço"],
  "itens": [{"id_externo": "FIXO-001", "titulo": "Arroz Branco Tipo 1 5kg", "preco": 27.9, "quantidade": 1, "loja": "Mercado Exemplo"}],
  "status": "ativa", "expira_em": "...", "criada_em": "...", "atualizada_em": "..."
}
```

- Vale 15 minutos e é de uso único. `GET /autorizacoes` lista **só as ativas e no prazo**.
- `DELETE /autorizacoes/{id}` revoga (`204`) e devolve a solicitação para `aguardando_aprovacao`;
  autorização já usada responde `409`.

## Pedido e Pix simulado

`POST /pedidos` com `{"autorizacao_id": "..."}` usa a autorização e responde `201`:

```json
{
  "id": "6ae51227...", "solicitacao_id": "...", "autorizacao_id": "...", "status": "aguardando_pagamento",
  "itens": [{"id_externo": "FIXO-001", "titulo": "Arroz Branco Tipo 1 5kg", "preco": 27.9, "quantidade": 1, "loja": "Mercado Exemplo"}],
  "total": 51.38,
  "pix": {"txid": "0584bf42...", "copia_e_cola": "PIX-SIMULADO-0584bf42...", "qr_code_base64": null, "expira_em": "...", "pago_em": null},
  "historico": [{"status": "aguardando_pagamento", "em": "..."}],
  "entrega": {"simulada": true},
  "criado_em": "..."
}
```

- `status`: `aguardando_pagamento` → `pago` → `enviado` → `entregue`, ou `expirado` (Pix venceu),
  `cancelado` e `devolucao_solicitada` → `devolvido`. Envio e entrega acontecem sozinhos depois de
  alguns minutos e aparecem **na próxima leitura** do pedido.
- `copia_e_cola` e `expira_em` só vêm enquanto o pedido aguarda pagamento; depois `pix` traz só `txid` e `pago_em`.
- `reembolso: {"valor", "status": "simulado", "em"}` aparece no cancelamento depois de pago e na devolução concluída;
  `devolucao: {"motivo"}` aparece quando a devolução é pedida.
- `GET /pedidos` devolve o resumo: `[{"id", "status", "total", "quantidade_itens", "criado_em"}]`.
- `POST /simulador-pix/pagamentos` com `{"txid": "..."}` simula o pagamento e devolve o pedido (`409` se venceu ou já foi pago).
- `PATCH /pedidos/{id}` com `{"status": "cancelado"}` (de `aguardando_pagamento`, `pago` ou `enviado`) ou
  `{"status": "devolucao_solicitada", "motivo": "3 a 300 caracteres"}` (de `entregue`, até 7 dias). Fora disso, `409`.

## Chamados: `/pedidos/{id}/chamados`

`POST` com `{"assunto": "3 a 80 caracteres", "mensagem": "10 a 1000 caracteres"}` responde `201`:
`{"id", "pedido_id", "assunto", "mensagem", "status": "aberto", "criado_em", "atualizado_em"}`. `GET` lista os chamados do pedido.

## Perfil: `GET` e `PATCH /usuarios/me` (M1, ainda não existe)

`GET` → `{"id", "nome", "email", "data_nascimento", "endereco", "preferencias", "orcamento_mensal", "criado_em"}`,
com `null` (ou listas vazias em `preferencias`) nos campos não preenchidos.

`PATCH` aceita qualquer subconjunto de:

```json
{
  "nome": "Ana Souza",
  "data_nascimento": "1999-05-20",
  "endereco": {"cep": "01001000", "numero": "100", "complemento": "Apto 12"},
  "preferencias": {"marcas_preferidas": ["vale verde"], "marcas_evitadas": ["brilho"]},
  "orcamento_mensal": 800
}
```

- A API completa o endereço pelo ViaCEP (o React nunca chama o ViaCEP). CEP inexistente: `400` com
  `{"cep": "Confira o CEP."}`; ViaCEP fora do ar: `502`.
- `data_nascimento` libera bebidas alcoólicas para maiores de 18. Acima do `orcamento_mensal`, o agente
  não compra sozinho e pede aprovação.

## Auditoria: `GET /auditoria?limite=50&antes_de=<id>` (M1, ainda não existe)

`{"eventos": [{"id", "tipo", "recurso": {"tipo", "id"}, "dados", "criado_em"}], "proximo": "<id> ou null"}`,
do mais recente para o mais antigo. A tela transforma cada `tipo` numa frase (`describe` em
`src/pages/AuditPage.tsx`); os tipos estão na seção 7 do contrato do backend. Tipo desconhecido
aparece com o ícone genérico, sem quebrar a tela.
