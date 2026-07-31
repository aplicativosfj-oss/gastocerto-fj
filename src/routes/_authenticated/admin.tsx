import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Search, ShieldCheck, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { LicensesPanel, PaymentsPanel } from "@/components/admin/licenses-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  adminOverview,
  adminResetUserPin,
  adminSaveSupportNotes,
  adminSetUserRole,
  adminSetUserStatus,
} from "@/lib/admin.functions";
import { maskCpf, onlyDigits } from "@/lib/cpf";
import { formatDateTime } from "@/lib/format";
import { useRoles, type Profile } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel administrativo — GastoCerto" },
      {
        name: "description",
        content: "Gerencie usuários, papéis, situação de contas e ações de suporte.",
      },
      { property: "og:title", content: "Painel administrativo — GastoCerto" },
      {
        property: "og:description",
        content: "Gerencie usuários, papéis, situação de contas e ações de suporte.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  canceled: "Cancelado",
};

function AdminPage() {
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const isAdmin = (roles ?? []).includes("admin");
  const isStaff = isAdmin || (roles ?? []).includes("support");

  if (rolesLoading) {
    return (
      <AppShell>
        <Skeleton className="h-64" />
      </AppShell>
    );
  }

  if (!isStaff) {
    return (
      <AppShell>
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-3 font-display text-sm font-semibold">Acesso restrito</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta área é exclusiva da equipe administrativa.
          </p>
        </div>
      </AppShell>
    );
  }

  return <AdminContent isAdmin={isAdmin} />;
}

