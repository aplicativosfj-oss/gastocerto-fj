import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarClock,
  HandCoins,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { FeatureGate } from "@/components/finance/feature-gate";
import { CommitmentDialog } from "@/components/finance/commitment-dialog";
import { CommitmentEntriesDialog } from "@/components/finance/commitment-entries-dialog";
import { CommitmentScheduleDialog } from "@/components/finance/commitment-schedule-dialog";
import { Badge } from "@/components/ui/badge";
import { NextDueQuickEdit } from "@/components/finance/next-due-quick-edit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { MONTH_NAMES, labelFor, monthRange } from "@/lib/finance";
import { useTransactions } from "@/lib/transactions";
import {
  COMMITMENT_STATUS,
  COMMITMENT_TYPES,
  commitmentTypeLabel,
  summarizeAll,
  useCommitmentEntries,
  useCommitments,
  useDeleteCommitment,
  type Commitment,
  type CommitmentEntry,
  type CommitmentSummary,
} from "@/lib/commitments";
import {
  buildCommitmentReminders,
  buildSchedule,
  monthlyCommitmentImpact,
} from "@/lib/commitment-schedule";
import { useNotificationPreferences, useSyncNotifications } from "@/lib/notifications";


const TITLE = "Compromissos e dívidas — GastoCerto";
const DESCRIPTION =
  "Controle financiamentos, fiado no comércio, açougue, empréstimos, cartão de crédito, compras a prazo e pensão alimentícia em um só lugar.";

export const Route = createFileRoute("/_authenticated/compromissos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompromissosPage,
});

