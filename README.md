# Sistema de Gestão de Entregas e Projetos

**Wiaflow** é o sistema interno da **WIADUPLA** para organizar o trabalho do dia a dia: quem faz o quê, até quando e em que pé está.

Ele tem dois módulos independentes, ambos ligados às pessoas responsáveis:

- **Entregas**: atividades do dia a dia, atribuídas a uma pessoa, com prazo e etapas.
- **Projetos**: iniciativas maiores, divididas em etapas e acompanhadas num quadro **Kanban**.

Repositório: <https://github.com/processosiawiadupla-ux/Sistema-de-Gest-o-de-Entregas-e-Projetos>

---

## Sumário

1. [Funcionalidades](#funcionalidades)
2. [Perfis e organograma](#perfis-e-organograma)
3. [Tecnologias](#tecnologias)
4. [Arquitetura](#arquitetura)
5. [Estrutura de pastas](#estrutura-de-pastas)
6. [Como rodar localmente](#como-rodar-localmente)
7. [Roteiro de apresentação das telas](#roteiro-de-apresentação-das-telas)
8. [Segurança](#segurança)
9. [Situação atual e próximos passos](#situação-atual-e-próximos-passos)

---

## Funcionalidades

### Entregas

- Atribuição de uma entrega a uma pessoa, com título, descrição, setor e prazo final.
- Divisão em **etapa única** (100%), **5 etapas** (20% cada) ou **10 etapas** (10% cada), cada etapa com título e prazo.
- As etapas podem ser concluídas **em qualquer ordem**, e quem decide a ordem é quem executa.
- **Lançar**: o responsável registra o avanço de uma etapa, informando **o que foi feito** e **o que faltou**.
- Histórico de lançamentos em cada entrega.
- Situação calculada automaticamente pelo prazo:

| Situação | Regra |
|---|---|
| No prazo | faltam mais de 3 dias |
| Em risco | vence em até 3 dias |
| Atrasado | o prazo já passou |
| Concluído | todas as etapas feitas dentro do prazo |
| Concluído com atraso | concluída depois do prazo |

### Projetos

- Cadastro com setor, responsável principal, datas, status e observações.
- O responsável principal é escolhido entre as pessoas do setor do projeto.
- Etapas (**única**, **5** ou **10**), cada uma com **título, prazo e responsável**.
- **Quadro Kanban** com três colunas: *A fazer*, *Em andamento* e *Concluído*.
  - Os cartões mudam de coluna **arrastando** ou pelas setas **← →**, que também funcionam no celular.
  - O progresso do projeto acompanha as etapas concluídas.
  - Clicando num cartão, o líder do projeto edita o título, o prazo ou o responsável da etapa.

### Equipe e acesso

- **Convite por e-mail institucional** (`@wiadupla.com`): a pessoa recebe um link de uso único, válido por 48 horas, para criar a própria senha.
- Edição de membro pelo ADMIN: nome, e-mail, papel, setor, **Responde a** (gestor direto) e acesso ativo ou inativo.
- **Redefinição de senha** enviada pelo ADMIN (link válido por 1 hora).
- E-mails enviados pelo **Brevo**, com o domínio `wiadupla.com` autenticado (SPF, DKIM e DMARC).

### Painel e relatórios

- **Dashboard** com o resumo das entregas.
- **Relatórios** com pontualidade da equipe e exportação em CSV.

---

## Perfis e organograma

O sistema separa três ideias:

| Pergunta | Quem responde |
|---|---|
| O que a pessoa pode configurar? | o **perfil** (ADMIN, LIDER, COLABORADOR) |
| Quem ela comanda? | o **organograma** (campo *Responde a*) |
| Onde ela trabalha? | o **setor** |

Exemplo de organograma:

```
Diretor
 ├─ Engenheira
 │   └─ Mestre de obras
 └─ Vendedora
```

A Engenheira recebe entregas do Diretor e, ao mesmo tempo, atribui entregas ao Mestre de obras.

### O que cada perfil faz hoje

| Ação | Colaborador | Líder | Admin |
|---|:---:|:---:|:---:|
| Ver e lançar as próprias entregas | ✅ | ✅ | ✅ |
| Atribuir entregas | — | ✅ (próprio setor) | ✅ |
| Ver entregas da equipe e relatórios | — | ✅ (próprio setor) | ✅ |
| Ver projetos | ✅ (os que participa) | ✅ (setor + os que participa) | ✅ (todos) |
| Mover cartões no Kanban | só as próprias etapas | ✅ (próprio setor) | ✅ |
| Criar, editar e excluir projetos | — | ✅ (próprio setor) | ✅ |
| Ver equipe e convidar | — | ✅ | ✅ |
| Editar membros e configurações | — | — | ✅ |

O **responsável principal** de um projeto, com qualquer perfil, também move todos os cartões e edita as etapas daquele projeto.

---

## Tecnologias

| Área | Linguagem | Principais tecnologias |
|---|---|---|
| Frontend | TypeScript, HTML, CSS | React 19, Vite, Tailwind CSS 3, TanStack Query 5, Axios, Lucide |
| Backend | TypeScript | Node.js, Express 5, Zod 4, JSON Web Token, bcrypt, Nodemailer |
| Banco de dados | SQL | PostgreSQL |
| E-mail | — | Brevo (SMTP) |

Ferramentas: **VS Code**, **Git** e **GitHub**.

---

## Arquitetura

Modelo cliente-servidor em três camadas:

```
Navegador (React)  →  Node/Express (API)  →  PostgreSQL
    interface           regras de negócio       dados
```

- O frontend **nunca acessa o banco diretamente**: tudo passa pela API.
- A API valida os dados (Zod) e aplica as permissões. **Quem decide o que cada pessoa pode fazer é o backend.** O frontend só esconde os botões que a pessoa não pode usar.
- Em desenvolvimento, o Vite encaminha as chamadas `/api` para `http://localhost:3001`.
- Em produção, o plano é um VPS na Hostinger com **Nginx** (HTTPS com Let's Encrypt) servindo o frontend e repassando `/api` para o backend, mantido no ar pelo **PM2**.

---

## Estrutura de pastas

```
wiaflow/
├── src/                      ← FRONTEND
│   ├── components/           layout (barra lateral)
│   ├── context/              usuário logado (AuthContext)
│   ├── features/             uma pasta por módulo
│   │   ├── auth/             login e criação de senha
│   │   ├── dashboard/        painel inicial
│   │   ├── deliveries/       entregas, Lançar, Atribuir
│   │   ├── projects/         projetos e quadro Kanban
│   │   ├── reports/          relatórios
│   │   ├── sectors/          setores
│   │   └── team/             equipe, convite e edição de membros
│   ├── lib/                  API, permissões e formatação
│   ├── services/             comunicação com a API
│   └── types/                tipos do TypeScript
│
└── server/                   ← BACKEND
    ├── schema.sql            estrutura do banco
    ├── .env.example          modelo de configuração (sem segredos)
    └── src/
        ├── auth/             login, sessão e permissões
        ├── config/           ambiente e conexão com o banco
        ├── mail/             envio de e-mails e modelos
        ├── routes/           endereços da API
        ├── schemas/          regras de validação
        └── scripts/          utilitários (criar admin, testar e-mail)
```

O frontend é organizado **por funcionalidade** (tudo de um módulo fica junto). O backend é organizado **por responsabilidade**.

---

## Como rodar localmente

### Pré-requisitos

- Node.js 22 ou mais recente
- PostgreSQL (com o pgAdmin, se quiser uma interface)
- Git

### 1. Clonar o repositório

```bash
git clone https://github.com/processosiawiadupla-ux/Sistema-de-Gest-o-de-Entregas-e-Projetos.git wiaflow
cd wiaflow
```

### 2. Banco de dados

Crie um banco vazio chamado `wiaflow_db`. As tabelas são criadas pelo `server/schema.sql`, que roda automaticamente quando o backend inicia.

### 3. Configurar o backend

```bash
cd server
npm install
```

Copie o `server/.env.example` para `server/.env` e preencha os valores:

| Variável | Para que serve |
|---|---|
| `JWT_SECRET` | segredo das sessões (32 caracteres ou mais) |
| `APP_URL` | endereço do sistema, usado nos links dos e-mails |
| `ALLOWED_EMAIL_DOMAIN` | domínio aceito nos convites (`wiadupla.com`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | envio de e-mails pelo Brevo |
| `MAIL_FROM` | remetente dos e-mails |
| conexão com o banco | conforme o `.env.example` |

> ⚠️ O arquivo `.env` contém senhas e **nunca deve ir para o Git**. Ele já está no `.gitignore`.
>
> Sem os dados de SMTP, o sistema funciona em **modo desenvolvimento**: os e-mails aparecem no terminal em vez de serem enviados.

### 4. Criar o primeiro administrador

Dentro de `server`:

```bash
npx tsx src/scripts/createAdmin.ts
```

### 5. Subir o sistema

Use **dois terminais**:

```bash
# Terminal 1, na pasta server: backend na porta 3001
npm run dev
```

```bash
# Terminal 2, na raiz: frontend na porta 5173
npm install
npm run dev
```

Acesse <http://localhost:5173>.

### Comandos úteis

| Comando | Onde | O que faz |
|---|---|---|
| `npx tsc --noEmit` | `server` | confere os tipos do backend |
| `npx tsc --noEmit -p tsconfig.app.json` | raiz | confere os tipos do frontend |
| `npx tsx src/scripts/testMail.ts email@exemplo.com` | `server` | envia um e-mail de teste |
| `npx tsx src/scripts/createUser.ts "Nome" email senha PAPEL "Setor"` | `server` | cria um usuário direto, para testes |
