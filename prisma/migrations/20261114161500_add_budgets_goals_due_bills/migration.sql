CREATE TYPE "due_bill_status" AS ENUM ('pending', 'paid');

CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "year" SMALLINT NOT NULL,
    "month" SMALLINT NOT NULL,
    "limit_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_goals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "target_amount" DECIMAL(12,2) NOT NULL,
    "current_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "target_date" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_goals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "due_bills" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "description" VARCHAR(120) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "due_bill_status" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "due_bills_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "movements"
ADD COLUMN "due_bill_id" UUID;

CREATE UNIQUE INDEX "budgets_user_category_period_key"
ON "budgets"("user_id", "category_id", "year", "month");
CREATE INDEX "budgets_user_period_idx"
ON "budgets"("user_id", "year", "month");
CREATE INDEX "financial_goals_user_created_idx"
ON "financial_goals"("user_id", "created_at" DESC);
CREATE INDEX "due_bills_user_status_due_date_idx"
ON "due_bills"("user_id", "status", "due_date");
CREATE UNIQUE INDEX "movements_due_bill_id_key"
ON "movements"("due_bill_id");

ALTER TABLE "budgets"
ADD CONSTRAINT "budgets_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "budgets"
ADD CONSTRAINT "budgets_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "categories"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_goals"
ADD CONSTRAINT "financial_goals_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "due_bills"
ADD CONSTRAINT "due_bills_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "due_bills"
ADD CONSTRAINT "due_bills_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "categories"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movements"
ADD CONSTRAINT "movements_due_bill_id_fkey"
FOREIGN KEY ("due_bill_id") REFERENCES "due_bills"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "budgets"
ADD CONSTRAINT "budgets_year_check" CHECK ("year" BETWEEN 1 AND 9999);
ALTER TABLE "budgets"
ADD CONSTRAINT "budgets_month_check" CHECK ("month" BETWEEN 1 AND 12);
ALTER TABLE "budgets"
ADD CONSTRAINT "budgets_limit_positive_check" CHECK ("limit_amount" > 0);
ALTER TABLE "financial_goals"
ADD CONSTRAINT "financial_goals_name_not_empty_check" CHECK (char_length(btrim("name")) > 0);
ALTER TABLE "financial_goals"
ADD CONSTRAINT "financial_goals_target_positive_check" CHECK ("target_amount" > 0);
ALTER TABLE "financial_goals"
ADD CONSTRAINT "financial_goals_current_nonnegative_check" CHECK ("current_amount" >= 0);
ALTER TABLE "due_bills"
ADD CONSTRAINT "due_bills_description_not_empty_check" CHECK (char_length(btrim("description")) > 0);
ALTER TABLE "due_bills"
ADD CONSTRAINT "due_bills_amount_positive_check" CHECK ("amount" > 0);
ALTER TABLE "due_bills"
ADD CONSTRAINT "due_bills_payment_state_check"
CHECK (
    ("status" = 'pending' AND "paid_at" IS NULL)
    OR ("status" = 'paid' AND "paid_at" IS NOT NULL)
);
