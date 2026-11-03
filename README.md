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

---

## Roteiro de apresentação das telas

Um caminho de cerca de **15 minutos** para mostrar o sistema, do convite até o Kanban.

### Antes de apresentar

Deixe preparado:

- Backend e frontend rodando.
- Três usuários ativos: **um ADMIN**, **um LIDER** e **um COLABORADOR** do mesmo setor, com o colaborador respondendo ao líder.
- Duas janelas do navegador: uma normal (ADMIN ou LIDER) e uma **anônima** (COLABORADOR). Assim dá para trocar de pessoa sem sair e entrar.

### 1. Login (1 min)

1. Abra o sistema e mostre a tela de login.
2. Explique que **não existe cadastro aberto**: só entra quem foi convidado com e-mail `@wiadupla.com`.
3. Entre como **ADMIN**.

### 2. Dashboard (1 min)

1. Mostre o resumo das entregas: quantas estão no prazo, em risco e atrasadas.
2. Aponte a barra lateral: **Atribuir** e **Lançar** no topo, e o menu dividido em Entregas, Projetos e Gestão.

### 3. Equipe e convite (3 min)

1. Abra **Equipe** e mostre os cartões dos membros.
2. Clique em **Convidar Membro**: nome, e-mail institucional, papel, setor e **Responde a**.
3. Explique o fluxo: a pessoa recebe um e-mail com um link que vale 48 horas e cria a própria senha. Ninguém conhece a senha dela.
4. Clique num membro para abrir **Gerenciar membro** e mostre:
   - o campo **Responde a**, que monta o organograma;
   - a confirmação para desativar ("digite DESATIVAR");
   - o botão de **redefinição de senha**.

### 4. Atribuir uma entrega (2 min)

1. Saia e entre como **LIDER** (ou continue como ADMIN).
2. Clique em **Atribuir**:
   - escolha o setor e o responsável;
   - dê um título e um prazo;
   - escolha **5 etapas** e preencha o título e o prazo de cada uma.
3. Salve e abra **Entregas da equipe**: a entrega aparece com a situação **No prazo**.

### 5. Lançar o avanço (2 min)

1. Na janela anônima, entre como **COLABORADOR**.
2. Mostre que o menu é menor: ele não vê Equipe, Relatórios nem Configurações.
3. Abra **Minhas entregas**: a entrega recém-atribuída aparece entre as **pendentes**.
4. Clique em **Lançar**, escolha a entrega e uma etapa, e preencha **o que foi feito** e **o que faltou**.
5. A barra de progresso vai para **20%**. Abra a entrega e mostre o **histórico** com o lançamento.
6. Volte à janela do LIDER e atualize **Entregas da equipe**: o progresso também aparece lá.

### 6. Projetos e Kanban (4 min)

1. Como **ADMIN** ou **LIDER**, abra **Projetos** e clique em **Novo Projeto**:
   - escolha o setor; o responsável principal e os responsáveis das etapas passam a mostrar só pessoas desse setor;
   - escolha **5 etapas** e coloque o **COLABORADOR** como responsável de uma delas.
2. Clique no projeto para abrir o **quadro Kanban**.
3. Arraste uma etapa para **Em andamento** e outra para **Concluído**: o progresso vai para **20%**.
4. Clique num cartão e altere o prazo para mostrar a edição.
5. Na janela do **COLABORADOR**, abra **Projetos**:
   - ele vê **só os projetos em que participa**;
   - o cartão dele aparece destacado como **"Você"**, e só esse cartão pode ser movido.

### 7. Relatórios (1 min)

1. Como **LIDER** ou **ADMIN**, abra **Relatórios**.
2. Mostre a pontualidade da equipe e a exportação em **CSV**.

### Fechamento

Reforce três pontos:

- **Cada pessoa vê só o que precisa**, e essas regras são garantidas pelo servidor.
- **Tudo tem prazo e histórico**: dá para saber o que foi feito, o que faltou e quando.
- **Entregas e projetos se complementam**: o dia a dia de cada pessoa e as iniciativas maiores no mesmo lugar.

---

## Segurança

- Senhas guardadas com **bcrypt**; ninguém, nem o ADMIN, consegue ver a senha de outra pessoa.
- Sessão em **cookie httpOnly**, inacessível ao JavaScript da página, que expira em 8 horas.
- **Limite de tentativas** de login (5 a cada 15 minutos).
- Ao trocar a senha, as sessões antigas deixam de valer.
- Links de convite e de redefinição de senha são **de uso único**, expiram e ficam guardados só como hash.
- Toda entrada de dados é validada no backend (Zod).
- O sistema sempre mantém **pelo menos um ADMIN ativo**, e ninguém pode alterar o próprio papel.
- Segredos ficam só no `server/.env`, fora do Git.

---

## Situação atual e próximos passos

### Pronto

- [x] Login, sessão e permissões por perfil
- [x] Convites por e-mail (Brevo) e redefinição de senha
- [x] Entregas com etapas, Lançar e histórico
- [x] Projetos com etapas e quadro Kanban
- [x] Projetos visíveis para o colaborador (só os que participa)
- [x] Campo **Responde a** (gestor direto) na edição de membro e no convite

### Em andamento

- [ ] Regras de visibilidade pelo **organograma** ("quem está abaixo de mim") em vez do setor
- [ ] Menu mostrando os itens de líder para quem tem equipe

### Futuro

- [ ] "Esqueci minha senha" na tela de login
- [ ] Etapas de projeto aparecendo em "Minhas entregas"
- [ ] Registro de auditoria (quem fez o quê)
- [ ] Verificação em duas etapas (MFA) para administradores
- [ ] Publicação em `wiaflow.wiadupla.com` (VPS Hostinger, Nginx, HTTPS, PM2)
