# Análise de lacunas — Protótipo × Morah API v2.0.0

Data: 11/10/2026 · Fontes: `docs/morah-openapi.yaml` (contrato), `docs/Pront doBack.txt` (prompt do backend) e `docs/Morach DOCS.docx` (requisitos REQ001–REQ019 e casos de uso UC01–UC33).

## 1. Situação encontrada (antes desta entrega)

O protótipo gerado no Bolt (Expo Router, web + mobile) era **apenas visual**:

| Item | Situação |
|---|---|
| Chamadas à API | **Nenhuma.** As 5 abas (`index`, `financeiro`, `portaria`, `avisos`, `mais`) tinham dados fixos no código ("Marina Silva", "Residencial Vila Madalena", "R$ 842,50"). |
| Login / JWT | Não existia tela de login, token, refresh nem logout (o botão "Sair" só mostrava uma mensagem). |
| Perfis (RBAC) | Uma só visão (morador). Não havia telas de **síndico** nem de **portaria**, e o proprietário não tinha funções próprias. |
| Módulos ativáveis | Ignorados: as abas eram fixas. |
| Personalização | Cores fixas no código. |
| Cliente HTTP / Logger | O prompt do backend diz que "o frontend já tem dois Singletons (cliente HTTP e logger)", mas **eles não existiam**. |
| Telas ausentes | Reservas, Encomendas, Minha Unidade, Notificações, Personalização/Módulos, todo o painel do síndico e toda a operação da portaria. |
| Dependências | `@supabase/supabase-js` instalado e não usado (removido). |

## 2. Cobertura do contrato: endpoint → tela

O contrato tem **56 operações** (o prompt do backend fala em "55"; a contagem por tag é 5 + 1 + 11 + 7 + 5 + 7 + 8 + 6 + 2 + 4 = 56).
Antes: **0 de 56** usadas. Agora: **55 de 56** usadas pelo app. A única exceção é o webhook, chamado pelo gateway e usado no app só para simular a confirmação do PIX no modo demonstração.

Legenda de perfis: M = morador, P = proprietário, S = síndico, T = portaria.

### Login
| Operação | Perfis | Tela | Antes | Agora |
|---|---|---|---|---|
| `POST /auth/login` | público | `app/login.tsx` | ❌ | ✅ e-mail + senha, usuários demo no modo simulado |
| `GET /auth/me` | todos | `AuthContext` (restaura a sessão), aba Mais | ❌ | ✅ |
| `POST /auth/contexto` | todos | Mais → "Contexto ativo" (troca de perfil/condomínio) | ❌ | ✅ |
| `POST /auth/refresh` | público | `ApiClient` (automático em 401, com rotação) | ❌ | ✅ |
| `POST /auth/logout` | todos | Mais → "Sair da conta" | ❌ | ✅ |

### Tela Inicial
| `GET /home/dashboard` | todos | Início: 3 variantes (DashboardMorador / DashboardSindico / DashboardPortaria) | ❌ dados fixos | ✅ |
|---|---|---|---|---|

### Financeiro
| Operação | Perfis | Tela | Antes | Agora |
|---|---|---|---|---|
| `GET /financeiro/cobrancas` | M P S | Financeiro (filtros de status; síndico também por unidade e competência) | ❌ | ✅ |
| `GET /financeiro/cobrancas/{id}` | M P S | Detalhe da cobrança (multa, juros, total) | ❌ | ✅ |
| `GET /financeiro/cobrancas/{id}/pix` | M P | "Gerar código PIX" + copiar (expo-clipboard) + `expiraEm` | ❌ (botão falso) | ✅ |
| `POST /financeiro/cobrancas/{id}/baixa-manual` | S | Financeiro do síndico → cobrança → baixa manual | ❌ | ✅ |
| `POST /financeiro/webhooks/pagamentos` | gateway | Só no modo simulado: "Simular confirmação do gateway" | ❌ | ⚠️ simulado |
| `GET /financeiro/documentos` | M P S | Documentos financeiros (abre `arquivoUrl`) | ❌ fixos | ✅ |
| `POST /financeiro/documentos` | S | "Publicar documento" | ❌ | ✅ |
| `POST /financeiro/taxas` | S | "Nova taxa" | ❌ | ✅ |
| `POST /financeiro/taxas/{id}/gerar-cobrancas` | S | Após criar a taxa, ou "Gerar cobranças de taxa existente"; mostra `falhas` | ❌ | ✅ |
| `GET /financeiro/inadimplencia` | S | Financeiro do síndico (métricas) | ❌ | ✅ |

