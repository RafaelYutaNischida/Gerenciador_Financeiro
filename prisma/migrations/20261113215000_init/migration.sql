-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "movement_type" AS ENUM ('income', 'expense');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "type" "movement_type" NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "description" VARCHAR(120) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "movement_date" DATE NOT NULL,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_type_key" ON "categories"("name", "type");

-- CreateIndex
CREATE INDEX "movements_user_date_idx" ON "movements"("user_id", "movement_date" DESC);

-- CreateIndex
CREATE INDEX "movements_category_id_idx" ON "movements"("category_id");

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce non-empty labels and positive monetary amounts at the database layer.
ALTER TABLE "users" ADD CONSTRAINT "users_name_not_empty_check" CHECK (char_length(btrim("name")) > 0);
ALTER TABLE "users" ADD CONSTRAINT "users_email_not_empty_check" CHECK (char_length(btrim("email")) > 0);
ALTER TABLE "categories" ADD CONSTRAINT "categories_code_not_empty_check" CHECK (char_length(btrim("code")) > 0);
ALTER TABLE "categories" ADD CONSTRAINT "categories_name_not_empty_check" CHECK (char_length(btrim("name")) > 0);
ALTER TABLE "movements" ADD CONSTRAINT "movements_description_not_empty_check" CHECK (char_length(btrim("description")) > 0);
ALTER TABLE "movements" ADD CONSTRAINT "movements_amount_positive_check" CHECK ("amount" > 0);

-- Fixed categories shared by all users in the MVP.
INSERT INTO "categories" ("id", "code", "name", "type") VALUES
    ('00000000-0000-4000-8000-000000000001', 'salary', 'Salário', 'income'),
    ('00000000-0000-4000-8000-000000000002', 'freelance', 'Freelance', 'income'),
    ('00000000-0000-4000-8000-000000000003', 'investments', 'Investimentos', 'income'),
    ('00000000-0000-4000-8000-000000000004', 'other-income', 'Outros', 'income'),
    ('00000000-0000-4000-8000-000000000005', 'housing', 'Moradia', 'expense'),
    ('00000000-0000-4000-8000-000000000006', 'food', 'Alimentação', 'expense'),
    ('00000000-0000-4000-8000-000000000007', 'transport', 'Transporte', 'expense'),
    ('00000000-0000-4000-8000-000000000008', 'health', 'Saúde', 'expense'),
    ('00000000-0000-4000-8000-000000000009', 'leisure', 'Lazer', 'expense'),
    ('00000000-0000-4000-8000-000000000010', 'other-expense', 'Outros', 'expense');
