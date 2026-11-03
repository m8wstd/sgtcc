# Integração de autenticação e autorização

## Configuração pendente

O projeto não contém credenciais, usuários ou configuração de um provedor SSO
institucional. O fluxo SSO permanece desativado enquanto
`NEXT_PUBLIC_FIREBASE_AUTH_PROVIDER_ID` não estiver preenchida.

O valor deve corresponder ao provider ID configurado no Firebase Authentication.
Exemplos de formato aceito pelo adaptador são `google.com`, `microsoft.com`,
`oidc.<id>` e `saml.<id>`. Esses valores são apenas exemplos de formato; nenhum
provedor foi escolhido ou inventado neste repositório.

Quando houver uma política de domínio institucional, preencher também
`NEXT_PUBLIC_FIREBASE_INSTITUTIONAL_EMAIL_DOMAIN` e a variável equivalente do
servidor. A validação do domínio acontece novamente no servidor.

O Firebase Admin exige `FIREBASE_PROJECT_ID` e credenciais disponíveis no
ambiente de execução. A chave de serviço não deve ser commitada; use
`FIREBASE_SERVICE_ACCOUNT_KEY` somente como segredo de ambiente.

## Login em uso e limitações

A tela de login da branch `dev` foi mantida nesta feature para não interromper
os usuários enquanto o SSO institucional não está configurado. Ela usa
`POST /api/auth/login-credenciais` e autentica e-mail/senha no Firebase Auth.
Esse fluxo não verifica `emailVerified`, provider institucional ou domínio
permitido. A rota também usa o perfil do Firestore com fallback para `ALUNO` e
não deve ser tratado como validação institucional adequada para produção.

O código SSO abaixo continua disponível, mas só pode ser usado depois de
configurar o provider e a política de domínio nos ambientes correspondentes.

## Sessão SSO

O cliente inicia o SSO e envia o ID token Firebase para
`POST /api/auth/session`. Antes disso, obtém um token de dupla submissão em
`GET /api/auth/csrf`. A criação da sessão exige:

- origem same-origin;
- cookie `sgtcc_csrf` igual ao header `X-CSRF-Token`;
- token Firebase válido e revogação verificada;
- provider igual ao provider institucional configurado;
- e-mail verificado e, quando configurado, pertencente ao domínio institucional;
- perfil válido na coleção `usuarios`.

Depois da validação, o servidor cria o cookie `sgtcc_session` com `HttpOnly`,
`SameSite=Lax` e `Secure` em produção.

## Correção crítica pendente: cadastro público

**CRÍTICO — tratar imediatamente em uma branch separada e revisar pela equipe.**
`POST /api/auth/cadastro` ainda aceita do cliente `perfil`, e-mail e matrícula;
o endpoint cria a conta, marca o e-mail como verificado sem prova e atribui
custom claims. Uma chamada direta pode, portanto, solicitar `ADMIN` ou
`COORDENACAO`, além de falsificar matrícula e identidade. A interface pública
também oferece cadastro. Não use esse fluxo para provisionar contas confiáveis
nem exponha esta revisão como correção do problema. A remediação precisa definir
um mecanismo institucional de provisionamento, negar papéis privilegiados a
requisições públicas e incluir testes de autorização antes da integração.

## Resolução do perfil e IDs

O adaptador atual procura o documento `usuarios/{Firebase UID}`. Essa é uma
dependência isolada em `src/lib/auth/profile.ts`, pois os artefatos atuais não
confirmam se o banco real usa o UID do Firebase como ID do documento ou como
campo separado.

O relacionamento de autorização usa a modelagem existente:

- `TCC.aluno_id` é comparado com `Aluno.matricula`;
- `TCC.orientador_id` é comparado com `ProfessorOrientador.id`;
- `BancaAvaliacao.avaliador_id` é comparado com `ProfessorAvaliador.id`.

Essas convenções devem ser confirmadas com a responsável pelo banco antes da
homologação. Caso estejam diferentes, deve ser alterado somente o adaptador
Firestore, preservando as funções de autorização.

## Autorização de documentos

`GET /api/documentos/[documentId]` nunca devolve diretamente o valor bruto de
`arquivoUrl`. Primeiro valida a sessão e o vínculo com o TCC e, em seguida,
gera uma URL temporária assinada para um objeto do Firebase Storage. URLs
externas ou buckets diferentes do bucket configurado são rejeitados.

As regras Firestore/Storage do ambiente Firebase ainda precisam ser
versionadas e revisadas pela equipe. Mesmo assim, os Route Handlers mantêm a
verificação server-side para não depender apenas de regras do cliente.
