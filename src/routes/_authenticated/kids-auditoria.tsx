import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Baby, Download, FileText, History, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PushAlertsCard } from "@/components/finance/push-alerts-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useDependents } from "@/lib/dependents";
import { isoDate } from "@/lib/finance";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  KIDS_AUDIT_ACTIONS,
  kidsAuditActionLabel,
  useClearKidsAudit,
  useKidsAuditLog,
} from "@/lib/kids-audit";
import { buildKidsReport, exportKidsReportCsv, exportKidsReportPdf } from "@/lib/kids-report";
import {
  useNotificationPreferences,
  useSaveNotificationPreferences,
} from "@/lib/notifications";
import { useTransactions } from "@/lib/transactions";

const TITLE = "Espaço Kids — histórico e relatórios | GastoCerto";
const DESCRIPTION =
  "Histórico completo das ações do Espaço Kids (mesada automática, conquistas, resgates e alertas) e exportação do relatório de cada criança em PDF ou CSV.";

export const Route = createFileRoute("/_authenticated/kids-auditoria")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KidsAuditPage,
});

function defaultFrom() {
  const date = new Date();
  date.setMonth(date.getMonth() - 5, 1);
  return isoDate(date);
}

function KidsAuditPage() {
  const { data: dependents } = useDependents();
  const [dependentFilter, setDependentFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(() => isoDate(new Date()));

  const { data: entries, isLoading } = useKidsAuditLog();
  const clearAudit = useClearKidsAudit();
  const { data: transactions } = useTransactions({ start: from, end: to });
  const { data: preferences } = useNotificationPreferences();
  const savePreferences = useSaveNotificationPreferences();

  const kids = dependents ?? [];

  const filtered = useMemo(() => {
    return (entries ?? []).filter((entry) => {
      if (dependentFilter !== "all" && entry.dependent_id !== dependentFilter) return false;
      if (actionFilter !== "all" && entry.action !== actionFilter) return false;
      const day = entry.created_at.slice(0, 10);
      return day >= from && day <= to;
    });
  }, [entries, dependentFilter, actionFilter, from, to]);

  const nameOf = (id: string | null) => {
    const found = kids.find((item) => item.id === id);
    return found ? found.nickname?.trim() || found.name : "Geral";
  };

  async function handleExport(dependentId: string, kind: "pdf" | "csv") {
    const dependent = kids.find((item) => item.id === dependentId);
    if (!dependent) return;
    const report = buildKidsReport(dependent, transactions ?? [], from, to);
    try {
      if (kind === "pdf") await exportKidsReportPdf(report);
      else exportKidsReportCsv(report);
      toast.success(`Relatório de ${report.who} gerado.`);
    } catch (error) {
      toast.error("Não foi possível gerar o relatório.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function togglePreference(
    field: "kids_alerts" | "kids_achievement_alerts" | "kids_email_alerts",
    value: boolean,
  ) {
    try {
      await savePreferences.mutateAsync({ [field]: value } as never);
      toast.success("Preferência salva.");
    } catch (error) {
      toast.error("Não foi possível salvar a preferência.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const prefs = preferences as
    | (Record<string, unknown> & { kids_alerts?: boolean })
    | null
    | undefined;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <Baby className="size-5 text-primary" /> Espaço Kids — histórico e relatórios
            </h1>
            <p className="text-xs text-muted-foreground">
              Tudo que aconteceu com cada criança: mesada automática, conquistas, resgates de
              recompensa e alertas enviados a você.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/painel">
              <ArrowLeft className="mr-1 size-4" /> Voltar ao painel
            </Link>
          </Button>
        </div>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Avisos ao responsável</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Escolha o que você quer receber sobre o Espaço Kids.
          </p>
          <div className="mt-3 space-y-3">
            <PreferenceRow
              label="Alertas de saldo e limite de gastos"
              hint="Avisa quando a mesada está acabando ou o limite do mês foi atingido."
              checked={Boolean(prefs?.kids_alerts ?? true)}
              onChange={(value) => void togglePreference("kids_alerts", value)}
            />
            <PreferenceRow
              label="Conquistas e resgates de recompensa"
              hint="Avisa quando uma meta é concluída e quando o prêmio é entregue."
              checked={Boolean((prefs as { kids_achievement_alerts?: boolean })?.kids_achievement_alerts ?? true)}
              onChange={(value) => void togglePreference("kids_achievement_alerts", value)}
            />
            <PreferenceRow
              label="Também enviar por e-mail"
              hint="Envia os mesmos avisos para o e-mail do responsável (requer domínio de e-mail configurado)."
              checked={Boolean((prefs as { kids_email_alerts?: boolean })?.kids_email_alerts ?? false)}
              onChange={(value) => void togglePreference("kids_email_alerts", value)}
            />
          </div>
        </section>

        <PushAlertsCard />

        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Relatório por criança</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Receitas, despesas e evolução do saldo por semana e por mês no período escolhido.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="kids-from">De</Label>
              <Input
                id="kids-from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="kids-to">Até</Label>
              <Input
                id="kids-to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {kids.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Cadastre um filho ou dependente para gerar relatórios.
              </p>
            ) : (
              kids.map((kid) => (
                <div
                  key={kid.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: kid.color ?? "#f97316" }}
                    />
                    <span className="text-sm font-medium">
                      {kid.nickname?.trim() || kid.name}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => void handleExport(kid.id, "pdf")}>
                      <FileText className="mr-1 size-3.5" /> PDF
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void handleExport(kid.id, "csv")}>
                      <Download className="mr-1 size-3.5" /> CSV
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <History className="size-4 text-primary" /> Histórico de ações
            </h2>
            <Button
              size="sm"
              variant="ghost"
              disabled={clearAudit.isPending || (entries ?? []).length === 0}
              onClick={() => {
                void clearAudit
                  .mutateAsync()
                  .then(() => toast.success("Histórico limpo."))
                  .catch((error: unknown) =>
                    toast.error("Não foi possível limpar.", {
                      description: error instanceof Error ? error.message : undefined,
                    }),
                  );
              }}
            >
              <Trash2 className="mr-1 size-3.5" /> Limpar histórico
            </Button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Select value={dependentFilter} onValueChange={setDependentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Criança" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as crianças</SelectItem>
                {kids.map((kid) => (
                  <SelectItem key={kid.id} value={kid.id}>
                    {kid.nickname?.trim() || kid.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {KIDS_AUDIT_ACTIONS.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3 space-y-2">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : filtered.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Nenhuma ação registrada no período. As ações aparecem aqui automaticamente.
              </p>
            ) : (
              filtered.map((entry) => (
                <article key={entry.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{kidsAuditActionLabel(entry.action)}</Badge>
                      <span className="text-sm font-medium">{entry.title}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {nameOf(entry.dependent_id)}
                    {entry.description ? ` · ${entry.description}` : ""}
                    {entry.amount != null ? ` · ${formatCurrency(Number(entry.amount))}` : ""}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function PreferenceRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