function CompromissosPage() {
  const { data: commitments, isLoading } = useCommitments();
  const { data: entries } = useCommitmentEntries();
  const remove = useDeleteCommitment();

  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("open");
  const [editing, setEditing] = useState<Commitment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryTarget, setEntryTarget] = useState<string | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<string | null>(null);

  const { data: preferences } = useNotificationPreferences();
  const syncNotifications = useSyncNotifications();
  const daysBefore = preferences?.days_before_due ?? 5;
  const dueAlerts = preferences?.due_alerts ?? true;

  const summaries = useMemo(
    () => summarizeAll(commitments ?? [], entries ?? []),
    [commitments, entries],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return summaries.filter((item) => {
      if (type !== "all" && item.commitment.commitment_type !== type) return false;
      if (status !== "all" && item.commitment.status !== status) return false;
      if (!term) return true;
      return (
        item.commitment.name.toLowerCase().includes(term) ||
        (item.commitment.creditor ?? "").toLowerCase().includes(term) ||
        (item.commitment.notes ?? "").toLowerCase().includes(term)
      );
    });
  }, [summaries, search, status, type]);

  const totals = useMemo(() => {
    const open = summaries.filter((item) => item.commitment.status === "open");
    const outstanding = open.reduce((sum, item) => sum + item.outstanding, 0);
    const monthly = open.reduce(
      (sum, item) => sum + Number(item.commitment.installment_amount ?? 0),
      0,
    );
    const overdue = open.filter((item) => item.overdue);
    const soon = open.filter(
      (item) => !item.overdue && item.daysToDue !== null && item.daysToDue <= 7,
    );
    return { outstanding, monthly, overdue, soon, count: open.length };
  }, [summaries]);

  const entryTargetSummary = summaries.find((item) => item.commitment.id === entryTarget) ?? null;
  const scheduleTargetSummary =
    summaries.find((item) => item.commitment.id === scheduleTarget) ?? null;

  // Gera automaticamente os lembretes das parcelas (dias antes e atrasos).
  useEffect(() => {
    if (!commitments || !entries || !dueAlerts) return;
    const drafts = buildCommitmentReminders(commitments, entries, { daysBefore });
    if (drafts.length === 0) return;
    syncNotifications.mutate(drafts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitments, entries, daysBefore, dueAlerts]);

  return (
    <AppShell>
      <FeatureGate feature="commitments">
      <div className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Compromissos e dívidas</h1>
            <p className="text-sm text-muted-foreground">
              Financiamentos, fiado no comércio, açougue, empréstimos, cartão de crédito, compras a
              prazo, pensão alimentícia e outras saídas — com saldo devedor, parcelas e vencimentos.
            </p>
          </div>
          <Button
            size="sm"
            className="h-9"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 size-4" />
            Novo compromisso
          </Button>
        </header>

        <div className="auto-cards-sm grid gap-3">
          <MetricCard
            icon={Wallet}
            label="Saldo devedor total"
            value={formatCurrency(totals.outstanding)}
            tone="alert"
          />
          <MetricCard
            icon={HandCoins}
            label="Compromisso mensal"
            value={formatCurrency(totals.monthly)}
          />
          <MetricCard
            icon={Receipt}
            label="Compromissos ativos"
            value={String(totals.count)}
          />
          <MetricCard
            icon={AlertTriangle}
            label="Atrasados / a vencer"
            value={`${totals.overdue.length} / ${totals.soon.length}`}
            tone={totals.overdue.length > 0 ? "alert" : undefined}
          />
        </div>

        <MonthlyImpact
          commitments={commitments ?? []}
          entries={entries ?? []}
          daysBefore={daysBefore}
        />


        {totals.overdue.length > 0 || totals.soon.length > 0 ? (
          <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="size-4 text-amber-600" />
              Atenção aos vencimentos
            </p>
            <ul className="mt-1.5 space-y-1 text-xs">
              {[...totals.overdue, ...totals.soon].slice(0, 6).map((item) => (
                <li key={item.commitment.id} className="flex justify-between gap-2">
                  <span>
                    {item.commitment.name}
                    {item.nextDue ? ` · vence ${formatDate(item.nextDue)}` : ""}
                  </span>
                  <span className="tabular-nums font-medium">
                    {item.overdue
                      ? `atrasado ${Math.abs(item.daysToDue ?? 0)} dia(s)`
                      : `em ${item.daysToDue} dia(s)`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-xl border border-border bg-card p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, credor ou observação"
                className="pl-8"
                aria-label="Buscar compromisso"
              />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="sm:w-52" aria-label="Filtrar por tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {COMMITMENT_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="sm:w-40" aria-label="Filtrar por situação">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as situações</SelectItem>
                {COMMITMENT_STATUS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {isLoading ? (
          <div className="auto-cards-md grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-40 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum compromisso encontrado. Cadastre financiamentos, fiados, empréstimos, cartão de
            crédito, pensão alimentícia e outras saídas para acompanhar aqui.
          </p>
        ) : (
          <div className="auto-cards-md grid gap-3">
            {filtered.map((item) => (
              <CommitmentCard
                key={item.commitment.id}
                summary={item}
                entries={entries ?? []}
                daysBefore={daysBefore}
                onSchedule={() => setScheduleTarget(item.commitment.id)}
                onQuickDue={() => setDueTarget(item.commitment)}
                onEdit={() => {
                  setEditing(item.commitment);
                  setDialogOpen(true);
                }}
                onEntries={() => setEntryTarget(item.commitment.id)}
                onDelete={async () => {
                  try {
                    await remove.mutateAsync(item.commitment.id);
                    toast.success("Compromisso removido.");
                  } catch {
                    toast.error("Não foi possível remover.");
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      <CommitmentDialog commitment={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
      {dueTarget ? (
        <NextDueQuickEdit
          key={dueTarget.id}
          commitment={dueTarget}
          open
          onOpenChange={(next) => {
            if (!next) setDueTarget(null);
          }}
        />
      ) : null}
      <CommitmentScheduleDialog
        summary={scheduleTargetSummary}
        daysBefore={daysBefore}
        open={Boolean(scheduleTarget)}
        onOpenChange={(open) => (open ? null : setScheduleTarget(null))}
      />
      <CommitmentEntriesDialog
        summary={entryTargetSummary}
        open={Boolean(entryTarget)}
        onOpenChange={(open) => (open ? null : setEntryTarget(null))}
      />
    </FeatureGate>
    </AppShell>
  );
}

/**
 * Impacto dos compromissos no saldo do mês atual: quanto vence, quanto já foi
 * pago, quanto ainda vai sair do caixa e o peso sobre as receitas do mês.
 */
function MonthlyImpact({
  commitments,
  entries,
  daysBefore,
}: {
  commitments: Commitment[];
  entries: CommitmentEntry[];
  daysBefore: number;
}) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const range = useMemo(() => {
    const { start, end } = monthRange(year, month);
    return { start, end };
  }, [year, month]);
  const { data: transactions } = useTransactions(range);

  const impact = useMemo(
    () => monthlyCommitmentImpact(commitments, entries, { year, month, daysBefore }),
    [commitments, entries, year, month, daysBefore],
  );

  const income = (transactions ?? [])
    .filter((item) => item.transaction_type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = (transactions ?? [])
    .filter((item) => item.transaction_type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = income - expense;
  const share = income > 0 ? Math.min((impact.dueTotal / income) * 100, 100) : 0;

  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">
            Impacto no saldo de {MONTH_NAMES[month - 1]} de {year}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Parcelas com vencimento no mês, o que já foi pago e o que ainda vai sair do caixa.
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] tabular-nums">
          {impact.paidCount}/{impact.dueCount} parcelas pagas no mês
        </Badge>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <ImpactItem label="Vence no mês" value={formatCurrency(impact.dueTotal)} />
        <ImpactItem
          label="Já pago no mês"
          value={formatCurrency(impact.paidTotal)}
          tone="good"
        />
        <ImpactItem
          label="Ainda a pagar"
          value={formatCurrency(impact.pendingTotal)}
          tone="alert"
        />
        <ImpactItem
          label="Atrasado em aberto"
          value={formatCurrency(impact.overdueTotal)}
          tone={impact.overdueTotal > 0 ? "alert" : undefined}
        />
        <ImpactItem
          label="Saldo do mês após compromissos"
          value={formatCurrency(balance - impact.pendingTotal)}
          tone={balance - impact.pendingTotal < 0 ? "alert" : "good"}
        />
      </dl>

      {income > 0 ? (
        <>
          <Progress value={share} className="mt-2 h-1.5" />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Os compromissos consomem {share.toFixed(0)}% das receitas do mês (
            {formatCurrency(income)}).
          </p>
        </>
      ) : null}

      {impact.items.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs">
          {impact.items.slice(0, 6).map(({ commitment, installment, totalInstallments }) => (
            <li
              key={`${commitment.id}-${installment.number}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-2 py-1"
            >
              <span className="min-w-0 truncate">
                {commitment.name} · parcela {installment.number}/{totalInstallments}
              </span>
              <span className="flex items-center gap-2 tabular-nums">
                {formatDate(`${installment.dueDate}T12:00:00`)}
                <strong
                  className={
                    installment.status === "paid"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : installment.status === "overdue"
                        ? "text-destructive"
                        : ""
                  }
                >
                  {formatCurrency(installment.amount)}
                </strong>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Nenhuma parcela com vencimento neste mês.
        </p>
      )}
    </section>
  );
}

function ImpactItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "alert" | "good";
}) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-2">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={`text-sm font-semibold tabular-nums ${
          tone === "alert"
            ? "text-destructive"
            : tone === "good"
              ? "text-emerald-600 dark:text-emerald-400"
              : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function CommitmentCard({

  summary,
  entries,
  daysBefore,
  onEdit,
  onEntries,
  onSchedule,
  onQuickDue,
  onDelete,
}: {
  summary: CommitmentSummary;
  entries: CommitmentEntry[];
  daysBefore: number;
  onEdit: () => void;
  onEntries: () => void;
  onSchedule: () => void;
  onQuickDue: () => void;
  onDelete: () => void;
}) {
  const { commitment } = summary;
  const schedule = buildSchedule(commitment, entries, { daysBefore });
  return (
    <article className="flex flex-col rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{commitment.name}</h2>
          <p className="text-[11px] text-muted-foreground">
            {commitmentTypeLabel(commitment.commitment_type)}
            {commitment.creditor ? ` · ${commitment.creditor}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" className="size-8" aria-label="Editar" onClick={onEdit}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Excluir compromisso"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="secondary" className="text-[10px]">
          {labelFor(COMMITMENT_STATUS, commitment.status)}
        </Badge>
        {commitment.is_open_account ? (
          <Badge variant="outline" className="text-[10px]">
            conta aberta
          </Badge>
        ) : null}
        {summary.overdue ? (
          <Badge variant="destructive" className="text-[10px]">
            atrasado
          </Badge>
        ) : null}
        {commitment.installments_total ? (
          <>
            <Badge variant="outline" className="text-[10px] tabular-nums">
              {Math.max(
                Math.min(summary.paidInstallments, commitment.installments_total),
                commitment.installments_paid,
              )}
              /{commitment.installments_total} parcelas
            </Badge>
            <Badge variant="outline" className="text-[10px] tabular-nums">
              faltam{" "}
              {Math.max(
                commitment.installments_total -
                  Math.max(
                    Math.min(summary.paidInstallments, commitment.installments_total),
                    commitment.installments_paid,
                  ),
                0,
              )}
            </Badge>
          </>
        ) : null}
        {commitment.end_date ? (
          <Badge variant="outline" className="text-[10px]">
            termina em {formatDate(`${commitment.end_date}T12:00:00`)}
          </Badge>
        ) : null}
      </div>

      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-[10px] uppercase text-muted-foreground">Total</dt>
          <dd className="tabular-nums">{formatCurrency(summary.contracted)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase text-muted-foreground">Pago</dt>
          <dd className="tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.paid)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase text-muted-foreground">Devendo</dt>
          <dd className="font-semibold tabular-nums text-destructive">
            {formatCurrency(summary.outstanding)}
          </dd>
        </div>
      </dl>

      <Progress value={summary.progress} className="mt-2 h-1.5" />

      <p className="mt-2 text-[11px] text-muted-foreground">
        {schedule?.nextOpen
          ? `Parcela ${schedule.nextOpen.number} vence ${formatDate(`${schedule.nextOpen.dueDate}T12:00:00`)}`
          : summary.nextDue
            ? `Próximo vencimento: ${formatDate(summary.nextDue)}`
            : "Sem vencimento definido"}
        {commitment.installment_amount
          ? ` · parcela ${formatCurrency(Number(commitment.installment_amount))}`
          : ""}
      </p>

      <button
        type="button"
        onClick={onQuickDue}
        className="mt-2 w-full rounded-lg border border-dashed border-border px-2 py-1.5 text-left text-[11px] text-muted-foreground transition hover:border-primary hover:text-foreground"
      >
        Ajustar próximo vencimento e recalcular parcelas
      </button>

      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        <Button variant="outline" size="sm" className="h-8" onClick={onEntries}>
          <HandCoins className="mr-1.5 size-3.5" />
          Pagamentos
        </Button>
        {schedule ? (
          <Button variant="secondary" size="sm" className="h-8" onClick={onSchedule}>
            <CalendarClock className="mr-1.5 size-3.5" />
            Carnê ({schedule.paidCount}/{schedule.installments.length})
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone?: "alert";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${
          tone === "alert" ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