### Portaria
| Operação | Perfis | Tela | Antes | Agora |
|---|---|---|---|---|
| `POST /portaria/visitantes` | T | Portaria (guarita) → "Novo visitante" | ❌ (mensagem falsa) | ✅ |
| `GET /portaria/autorizacoes` | T M P | Fila da guarita / "Visitantes" do morador | ❌ fixos | ✅ |
| `GET /portaria/autorizacoes/{id}` | T M P | Detalhe (aberto também pela notificação) | ❌ | ✅ |
| `PATCH /portaria/autorizacoes/{id}/decisao` | M P | Liberar / recusar com justificativa | ❌ (estado local) | ✅ |
| `POST /portaria/autorizacoes/{id}/reenviar` | T | "Reenviar notificação" | ❌ | ✅ |
| `GET /portaria/acessos` | T S | "Entradas e saídas" (navegação por dia); síndico: histórico | ❌ | ✅ |
| `POST /portaria/acessos` | T | Registrar entrada (com autorização ou manual após expirar) e saída | ❌ | ✅ |

### Avisos
| Operação | Perfis | Tela | Antes | Agora |
|---|---|---|---|---|
| `GET /avisos` | todos | Mural com filtros de categoria e prioridade e contador de não lidos | ❌ fixos | ✅ |
| `GET /avisos/{id}` | todos | Detalhe (marca como lido; 410 → "fora de vigência") | ❌ | ✅ |
| `POST /avisos` | S | "Novo aviso" (público-alvo condomínio/bloco/unidade) | ❌ | ✅ |
| `PATCH /avisos/{id}` | S | "Editar" (envia só os campos alterados) | ❌ | ✅ |
| `DELETE /avisos/{id}` | S | "Remover" (expira o aviso) | ❌ | ✅ |

### Reservas
| Operação | Perfis | Tela | Antes | Agora |
|---|---|---|---|---|
| `GET /areas-comuns` | todos | Reservas → áreas comuns | ❌ | ✅ |
| `GET /areas-comuns/{id}/disponibilidade` | M P | Grade de horários de 1 h (08h–22h) dos próximos 14 dias | ❌ | ✅ |
| `GET /reservas` | M P T S | Minhas reservas / reservas do dia (portaria) / todas (síndico) | ❌ (card fixo) | ✅ |
| `POST /reservas` | M P | Confirmar reserva (409 → atualiza a grade) | ❌ | ✅ |
| `GET /reservas/{id}` | M P T S | Detalhe da reserva | ❌ | ✅ |
| `DELETE /reservas/{id}` | M P | Cancelar (com confirmação) | ❌ | ✅ |
| `POST /reservas/{id}/vistoria` | T | Vistoria de entrada/saída, dano, observação e foto | ❌ | ✅ |

### Minha Unidade
| Operação | Perfis | Tela | Antes | Agora |
|---|---|---|---|---|
| `GET /unidades/minha` | M P | Minha unidade | ❌ (texto fixo) | ✅ |
| `GET /unidades/minha/vinculos` | M P | Moradores e vínculos | ❌ | ✅ |
| `POST /unidades/minha/vinculos/solicitacoes` | M P | "Solicitar vínculo" | ❌ | ✅ |
| `POST /unidades/minha/inquilinos` | P | "Cadastrar inquilino" | ❌ | ✅ |
| `DELETE /unidades/minha/inquilinos/{vinculoId}` | P | "Encerrar" contrato | ❌ | ✅ |
| `GET /unidades/{id}` | S | Unidades (consulta por id) | ❌ | ✅ |
| `GET /unidades/{id}/vinculos/solicitacoes` | S | Solicitações pendentes da unidade | ❌ | ✅ |
| `PATCH /unidades/{id}/vinculos/solicitacoes/{id}` | S | Aprovar / rejeitar | ❌ | ✅ |

