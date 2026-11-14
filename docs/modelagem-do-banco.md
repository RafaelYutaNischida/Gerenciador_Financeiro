# FinTrack — modelagem do banco de dados

## Decisões do MVP

- PostgreSQL como banco relacional e Prisma como ORM.
- Uma única moeda (BRL); o valor não guarda um código de moeda por movimentação.
- Categorias predefinidas e compartilhadas entre os usuários. A primeira migração as cadastra.
- O saldo não é armazenado: é calculado a partir das movimentações do usuário e do período.
- Não há contas bancárias ou saldo inicial nesta versão.

## Entidades

### `users`

| Coluna | Tipo PostgreSQL | Nulo? | Regra |
|---|---|---:|---|
| `id` | `UUID` | Não | Chave primária, gerada pela aplicação |
| `name` | `VARCHAR(100)` | Não | Nome não pode ser vazio |
| `email` | `VARCHAR(254)` | Não | Único; a aplicação deve salvar em minúsculas |
| `password_hash` | `VARCHAR(255)` | Não | Hash da senha, nunca a senha em texto puro |
| `created_at` | `TIMESTAMPTZ(3)` | Não | Criado com o registro |
| `updated_at` | `TIMESTAMPTZ(3)` | Não | Atualizado pelo Prisma |

### `categories`

| Coluna | Tipo PostgreSQL | Nulo? | Regra |
|---|---|---:|---|
| `id` | `UUID` | Não | Chave primária |
| `code` | `VARCHAR(32)` | Não | Código estável e único, usado para identificar a categoria |
| `name` | `VARCHAR(60)` | Não | Nome exibido; único junto com `type` |
| `type` | `movement_type` | Não | `income` ou `expense` |

As categorias iniciais são Salário, Freelance, Investimentos e Outros para receitas; Moradia, Alimentação, Transporte, Saúde, Lazer e Outros para despesas.

### `movements`

| Coluna | Tipo PostgreSQL | Nulo? | Regra |
|---|---|---:|---|
| `id` | `UUID` | Não | Chave primária |
| `user_id` | `UUID` | Não | Chave estrangeira para `users.id` |
| `category_id` | `UUID` | Não | Chave estrangeira para `categories.id`; o tipo é obtido pela categoria |
| `description` | `VARCHAR(120)` | Não | Descrição não pode ser vazia |
| `amount` | `DECIMAL(12,2)` | Não | Valor positivo, com precisão exata de centavos |
| `movement_date` | `DATE` | Não | Dia da movimentação, sem horário/fuso |
| `notes` | `VARCHAR(500)` | Sim | Observação opcional |
| `created_at` | `TIMESTAMPTZ(3)` | Não | Instante em que o registro foi criado |
| `updated_at` | `TIMESTAMPTZ(3)` | Não | Instante da última alteração |

O enum `movement_type` limita os valores a `income` e `expense`.

## DER

```mermaid
erDiagram
    USERS ||--o{ MOVEMENTS : registra
    CATEGORIES ||--o{ MOVEMENTS : classifica

    USERS {
        UUID id PK
        VARCHAR name
        VARCHAR email UK
        VARCHAR password_hash
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    CATEGORIES {
        UUID id PK
        VARCHAR code UK
        VARCHAR name
        movement_type type
    }

    MOVEMENTS {
        UUID id PK
        UUID user_id FK
        UUID category_id FK
        VARCHAR description
        DECIMAL amount
        DATE movement_date
        VARCHAR notes
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }
```

O tipo da movimentação é o tipo de sua categoria. Assim, não há uma segunda coluna `type` em `MOVEMENTS` para ficar divergente; o backend filtra as categorias compatíveis com o tipo escolhido no formulário.

## Relacionamentos e cardinalidade

- **Usuário 1:N Movimentações:** um usuário pode não ter ou ter várias movimentações; cada movimentação pertence a exatamente um usuário. A exclusão do usuário remove suas movimentações (`ON DELETE CASCADE`).
- **Categoria 1:N Movimentações:** uma categoria pode classificar nenhuma ou várias movimentações; cada movimentação tem exatamente uma categoria. Uma categoria em uso não pode ser excluída (`ON DELETE RESTRICT`).
- Não existe relacionamento direto entre usuários e categorias: as categorias iniciais são compartilhadas.

