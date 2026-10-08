# Guia de Contribuição — SGTCC

Bem-vindo ao repositório do **SGTCC (Sistema de Gestão de TCC)**! Este guia define as diretrizes, fluxos de trabalho e padrões arquiteturais para contribuir com o desenvolvimento do **Frontend** e do **Backend** da plataforma.

---

## 📌 Sumário
1. [Fluxo de Branches e Git](#-fluxo-de-branches-e-git)
2. [Configuração do Ambiente de Desenvolvimento](#-configuração-do-ambiente-de-desenvolvimento)
3. [Diretrizes de Desenvolvimento: Frontend](#-diretrizes-de-desenvolvimento-frontend)
4. [Diretrizes de Desenvolvimento: Backend](#-diretrizes-de-desenvolvimento-backend)
5. [Padrões de Nomenclatura e Commits](#-padrões-de-nomenclatura-e-commits)
6. [Passo a Passo Prático para Contribuir](#-passo-a-passo-prático-para-contribuir)
7. [Checklist antes de Abrir o Pull Request (PR)](#-checklist-antes-de-abrir-o-pull-request-pr)

---

## 🌿 Fluxo de Branches e Git

Adotamos um modelo simplificado baseado em GitFlow:

- **`main`**: **Branch de Produção / Entregas Oficiais**. Contém estritamente o código validado e finalizado para as datas das Sprints avaliadas pela disciplina. **Nunca faça commits diretos na `main`**.
- **`dev`**: **Branch de Integração Contínua**. É a branch principal de trabalho da equipe. Todo novo código entra aqui primeiro.
- **Branches de Feature/Fix**: Devem ser criadas sempre a partir da `dev` e reintegradas via Pull Request (PR).
  - Padrão: `feat/<nome-da-tarefa>` ou `fix/<nome-da-correcao>` (ex: `feat/rf01-login`, `feat/db-tcc-schema`, `fix/responsividade-tabela`).

---

## 💻 Configuração do Ambiente de Desenvolvimento

### Pré-requisitos
- **Node.js**: Versão 20.x ou superior (testado e validado em Node 25).
- **npm**: Gerenciador de pacotes padrão do Node.
- **Git**: Controle de versão.

### Clonar e Instalar Dependências
```powershell
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
Copie o modelo de variáveis de ambiente para o arquivo local (que é ignorado pelo Git):
```powershell
cp .env.example .env.local
```
Edite `.env.local` preenchendo as chaves do Firebase obtidas no Console do projeto:
- `NEXT_PUBLIC_FIREBASE_*`: Utilizadas no navegador (Frontend).
- `FIREBASE_*`: Utilizadas exclusivamente no servidor (Backend / Admin).

### Rodar o Servidor Local
```powershell
npm run dev
```
O projeto estará disponível em `http://localhost:3000`.

---

## 🎨 Diretrizes de Desenvolvimento: Frontend

O frontend é construído com **Next.js (App Router)**, **React 19**, **Tailwind CSS v4** e **shadcn/ui**.

### 1. Estrutura de Diretórios
```
src/
├── app/                  # Rotas e páginas do Next.js (App Router)
│   ├── layout.tsx        # Layout raiz da aplicação
│   ├── globals.css       # Tokens de tema e CSS Tailwind v4
│   ├── page.tsx          # Página inicial
│   ├── (auth)/           # Grupo de rotas públicas de autenticação (login, cadastro)
│   └── (dashboard)/      # Grupo de rotas autenticadas (aluno, orientador, coordenador)
├── components/           # Componentes reutilizáveis
│   ├── ui/               # Componentes do design system shadcn/ui (Button, Card, Input...)
│   └── layout/           # Componentes de navegação, sidebars, cabeçalhos
├── lib/                  # Utilitários globais e clientes de SDK
│   ├── utils.ts          # Utilitário de classes CSS (cn)
│   └── firebase/         # Módulos de inicialização
└── types/                # Tipos TypeScript do domínio (index.ts)
```

### 2. Padrões de Componentes UI (shadcn/ui)
- Prefira reutilizar os componentes em `src/components/ui/`.
- Para adicionar um novo componente oficial do shadcn/ui, execute:
  ```powershell
  npx shadcn@latest add <nome-do-componente>
  # Exemplo:
  npx shadcn@latest add dialog dropdown-menu table
  ```
- Use a biblioteca **`lucide-react`** para ícones.
- Garanta **responsividade** (RNF02 e US12-AC2):
  - Em telas menores (`sm:`, `md:`), tabelas devem se transformar em cards empilhados.
  - Utilize as classes do Tailwind (`hidden md:table`, `md:hidden flex flex-col gap-2`).

---

## ⚙️ Diretrizes de Desenvolvimento: Backend

O backend do SGTCC utiliza o ecossistema **Firebase** integrado ao Next.js (Server Actions e Route Handlers).

### 1. Modelagem e Tipagem
- **Todas as entidades e coleções** devem seguir a tipagem definida em [`src/types/index.ts`](file:///c:/Users/maxwe/Desktop/sgtcc/src/types/index.ts), que espelha os diagramas UML (`docs/classes.puml` e `docs/data.puml`):
  - `usuarios`
  - `alunos`
  - `professores_orientadores`
  - `professores_avaliadores`
  - `coordenadores`
  - `tccs`
  - `cronogramas`
  - `marcos_cronograma`
  - `entregas`
  - `versoes_arquivo`
  - `feedbacks`
  - `bancas_avaliacao`
  - `notificacoes`

### 2. Uso dos SDKs do Firebase
- **Client-Side** (`src/lib/firebase/config.ts`):
  - Utilize para operações de autenticação com o usuário atual (`auth.currentUser`), ouvintes de estado de login (`onAuthStateChanged`) e leituras permitidas por regras de segurança.
- **Server-Side / Admin** (`src/lib/firebase/admin.ts`):
  - Utilize em Server Actions (`"use server"`) ou rotas de API (`src/app/api/...`) para operações que exigem privilégios elevados, como criação em lote de usuários, atribuição de perfis com claims personalizadas (Custom Claims), ou validação estrita de prazos.

### 3. Regras de Negócio Críticas
- **RN02 (Imutabilidade de Histórico)**: Ao trocar de orientador, não delete ou altere registros de entregas e feedbacks anteriores.
- **RN05 & US13 (Fluxo Obrigatório)**: Um marco só pode ser concluído pelo orientador se tiver pelo menos uma submissão de arquivo do aluno.
- **US03 (Restrição de Arquivo)**: No upload de entregas, validar estritamente extensões `.pdf` e `.docx`.

---

## 🏷️ Padrões de Nomenclatura e Commits

Utilizamos o padrão **Conventional Commits**:
- `feat:` Nova funcionalidade (ex: `feat: tela de login institucional RF01`)
- `fix:` Correção de bug (ex: `fix: bloqueio de upload fora do prazo`)
- `docs:` Alterações na documentação (ex: `docs: atualiza instruções de setup`)
- `style:` Ajustes visuais ou de formatação que não alteram a lógica
- `refactor:` Refatoração de código
- `test:` Adição ou modificação de testes

---

## 🚀 Passo a Passo Prático para Contribuir

1. **Atualize sua branch local `dev`**:
   ```powershell
   git checkout dev
   git pull origin dev
   ```

2. **Crie uma branch específica para sua tarefa**:
   ```powershell
   git checkout -b feat/rf01-login-screen
   ```

3. **Desenvolva a funcionalidade**:
   - Mantenha o código limpo, tipado e com separação clara de responsabilidades.
   - Siga os Acceptance Criteria (AC) da User Story correspondente.

4. **Verifique se o build e tipagem estão passando**:
   ```powershell
   npm run build
   ```
   *Se o build falhar, corrija os erros de TypeScript antes de subir o código.*

5. **Commit e Push**:
   ```powershell
   git add .
   git commit -m "feat(auth): implementa tela de login e integracao com firebase auth"
   git push -u origin feat/rf01-login-screen
   ```

6. **Abra um Pull Request no GitHub**:
   - Direcione o PR para a branch base **`dev`** (e **não** para a `main`).
   - Descreva o que foi implementado e marque a User Story correspondente.
   - Peça revisão de ao menos um colega do grupo.

---

## ✅ Checklist antes de Abrir o Pull Request (PR)

- [ ] Estou na branch correta baseada na `dev`?
- [ ] O comando `npm run build` executou com sucesso (sem erros de TypeScript)?
- [ ] O `.env.local` **não** foi adicionado ao Git (verifique com `git status`)?
- [ ] Os componentes criados são responsivos (mobile, tablet e desktop)?
- [ ] As entidades utilizadas respeitam [`src/types/index.ts`](file:///c:/Users/maxwe/Desktop/sgtcc/src/types/index.ts)?
- [ ] Os critérios de aceitação (AC) da User Story foram testados manualmente?