### Encomendas
| Operação | Perfis | Tela | Antes | Agora |
|---|---|---|---|---|
| `GET /encomendas` | M P T S | Encomendas (filtro de status) | ❌ (contador fixo) | ✅ |
| `POST /encomendas` | T | "Receber" encomenda | ❌ | ✅ |
| `GET /encomendas/{id}` | M P T S | Detalhe + código de retirada (morador) | ❌ | ✅ |
| `POST /encomendas/{id}/autorizacoes-retirada` | M P | "Autorizar terceiro" (código temporário) | ❌ | ✅ |
| `POST /encomendas/{id}/retirada` | T | "Confirmar retirada" por código (409 → código inválido) | ❌ | ✅ |
| `POST /encomendas/{id}/ocorrencias` | M P | "Não encontrada? Abrir ocorrência" | ❌ | ✅ |

### Notificações
| Operação | Perfis | Tela | Antes | Agora |
|---|---|---|---|---|
| `GET /notificacoes` | todos | Sino com contador + tela Notificações | ❌ (bolinha fixa) | ✅ |
| `PATCH /notificacoes/{id}/lida` | todos | Ao abrir (navega para a tela do `tipo`/`referenciaId`) e "Ler todas" | ❌ | ✅ |

### Personalização
| Operação | Perfis | Tela | Antes | Agora |
|---|---|---|---|---|
| `GET /condominio/personalizacao` | todos | `CondominioContext`: nome, cores e tema do app inteiro | ❌ cores fixas | ✅ |
| `PATCH /condominio/personalizacao` | S | Condomínio → identidade visual (valida `#RRGGBB`, remove logo com `null`) | ❌ | ✅ |
| `GET /condominio/modulos` | todos | Esconde as abas e atalhos de módulos desativados; recarrega a cada 5 min (REQ018) | ❌ | ✅ |
| `PATCH /condominio/modulos/{modulo}` | S | Chaves liga/desliga com confirmação ao desativar | ❌ | ✅ |

## 3. Requisitos (DOCS) × contrato × app

| Requisito | Coberto pelo contrato? | No app |
|---|---|---|
| REQ001 Autenticação por credenciais | Sim, **mas por e-mail** (o DOCS diz CPF) | ✅ login por e-mail |
| REQ002 Biometria | **Não** | — fora do escopo do contrato |
| REQ003 Boletos e PIX | Sim | ✅ |
| REQ004 Assembleia virtual | **Não** | — fora do escopo |
| REQ005 Reserva de espaços | Sim | ✅ |
| REQ006 Liberação notificada de visitantes | Sim (notificação interna; push real não está no contrato) | ✅ |
| REQ007 Consulta e retirada de encomendas | Sim | ✅ |
| REQ008 Autorização de terceiros | Sim | ✅ |
| REQ009 Lavanderia | **Não** | — fora do escopo |
| REQ010 Painel financeiro do síndico | Sim | ✅ |
| REQ011 Gestão de módulos | Sim | ✅ |
| REQ012 Cadastro de moradores e unidades | **Parcial**: só vínculos e inquilinos; não há cadastro de unidade nem de morador pelo síndico | ✅ no que existe |
| REQ013 Registro de portaria e acesso | Sim (foto como URL) | ✅ |
| REQ014 Recebimento de encomendas | Sim (foto como URL) | ✅ |
| REQ015 Expiração da visita | Sim, **30 min** (o DOCS diz 5 min) | ✅ segue o contrato |
| REQ016 Módulos núcleo protegidos | **Diverge**: o contrato permite desativar a Portaria | ⚠️ segue o contrato |
| REQ017 Unicidade de CPF | Regra do backend | — |
| REQ018 Propagação de módulos em até 5 min | Sim | ✅ recarga a cada 5 min e ao voltar ao app |
| REQ019 Ocorrência por divergência de encomenda | Sim | ✅ |

