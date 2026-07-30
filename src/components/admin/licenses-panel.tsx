import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, KeyRound, Loader2, Plus, Ban } from "lucide-react";
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
  adminListLicenses,
  adminSetLicenseStatus,
} from "@/lib/licenses.functions";
import { formatCurrency, formatDateTime } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  active: "Ativa",
  expired: "Expirada",
  revoked: "Revogada",
};

export function LicensesPanel() {
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

  const licenses = useMemo(() => {
    const rows = data.data?.licenses ?? [];
    if (statusFilter === "all") return rows;
    return rows.filter((row: any) => row.status === statusFilter);
  }, [data.data, statusFilter]);

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
              <TableHead>Ciclo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : licenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
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
                  <TableCell>{license.billing_cycle === "annual" ? "Anual" : "Mensal"}</TableCell>
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
                    {license.expires_at ? formatDateTime(license.expires_at) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
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
                <Input
                  id="license-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
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