## Normalização e integridade

O modelo atende à **3ª Forma Normal** para o escopo atual:

- Dados de autenticação ficam em `users`, os nomes e tipos das categorias em `categories`, e os lançamentos em `movements`.
- Cada movimentação guarda apenas as chaves das entidades relacionadas, não repete nome de usuário ou categoria.
- `type` fica em `categories`, onde define se aquele lançamento é receita ou despesa. As consultas fazem `JOIN` para filtrar e agregar pelo tipo.
- O saldo não é duplicado em uma coluna. Assim, uma edição ou exclusão não deixa um saldo armazenado desatualizado.

As restrições são aplicadas em mais de uma camada:

- `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE` e `NOT NULL` protegem identidade e relações.
- O enum limita os tipos de movimentação.
- A migração inicial adiciona `CHECK` para valor maior que zero e nomes/descrições não vazios.
- O backend ainda deve validar tamanho, formato de e-mail e categoria, além de normalizar e-mail para minúsculas.
- Toda leitura, edição ou exclusão de movimentação deve filtrar pelo `user_id` da sessão autenticada. Não se deve confiar em um `user_id` enviado livremente pelo navegador.
- A aplicação usa BRL em todo o MVP. Se moedas forem adicionadas futuramente, será necessário persistir a moeda e definir regras cambiais.

Os índices em `(user_id, movement_date)` e `category_id` atendem à listagem por período e às junções com categorias, mantendo as consultas sempre limitadas ao usuário autenticado.

## Consultas na aplicação

O Prisma deve ser a interface normal do backend para essas tabelas. SQL parametrizado é útil para entender as operações e para relatórios especializados; nunca concatene valores recebidos do usuário na string SQL.

### Listar por usuário, período e tipo opcional

```sql
SELECT
    m.id,
    m.description,
    c.type,
    m.amount,
    m.movement_date,
    c.name AS category
FROM movements AS m
JOIN categories AS c
  ON c.id = m.category_id
WHERE m.user_id = $1
  AND m.movement_date >= $2::date
  AND m.movement_date <= $3::date
  AND ($4::movement_type IS NULL OR c.type = $4::movement_type)
ORDER BY m.movement_date DESC, m.created_at DESC
LIMIT $5 OFFSET $6;
```

O primeiro e o último dia são incluídos. Para o dashboard mensal, `$2` é o primeiro dia do mês e `$3` é o último.

### Calcular receitas, despesas e saldo do período

```sql
SELECT
    COALESCE(SUM(m.amount) FILTER (WHERE c.type = 'income'), 0) AS income_total,
    COALESCE(SUM(m.amount) FILTER (WHERE c.type = 'expense'), 0) AS expense_total,
    COALESCE(SUM(m.amount) FILTER (WHERE c.type = 'income'), 0)
      - COALESCE(SUM(m.amount) FILTER (WHERE c.type = 'expense'), 0) AS balance
FROM movements AS m
JOIN categories AS c ON c.id = m.category_id
WHERE m.user_id = $1
  AND m.movement_date >= $2::date
  AND m.movement_date <= $3::date;
```

### Criar, editar e excluir

- **Create:** `INSERT` em `movements` com uma categoria do tipo escolhido.
- **Read:** `SELECT` por `user_id`, com filtros opcionais e ordenação por data.
- **Update:** `UPDATE ... WHERE id = $1 AND user_id = $2`; verificar se uma linha foi alterada.
- **Delete:** `DELETE ... WHERE id = $1 AND user_id = $2`, somente após confirmação do usuário.

No Prisma, essas operações correspondem a `create`, `findMany`, `updateMany` e `deleteMany`. Para o resumo, filtre `movement.category.type` para cada total e some `amount`. A resposta de edição/exclusão deve distinguir “registro não encontrado ou não pertence ao usuário” de sucesso.

## Arquivos da implementação

- `prisma/schema.prisma`: modelos, tipos e relacionamentos.
- `prisma/migrations/20261113215000_init/migration.sql`: criação das tabelas, restrições `CHECK` e categorias iniciais.
- `prisma.config.ts`: configuração do Prisma CLI.
- `.env.example`: formato local esperado para `DATABASE_URL`; não contém credenciais reais.