function AdminContent({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Profile | null>(null);

  const overview = useQuery({
    queryKey: ["admin", "overview"],
    enabled: isAdmin,
    queryFn: () => adminOverview(),
  });

  const profiles = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rolesByUser = useQuery({
    queryKey: ["admin", "roles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      const map = new Map<string, string[]>();
      for (const row of data ?? []) {
        map.set(row.user_id, [...(map.get(row.user_id) ?? []), row.role]);
      }
      return map;
    },
  });

  const logs = useQuery({
    queryKey: ["admin", "logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const nameByUser = useMemo(() => {
    const map = new Map<string, string>();
    for (const profile of profiles.data ?? []) {
      map.set(profile.user_id, profile.full_name ?? "Usuário");
    }
    return map;
  }, [profiles.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = onlyDigits(search);
    return (profiles.data ?? []).filter((profile) => {
      if (statusFilter !== "all" && profile.status !== statusFilter) return false;
      if (!term) return true;
      const name = (profile.full_name ?? "").toLowerCase();
      const email = (profile.contact_email ?? "").toLowerCase();
      const cpf = onlyDigits(profile.cpf ?? "");
      return (
        name.includes(term) || email.includes(term) || (digits.length > 0 && cpf.includes(digits))
      );
    });
  }, [profiles.data, search, statusFilter]);

  async function refreshAll() {
    await queryClient.invalidateQueries({ queryKey: ["admin"] });
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <header>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Administração</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de usuários, papéis, suporte e trilha de auditoria.
          </p>
        </header>

        {isAdmin ? (
          <div className="grid gap-3 auto-cards-sm">
            <StatCard label="Usuários" value={overview.data?.totalUsers} />
            <StatCard label="Contas ativas" value={overview.data?.activeUsers} />
            <StatCard label="Novos (30 dias)" value={overview.data?.newUsers30d} />
            <StatCard label="Lançamentos" value={overview.data?.totalTransactions} />
          </div>
        ) : null}

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            {isAdmin ? <TabsTrigger value="licenses">Licenças</TabsTrigger> : null}
            {isAdmin ? <TabsTrigger value="payments">Pagamentos</TabsTrigger> : null}
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          {isAdmin ? (
            <TabsContent value="licenses" className="mt-4">
              <LicensesPanel />
            </TabsContent>
          ) : null}

          {isAdmin ? (
            <TabsContent value="payments" className="mt-4">
              <PaymentsPanel />
            </TabsContent>
          ) : null}

          <TabsContent value="users" className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-64 flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nome, CPF ou e-mail"
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as situações</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="suspended">Suspensos</SelectItem>
                  <SelectItem value="canceled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Papéis</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center">
                        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        Nenhum usuário encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.full_name ?? "—"}</TableCell>
                        <TableCell>{profile.cpf ? maskCpf(profile.cpf) : "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {profile.contact_email ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(rolesByUser.data?.get(profile.user_id) ?? ["user"]).map((role) => (
                              <Badge
                                key={role}
                                variant={role === "user" ? "secondary" : "default"}
                                className="text-[10px]"
                              >
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={profile.status === "active" ? "secondary" : "destructive"}>
                            {STATUS_LABELS[profile.status] ?? profile.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(profile.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setSelected(profile)}>
                            <UserCog className="mr-2 size-4" />
                            Gerenciar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Usuário afetado</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(logs.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        Nenhuma ação registrada ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (logs.data ?? []).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDateTime(log.created_at)}</TableCell>
                        <TableCell>{nameByUser.get(log.actor_id) ?? "Equipe"}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>
                          {log.target_user_id ? (nameByUser.get(log.target_user_id) ?? "—") : "—"}
                        </TableCell>
                        <TableCell className="max-w-64 truncate text-xs text-muted-foreground">
                          {JSON.stringify(log.details)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ManageUserDialog
        profile={selected}
        canEdit={isAdmin}
        isSelf={selected?.user_id === user?.id}
        roles={selected ? (rolesByUser.data?.get(selected.user_id) ?? []) : []}
        onClose={() => setSelected(null)}
        onChanged={refreshAll}
      />
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">
        {value === undefined ? "—" : value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}

function ManageUserDialog({
  profile,
  canEdit,
  isSelf,
  roles,
  onClose,
  onChanged,
}: {
  profile: Profile | null;
  canEdit: boolean;
  isSelf: boolean;
  roles: string[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [pending, setPending] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<unknown>, successMessage: string) {
    setPending(key);
    try {
      await action();
      await onChanged();
      toast.success(successMessage);
    } catch (error) {
      console.error("[admin] falha na ação", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a ação");
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog open={Boolean(profile)} onOpenChange={(value) => (value ? null : onClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{profile?.full_name ?? "Usuário"}</DialogTitle>
          <DialogDescription>
            {profile?.cpf ? maskCpf(profile.cpf) : "Sem CPF"} ·{" "}
            {profile?.contact_email ?? "sem e-mail de contato"}
          </DialogDescription>
        </DialogHeader>

        {!profile ? null : !canEdit ? (
          <p className="text-sm text-muted-foreground">
            Perfil de suporte: consulta apenas. Ações administrativas exigem papel de admin.
          </p>
        ) : (
          <div className="space-y-5">
            <section>
              <Label className="text-xs uppercase text-muted-foreground">Situação da conta</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["active", "suspended", "canceled"] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={profile.status === status ? "default" : "outline"}
                    disabled={pending !== null}
                    onClick={() =>
                      run(
                        `status-${status}`,
                        () =>
                          adminSetUserStatus({
                            data: { targetUserId: profile.user_id, status },
                          }),
                        "Situação atualizada",
                      )
                    }
                  >
                    {pending === `status-${status}` ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    {STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </section>

            <section>
              <Label className="text-xs uppercase text-muted-foreground">Papéis</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["admin", "support"] as const).map((role) => {
                  const has = roles.includes(role);
                  return (
                    <Button
                      key={role}
                      size="sm"
                      variant={has ? "default" : "outline"}
                      disabled={pending !== null || (isSelf && role === "admin" && has)}
                      onClick={() =>
                        run(
                          `role-${role}`,
                          () =>
                            adminSetUserRole({
                              data: { targetUserId: profile.user_id, role, grant: !has },
                            }),
                          has ? "Papel removido" : "Papel concedido",
                        )
                      }
                    >
                      {pending === `role-${role}` ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : null}
                      {has ? `Remover ${role}` : `Conceder ${role}`}
                    </Button>
                  );
                })}
              </div>
            </section>

            <section>
              <Label htmlFor="admin-pin" className="text-xs uppercase text-muted-foreground">
                Redefinir senha (6 dígitos)
              </Label>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const input = new FormData(event.currentTarget).get("pin");
                  const pin = onlyDigits(String(input ?? ""));
                  if (pin.length !== 6) {
                    toast.error("A senha precisa ter 6 dígitos");
                    return;
                  }
                  void run(
                    "pin",
                    () => adminResetUserPin({ data: { targetUserId: profile.user_id, pin } }),
                    "Senha redefinida",
                  );
                }}
              >
                <Input
                  id="admin-pin"
                  name="pin"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="tracking-[0.3em]"
                />
                <Button type="submit" disabled={pending !== null}>
                  {pending === "pin" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <KeyRound className="size-4" />
                  )}
                </Button>
              </form>
            </section>

            <section>
              <Label htmlFor="admin-notes" className="text-xs uppercase text-muted-foreground">
                Anotações de suporte
              </Label>
              <form
                className="mt-2 space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const notes = String(new FormData(event.currentTarget).get("notes") ?? "");
                  void run(
                    "notes",
                    () =>
                      adminSaveSupportNotes({
                        data: { targetUserId: profile.user_id, notes },
                      }),
                    "Anotação salva",
                  );
                }}
              >
                <Textarea
                  id="admin-notes"
                  name="notes"
                  rows={3}
                  defaultValue={profile.support_notes ?? ""}
                  placeholder="Histórico de atendimento, acordos, pendências…"
                />
                <DialogFooter>
                  <Button type="submit" variant="outline" disabled={pending !== null}>
                    {pending === "notes" ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Salvar anotação
                  </Button>
                </DialogFooter>
              </form>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
