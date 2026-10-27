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
