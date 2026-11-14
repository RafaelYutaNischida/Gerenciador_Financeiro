"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import AuthScreen, { type AuthenticatedUser } from "@/app/auth-screen";
import { apiRequest, apiRequestNoContent, ApiClientError } from "@/lib/client-api";
import {
  type DashboardSummary,
  calculateExpenseCategoryShares,
  calculateMonthlyCashFlow,
} from "@/lib/dashboard-summary";
import {
  formatCurrency,
  parseAmountToCents,
  type MovementType,
  type Transaction,
} from "@/lib/finance";

type Screen = "dashboard" | "transactions";
type Draft = Omit<Transaction, "id">;

const expenseChartColors = [
  "#536b83",
  "#7890a5",
  "#8d9a8f",
  "#657b75",
  "#a49b88",
  "#81879b",
  "#849eae",
  "#9a8d84",
  "#758b9b",
  "#a2aaa4",
];

const incomeCategories = ["Salário", "Freelance", "Investimentos", "Outros"];
const expenseCategories = [
  "Moradia",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Lazer",
  "Outros",
];

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

function shortMonthLabel(month: string): string {
  const [year, value] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
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
  user,
  onLogout,
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  onCreate: () => void;
  user: AuthenticatedUser;
  onLogout: () => void;
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
          <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div className="profile-copy">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <button className="profile-menu" onClick={onLogout}>
            Sair
          </button>
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
  loading = false,
}: {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  loading?: boolean;
}) {
  if (transactions.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon"><Icon name="arrows" size={24} /></span>
        <strong>
          {loading ? "Carregando movimentações..." : "Nenhuma movimentação por aqui"}
        </strong>
        {!loading && (
          <p>Experimente ajustar os filtros ou cadastre uma movimentação.</p>
        )}
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
  onSave: (draft: Draft, id?: string) => Promise<void>;
}) {
  const [type, setType] = useState<MovementType>(transaction?.type ?? "expense");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [amount, setAmount] = useState(
    transaction ? (transaction.amountCents / 100).toFixed(2) : "",
  );
  const [date, setDate] = useState(transaction?.date ?? todayDate());
  const categories = type === "income" ? incomeCategories : expenseCategories;
  const [category, setCategory] = useState(transaction?.category ?? categories[0]);
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
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
    setSaving(true);
    try {
      await onSave(
        {
          description: description.trim(),
          amountCents,
          type,
          date,
          category,
          notes,
        },
        transaction?.id,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar a movimentação.",
      );
    } finally {
      setSaving(false);
    }
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
            maxLength={120}
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

          <label className="field-label" htmlFor="notes">Observação (opcional)</label>
          <textarea
            id="notes"
            className="form-input form-textarea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            rows={3}
          />

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-footer">
            <button type="button" className="button button-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="button button-primary" disabled={saving}>
              {saving
                ? "Salvando..."
                : transaction
                  ? "Salvar alterações"
                  : "Adicionar movimentação"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MonthlyCashFlowChart({
  transactions,
  selectedMonth,
}: {
  transactions: Transaction[];
  selectedMonth: string;
}) {
  const [monthCount, setMonthCount] = useState<6 | 12>(6);
  const flow = useMemo(
    () => calculateMonthlyCashFlow(transactions, selectedMonth, monthCount),
    [transactions, selectedMonth, monthCount],
  );
  const maximumCents = Math.max(
    0,
    ...flow.flatMap((item) => [item.incomeCents, item.expenseCents]),
  );
  const hasActivity = maximumCents > 0;

  function barHeight(amountCents: number): string {
    if (amountCents === 0 || maximumCents === 0) {
      return "0%";
    }
    return `${Math.max((amountCents / maximumCents) * 100, 2)}%`;
  }

  return (
    <section className="content-card dashboard-panel" aria-labelledby="cash-flow-title">
      <div className="dashboard-panel-heading">
        <div>
          <h2 id="cash-flow-title">Fluxo de caixa</h2>
          <p>Receitas e despesas por mês</p>
        </div>
        <label className="filter-select chart-range-select">
          <span className="sr-only">Período do fluxo de caixa</span>
          <select
            value={monthCount}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (value === 6 || value === 12) {
                setMonthCount(value);
              }
            }}
          >
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
        </label>
      </div>

      <div className="chart-legend" aria-hidden="true">
        <span><i className="legend-income" /> Receitas</span>
        <span><i className="legend-expense" /> Despesas</span>
      </div>

      {hasActivity ? (
        <div className="cash-flow-scroll">
          <div
            className="cash-flow-chart"
            role="img"
            aria-label={`Comparação de receitas e despesas nos últimos ${monthCount} meses até ${monthLabel(selectedMonth)}.`}
            style={{ gridTemplateColumns: `repeat(${monthCount}, minmax(0, 1fr))` }}
          >
            {flow.map((item) => (
              <div className="cash-flow-month" key={item.month}>
                <div className="cash-flow-bars">
                  <span
                    className="cash-flow-bar cash-flow-income"
                    style={{ height: barHeight(item.incomeCents) }}
                    title={`${monthLabel(item.month)} — receitas: ${formatCurrency(item.incomeCents)}`}
                  />
                  <span
                    className="cash-flow-bar cash-flow-expense"
                    style={{ height: barHeight(item.expenseCents) }}
                    title={`${monthLabel(item.month)} — despesas: ${formatCurrency(item.expenseCents)}`}
                  />
                </div>
                <span className="cash-flow-month-label">{shortMonthLabel(item.month)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="dashboard-chart-empty">
          <strong>Sem movimentações neste período</strong>
          <span>Cadastre receitas ou despesas para visualizar o fluxo.</span>
        </div>
      )}
    </section>
  );
}

function ExpenseCategoryChart({
  transactions,
  selectedMonth,
}: {
  transactions: Transaction[];
  selectedMonth: string;
}) {
  const categories = useMemo(
    () => calculateExpenseCategoryShares(transactions, selectedMonth),
    [transactions, selectedMonth],
  );
  const totalCents = categories.reduce((total, item) => total + item.amountCents, 0);
  let currentPercentage = 0;
  const gradient = categories.length
    ? `conic-gradient(${categories
        .map((item, index) => {
          const start = currentPercentage;
          currentPercentage += item.percentage;
          const end = index === categories.length - 1 ? 100 : currentPercentage;
          const color = expenseChartColors[index % expenseChartColors.length];
          return `${color} ${start}% ${end}%`;
        })
        .join(", ")})`
    : "conic-gradient(#e9eeeb 0% 100%)";

  return (
    <section className="content-card dashboard-panel" aria-labelledby="category-chart-title">
      <div className="dashboard-panel-heading">
        <div>
          <h2 id="category-chart-title">Despesas por categoria</h2>
          <p>{monthLabel(selectedMonth)}</p>
        </div>
      </div>

      {categories.length > 0 ? (
        <div className="category-chart-content">
          <div
            className="expense-donut"
            role="img"
            aria-label={`Despesas por categoria em ${monthLabel(selectedMonth)}. Total: ${formatCurrency(totalCents)}.`}
            style={{ background: gradient }}
          >
            <div className="expense-donut-center">
              <span>Total</span>
              <strong>{formatCurrency(totalCents)}</strong>
            </div>
          </div>
          <ul className="category-legend">
            {categories.map((item, index) => (
              <li key={item.category}>
                <span
                  className="category-legend-swatch"
                  style={{ backgroundColor: expenseChartColors[index % expenseChartColors.length] }}
                  aria-hidden="true"
                />
                <span className="category-legend-name">{item.category}</span>
                <strong>{Math.round(item.percentage)}%</strong>
                <span className="category-legend-amount">{formatCurrency(item.amountCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="dashboard-chart-empty">
          <strong>Nenhuma despesa neste mês</strong>
          <span>As despesas cadastradas aparecerão aqui por categoria.</span>
        </div>
      )}
    </section>
  );
}

function DashboardAvailabilityPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="content-card dashboard-availability-panel">
      <div className="availability-panel-top">
        <span className="availability-indicator" aria-hidden="true">—</span>
        <span className="availability-label">Sem dados disponíveis</span>
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [authStatus, setAuthStatus] = useState<"loading" | "signed-out" | "ready">("loading");
  const [authUser, setAuthUser] = useState<AuthenticatedUser | null>(null);
  const [authError, setAuthError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      let session: { user: AuthenticatedUser };
      try {
        session = await apiRequest<{ user: AuthenticatedUser }>("/api/auth/session");
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiClientError && error.status === 401) {
          setAuthStatus("signed-out");
        } else {
          setAuthError(
            error instanceof Error
              ? error.message
              : "Não foi possível conectar ao servidor.",
          );
          setAuthStatus("signed-out");
        }
        setLoadingTransactions(false);
        return;
      }

      if (!active) return;
      setAuthUser(session.user);
      try {
        const result = await apiRequest<{ data: Transaction[] }>("/api/movements");
        if (active) {
          setTransactions(result.data);
          setLoadError("");
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as movimentações.",
          );
        }
      } finally {
        if (active) {
          setLoadingTransactions(false);
          setAuthStatus("ready");
        }
      }
    }

    void loadAccount();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (authStatus !== "ready") {
      return;
    }

    let active = true;
    setSummaryLoading(true);
    setSummaryError("");
    setDashboardSummary(null);

    async function loadSummary() {
      try {
        const result = await apiRequest<{ data: DashboardSummary }>(
          `/api/summary?month=${encodeURIComponent(selectedMonth)}`,
        );
        if (active) {
          setDashboardSummary(result.data);
        }
      } catch (error) {
        if (active) {
          setSummaryError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o resumo financeiro.",
          );
        }
      } finally {
        if (active) {
          setSummaryLoading(false);
        }
      }
    }

    void loadSummary();
    return () => {
      active = false;
    };
  }, [authStatus, selectedMonth, summaryRefreshKey]);

  const monthTransactions = useMemo(
    () => transactions.filter((item) => item.date.startsWith(selectedMonth)),
    [transactions, selectedMonth],
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

  function showNotice(message: string, isError = false) {
    setNotice(message);
    setNoticeIsError(isError);
    window.setTimeout(() => setNotice(""), 3000);
  }

  async function handleAuthenticated(user: AuthenticatedUser) {
    setAuthUser(user);
    setAuthStatus("ready");
    setAuthError("");
    setLoadingTransactions(true);
    try {
      const result = await apiRequest<{ data: Transaction[] }>("/api/movements");
      setTransactions(result.data);
      setLoadError("");
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as movimentações.",
      );
    } finally {
      setLoadingTransactions(false);
    }
  }

  async function reloadTransactions() {
    setLoadingTransactions(true);
    setLoadError("");
    try {
      const result = await apiRequest<{ data: Transaction[] }>("/api/movements");
      setTransactions(result.data);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as movimentações.",
      );
    } finally {
      setLoadingTransactions(false);
    }
  }

  async function logout() {
    try {
      await apiRequestNoContent("/api/auth/logout", { method: "POST" });
      setAuthUser(null);
      setTransactions([]);
      setDashboardSummary(null);
      setAuthStatus("signed-out");
      setAuthError("");
    } catch (error) {
      showNotice(
        error instanceof Error ? error.message : "Não foi possível sair da conta.",
        true,
      );
    }
  }

  function openCreateForm() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEditForm(transaction: Transaction) {
    setEditing(transaction);
    setFormOpen(true);
  }

  async function saveTransaction(draft: Draft, id?: string) {
    const result = await apiRequest<{ data: Transaction }>(
      id ? `/api/movements/${id}` : "/api/movements",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(draft),
      },
    );

    setTransactions((current) =>
      id
        ? current.map((item) => item.id === id ? result.data : item)
        : [result.data, ...current],
    );
    setSummaryRefreshKey((current) => current + 1);
    setFormOpen(false);
    showNotice(id ? "Movimentação atualizada." : "Movimentação adicionada.");
  }

  async function deleteTransaction(transaction: Transaction) {
    const confirmed = window.confirm(
      `Excluir "${transaction.description}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    try {
      await apiRequestNoContent(`/api/movements/${transaction.id}`, {
        method: "DELETE",
      });
      setTransactions((current) =>
        current.filter((item) => item.id !== transaction.id),
      );
      setSummaryRefreshKey((current) => current + 1);
      showNotice("Movimentação excluída.");
    } catch (error) {
      showNotice(
        error instanceof Error ? error.message : "Não foi possível excluir a movimentação.",
        true,
      );
    }
  }

  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  if (authStatus === "loading") {
    return (
      <main className="auth-page">
        <p className="auth-loading" role="status">Conectando à sua conta...</p>
      </main>
    );
  }

  if (authStatus === "signed-out" || !authUser) {
    return (
      <AuthScreen
        initialError={authError}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        screen={screen}
        onNavigate={setScreen}
        onCreate={openCreateForm}
        user={authUser}
        onLogout={logout}
      />
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
            <span className="topbar-avatar">{authUser.name.charAt(0).toUpperCase()}</span>
            <button className="logout-button" onClick={logout}>Sair</button>
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
          {loadError && (
            <div className="error-banner" role="alert">
              <span>{loadError}</span>
              <button onClick={reloadTransactions}>Tentar novamente</button>
            </div>
          )}
          {screen === "dashboard" && summaryError && (
            <div className="error-banner" role="alert">
              <span>{summaryError}</span>
              <button onClick={() => setSummaryRefreshKey((current) => current + 1)}>
                Tentar novamente
              </button>
            </div>
          )}
          {screen === "dashboard" ? (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow">{today}</p>
                  <h1>Olá, {authUser.name.split(" ")[0]} <span className="wave">✦</span></h1>
                  <p className="page-description">Aqui está o resumo das suas finanças.</p>
                </div>
                <button className="button button-primary" onClick={openCreateForm}>
                  <Icon name="plus" size={18} /> Nova movimentação
                </button>
              </section>

              <div className="section-toolbar">
                <div>
                  <h2>Resumo financeiro</h2>
                  <p>Movimentações registradas; sem separação por conta ou cartão.</p>
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

              <section className="summary-grid" aria-label="Resumo financeiro">
                <article className="summary-card balance-card">
                  <div className="summary-card-top">
                    <span className="summary-label">Saldo atual</span>
                    <span className="summary-icon balance-icon">R$</span>
                  </div>
                  <strong className="summary-value">
                    {dashboardSummary
                      ? formatCurrency(dashboardSummary.currentBalanceCents)
                      : summaryLoading
                        ? "Carregando..."
                        : "—"}
                  </strong>
                  <span className="summary-caption">Movimentações até hoje</span>
                  <span className="balance-decoration" aria-hidden="true">↗</span>
                </article>
                <article className="summary-card">
                  <div className="summary-card-top">
                    <span className="summary-label">Receitas do mês</span>
                    <span className="summary-icon income-icon">↓</span>
                  </div>
                  <strong className="summary-value">
                    {dashboardSummary
                      ? formatCurrency(dashboardSummary.monthlyIncomeCents)
                      : summaryLoading
                        ? "Carregando..."
                        : "—"}
                  </strong>
                  <span className="summary-caption">{monthLabel(selectedMonth)}</span>
                </article>
                <article className="summary-card">
                  <div className="summary-card-top">
                    <span className="summary-label">Despesas do mês</span>
                    <span className="summary-icon expense-icon">↑</span>
                  </div>
                  <strong className="summary-value">
                    {dashboardSummary
                      ? formatCurrency(dashboardSummary.monthlyExpenseCents)
                      : summaryLoading
                        ? "Carregando..."
                        : "—"}
                  </strong>
                  <span className="summary-caption">{monthLabel(selectedMonth)}</span>
                </article>
                <article className="summary-card monthly-balance-card">
                  <div className="summary-card-top">
                    <span className="summary-label">Saldo do mês</span>
                    <span className="summary-icon monthly-balance-icon">=</span>
                  </div>
                  <strong className="summary-value">
                    {dashboardSummary
                      ? formatCurrency(dashboardSummary.monthlyBalanceCents)
                      : summaryLoading
                        ? "Carregando..."
                        : "—"}
                  </strong>
                  <span className="summary-caption">
                    Receitas menos despesas · {monthLabel(selectedMonth)}
                  </span>
                </article>
              </section>

              <section className="dashboard-charts-grid" aria-label="Análises financeiras">
                <MonthlyCashFlowChart
                  transactions={transactions}
                  selectedMonth={selectedMonth}
                />
                <ExpenseCategoryChart
                  transactions={transactions}
                  selectedMonth={selectedMonth}
                />
              </section>

              <section
                className="dashboard-availability-grid"
                aria-label="Orçamentos, metas e vencimentos"
              >
                <DashboardAvailabilityPanel
                  title="Limites de gastos"
                  description="O cadastro de orçamentos por categoria ainda não existe, então não há limites para comparar."
                />
                <DashboardAvailabilityPanel
                  title="Metas financeiras"
                  description="Metas de reserva ou quitação ainda não são cadastradas no FinTrack."
                />
                <DashboardAvailabilityPanel
                  title="Próximos vencimentos"
                  description="As movimentações têm data de registro, mas ainda não possuem data de vencimento."
                />
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
                  loading={loadingTransactions}
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
                  loading={loadingTransactions}
                />
              </section>
            </>
          )}
          <footer className="page-footer">
            <span>FinTrack <span aria-hidden="true">·</span> Seu dinheiro, com mais clareza.</span>
            <span className="temporary-note">Movimentações salvas na sua conta.</span>
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
      {notice && (
        <div className={`toast${noticeIsError ? " toast-error" : ""}`} role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
