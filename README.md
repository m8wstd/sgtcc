# SGTCC — Sistema de Gestão de Trabalho de Conclusão de Curso

Plataforma web completa e moderna para acompanhamento, submissão, orientação, avaliação de bancas e coordenação de Trabalhos de Conclusão de Curso (TCC 1 e TCC 2).

Desenvolvido com foco em usabilidade, segurança, tempo real e alta fidelidade aos fluxos acadêmicos institucionais.

---

## 🚀 Tecnologias Utilizadas

- **Framework:** [Next.js](https://nextjs.org/) 16 (App Router, Server Actions, Route Handlers)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **UI & Estilização:** [React](https://react.dev/) 19, [Tailwind CSS](https://tailwindcss.com/) v4, [Base UI](https://base-ui.com/), [Lucide React](https://lucide.dev/)
- **Backend & Database:** [Firebase Admin](https://firebase.google.com/docs/admin/setup) & [Google Cloud Firestore](https://firebase.google.com/docs/firestore)
- **Autenticação:** [Firebase Authentication](https://firebase.google.com/docs/auth) com Sessão em Cookies HTTP-Only assinado e Custom Claims
- **Armazenamento de Arquivos:** [Supabase Storage](https://supabase.com/storage) (bucket dedicado para PDFs, versionamento de entregas e materiais)
- **Testes Automatizados:** [Vitest](https://vitest.dev/) (23 suítes com 153+ testes unitários e de integração)

---

## 🎯 Perfis de Usuário e Funcionalidades

O sistema opera com controle de acesso baseado em papéis (RBAC):

### 🎓 Aluno (`ALUNO`)
- **Painel do Aluno:** Visão clara do progresso geral do TCC (TCC 1 / TCC 2), orientador vinculado, próximos prazos e status da entrega.
- **Linha do Tempo / Etapas:** Acompanhamento do cronograma institucional, visualização de materiais de apoio disponibilizados pelos professores e mural de postagens da etapa.
- **Envio de Arquivos & Versionamento:** Upload de documentos (PDF, DOCX, ZIP), histórico de versões anteriores, visualização e download dos arquivos submetidos.
- **Feedback & Parecer do Orientador:** Notificação imediata de correções solicitadas ou conclusão da etapa com parecer detalhado.
- **Envio da Versão Final:** Submissão do trabalho completo para avaliação pela banca examinadora.

### 👨‍🏫 Professor (`ORIENTADOR` / `AVALIADOR`)
O papel de Professor unifica as duas atuações acadêmicas:
- **Aba "Orientações":**
  - Gestão Kanban dos orientandos distribuídos por status: *Pendente*, *Em revisão* e *Concluído*.
  - Filtros por fase (Todas, TCC 1, TCC 2), curso e busca por nome ou tema.
  - Avaliação de etapas: download dos arquivos do aluno, emissão de parecer obrigatório com opção de aprovar (concluir) ou devolver para correção.
  - Publicação de comunicados e materiais de apoio na etapa.
- **Aba "Banca Avaliadora":**
  - Kanban dos trabalhos onde compõe a banca examinadora (*Aguardando Envio*, *Para Avaliar*, *Em Avaliação*, *Avaliadas*).
  - Filtros sincronizados por semestre, curso, fase e busca textual.
  - Sala da Banca: visualizador de PDF embutido da versão final enviada pelo aluno, atribuição de notas, parecer individual e registro de decisão (*Aprovado*, *Aprovado com Ressalvas*, *Reprovado*).

### 🗂️ Coordenação (`COORDENACAO`)
- **Painel Operacional da Coordenação:**
  - **Novo TCC:** Cadastro e vinculação de projetos com suporte a múltiplos coautores/alunos, definição de fase, semestre e orientador. Restrito estritamente aos cursos delegados ao coordenador.
  - **Alocação de Docentes:** Transferência e distribuição de orientandos por docente e capacidade de orientação.
  - **Professores da Banca:** Composição e designação de bancas examinadoras via modal com seleção de professores disponíveis do curso.
  - **Cronograma Semestral:** Gerenciamento das datas oficiais de entregas, submissão à banca e defesas públicas para TCC 1 e TCC 2.
- **Acesso Completo:** Consulta de orientações e bancas examinadoras de todos os cursos sob sua coordenação.

### 🛡️ Administração (`ADMIN`)
- **Painel de Administração:**
  - Gestão global de usuários: criação direta, convites por token temporário, edição de perfis e exclusão.
  - Configuração de cursos coordenados por cada membro da coordenação.
  - Métricas e filtros em tempo real categorizados semanticamente por persona (*Total*, *Alunos*, *Orientadores*, *Avaliadores*, *Coordenação*, *Admin*).
  - Acesso irrestrito a todas as visões do sistema (Orientações, Bancas e Painel da Coordenação).

### 💬 Comunicação e Cronograma Integrado
- **Hub Flutuante Inferior:** Menu de navegação dinâmico estilo *Liquid Glass* responsivo, adaptado dinamicamente para cada perfil.
- **Mensagens:** Chat interno direto entre alunos, orientadores e coordenação com interface otimizada para mobile e desktop.
- **Notificações:** Alertas em tempo real para submissões de arquivos, mudanças de status, pareceres da banca e comunicados institucionais.

---

## 📂 Estrutura de Diretórios

```plaintext
sgtcc/
├── scripts/
│   └── seed.ts                     # Script de população do banco de dados (Auth + Firestore + Supabase Storage)
├── src/
│   ├── app/
│   │   ├── api/                    # Rotas de API e Route Handlers seguros
│   │   │   ├── admin/              # Usuários e convites do Admin
│   │   │   ├── auth/               # Login, sessão, cadastro por token
│   │   │   ├── coordenacao/        # Alocação, bancas, cronograma e criação de TCC
│   │   │   ├── documentos/         # Uploads, visualização e download no Supabase Storage
│   │   │   ├── mensagens/          # Sistema de mensageria
│   │   │   └── tcc/                # Ações de etapas, postagens e avaliações de TCC
│   │   ├── cadastro/               # Tela de cadastro via token de convite
│   │   ├── dashboard/              # Telas e layouts autenticados por perfil
│   │   │   ├── admin/              # Painel de Administração
│   │   │   ├── aluno/              # Painel e entregas do Aluno
│   │   │   ├── avaliador/          # Painel da Banca Avaliadora
│   │   │   ├── coordenacao/        # Painel Operacional da Coordenação
│   │   │   ├── cronograma/         # Cronograma institucional
│   │   │   ├── mensagens/          # Interface de Mensagens (estilo chat)
│   │   │   ├── orientador/         # Painel de Orientações
│   │   │   ├── professor/          # Painel unificado do Docente
│   │   │   └── tcc/[id]/           # Detalhe do TCC, etapas e sala de banca
│   │   ├── login/                  # Tela de autenticação com credenciais
│   │   ├── layout.tsx              # Layout raiz
│   │   └── page.tsx               # Redirecionamento inteligente inicial
│   ├── components/
│   │   ├── etapa/                  # Componentes de submissão e sala da banca
│   │   ├── layout/                 # Header, Floating Hub e modais globais
│   │   ├── tcc-view/               # Visualização modular das etapas do TCC
│   │   └── ui/                     # Componentes primitivos acessíveis (StatCard, StatusPill, etc.)
│   ├── lib/
│   │   ├── auth/                   # Sessão por cookies, validação de perfis e autorização
│   │   ├── banca/                  # Regras de notas e pareceres da banca
│   │   ├── data/                   # Queries e joins manuais em lote no Firestore
│   │   ├── entregas/               # Regras de negócio de prazos e submissões
│   │   ├── firebase/               # Inicialização de Firebase Admin e Client
│   │   └── notificacoes/           # Serviço de notificações em lote
│   └── types/                      # Tipagens e interfaces TypeScript (TCC, Usuários, Perfis)
├── docs/                           # Diagramas UML e documentações complementares
├── package.json
└── tsconfig.json
```

---

## 🛠️ Configuração e Execução

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 20 ou superior
- [npm](https://www.npmjs.com/) ou [pnpm](https://pnpm.io/)
- Projeto configurado no [Firebase](https://firebase.google.com/) com Firestore e Auth ativos
- Projeto configurado no [Supabase](https://supabase.com/) com Storage bucket criado (ex: `sgtcc`) para upload e download de arquivos e monografias

### 1. Clonar o repositório e instalar dependências
```bash
git clone https://github.com/seu-usuario/sgtcc.git
cd sgtcc
npm install
```

### 2. Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto com as credenciais necessárias:

```env
# Firebase Admin
FIREBASE_PROJECT_ID="seu-projeto-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@seu-projeto.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="seu-projeto.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="seu-projeto-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="seu-projeto.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# Supabase Storage (Armazenamento de Arquivos)
NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
SUPABASE_STORAGE_BUCKET="sgtcc"

# Sessão e Segurança
SESSION_SECRET="chave-secreta-longa-para-cookies"
SEED_PASSWORD="SenhaPadraoSeed123!"
```

### 3. Popular o Banco de Dados (Seed)
Execute o script de seed para criar a estrutura inicial, usuários de teste de todas as personas e dados de demonstração:

```bash
npm run seed
```

#### Credenciais padrão geradas pelo seed:
| Perfil | E-mail | Senha |
| :--- | :--- | :--- |
| **Administrador** | `admin@teste.sgtcc.dev` | Definida em `SEED_PASSWORD` |
| **Coordenação** | `claudio@teste.sgtcc.dev` | Definida em `SEED_PASSWORD` |
| **Professor (Orientador/Banca)** | `joana@teste.sgtcc.dev` | Definida em `SEED_PASSWORD` |
| **Professor (Orientador/Banca)** | `silvia@teste.sgtcc.dev` | Definida em `SEED_PASSWORD` |
| **Aluno** | `jorge@teste.sgtcc.dev` | Definida em `SEED_PASSWORD` |
| **Aluna** | `maria@teste.sgtcc.dev` | Definida em `SEED_PASSWORD` |

### 4. Executar em Desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 🧪 Testes Automatizados

O projeto conta com testes unitários e de integração cobrindo fluxos críticos de autorização, submissão de entregas, cálculos de status e pareceres da banca:

```bash
# Executar todos os testes com Vitest
npm test

# Executar checagem estática de tipos TypeScript
npx tsc --noEmit
```

---

## 🔒 Regras de Negócio e Segurança

- **Proteção contra Open Redirect:** Validação estrita de parâmetros `next` permitindo apenas rotas internas do dashboard.
- **Rollback Transacional:** O cadastro de usuários executa compensação atômica excluindo o usuário do Auth caso a gravação do Firestore falhe.
- **Sessões HTTP-Only:** Tokens de autenticação protegidos contra ataques XSS, trafegados exclusivamente por cookies HTTP seguros.
- **Isolamento de Dados:** Cada persona só tem acesso às rotas, APIs e documentos autorizados para o seu perfil e cursos delegados.
