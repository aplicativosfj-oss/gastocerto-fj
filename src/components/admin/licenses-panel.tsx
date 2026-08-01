import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CheckCircle2,
  Copy,
  Info,
  KeyRound,
  Loader2,
  Plus,
  Sparkles,
  SparklesIcon,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  adminCreateLicense,
  adminDeleteLicense,
  adminListLicenses,
  adminSetLicenseStatus,
} from "@/lib/licenses.functions";
import { describeLicense } from "@/lib/license-status";
import { formatCurrency, formatDateTime } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  active: "Ativa",
  expired: "Expirada",
  revoked: "Revogada",
};

/** Situação detalhada da licença (tipo, validade, recursos e IA). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function detail(license: any) {
  return describeLicense({
    source: license.source,
    amount: license.amount,
    planSlug: license.plans?.slug ?? null,
    status: license.status,
    billing_cycle: license.billing_cycle,
    activated_at: license.activated_at,
    expires_at: license.expires_at,
    user_id: license.user_id,
    trialDays: license.plans?.trial_days ?? license.trial_days ?? null,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LicenseDetailDialog({ license }: { license: any }) {
  const [open, setOpen] = useState(false);
  const info = detail(license);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label="Ver detalhes da licença">
          <Info className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-base">{license.license_key}</DialogTitle>
          <DialogDescription>
            {license.plans?.name ?? "Plano não informado"} · {info.kindLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Situação</p>
              <p className="mt-0.5 font-medium">{info.statusLabel}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Expira em</p>
              <p className="mt-0.5 font-medium">
                {info.expiresAt
                  ? formatDateTime(info.expiresAt)
                  : "Conta a partir da ativação do cliente"}
              </p>
              {info.daysLeft != null ? (
                <p className="text-xs text-muted-foreground">{info.daysLeft} dia(s) restante(s)</p>
              ) : null}
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Cliente</p>
              <p className="mt-0.5 font-medium">{license.full_name ?? license.email ?? "—"}</p>
              <p className="text-xs text-muted-foreground">
                {license.user_id ? "Vinculada a uma conta" : "Ainda não vinculada"}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Valor</p>
              <p className="mt-0.5 font-medium">{formatCurrency(Number(license.amount ?? 0))}</p>
              <p className="text-xs text-muted-foreground">
                {license.billing_cycle === "annual" ? "Ciclo anual" : "Ciclo mensal"}
              </p>
            </div>
          </div>

          <div
            className={
              info.aiEnabled
                ? "flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3"
                : "flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3"
            }
          >
            <SparklesIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">
                Consultor de IA: {info.aiEnabled ? "habilitado" : "bloqueado"}
              </p>
              <p className="text-xs text-muted-foreground">{info.aiNote}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase text-muted-foreground">Recursos liberados</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {info.featureLabels.map((label) => (
                <Badge key={label} variant="secondary">
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {info.lockedLabels.length ? (
            <div>
              <p className="text-[11px] uppercase text-muted-foreground">Recursos bloqueados</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {info.lockedLabels.map((label) => (
                  <Badge key={label} variant="outline">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {license.notes ? (
            <p className="text-xs text-muted-foreground">{license.notes}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LicensesPanel({ globalSearch = "" }: { globalSearch?: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const data = useQuery({
    queryKey: ["admin", "licenses"],
    queryFn: () => adminListLicenses(),
  });

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("active", true)
        .order("monthly_price");
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: (input: { licenseId: string; status: "active" | "revoked" | "expired" }) =>
      adminSetLicenseStatus({ data: input }),
    onSuccess: async () => {
      toast.success("Licença atualizada");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteLicense = useMutation({
    mutationFn: (id: string) => adminDeleteLicense({ data: { id } }),
    onSuccess: async () => {
      toast.success("Licença excluída definitivamente");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const licenses = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();
    let rows = (data.data?.licenses ?? []) as any[];
    if (statusFilter !== "all") {
      rows = rows.filter((row: any) => row.status === statusFilter);
    }
    if (!term) return rows;
    return rows.filter(
      (l) =>
        (l.email ?? "").toLowerCase().includes(term) ||
        (l.license_key ?? "").toLowerCase().includes(term) ||
        (l.full_name ?? "").toLowerCase().includes(term),
    );
  }, [data.data, statusFilter, globalSearch]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as licenças</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="expired">Expiradas</SelectItem>
            <SelectItem value="revoked">Revogadas</SelectItem>
          </SelectContent>
        </Select>

        <NewLicenseDialog
          open={open}
          onOpenChange={setOpen}
          plans={plans.data ?? []}
          onCreated={async () => {
            await queryClient.invalidateQueries({ queryKey: ["admin"] });
          }}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chave</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>IA</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : licenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma licença emitida ainda.
                </TableCell>
              </TableRow>
            ) : (
              licenses.map((license: any) => (
                <TableRow key={license.id}>
                  <TableCell className="font-mono text-xs">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-primary"
                      onClick={() => {
                        void navigator.clipboard.writeText(license.license_key);
                        toast.success("Chave copiada");
                      }}
                    >
                      {license.license_key}
                      <Copy className="size-3" />
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{license.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{license.email ?? "—"}</div>
                  </TableCell>
                  <TableCell>{license.plans?.name ?? "—"}</TableCell>
                  <TableCell>
                    <div className="text-sm">{detail(license).kindLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      {detail(license).effective
                        ? detail(license).daysLeft != null
                          ? `Em vigor · ${detail(license).daysLeft} dia(s) restante(s)`
                          : "Em vigor"
                        : detail(license).awaitingActivation
                          ? "Só vale após o cliente ativar a chave"
                          : detail(license).statusLabel}
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(Number(license.amount ?? 0))}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        license.status === "active"
                          ? "default"
                          : license.status === "revoked"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {STATUS_LABEL[license.status] ?? license.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {license.expires_at
                      ? formatDateTime(license.expires_at)
                      : detail(license).awaitingActivation
                        ? "Conta a partir da ativação"
                        : "—"}
                  </TableCell>
                  <TableCell>
                    {detail(license).aiEnabled ? (
                      <Badge className="gap-1">
                        <Sparkles className="size-3" aria-hidden />
                        Liberada
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Bloqueada</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <LicenseDetailDialog license={license} />
                      {license.status !== "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate({ licenseId: license.id, status: "active" })
                          }
                        >
                          <CheckCircle2 className="mr-1 size-4" />
                          Ativar
                        </Button>
                      ) : null}
                      {license.status !== "revoked" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate({ licenseId: license.id, status: "revoked" })
                          }
                        >
                          <Ban className="mr-1 size-4" />
                          Revogar
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deleteLicense.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Excluir esta licença definitivamente? Esta ação não pode ser desfeita.",
                            )
                          ) {
                            deleteLicense.mutate(license.id);
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function NewLicenseDialog({
  open,
  onOpenChange,
  plans,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  plans: any[];
  onCreated: () => Promise<void>;
}) {
  const [planId, setPlanId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [amount, setAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [activateNow, setActivateNow] = useState(true);
  const [created, setCreated] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      adminCreateLicense({
        data: {
          planId,
          email,
          fullName: fullName || undefined,
          billingCycle: cycle,
          amount: Number(amount.replace(",", ".")) || 0,
          activateNow,
          notes: notes || undefined,
        },
      }),
    onSuccess: async (license: any) => {
      setCreated(license.license_key);
      toast.success("Licença emitida");
      await onCreated();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handlePlanChange(value: string) {
    setPlanId(value);
    const plan = plans.find((item) => item.id === value);
    if (plan) {
      setAmount(String(cycle === "annual" ? plan.annual_price : plan.monthly_price));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) setCreated(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 size-4" />
          Emitir licença
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Emitir licença</DialogTitle>
          <DialogDescription>
            Gere uma chave de acesso para o cliente. A automação por Pix (Mercado Pago) usará o
            mesmo fluxo quando for ativada.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
            <KeyRound className="mx-auto size-6 text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Chave gerada</p>
            <p className="mt-1 font-mono text-lg font-semibold tracking-wider">{created}</p>
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(created);
                toast.success("Chave copiada");
              }}
            >
              <Copy className="mr-2 size-4" />
              Copiar chave
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Plano</Label>
              <Select value={planId} onValueChange={handlePlanChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="license-email">E-mail do cliente</Label>
                <Input
                  id="license-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="license-name">Nome</Label>
                <Input
                  id="license-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Ciclo</Label>
                <Select
                  value={cycle}
                  onValueChange={(value: "monthly" | "annual") => {
                    setCycle(value);
                    const plan = plans.find((item) => item.id === planId);
                    if (plan) {
                      setAmount(String(value === "annual" ? plan.annual_price : plan.monthly_price));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="license-amount">Valor (R$)</Label>
                <MoneyInput
                  id="license-amount"
                  value={amount}
                  onValueChange={setAmount}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="license-notes">Observações</Label>
              <Textarea
                id="license-notes"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={activateNow}
                onChange={(event) => setActivateNow(event.target.checked)}
              />
              Ativar imediatamente (vincula à conta com este e-mail, se existir)
            </label>
          </div>
        )}

        <DialogFooter>
          {created ? (
            <Button onClick={() => onOpenChange(false)}>Concluir</Button>
          ) : (
            <Button
              disabled={!planId || !email || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Emitir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentsPanel() {
  const data = useQuery({
    queryKey: ["admin", "licenses"],
    queryFn: () => adminListLicenses(),
  });

  const payments = data.data?.payments ?? [];

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Provedor</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                Nenhum pagamento registrado. A integração Pix com Mercado Pago será conectada aqui.
              </TableCell>
            </TableRow>
          ) : (
            payments.map((payment: any) => (
              <TableRow key={payment.id}>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(payment.created_at)}
                </TableCell>
                <TableCell>{payment.email ?? "—"}</TableCell>
                <TableCell>{payment.provider}</TableCell>
                <TableCell className="uppercase">{payment.method}</TableCell>
                <TableCell>{formatCurrency(Number(payment.amount ?? 0))}</TableCell>
                <TableCell>
                  <Badge variant={payment.status === "approved" ? "default" : "secondary"}>
                    {payment.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
