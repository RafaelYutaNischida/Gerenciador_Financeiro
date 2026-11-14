"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  calculateSummary,
  formatCurrency,
  parseAmountToCents,
  type MovementType,
  type Transaction,
} from "@/lib/finance";

type Screen = "dashboard" | "transactions";
type Draft = Omit<Transaction, "id">;

const incomeCategories = ["Salário", "Freelance", "Investimentos", "Outros"];
const expenseCategories = [
  "Moradia",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Lazer",
  "Outros",
];

const initialTransactions: Transaction[] = [
  {
    id: "salary",
    description: "Salário",
    amountCents: 520000,
    type: "income",
    date: dateInCurrentMonth(5),
    category: "Salário",
  },
  {
    id: "rent",
    description: "Aluguel",
    amountCents: 180000,
    type: "expense",
    date: dateInCurrentMonth(7),
    category: "Moradia",
  },
  {
    id: "groceries",
    description: "Compras do mês",
    amountCents: 42570,
    type: "expense",
    date: dateInCurrentMonth(10),
    category: "Alimentação",
  },
  {
    id: "freelance",
    description: "Projeto freelance",
    amountCents: 140000,
    type: "income",
    date: dateInCurrentMonth(12),
    category: "Freelance",
  },
  {
    id: "internet",
    description: "Internet",
    amountCents: 9990,
    type: "expense",
    date: dateInCurrentMonth(16),
    category: "Moradia",
  },
];

function dateInCurrentMonth(day: number): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function todayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function monthLabel(month: string): string {
  const [year, value] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, value - 1, 1));
}