Casos de uso sem endpoint no contrato (ficam fora desta entrega): UC03/UC27 Assembleia, UC07 Lavanderia, UC14 Gerenciar Perfil (não há `PATCH` de pessoa), UC16 Veículos, UC17 Pets, UC18 Desapegos, UC19/UC28 Piscina e Atestados, UC20 Garagens, UC21 Documentos gerais, UC22 Mudança, UC23 Obras, UC29 Ocorrências (só criação indireta), UC30 Cadastro de unidades, UC32 Infrações e UC33 Prestadores.

## 4. Divergências para o grupo decidir

1. **Login por CPF × e-mail**: o DOCS (UC01/REQ001) pede CPF, mas o contrato usa e-mail. O app segue o contrato.
2. **Expiração da visita: 5 min × 30 min**: o DOCS (REQ015) fala em 5 min, o contrato em 30 min. O app mostra 30 min.
3. **Portaria como módulo núcleo**: o REQ016 e o UC09 E1 dizem que ela não pode ser desativada, mas o contrato aceita `portaria` em `ModuloCodigo`.
4. **RN1 do UC01** (bloqueio após 3 tentativas): não está no contrato.

## 5. Lacunas do próprio contrato que afetam o front

| Lacuna | Impacto | Contorno no app |
|---|---|---|
| Não há listagem de unidades para a portaria nem para o síndico | Registrar visitante e encomenda e consultar unidade exigem o `unidadeId` | Campo numérico com dica (seed: 1 = Apto 302, 2 = Apto 502). **Sugestão:** `GET /unidades` (síndico/portaria). |
| Não há `GET /financeiro/taxas` | O síndico só conhece o `taxaId` pela resposta do `criarTaxa` | Fluxo "criar taxa → gerar lote" e campo para o id de uma taxa existente. |
| Não há upload de arquivos | Documentos e fotos (visitante, encomenda, vistoria) são **URLs** | Campos de URL; a câmera (`expo-camera` já instalado) fica para quando houver upload. |
| `GET /notificacoes` sem metadados | Não dá para saber o total de páginas | "Carregar mais" enquanto a página vier cheia. |
| Não há endpoint de ocorrências | O síndico vê só o número (`ocorrenciasAbertas`) no dashboard | Mostrado no Início do síndico. |
| CORS não citado no prompt do backend | Na web (Expo), chamadas para `localhost:8080` serão bloqueadas sem CORS | **Pendência para o backend:** liberar a origem do app web (ex.: `http://localhost:8081`). |

## 6. O que foi implementado

- **`lib/logger.ts`**: Singleton `Logger` (`getInstance()`).
- **`lib/api/client.ts`**: Singleton `ApiClient`. Envia o Bearer automaticamente, faz refresh com rotação no 401 (uma única renovação mesmo com várias chamadas simultâneas) e converte os erros `application/problem+json` em `ApiError` (com `erros[]`).
- **`lib/api/types.ts`**: todos os schemas do contrato, com os mesmos nomes.
- **`lib/api/endpoints/*.ts`**: uma função por `operationId`.
- **`lib/api/mock/`**: servidor simulado com o seed do backend e as regras do contrato:
  - RBAC, sendo o proprietário cumulativo ao morador;
  - escopo 403/404, módulos desativados → 403, paginação (`size` 1–100);
  - status calculados (`atrasado`, `expirada`), 409/410;
  - notificações.
  - Fica ativo enquanto `EXPO_PUBLIC_USE_MOCK` não for `false`.
- **`contexts/AuthContext.tsx`** e **`contexts/CondominioContext.tsx`**: sessão, contexto ativo, tema e módulos.
- **Telas**: login, abas por perfil e todas as telas da seção 2.

Como apontar para o backend real: veja o `README.md`.
