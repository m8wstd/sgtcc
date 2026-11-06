# Integração front-end ↔ backend ↔ Firestore

Telas autenticadas lendo dados do Firestore, sobre o fluxo de sessão de `docs/auth-integration.md`.

## Rotas

| Rota | Quem acessa | O que mostra |
|---|---|---|
| `/login` | público | login por credenciais da `dev`; cadastro público ainda está presente e contém vulnerabilidade crítica documentada em `docs/auth-integration.md` |
| `/dashboard` | logado | redireciona para a home do perfil |
| `/dashboard/aluno` · `/orientador` · `/avaliador` · `/coordenacao` | o perfil correspondente | lista dos TCCs que o perfil pode ver |
| `/dashboard/admin` | somente ADMIN | indicadores globais e lista de TCCs, em leitura |
| `/dashboard/tcc/[id]` | quem tem vínculo com o TCC | marcos, status, versões e feedbacks |
| `/dashboard/aluno/entregas` | ALUNO | Central de Entregas e Versões (RF03): envio de arquivos por marco e histórico de versões |

`src/proxy.ts` barra `/dashboard/*` sem cookie; cada página valida a sessão de verdade em
`requireSessao()` (`src/lib/auth/server-session.ts`). Perfil errado → redireciona para a home do próprio perfil.
O painel ADMIN também valida o papel na consulta de dados do servidor. A rota de login mantém o comportamento de `dev` durante a transição; suas limitações de identidade e a vulnerabilidade crítica do cadastro público estão documentadas em `docs/auth-integration.md`.

## Onde está cada coisa

- `src/lib/data/queries.ts`: leituras do Firestore (Admin SDK). Segue o modelo do banco:
  aluno → `alunos.usuario_id` → matrícula; orientador → `professores_orientadores.usuario_id`;
  avaliador → `bancas_avaliacao`. Um TCC isolado passa por `canAccessTcc` (`lib/auth/authorization.ts`).
- `src/lib/data/admin-queries.ts`: agregações administrativas de leitura; exige perfil ADMIN antes de consultar.
- `src/lib/auth/server-session.ts`: adapta `getAuthenticatedSession` para Server Components.
- `src/app/dashboard/*`: páginas. `src/app/login/*`: tela de login.

## Como testar localmente

Para testar o dashboard, use um ambiente local/emulador ou projeto isolado e uma
conta ADMIN de teste já provisionada, com documento `usuarios/<UID>` e
`perfil: "ADMIN"`. Configure o Firebase para esse ambiente, execute
`npm run dev` e autentique com uma conta existente; o redirect de perfil deve
abrir `/dashboard/admin`. O login por senha preservado não comprova a identidade
institucional e é apenas um caminho transitório. Não use o cadastro público
para obter privilégio ADMIN, não rode `npm run seed` contra Firebase real e não
altere manualmente o perfil de uma conta de produção.

## RF03 — Central de Entregas e Versões

O aluno envia arquivos (capítulos, rascunhos, monografia) para cada marco do cronograma em
`/dashboard/aluno/entregas`. Cada envio cria uma **nova versão**; as anteriores nunca são alteradas (US03-AC2).

**API:** `POST /api/tcc/[tccId]/entregas` (`multipart/form-data`: `marcoId`, `arquivo`).
Exige sessão de ALUNO dono do TCC, same-origin e token CSRF (`/api/auth/csrf`, header `X-CSRF-Token`).
Respostas: `201` (`{ versao, emAtraso }`), `400` arquivo/marco inválido, `403` sem vínculo, CSRF ou prazo
encerrado (`DEADLINE_PASSED`), `404` TCC/marco inexistente, `409` entrega concluída (`DELIVERY_CLOSED`) ou
conflito de versão, `413` arquivo acima de 10 MB. Para abrir uma versão use `GET /api/documentos/[versaoId]`.

**Regras de negócio** (`src/lib/entregas/regras.ts`, usadas pelo servidor e pela tela):
- somente `.pdf` e `.docx` (extensão **e** bytes iniciais conferidos), até 10 MB (US03);
- entrega `CONCLUIDA` pelo orientador não aceita novas versões (RN02);
- depois de `dataLimite`, o envio só é recusado se o marco tiver `bloqueioEstrito: true`; caso contrário é
  aceito e marcado como atrasado;
- o envio **não altera o status** da entrega (uma entrega nova nasce `AGUARDANDO_ENVIO`); marcar como
  "pronta para revisão" é a ação separada da US05. Isso permite enviar rascunhos.

**Armazenamento:** arquivo em `tccs/<tccId>/entregas/<entregaId>/v<n>_<nome>` no Firebase Storage (criado com
`ifGenerationMatch: 0`, nunca sobrescreve) e documento em `versoes_arquivo` com id `<entregaId>__v<n>`.

**Limite de corpo:** `src/proxy.ts` intercepta `/api/tcc/*` e o Next bufferiza o corpo da requisição (e trunca em
silêncio acima do limite). Por isso `next.config.ts` define `experimental.proxyClientMaxBodySize: "12mb"`. Se o
limite de arquivo mudar, ajuste os dois. Em hospedagens com limite de corpo próprio (ex.: Vercel, ~4,5 MB), o
upload por esta rota fica limitado a esse valor.