function Icon({
  name,
  size = 20,
}: {
  name: "grid" | "arrows" | "plus" | "search" | "close" | "edit" | "trash";
  size?: number;
}) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    arrows: (
      <>
        <path d="M7 7h13l-3-3" />
        <path d="M17 17H4l3 3" />
        <path d="M20 7l-3 3M4 17l3-3" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    close: <path d="m18 6-12 12M6 6l12 12" />,
    edit: (
      <>
        <path d="m15 5 4 4" />
        <path d="M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M10 11v6M14 11v6" />
        <path d="m6 7 1 13h10l1-13M9 7V4h6v3" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function Sidebar({
  screen,
  onNavigate,
  onCreate,
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  onCreate: () => void;
}) {
  return (
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="FinTrack, início">
        <span className="brand-mark">F</span>
        <span>fintrack<span className="brand-dot">.</span></span>
      </a>

      <div className="nav-caption">MENU PRINCIPAL</div>
      <nav className="main-nav" aria-label="Navegação principal">
        <button
          className={`nav-link ${screen === "dashboard" ? "active" : ""}`}
          onClick={() => onNavigate("dashboard")}
          aria-label="Visão geral"
          aria-current={screen === "dashboard" ? "page" : undefined}
        >
          <Icon name="grid" />
          <span>Visão geral</span>
        </button>
        <button
          className={`nav-link ${screen === "transactions" ? "active" : ""}`}
          onClick={() => onNavigate("transactions")}
          aria-label="Movimentações"
          aria-current={screen === "transactions" ? "page" : undefined}
        >
          <Icon name="arrows" />
          <span>Movimentações</span>
        </button>
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-tip">
          <span className="tip-icon">✦</span>
          <p>Pequenos passos hoje, mais tranquilidade amanhã.</p>
        </div>
        <div className="profile">
          <div className="avatar">A</div>
          <div className="profile-copy">
            <strong>Alex Silva</strong>
            <span>Conta pessoal</span>
          </div>
          <span className="profile-menu" aria-hidden="true">···</span>
        </div>
      </div>
      <button
        className="sidebar-create"
        onClick={onCreate}
        aria-label="Nova movimentação"
      >
        <Icon name="plus" size={18} />
        <span>Nova movimentação</span>
      </button>
    </aside>
  );
}

function TransactionTable({
  transactions,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  if (transactions.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon"><Icon name="arrows" size={24} /></span>
        <strong>Nenhuma movimentação por aqui</strong>
        <p>Experimente ajustar os filtros ou cadastre uma movimentação.</p>
      </div>
    );
  }

  return (
    <>
      <div className="transaction-table" role="table" aria-label="Movimentações">
        <div className="table-head" role="row">
          <span role="columnheader">DESCRIÇÃO</span>
          <span role="columnheader">CATEGORIA</span>
          <span role="columnheader">DATA</span>
          <span role="columnheader">VALOR</span>
          <span role="columnheader"><span className="sr-only">Ações</span></span>
        </div>
        {transactions.map((transaction) => (
          <div className="table-row" role="row" key={transaction.id}>
            <div className="transaction-name" role="cell">
              <span className={`transaction-icon ${transaction.type}`}>
                {transaction.type === "income" ? "↙" : "↗"}
              </span>
              <div>
                <strong>{transaction.description}</strong>
                <span>{transaction.type === "income" ? "Receita" : "Despesa"}</span>
              </div>
            </div>
            <span className="category-cell" role="cell">{transaction.category}</span>
            <span className="date-cell" role="cell">{formatDate(transaction.date)}</span>
            <strong className={`amount-cell ${transaction.type}`} role="cell">
              {transaction.type === "income" ? "+" : "−"}
              {formatCurrency(transaction.amountCents)}
            </strong>
            <div className="row-actions" role="cell">
              <button
                className="icon-button"
                onClick={() => onEdit(transaction)}
                aria-label={`Editar ${transaction.description}`}
              >
                <Icon name="edit" size={17} />
              </button>
              <button
                className="icon-button danger"
                onClick={() => onDelete(transaction)}
                aria-label={`Excluir ${transaction.description}`}
              >
                <Icon name="trash" size={17} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mobile-transactions">
        {transactions.map((transaction) => (
          <article className="mobile-transaction" key={transaction.id}>
            <div className="mobile-transaction-top">
              <span className={`transaction-icon ${transaction.type}`}>
                {transaction.type === "income" ? "↙" : "↗"}
              </span>
              <div className="mobile-transaction-name">
                <strong>{transaction.description}</strong>
                <span>{transaction.category} · {formatDate(transaction.date)}</span>
              </div>
              <strong className={`amount-cell ${transaction.type}`}>
                {transaction.type === "income" ? "+" : "−"}
                {formatCurrency(transaction.amountCents)}
              </strong>
            </div>
            <div className="mobile-actions">
              <button className="text-action" onClick={() => onEdit(transaction)}>
                <Icon name="edit" size={15} /> Editar
              </button>
              <button className="text-action danger-text" onClick={() => onDelete(transaction)}>
                <Icon name="trash" size={15} /> Excluir
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function MovementForm({
  transaction,
  onClose,
  onSave,
}: {
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (draft: Draft, id?: string) => void;
}) {
  const [type, setType] = useState<MovementType>(transaction?.type ?? "expense");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [amount, setAmount] = useState(
    transaction ? (transaction.amountCents / 100).toFixed(2) : "",
  );
  const [date, setDate] = useState(transaction?.date ?? todayDate());
  const categories = type === "income" ? incomeCategories : expenseCategories;
  const [category, setCategory] = useState(transaction?.category ?? categories[0]);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountCents = parseAmountToCents(amount);

    if (!description.trim()) {
      setError("Informe uma descrição para a movimentação.");
      return;
    }
    if (amountCents === null) {
      setError("Informe um valor maior que zero, com até duas casas decimais.");
      return;
    }
    if (!date) {
      setError("Informe a data da movimentação.");
      return;
    }

    setError("");
    onSave(
      {
        description: description.trim(),
        amountCents,
        type,
        date,
        category,
      },
      transaction?.id,
    );
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className="form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">MOVIMENTAÇÃO</span>
            <h2 id="form-title">{transaction ? "Editar lançamento" : "Novo lançamento"}</h2>
          </div>
          <button className="icon-button modal-close" onClick={onClose} aria-label="Fechar formulário">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          <div className="type-switch" aria-label="Tipo de movimentação">
            <button
              type="button"
              className={type === "expense" ? "selected expense-choice" : ""}
              onClick={() => {
                setType("expense");
                setCategory(expenseCategories[0]);
              }}
            >
              Despesa
            </button>
            <button
              type="button"
              className={type === "income" ? "selected income-choice" : ""}
              onClick={() => {
                setType("income");
                setCategory(incomeCategories[0]);
              }}
            >
              Receita
            </button>
          </div>

          <label className="field-label" htmlFor="description">Descrição</label>
          <input
            id="description"
            className="form-input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex.: Conta de energia"
            maxLength={80}
            autoFocus
          />

          <div className="form-grid">
            <div>
              <label className="field-label" htmlFor="amount">Valor (R$)</label>
              <input
                id="amount"
                className="form-input"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="date">Data</label>
              <input
                id="date"
                className="form-input"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>

          <label className="field-label" htmlFor="category">Categoria</label>
          <select
            id="category"
            className="form-input"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((option) => <option key={option}>{option}</option>)}
          </select>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-footer">
            <button type="button" className="button button-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="button button-primary">
              {transaction ? "Salvar alterações" : "Adicionar movimentação"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const monthTransactions = useMemo(
    () => transactions.filter((item) => item.date.startsWith(selectedMonth)),
    [transactions, selectedMonth],
  );
  const summary = useMemo(
    () => calculateSummary(monthTransactions),
    [monthTransactions],
  );
  const visibleTransactions = useMemo(
    () =>
      monthTransactions
        .filter((item) => typeFilter === "all" || item.type === typeFilter)
        .filter((item) =>
          `${item.description} ${item.category}`.toLocaleLowerCase("pt-BR")
            .includes(search.toLocaleLowerCase("pt-BR")),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [monthTransactions, search, typeFilter],
  );
  const recentTransactions = useMemo(
    () => [...monthTransactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [monthTransactions],
  );

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  }

  function openCreateForm() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEditForm(transaction: Transaction) {
    setEditing(transaction);
    setFormOpen(true);
  }

  function saveTransaction(draft: Draft, id?: string) {
    const nextTransaction: Transaction = {
      id: id ?? crypto.randomUUID(),
      description: draft.description,
      amountCents: draft.amountCents,
      type: draft.type,
      date: draft.date,
      category: draft.category,
    };

    setTransactions((current) =>
      id
        ? current.map((item) => item.id === id ? nextTransaction : item)
        : [nextTransaction, ...current],
    );
    setFormOpen(false);
    showNotice(id ? "Movimentação atualizada." : "Movimentação adicionada.");
  }

  function deleteTransaction(transaction: Transaction) {
    const confirmed = window.confirm(
      `Excluir "${transaction.description}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    setTransactions((current) => current.filter((item) => item.id !== transaction.id));
    showNotice("Movimentação excluída.");
  }

  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="app-shell">
      <Sidebar screen={screen} onNavigate={setScreen} onCreate={openCreateForm} />
      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">F</span>
            <span>fintrack<span className="brand-dot">.</span></span>
          </div>
          <div className="breadcrumb">
            <span>FinTrack</span><span className="breadcrumb-separator">/</span>
            <strong>{screen === "dashboard" ? "Visão geral" : "Movimentações"}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-badge"><span /> Demonstração</span>
            <span className="topbar-avatar">A</span>
          </div>
        </header>
        <nav className="mobile-nav" aria-label="Navegação principal">
          <button
            className={screen === "dashboard" ? "active" : ""}
            onClick={() => setScreen("dashboard")}
            aria-current={screen === "dashboard" ? "page" : undefined}
          >
            <Icon name="grid" size={18} />
            Visão geral
          </button>
          <button
            className={screen === "transactions" ? "active" : ""}
            onClick={() => setScreen("transactions")}
            aria-current={screen === "transactions" ? "page" : undefined}
          >
            <Icon name="arrows" size={18} />
            Movimentações
          </button>
          <button className="mobile-create" onClick={openCreateForm}>
            <span><Icon name="plus" size={18} /></span>
            Novo lançamento
          </button>
        </nav>

        <div className="page-content">
          {screen === "dashboard" ? (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">{today}</p>
                  <h1>Bom dia, Alex <span className="wave">✦</span></h1>
                  <p className="page-description">Aqui está o resumo das suas finanças.</p>
                </div>
                <button className="button button-primary" onClick={openCreateForm}>
                  <Icon name="plus" size={18} /> Nova movimentação
                </button>
              </section>

              <div className="section-toolbar">
                <div>
                  <h2>Resumo financeiro</h2>
                  <p>Uma visão clara do seu dinheiro</p>
                </div>
                <label className="month-picker">
                  <span className="sr-only">Selecionar mês do resumo</span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value || currentMonth())}
                  />
                </label>
              </div>

              <section className="summary-grid" aria-label="Resumo financeiro do período">
                <article className="summary-card balance-card">
                  <div className="summary-card-top">
                    <span className="summary-label">Saldo do período</span>
                    <span className="summary-icon balance-icon">R$</span>
                  </div>
                  <strong className="summary-value">{formatCurrency(summary.balanceCents)}</strong>
                  <span className="summary-caption">{monthLabel(selectedMonth)}</span>
                  <span className="balance-decoration" aria-hidden="true">↗</span>
                </article>
                <article className="summary-card">
                  <div className="summary-card-top">
                    <span className="summary-label">Receitas</span>
                    <span className="summary-icon income-icon">↓</span>
                  </div>
                  <strong className="summary-value">{formatCurrency(summary.incomeCents)}</strong>
                  <span className="summary-caption">Entradas no período</span>
                </article>
                <article className="summary-card">
                  <div className="summary-card-top">
                    <span className="summary-label">Despesas</span>
                    <span className="summary-icon expense-icon">↑</span>
                  </div>
                  <strong className="summary-value">{formatCurrency(summary.expenseCents)}</strong>
                  <span className="summary-caption">Saídas no período</span>
                </article>
              </section>

              <section className="content-card recent-card">
                <div className="card-heading">
                  <div>
                    <h2>Movimentações recentes</h2>
                    <p>Seus últimos lançamentos do período</p>
                  </div>
                  <button className="text-link" onClick={() => setScreen("transactions")}>
                    Ver todas <span aria-hidden="true">→</span>
                  </button>
                </div>
                <TransactionTable
                  transactions={recentTransactions}
                  onEdit={openEditForm}
                  onDelete={deleteTransaction}
                />
              </section>
            </>
          ) : (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">SEU HISTÓRICO</p>
                  <h1>Movimentações</h1>
                  <p className="page-description">Acompanhe e organize suas receitas e despesas.</p>
                </div>
                <button className="button button-primary" onClick={openCreateForm}>
                  <Icon name="plus" size={18} /> Nova movimentação
                </button>
              </section>

              <section className="content-card list-card">
                <div className="list-toolbar">
                  <div className="list-title">
                    <h2>Lançamentos</h2>
                    <span className="result-count">{visibleTransactions.length}</span>
                  </div>
                  <div className="filters">
                    <label className="search-field">
                      <Icon name="search" size={18} />
                      <span className="sr-only">Buscar movimentações</span>
                      <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar..."
                      />
                    </label>
                    <label className="filter-select">
                      <span className="sr-only">Filtrar por tipo</span>
                      <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                        <option value="all">Todos os tipos</option>
                        <option value="income">Receitas</option>
                        <option value="expense">Despesas</option>
                      </select>
                    </label>
                    <label className="month-picker list-month">
                      <span className="sr-only">Filtrar por mês</span>
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(event) => setSelectedMonth(event.target.value || currentMonth())}
                      />
                    </label>
                  </div>
                </div>
                <TransactionTable
                  transactions={visibleTransactions}
                  onEdit={openEditForm}
                  onDelete={deleteTransaction}
                />
              </section>
            </>
          )}
          <footer className="page-footer">
            <span>FinTrack <span aria-hidden="true">·</span> Seu dinheiro, com mais clareza.</span>
            <span className="temporary-note">Versão demonstrativa — dados não são salvos.</span>
          </footer>
        </div>
      </main>

      {formOpen && (
        <MovementForm
          transaction={editing}
          onClose={() => setFormOpen(false)}
          onSave={saveTransaction}
        />
      )}
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
