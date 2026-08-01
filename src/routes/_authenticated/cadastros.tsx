import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Banknote,
  Car,
  CreditCard,
  Landmark,
  Pencil,
  Plus,
  Tags,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { DependentDialog } from "@/components/finance/dependent-dialog";
import { AccountDialog } from "@/components/finance/account-dialog";
import { CommitmentDialog } from "@/components/finance/commitment-dialog";
import { VehicleDialog } from "@/components/finance/vehicle-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useArchiveAccount, ACCOUNT_TYPES, type Account } from "@/lib/accounts";
import {
  commitmentTypeLabel,
  useCommitments,
  useDeleteCommitment,
  type Commitment,
} from "@/lib/commitments";
import {
  dependentAge,
  relationLabel,
  useDeleteDependent,
  useDependents,
  type Dependent,
} from "@/lib/dependents";
import { labelFor } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { useCategories } from "@/lib/queries";
import { useAccounts } from "@/lib/transactions";
import { VehicleEmblem } from "@/components/finance/vehicle-emblem";
import { VEHICLE_TYPES, useDeleteVehicle, useVehicles, type Vehicle } from "@/lib/vehicles";

export const Route = createFileRoute("/_authenticated/cadastros")({
  head: () => ({
    meta: [
      { title: "Meus cadastros — GastoCerto" },
      {
        name: "description",
        content:
          "Cadastre veículos, bancos, cartões, empréstimos, financiamentos e pensões antes de lançar seus gastos.",
      },
      { property: "og:title", content: "Meus cadastros — GastoCerto" },
      {
        property: "og:description",
        content: "Organize veículos, contas, cartões e dívidas em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegistrationsPage,
});

/** Ilustração SVG leve para cada bloco de cadastro. */
function BlockGlyph({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center rounded-xl border border-border"
      style={{ background: `color-mix(in oklab, var(--${tone}) 14%, transparent)` }}
    >
      <span style={{ color: `var(--${tone})` }}>{children}</span>
    </span>
  );
}

function RegistrationsPage() {
  const { data: vehicles } = useVehicles(true);
  const { data: accounts } = useAccounts();
  const { data: commitments } = useCommitments();
  const { data: categories } = useCategories();
  const { data: dependents } = useDependents();

  const removeDependent = useDeleteDependent();
  const removeVehicle = useDeleteVehicle();
  const archiveAccount = useArchiveAccount();
  const removeCommitment = useDeleteCommitment();

  const [vehicleDialog, setVehicleDialog] = useState<{ open: boolean; item?: Vehicle | null }>({
    open: false,
  });
  const [accountDialog, setAccountDialog] = useState<{ open: boolean; item?: Account | null }>({
    open: false,
  });
  const [dependentDialog, setDependentDialog] = useState<{
    open: boolean;
    item?: Dependent | null;
  }>({ open: false });
  const [commitmentDialog, setCommitmentDialog] = useState<{
    open: boolean;
    item?: Commitment | null;
  }>({ open: false });

  const cards = (accounts ?? []).filter((account) =>
    ["credit_card", "benefit"].includes(account.account_type),
  );
  const banks = (accounts ?? []).filter(
    (account) => !["credit_card", "benefit"].includes(account.account_type),
  );

  const steps = [
    { label: "Veículos", done: (vehicles ?? []).length > 0 },
    { label: "Bancos e carteiras", done: banks.length > 0 },
    { label: "Cartões", done: cards.length > 0 },
    { label: "Dívidas e compromissos", done: (commitments ?? []).length > 0 },
    { label: "Filhos e dependentes", done: (dependents ?? []).length > 0 },
    { label: "Categorias", done: (categories ?? []).length > 0 },
  ];
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <AppShell>
      <div className="space-y-4">
        <header className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="page-title">Meus cadastros</h1>
              <p className="page-subtitle mt-1">
                Cadastre primeiro o que você já tem — veículos, bancos, cartões, empréstimos,
                financiamentos e pensões. Depois, cada lançamento fica automático e organizado.
              </p>
            </div>
            <Badge variant={doneCount === steps.length ? "default" : "secondary"}>
              {doneCount} de {steps.length} concluídos
            </Badge>
          </div>
          <Progress className="mt-3" value={(doneCount / steps.length) * 100} />
          <ul className="mt-3 flex flex-wrap gap-2">
            {steps.map((step) => (
              <li
                key={step.label}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  step.done
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {step.done ? "✓ " : "• "}
                {step.label}
              </li>
            ))}
          </ul>
        </header>

        <section className="auto-cards-lg">
          {/* Veículos */}
          <article className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <BlockGlyph tone="accent-teal">
                  <Car className="size-5" />
                </BlockGlyph>
                <div className="min-w-0">
                  <h2 className="font-semibold">Veículos</h2>
                  <p className="text-xs text-muted-foreground">
                    {(vehicles ?? []).length} cadastrado(s)
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => setVehicleDialog({ open: true, item: null })}>
                <Plus className="mr-1.5 size-4" />
                Novo
              </Button>
            </div>
            <ul className="mt-3 divide-y divide-border">
              {(vehicles ?? []).length === 0 ? (
                <li className="py-4 text-sm text-muted-foreground">
                  Cadastre carro, moto ou caminhão para acompanhar combustível e manutenção.
                </li>
              ) : (
                (vehicles ?? []).map((vehicle) => (
                  <li key={vehicle.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <VehicleEmblem vehicleType={vehicle.vehicle_type} className="size-8 shrink-0" />
                      <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{vehicle.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {labelFor(VEHICLE_TYPES, vehicle.vehicle_type)}
                        {vehicle.plate ? ` · ${vehicle.plate}` : ""}
                      </p>
                      </div>
                    </div>
                    <div className="flex shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${vehicle.name}`}
                        onClick={() => setVehicleDialog({ open: true, item: vehicle })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ${vehicle.name}`}
                        onClick={async () => {
                          await removeVehicle.mutateAsync(vehicle.id).catch(() => {
                            toast.error("Não foi possível remover o veículo.");
                          });
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </article>

          {/* Bancos e cartões */}
          <article className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <BlockGlyph tone="primary">
                  <Landmark className="size-5" />
                </BlockGlyph>
                <div className="min-w-0">
                  <h2 className="font-semibold">Bancos, carteiras e cartões</h2>
                  <p className="text-xs text-muted-foreground">
                    {banks.length} conta(s) · {cards.length} cartão(ões)
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => setAccountDialog({ open: true, item: null })}>
                <Plus className="mr-1.5 size-4" />
                Novo
              </Button>
            </div>
            <ul className="mt-3 divide-y divide-border">
              {(accounts ?? []).length === 0 ? (
                <li className="py-4 text-sm text-muted-foreground">
                  Cadastre onde o dinheiro fica: conta do banco, carteira em dinheiro e cartões.
                </li>
              ) : (
                (accounts ?? []).map((account) => (
                  <li key={account.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {["credit_card", "benefit"].includes(account.account_type) ? (
                        <CreditCard className="size-4 shrink-0 text-muted-foreground" />
                      ) : account.account_type === "wallet" ? (
                        <Wallet className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <Banknote className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{account.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {labelFor(ACCOUNT_TYPES, account.account_type)}
                          {account.institution ? ` · ${account.institution}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCurrency(Number(account.current_balance))}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${account.name}`}
                        onClick={() => setAccountDialog({ open: true, item: account })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Arquivar ${account.name}`}
                        onClick={async () => {
                          await archiveAccount.mutateAsync(account.id).catch(() => {
                            toast.error("Não foi possível arquivar a conta.");
                          });
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </article>

          {/* Compromissos */}
          <article className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <BlockGlyph tone="accent-coral">
                  <CreditCard className="size-5" />
                </BlockGlyph>
                <div className="min-w-0">
                  <h2 className="font-semibold">Empréstimos, financiamentos e pensões</h2>
                  <p className="text-xs text-muted-foreground">
                    {(commitments ?? []).length} compromisso(s)
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => setCommitmentDialog({ open: true, item: null })}>
                <Plus className="mr-1.5 size-4" />
                Novo
              </Button>
            </div>
            <ul className="mt-3 divide-y divide-border">
              {(commitments ?? []).length === 0 ? (
                <li className="py-4 text-sm text-muted-foreground">
                  Cadastre financiamentos, empréstimos, cartões, fiado, pensão alimentícia e outras
                  saídas fixas.
                </li>
              ) : (
                (commitments ?? []).slice(0, 8).map((commitment) => (
                  <li key={commitment.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{commitment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {commitmentTypeLabel(commitment.commitment_type)}
                        {commitment.installments_total
                          ? ` · ${commitment.installments_total}x`
                          : " · conta aberta"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCurrency(Number(commitment.total_amount))}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${commitment.name}`}
                        onClick={() => setCommitmentDialog({ open: true, item: commitment })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ${commitment.name}`}
                        onClick={async () => {
                          await removeCommitment.mutateAsync(commitment.id).catch(() => {
                            toast.error("Não foi possível remover o compromisso.");
                          });
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>
            {(commitments ?? []).length > 8 ? (
              <Button asChild variant="ghost" size="sm" className="mt-2">
                <Link to="/compromissos">
                  Ver todos
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            ) : null}
          </article>

          {/* Filhos e dependentes */}
          <article className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <BlockGlyph tone="accent-coral">
                  <Users className="size-5" />
                </BlockGlyph>
                <div className="min-w-0">
                  <h2 className="font-semibold">Filhos e dependentes</h2>
                  <p className="text-xs text-muted-foreground">
                    {(dependents ?? []).length} cadastrado(s)
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => setDependentDialog({ open: true, item: null })}>
                <Plus className="mr-1.5 size-4" />
                Novo
              </Button>
            </div>
            <ul className="mt-3 divide-y divide-border">
              {(dependents ?? []).length === 0 ? (
                <li className="py-4 text-sm text-muted-foreground">
                  Cadastre cada filho para separar os gastos extras: pix, lanche, presente,
                  material didático e mesada — mesmo quando você já paga pensão.
                </li>
              ) : (
                (dependents ?? []).map((dependent) => {
                  const age = dependentAge(dependent);
                  return (
                    <li key={dependent.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                          style={{
                            backgroundColor: `${dependent.color ?? "#64748b"}22`,
                            color: dependent.color ?? undefined,
                          }}
                        >
                          {(dependent.nickname?.trim() || dependent.name).slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{dependent.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {relationLabel(dependent.relation)}
                            {age !== null ? ` · ${age} anos` : ""}
                            {dependent.monthly_allowance
                              ? ` · mesada ${formatCurrency(Number(dependent.monthly_allowance))}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${dependent.name}`}
                          onClick={() => setDependentDialog({ open: true, item: dependent })}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remover ${dependent.name}`}
                          onClick={async () => {
                            await removeDependent.mutateAsync(dependent.id).catch(() => {
                              toast.error("Não foi possível remover o dependente.");
                            });
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </article>

          {/* Categorias */}
          <article className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <BlockGlyph tone="accent-amber">
                  <Tags className="size-5" />
                </BlockGlyph>
                <div className="min-w-0">
                  <h2 className="font-semibold">Categorias e subcategorias</h2>
                  <p className="text-xs text-muted-foreground">
                    {(categories ?? []).length} disponível(is)
                  </p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/categorias">Gerenciar</Link>
              </Button>
            </div>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {(categories ?? []).slice(0, 18).map((category) => (
                <li
                  key={category.id}
                  className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {category.name}
                </li>
              ))}
            </ul>
          </article>
        </section>
      </div>

      {dependentDialog.open ? (
        <DependentDialog
          key={dependentDialog.item?.id ?? "new-dependent"}
          open={dependentDialog.open}
          onOpenChange={(open) => setDependentDialog({ open })}
          dependent={dependentDialog.item ?? null}
        />
      ) : null}

      {vehicleDialog.open ? (
        <VehicleDialog
          key={vehicleDialog.item?.id ?? "new-vehicle"}
          open={vehicleDialog.open}
          onOpenChange={(open) => setVehicleDialog({ open })}
          vehicle={vehicleDialog.item ?? null}
        />
      ) : null}

      {accountDialog.open ? (
        <AccountDialog
          key={accountDialog.item?.id ?? "new-account"}
          open={accountDialog.open}
          onOpenChange={(open) => setAccountDialog({ open })}
          account={accountDialog.item ?? null}
        />
      ) : null}

      {commitmentDialog.open ? (
        <CommitmentDialog
          key={commitmentDialog.item?.id ?? "new-commitment"}
          open={commitmentDialog.open}
          onOpenChange={(open) => setCommitmentDialog({ open })}
          commitment={commitmentDialog.item ?? null}
        />
      ) : null}
    </AppShell>
  );
}
