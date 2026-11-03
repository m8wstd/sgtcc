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
