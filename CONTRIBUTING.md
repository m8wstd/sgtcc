# Guia de Contribuição — SGTCC

Bem-vindo ao repositório do **SGTCC (Sistema de Gestão de TCC)**! Este guia define as diretrizes, fluxos de trabalho, boas práticas e padrões arquiteturais para contribuir com o desenvolvimento da plataforma.

---

## 📌 Sumário
1. [Fluxo de Branches e Git](#-fluxo-de-branches-e-git)
2. [Configuração do Ambiente de Desenvolvimento](#-configuração-do-ambiente-de-desenvolvimento)
3. [Diretrizes de Desenvolvimento: Frontend](#-diretrizes-de-desenvolvimento-frontend)
4. [Diretrizes de Desenvolvimento: Backend e APIs](#-diretrizes-de-desenvolvimento-backend-e-apis)
5. [Padrões de Nomenclatura e Commits](#-padrões-de-nomenclatura-e-commits)
6. [Testes e Qualidade de Código](#-testes-e-qualidade-de-código)
7. [Passo a Passo Prático para Contribuir](#-passo-a-passo-prático-para-contribuir)
8. [Checklist antes de Abrir o Pull Request (PR)](#-checklist-antes-de-abrir-o-pull-request-pr)

---

## 🌿 Fluxo de Branches e Git

Adotamos um modelo de branches baseado em GitFlow:

- **`main`**: **Branch de Produção / Entregas Oficiais**. Contém estritamente o código validado e estável. **Nunca faça commits diretos na `main`**.
- **`dev`**: **Branch de Integração Contínua**. É a branch principal de trabalho da equipe. Todo novo código entra aqui primeiro via Pull Request.
- **Branches de Feature/Fix**: Devem ser criadas sempre a partir da `dev`:
  - Features: `feat/<nome-da-tarefa>` (ex: `feat/painel-coordenacao`, `feat/chat-mobile`)
  - Correções de Bugs: `fix/<nome-da-correcao>` (ex: `fix/status-kanban`, `fix/mobile-aluno-overflow`)
  - Refatorações: `refactor/<nome-do-modulo>`

---

## 💻 Configuração do Ambiente de Desenvolvimento

### Pré-requisitos
- **Node.js**: Versão 20.x ou superior.
- **npm** (ou gerenciador compatível).
- **Git**: Controle de versão.
- Projeto configurado no **Firebase Console** (Auth + Firestore).
- Token de acesso ao **Vercel Blob Storage** (para upload e visualização de PDFs/documentos).

### Clonar e Instalar Dependências
```bash
# 1. Clone o repositório
git clone https://github.com/m8wstd/sgtcc.git

# 2. Acesse a pasta do projeto
cd sgtcc

# 3. Mude para a branch de desenvolvimento
git checkout dev

# 4. Instale os pacotes
npm install
```

### Configurar Variáveis de Ambiente
Crie ou edite o arquivo `.env.local` na raiz do projeto (este arquivo é ignorado pelo Git):
```env
# Firebase Admin (Credenciais de Servidor)
FIREBASE_PROJECT_ID="seu-projeto-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@seu-projeto.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Client (Exposto publicamente no browser)
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="seu-projeto.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="seu-projeto-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="seu-projeto.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# Vercel Blob Storage (Armazenamento de Arquivos)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# Sessão e Seed
SESSION_SECRET="uma-chave-secreta-longa-para-cookies-de-sessao"
SEED_PASSWORD="SenhaPadraoSeed123!"
```

### Popular o Banco de Dados com Dados de Demonstração (Seed)
O script de seed cria todas as coleções, usuários de teste de todas as personas (Aluno, Professor/Orientador/Avaliador, Coordenação, Admin) e gera PDFs de exemplo:
```bash
npm run seed
```

### Rodar o Servidor Local
```bash
npm run dev
```
O projeto estará disponível em `http://localhost:3000`.

---

## 🎨 Diretrizes de Desenvolvimento: Frontend

O frontend é construído com **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4** e **Base UI / shadcn/ui**.

### 1. Estrutura de Diretórios
```plaintext
src/
├── app/                  # Rotas e páginas do Next.js (App Router)
│   ├── api/              # Route Handlers protegidos (endpoints HTTP)
│   ├── cadastro/         # Cadastro via token de convite
│   ├── dashboard/        # Telas autenticadas agrupadas por persona
│   │   ├── admin/        # Gestão de usuários, convites e métricas
│   │   ├── aluno/        # Entregas, progresso e submissão final
│   │   ├── avaliador/    # Painel da banca examinadora (Kanban)
│   │   ├── coordenacao/  # Operações da coordenação (Novo TCC, alocações, bancas)
│   │   ├── cronograma/   # Visualização do cronograma de etapas
│   │   ├── mensagens/    # Chat de mensagens em tempo real
│   │   ├── orientador/   # Acompanhamento de orientandos (Kanban)
│   │   ├── professor/    # Dashboard unificado do professor (Orientações + Banca)
│   │   └── tcc/[id]/     # Detalhe do TCC, etapas, pareceres e sala de banca
│   ├── login/            # Tela de autenticação com credenciais
│   └── layout.tsx        # Layout raiz com fontes e tokens globais
├── components/           # Componentes reutilizáveis
│   ├── etapa/            # Componentes de submissão, upload e sala de banca
│   ├── layout/           # Header, FloatingHub responsivo e modais de topo
│   ├── tcc-view/         # Linha do tempo e visualização de etapas
│   └── ui/               # Componentes primitivos (StatCard, StatusPill, etc.)
├── lib/                  # Utilitários, regras de domínio e clientes de SDK
└── types/                # Interfaces TypeScript do sistema
```

### 2. Boas Práticas de UI e Responsividade
- **Mobile First e Semântica**:
  - Toda funcionalidade desenvolvida deve ser 100% responsiva (smartphones, tablets e desktop).
  - Evite que botões, selects ou tags estourem a largura da tela em dispositivos móveis (`max-w-full`, `min-w-0`, `truncate`).
  - Em telas menores, adote empilhamento limpo (`flex-col sm:flex-row`, `w-full sm:w-auto`).
- **Navegação**:
  - A navegação principal entre módulos e personas é gerenciada exclusivamente pelo **Hub Flutuante Inferior** (`FloatingHub`), estilizado em *Liquid Glass* responsivo.
  - Não crie menus e botões redundantes no cabeçalho superior que dupliquem abas do hub.
- **Ícones**:
  - Utilize estritamente a biblioteca **`lucide-react`**.
  - Respeite o mapeamento semântico de ícones por persona:
    - 🎓 **Aluno**: `GraduationCap`
    - 📖 **Orientador / Orientações**: `BookOpen`
    - 🏆 **Avaliador / Banca**: `Award`
    - 🗂️ **Coordenação**: `Layers`
    - 🛡️ **Administração**: `ShieldCheck`
- **Acessibilidade e Usabilidade**:
  - Não utilize dados falsos ou fantasmas (dados estáticos simulados onde deve haver integração real).
  - Feedbacks do professor e notas de banca devem ser funcionais e persistidos no banco.

---

## ⚙️ Diretrizes de Desenvolvimento: Backend e APIs

### 1. Modelagem e Tipagem de Dados
- Toda entidade do domínio deve respeitar as tipagens de [`src/types/index.ts`](file:///home/mw/Projects/sgtcc/src/types/index.ts).
- Principais coleções no Firestore:
  - `usuarios`: Informações de conta, e-mail, nome e perfil (`ALUNO`, `ORIENTADOR`, `AVALIADOR`, `COORDENACAO`, `ADMIN`).
  - `alunos`: Matrícula, curso e referência ao `usuario_id`.
  - `professores_orientadores` / `professores_avaliadores`: Cursos habilitados e referência ao `usuario_id`.
  - `coordenadores`: Cursos sob coordenação e referência ao `usuario_id`.
  - `tccs`: Projeto de TCC vinculado a `aluno_id` (e `alunos_ids` para múltiplos coautores), `orientador_id`, curso, fase (1 ou 2) e semestre.
  - `bancas_avaliacao`: Vínculo entre TCC e professor avaliador da banca.
  - `entregas`, `versoes_arquivo` e `feedbacks`: Histórico imutável de submissões e pareceres das etapas.
  - `notificacoes`: Alertas em tempo real enviados a usuários ou em lote.

### 2. Autenticação e Sessão
- **Sessão Segura**: Baseada em cookies HTTP-Only assinados e Custom Claims do Firebase Auth (`requireSessao`).
- **Controle de Acesso (RBAC)**:
  - Todo Route Handler (`src/app/api/...`) ou Server Component que manipula dados restritos deve validar o perfil da sessão antes de qualquer operação.
  - **Coordenação**: Só pode visualizar, criar TCCs e alocar bancas para os cursos que coordena.
  - **Professores**: Podem atuar tanto como Orientadores quanto como Avaliadores de Banca, navegando entre as abas correspondentes.
  - **Proteção Open Redirect**: Use sempre `destinoSeguro(next)` em fluxos de redirecionamento para aceitar apenas rotas internas do dashboard.

### 3. Upload de Arquivos
- Uploads de PDFs e materiais de apoio utilizam o **Vercel Blob Storage** (`@vercel/blob`).
- O backend valida a extensão do arquivo e armazena metadados (URL pública/privada, data, tamanho, número da versão) na coleção correspondente do Firestore.

---

## 🏷️ Padrões de Nomenclatura e Commits

Adotamos a especificação **Conventional Commits**:
- `feat:` Nova funcionalidade (ex: `feat(coordenacao): criacao de tcc com multiplos alunos`)
- `fix:` Correção de bug (ex: `fix(banca): alinhamento de filtros e remocao de texto redundante`)
- `docs:` Alterações em documentações (ex: `docs: atualiza README e CONTRIBUTING`)
- `refactor:` Refatoração de código sem alteração de comportamento
- `style:` Ajustes visuais ou de formatação que não alteram a lógica
- `test:` Adição ou modificação de testes automatizados

---

## 🧪 Testes e Qualidade de Código

Qualquer nova funcionalidade ou correção deve manter a suíte de testes íntegra e sem erros de tipagem.

```bash
# Executar a suíte de testes com Vitest
npm test

# Executar checagem estática de tipos TypeScript
npx tsc --noEmit

# Executar o linter
npm run lint
```

---

## 🚀 Passo a Passo Prático para Contribuir

1. **Sincronize sua branch `dev` local**:
   ```bash
   git checkout dev
   git pull origin dev
   ```

2. **Crie uma branch para sua tarefa**:
   ```bash
   git checkout -b feat/nome-da-sua-feature
   ```

3. **Desenvolva e teste localmente**:
   - Garanta a responsividade no mobile e desktop.
   - Escreva testes unitários/integração para regras de negócio novas.

4. **Valide a integridade do projeto**:
   ```bash
   npx tsc --noEmit
   npm test
   ```

5. **Commit e Push**:
   ```bash
   git add .
   git commit -m "feat(modulo): descricao clara da alteracao"
   git push -u origin feat/nome-da-sua-feature
   ```

6. **Abra o Pull Request no GitHub**:
   - Defina como branch de destino a **`dev`** (e nunca a `main`).
   - Preencha o template do PR explicando o que foi feito, instruções para teste e capturas de tela se houver mudança de interface.

---

## ✅ Checklist antes de Abrir o Pull Request (PR)

- [ ] A branch foi criada a partir da `dev` e tem um nome descritivo (`feat/`, `fix/`)?
- [ ] O comando `npx tsc --noEmit` executou com **0 erros** de TypeScript?
- [ ] O comando `npm test` passou com **100% de sucesso** em todos os testes?
- [ ] O arquivo `.env.local` está devidamente ignorado e **não** foi adicionado ao commit?
- [ ] A interface foi testada em resolução mobile (375px a 425px) e desktop?
- [ ] Não foram incluídos dados falsos/estáticos onde a integração real deve operar?
- [ ] O PR está apontando para a branch **`dev`**?
