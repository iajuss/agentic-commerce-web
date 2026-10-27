# Contrato da API usado pelo front-end

Rotas que o React já chama, mas que a API ainda não tem. O backend pode implementar a partir
daqui; se precisar mudar algo, ajuste este arquivo no mesmo PR e avise a Pessoa 4. As rotas
que já existem (`/usuarios`, `/sessoes`, `/politicas`) estão documentadas no README da API.

Os tipos TypeScript de cada rota ficam em `src/api/` e seguem este documento.

## Convenções

- Toda rota exige `Authorization: Bearer <token>` e só enxerga os dados de quem fez a requisição
  (recurso de outra pessoa responde 404).
- Erro sempre no formato da API: `{"erro": "mensagem para o usuário", "detalhes": {"campo": "problema"}}`.
  A tela mostra `erro` no topo e cada item de `detalhes` embaixo do campo com o mesmo nome.
  Campos aninhados usam ponto: `"endereco.cep"`.
- Datas em ISO 8601 com fuso (`2026-10-27T14:03:00+00:00`), valores em reais como número
  (`389.9`), ids como texto.
- Enquanto uma rota não existir, o Flask responde 404 (inclusive ao preflight do CORS) e a tela
  mostra "Esta parte ainda está sendo conectada" em vez de quebrar.

## Perfil: `GET /usuarios/me` e `PATCH /usuarios/me`

Responsável no backend: Pessoa 3. Tela: `/perfil` (`src/api/perfil.ts`).

### `GET /usuarios/me` → `200`

```json
{
  "id": "6ae0c58e05554cb018a1d2c0",
  "nome": "Ana Souza",
  "email": "ana@exemplo.com",
  "preferencias": {
    "prioridade": "preco",
    "lojas_preferidas": ["loja sonora"]
  },
  "orcamento_mensal": 1200,
  "endereco": {
    "cep": "04546-042",
    "logradouro": "Rua Quatá",
    "numero": "300",
    "complemento": "",
    "bairro": "Vila Olímpia",
    "cidade": "São Paulo",
    "uf": "SP"
  },
  "atualizado_em": "2026-10-27T14:03:00+00:00"
}
```

- Usuário recém-cadastrado: `preferencias` com os valores padrão (`"prioridade": "preco"`,
  `"lojas_preferidas": []`), `orcamento_mensal: null` e `endereco: null`. `atualizado_em` pode
  ser igual ao `criado_em` do usuário.
- `prioridade`: `preco` | `prazo` | `avaliacao`. É o critério que pesa mais no ranking das ofertas.
- `lojas_preferidas`: lista de textos em minúsculas, como as lojas das políticas; desempata o ranking.
- `orcamento_mensal`: número maior que zero ou `null` (sem orçamento). É só uma referência; o
  teto de cada compra continua nas políticas.
- `cep` volta sempre com máscara (`00000-000`).

### `PATCH /usuarios/me` → `200` com o perfil completo (mesmo formato do GET)

O React sempre manda o formulário inteiro:

```json
{
  "nome": "Ana Souza",
  "preferencias": { "prioridade": "prazo", "lojas_preferidas": ["loja sonora"] },
  "orcamento_mensal": 1200,
  "endereco": { "cep": "01310-100", "numero": "1000", "complemento": "Apto 12" }
}
```

- Campos ausentes ficam como estão; campos desconhecidos são ignorados (como em `/politicas`).
- `endereco: null` apaga o endereço.
- **O React nunca chama o ViaCEP.** A API recebe só `cep`, `numero` e `complemento`, consulta
  `https://viacep.com.br/ws/{cep}/json/` e salva `logradouro`, `bairro`, `cidade` (campo
  `localidade` do ViaCEP) e `uf`. O `cep` pode chegar com ou sem hífen.
- `email` não é editável por esta rota (se vier, é ignorado).

### Erros

`400` com os campos inválidos:

```json
{
  "erro": "Confira os campos destacados.",
  "detalhes": {
    "nome": "Informe um nome de até 80 caracteres.",
    "orcamento_mensal": "Informe um valor maior que zero ou deixe vazio.",
    "endereco.cep": "Não encontrei este CEP. Confira os números.",
    "endereco.numero": "Informe o número."
  }
}
```

| Situação | Status | Chave em `detalhes` |
|---|---|---|
| `nome` vazio ou com mais de 80 caracteres | 400 | `nome` |
| `preferencias.prioridade` fora da lista | 400 | `preferencias.prioridade` |
| `preferencias.lojas_preferidas` não é lista de textos | 400 | `preferencias.lojas_preferidas` |
| `orcamento_mensal` não é número maior que zero nem `null` | 400 | `orcamento_mensal` |
| CEP sem 8 números | 400 | `endereco.cep` |
| ViaCEP responde `{"erro": true}` (CEP inexistente) | 400 | `endereco.cep` |
| `numero` vazio | 400 | `endereco.numero` |
| ViaCEP fora do ar ou demorou mais de 5 s | 502 | (sem detalhes) `"erro": "Não consegui consultar o CEP agora. Tente de novo em instantes."` |

## Solicitações: `POST /solicitacoes`, `GET /solicitacoes`, `GET /solicitacoes/{id}`, `DELETE /solicitacoes/{id}`

Responsável no backend: Pessoa 3. Telas: `/compras/nova` (envio e histórico) e `/compras/{id}`
(resultado). Tipos em `src/api/solicitacoes.ts`.

