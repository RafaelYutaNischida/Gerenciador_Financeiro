# FinTrack

Gerenciador financeiro pessoal para registrar receitas e despesas, acompanhar o saldo e visualizar resumos financeiros em um dashboard.

## Funcionalidades

- Cadastro, login e logout de usuários.
- CRUD de movimentações financeiras: receitas e despesas.
- Categorias predefinidas para cada tipo de movimentação.
- Dashboard com saldo acumulado, receitas e despesas do mês e balanço mensal.
- Filtro mensal e gráficos de fluxo de caixa dos últimos 6 ou 12 meses e despesas por categoria.
- Busca textual e filtros por tipo e período na lista de movimentações.
- Interface responsiva para desktop, tablet e celular.
- Dados isolados por usuário autenticado.

## Tecnologias

- Next.js 16 e React 19
- TypeScript 5
- PostgreSQL
- Prisma ORM 7
- Vitest

## Como funciona

O navegador usa a interface do Next.js e suas rotas de API. As rotas autenticam as requisições e acessam o PostgreSQL pelo Prisma. Os valores enviados pela API são representados em centavos inteiros; o banco armazena valores monetários em `DECIMAL(12,2)`.

O saldo não é armazenado como um valor separado: ele é calculado a partir das movimentações. O saldo acumulado até hoje é diferente do balanço do mês selecionado.

### Principais rotas da API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/register` | Criar uma conta |
| `POST` | `/api/auth/login` | Iniciar uma sessão |
| `GET` | `/api/auth/session` | Consultar a sessão atual |
| `POST` | `/api/auth/logout` | Encerrar a sessão |
| `GET` / `POST` | `/api/movements` | Listar / cadastrar movimentações |
| `GET` / `PUT` / `DELETE` | `/api/movements/{id}` | Consultar / editar / excluir uma movimentação própria |
| `GET` | `/api/summary?month=AAAA-MM` | Consultar os indicadores financeiros |

Mais detalhes do modelo, relacionamentos e payloads estão em [docs/modelagem-do-banco.md](docs/modelagem-do-banco.md).

## Pré-requisitos

- Node.js 24.x
- npm
- PostgreSQL

## Instalação e execução local

Os comandos abaixo usam o PowerShell no Windows.

1. Clone o repositório e entre na pasta:

   ```powershell
   git clone https://github.com/RafaelYutaNischida/Gerenciador_Financeiro.git
   Set-Location Gerenciador_Financeiro
   ```

2. Instale as dependências:

   ```powershell
   npm ci
   ```

3. Crie um banco PostgreSQL local e um usuário com acesso a ele. Copie o arquivo de exemplo:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Edite `.env` e ajuste `DATABASE_URL` para as credenciais do seu PostgreSQL. O formato esperado é:

   ```env
   DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/fintrack?schema=public"
   ```

   Use um banco local vazio para a primeira instalação. Não compartilhe nem versione o arquivo `.env`.

5. Aplique as migrações versionadas e gere o cliente Prisma:

   ```powershell
   npx prisma migrate deploy
   npm run db:generate
   ```

6. Inicie a aplicação:

   ```powershell
   npm run dev
   ```

   Acesse [http://localhost:3000](http://localhost:3000) e crie uma conta pela tela inicial.

### Migrações e observação sobre o banco

O histórico versionado contém uma migração legada que cria tabelas de limites, metas e vencimentos. Essas áreas não estão disponíveis na interface ou na API atual e seus modelos não fazem parte do `schema.prisma`. A migração é mantida para preservar o histórico já aplicado; em uma instalação limpa, ela também cria essas tabelas.

Para mudanças no schema durante o desenvolvimento, `npm run db:migrate` executa `prisma migrate dev` e pode gerar e aplicar migrações no banco configurado. Como o schema atual não modela as tabelas legadas mencionadas acima, o Prisma pode propor uma migração para removê-las. Faça backup e revise o SQL antes de aceitar qualquer remoção; não a aplique se houver dados que queira preservar.

## Testes e validações

```powershell
npm test
npx tsc --noEmit
npm run db:validate
npm run build
```

- `npm test`: testes unitários com Vitest.
- `npx tsc --noEmit`: verificação de tipos TypeScript.
- `npm run db:validate`: validação do schema Prisma.
- `npm run build`: build de produção do Next.js.

## Estrutura do projeto

```text
app/
  api/                 Rotas de autenticação, movimentações e resumo
  auth-screen.tsx      Telas de cadastro e login
  page.tsx             Dashboard e interface de movimentações
  globals.css          Estilos globais e responsivos
lib/
  auth.ts              Sessões e autenticação
  finance.ts           Cálculos financeiros
  movement-validation.ts
                       Validação de movimentações
  prisma.ts            Cliente Prisma
prisma/
  migrations/          Histórico de migrações SQL
  schema.prisma        Modelos atuais do banco
docs/
  modelagem-do-banco.md
                       Entidades, regras e documentação da API
```

## Capturas de tela

As capturas ainda não estão incluídas. Antes de adicioná-las ao portfólio, use uma conta demonstrativa e dados fictícios para não expor informações pessoais ou financeiras.

## Escopo e próximos passos

O MVP trabalha com uma única moeda (BRL) e não possui contas bancárias, cartões, saldo inicial, orçamentos, metas ou vencimentos disponíveis na aplicação. Essas funcionalidades podem ser consideradas em versões futuras, após definir os requisitos e a modelagem necessários.
