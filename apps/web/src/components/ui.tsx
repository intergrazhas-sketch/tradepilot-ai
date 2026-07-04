import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-line rounded-xl shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "default" | "profit" | "warn";
}) {
  const accentColor =
    accent === "profit" ? "text-profit-500" : accent === "warn" ? "text-warn-500" : "text-ink-900";
  return (
    <Card className="p-4">
      <div className="text-xs text-ink-500 mb-1.5">{label}</div>
      <div className={`text-2xl font-semibold ${accentColor}`}>{value}</div>
      {hint && <div className="text-xs text-ink-500 mt-1">{hint}</div>}
    </Card>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-profit-50 text-profit-500",
  draft: "bg-ink-300/20 text-ink-500",
  archived: "bg-ink-300/20 text-ink-500",
  paused: "bg-warn-50 text-warn-500",

  new: "bg-brand-50 text-brand-600",
  confirmed: "bg-brand-50 text-brand-600",
  supplier_ordered: "bg-warn-50 text-warn-500",
  delivered: "bg-profit-50 text-profit-500",
  cancelled: "bg-danger-50 text-danger-500",
  sent_to_supplier: "bg-warn-50 text-warn-500",
  shipped: "bg-warn-50 text-warn-500",
  completed: "bg-profit-50 text-profit-500",

  not_connected: "bg-ink-300/20 text-ink-500",
  planned: "bg-warn-50 text-warn-500",
  connected: "bg-profit-50 text-profit-500",

  reviewed: "bg-brand-50 text-brand-600",
  added_to_suppliers: "bg-profit-50 text-profit-500",
  rejected: "bg-danger-50 text-danger-500",
};

const STATUS_LABELS_RU: Record<string, string> = {
  active: "Активен",
  draft: "Черновик",
  archived: "Архив",
  paused: "Пауза",
  new: "Новый",
  confirmed: "Подтверждён",
  supplier_ordered: "У поставщика",
  delivered: "Доставлен",
  cancelled: "Отменён",
  sent_to_supplier: "У поставщика",
  shipped: "У поставщика",
  completed: "Доставлен",
  not_connected: "Не подключен",
  planned: "Запланирован",
  connected: "Подключен",

  reviewed: "Проверен",
  added_to_suppliers: "В поставщиках",
  rejected: "Отклонён",

  good: "Хороший",
  risk: "Риск",
  bad: "Плохой",
};

export function TestStatusBadge({ status, label }: { status: string; label?: string }) {
  const styles: Record<string, string> = {
    candidate: "bg-brand-50 text-brand-600",
    testing: "bg-warn-50 text-warn-500",
    rejected: "bg-danger-50 text-danger-500",
    none: "bg-ink-300/20 text-ink-500",
  };
  if (status === "none" || !status) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.none}`}>
      {label || status}
    </span>
  );
}

export function DecisionBadge({ status, label }: { status: string; label?: string }) {
  const styles: Record<string, string> = {
    good: "bg-profit-50 text-profit-500",
    risk: "bg-warn-50 text-warn-500",
    bad: "bg-danger-50 text-danger-500",
  };
  const fallback: Record<string, string> = {
    good: STATUS_LABELS_RU.good,
    risk: STATUS_LABELS_RU.risk,
    bad: STATUS_LABELS_RU.bad,
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-ink-300/20 text-ink-500"}`}>
      {label || fallback[status] || status}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || "bg-ink-300/20 text-ink-500";
  const label = STATUS_LABELS_RU[status] || status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const base = "inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-brand-500 text-white hover:bg-brand-600",
    secondary: "bg-canvas text-ink-700 border border-line hover:bg-line/40",
    ghost: "text-ink-700 hover:bg-canvas",
    danger: "bg-danger-50 text-danger-500 hover:bg-danger-50/70",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-canvas border border-line flex items-center justify-center mb-3">
        <svg className="w-5 h-5 text-ink-300" viewBox="0 0 24 24" fill="none">
          <path d="M4 7l8-4 8 4-8 4-8-4z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4 7v10l8 4 8-4V7" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </div>
      <div className="text-sm font-medium text-ink-700">{title}</div>
      {hint && <div className="text-xs text-ink-500 mt-1 max-w-xs">{hint}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-line border-t-brand-500 rounded-full animate-spin" />
    </div>
  );
}

export function Input({
  label,
  ...props
}: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-ink-700 mb-1">{label}</span>}
      <input
        {...props}
        className={`w-full px-3 py-2 rounded-lg border border-line bg-surface text-sm text-ink-900 placeholder:text-ink-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none ${props.className || ""}`}
      />
    </label>
  );
}

export function Textarea({
  label,
  ...props
}: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-ink-700 mb-1">{label}</span>}
      <textarea
        {...props}
        className={`w-full px-3 py-2 rounded-lg border border-line bg-surface text-sm text-ink-900 placeholder:text-ink-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none ${props.className || ""}`}
      />
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: { label?: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-ink-700 mb-1">{label}</span>}
      <select
        {...props}
        className={`w-full px-3 py-2 rounded-lg border border-line bg-surface text-sm text-ink-900 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none ${props.className || ""}`}
      >
        {children}
      </select>
    </label>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 px-4 py-3 rounded-lg bg-danger-50 text-danger-500 text-sm">
      Не удалось загрузить данные. Проверьте backend API. ({message})
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/30" onClick={onClose} />
      <div className="relative bg-surface rounded-xl shadow-card border border-line w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-semibold text-ink-900">{title}</h3>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