### Solicitação

```json
{
  "id": "6ae0c9f105554cb018a1d2d0",
  "intencao": "Fone confortável para reuniões, até R$ 450",
  "status": "com_resultado",
  "ofertas": [
    {
      "id": "6ae0c9f105554cb018a1d2d1",
      "titulo": "Headset Vox Office 30",
      "preco": 349.9,
      "frete": 0,
      "loja": "Loja Sonora",
      "categoria": "mobile-accessories",
      "imagem": "https://cdn.dummyjson.com/products/images/mobile-accessories/1/thumbnail.png",
      "posicao": 1,
      "explicacao": "Ficou em 1º: custa R$ 59,00 menos que a 2ª e chega 1 dia antes.",
      "dentro_da_politica": true,
      "motivos_recusa": [],
      "compra_automatica": false,
      "prazo_dias": 2,
      "avaliacao": 4.6,
      "criterios": [
        { "nome": "Preço total", "nota": 1, "valor": "R$ 349,90" },
        { "nome": "Prazo", "nota": 1, "valor": "2 dias" },
        { "nome": "Avaliação", "nota": 0.92, "valor": "4,6 de 5" }
      ]
    },
    {
      "id": "6ae0c9f105554cb018a1d2d4",
      "titulo": "Fone Studio Max",
      "preco": 899,
      "frete": 0,
      "loja": "Mercado Tech",
      "categoria": "mobile-accessories",
      "imagem": null,
      "posicao": 4,
      "explicacao": "Fica fora das suas políticas, então não posso comprar. Veja o motivo abaixo.",
      "dentro_da_politica": false,
      "motivos_recusa": ["Eletrônicos do dia a dia: total de R$ 899,00 passa do teto de R$ 500,00"],
      "compra_automatica": false,
      "prazo_dias": 2,
      "avaliacao": 4.9,
      "criterios": []
    }
  ],
  "criada_em": "2026-10-27T15:54:00+00:00",
  "atualizada_em": "2026-10-27T15:54:02+00:00"
}
```

| Campo | Regra |
|---|---|
| `status` | `processando` (buscando no catálogo), `com_resultado`, `sem_resultado` (nenhuma oferta encontrada: o fluxo termina), `aprovada` (uma oferta virou autorização), `cancelada` |
| `ofertas` | Vazia enquanto `processando` e em `sem_resultado`. Inclui as ofertas fora da política, para a pessoa entender por que ficaram de fora |
| `posicao` | 1 = melhor. As que cabem na política vêm primeiro (1, 2, 3...), as recusadas depois |
| `explicacao` | Uma frase, em primeira pessoa e com números, dizendo por que ficou nessa posição (tom de voz da identidade visual: critério e número, não adjetivo) |
| `dentro_da_politica`, `motivos_recusa`, `compra_automatica` | Resultado de `avaliar_oferta` (`permitida`, `motivos`, `compra_automatica`). `motivos_recusa` vazio quando está dentro |
| `prazo_dias`, `avaliacao` | Do catálogo; `null` se o catálogo não informar |
| `criterios` | Opcional (pode ser `[]`). Uma entrada por critério do ranking, com `nota` de 0 a 1 (1 = melhor entre as ofertas) e `valor` já formatado em pt-BR. A tela desenha uma barra por critério |
| `imagem` | URL da miniatura do catálogo ou `null` |

### `POST /solicitacoes` → `201` + `Location: /solicitacoes/{id}`

Corpo: `{"intencao": "Fone confortável para reuniões, até R$ 450"}`. Resposta: a solicitação.

- A API pode responder já com o resultado (`com_resultado` ou `sem_resultado`) ou com
  `processando`. Enquanto estiver `processando`, a tela chama `GET /solicitacoes/{id}` a cada 2 s.
- Erros: `400` com `{"detalhes": {"intencao": "Escreva pelo menos 3 letras."}}` (vazia, menos
  de 3 ou mais de 500 caracteres); `502` com
  `{"erro": "Não consegui consultar o catálogo agora. Tente de novo em instantes."}` se o catálogo falhar.

### `GET /solicitacoes` → `200`

Histórico da pessoa, da mais recente para a mais antiga, sem as ofertas:

```json
[
  { "id": "6ae0c9f105554cb018a1d2d0", "intencao": "Fone confortável para reuniões, até R$ 450", "status": "com_resultado", "criada_em": "2026-10-27T15:54:00+00:00", "quantidade_ofertas": 4 },
  { "id": "6ae0c0aa05554cb018a1d2c5", "intencao": "Guarda-chuva de golfe com capa térmica", "status": "sem_resultado", "criada_em": "2026-10-24T12:53:00+00:00", "quantidade_ofertas": 0 }
]
```

### `GET /solicitacoes/{id}` → `200` com a solicitação, ou `404`

`{"erro": "Não encontrei esta solicitação."}` quando não existe ou é de outra pessoa.

### `DELETE /solicitacoes/{id}` → `204`

Cancela antes da aprovação: só vale para `processando` e `com_resultado` (a tela só mostra o
botão nesses casos). Depois disso, o status vira `cancelada` e nenhuma oferta dela pode ser aprovada.

- `404` se não existe.
- `409` com `{"erro": "Esta solicitação não pode mais ser cancelada: ela já foi aprovada, cancelada ou terminou sem ofertas."}`.
