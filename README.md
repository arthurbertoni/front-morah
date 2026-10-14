# front-morah

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-m5ikm9vw)

App do **Morah — gestão de condomínios** (Expo Router: web, Android e iOS), integrado à **Morah API v2.0.0** (`docs/morah-openapi.yaml`).

A análise do que faltava no protótipo e o mapa endpoint → tela estão em [`docs/ANALISE-LACUNAS-API.md`](docs/ANALISE-LACUNAS-API.md).

## Como rodar

```bash
npm install
npm run web      # abre no navegador (http://localhost:8081)
npm run dev      # Expo Go / emulador
npm run typecheck
```

## API real × modo demonstração

Enquanto o backend Spring não está no ar, o app usa um **servidor simulado** (`lib/api/mock/`), que segue o contrato:

- RBAC por perfil;
- escopo de unidade e de condomínio;
- módulos desativados respondem 403;
- erros 409/410;
- paginação.

O seed é o mesmo do backend.

| Variável | Padrão | Uso |
|---|---|---|
| `EXPO_PUBLIC_USE_MOCK` | `true` | `false` para chamar a API real |
| `EXPO_PUBLIC_API_URL` | `http://localhost:8080/v1` | URL base da API |

Para usar o backend local, crie um `.env` na raiz do projeto:

```
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_URL=http://localhost:8080/v1
```

No celular físico, troque `localhost` pelo IP da máquina. Na web, o backend precisa liberar **CORS** para a origem do app (ex.: `http://localhost:8081`).

## Usuários de demonstração (senha `demo123`)

| E-mail | Perfil |
|---|---|
| `camila.duarte@demo.com.br` | Moradora (inquilina) · Apto 502 |
| `rafael.nunes@demo.com.br` | Proprietário · Apto 302 |
| `helena.prado@demo.com.br` | Síndica (no modo simulado, também proprietária do Apto 502, para testar a troca de contexto) |
| `portaria@demo.com.br` | Portaria |

No modo simulado, os dados ficam no `localStorage` do navegador. O botão "Restaurar dados de demonstração", na tela de login, volta ao seed.

## Estrutura

```
app/                      rotas (Expo Router)
  login.tsx               POST /auth/login
  (tabs)/_layout.tsx      abas por perfil + módulos ativos
  (tabs)/*.tsx            Início, Financeiro, Portaria, Avisos, Reservas, Encomendas,
                          Minha unidade, Unidades, Notificações, Condomínio, Mais
telas/                    variações de tela por perfil (financeiro, portaria) e componentes comuns
components/morah-ui.tsx   kit de UI (cores de marca vindas da personalização)
contexts/                 AuthContext (sessão/JWT/contexto) e CondominioContext (tema e módulos)
hooks/useApi.ts           useApi, usePaged, useAcao, useRecarregarAoFocar
lib/
  config.ts               variáveis de ambiente
  logger.ts               Singleton Logger
  api/client.ts           Singleton ApiClient (Bearer, refresh com rotação, erros RFC 9457)
  api/types.ts            schemas do contrato
  api/endpoints/*.ts      uma função por operationId
  api/mock/               servidor simulado + seed
```

## Os dois Singletons do frontend

- **`Logger`** (`lib/logger.ts`): uma única instância, via `Logger.getInstance()`, padroniza os logs (`[Morah] <data> <nível> …`).
- **`ApiClient`** (`lib/api/client.ts`): uma única instância, via `ApiClient.getInstance()`, concentra:
  - a URL base e o cabeçalho `Authorization: Bearer`;
  - a renovação do token: em um 401, chama `POST /auth/refresh` uma vez (com rotação) e repete a requisição;
  - a conversão de `application/problem+json` em `ApiError`.

  O transporte é trocável: `fetch` para a API real e o servidor simulado no modo demonstração.
