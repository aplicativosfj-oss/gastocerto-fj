import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldBan, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { adminBlockIp, adminListBlockedIps, adminUnblockIp } from "@/lib/admin-users.functions";

/** Bloqueio de IPs suspeitos: cadastro, listagem e liberação. */
export function BlockedIpsPanel() {
  const list = useServerFn(adminListBlockedIps);
  const block = useServerFn(adminBlockIp);
  const unblock = useServerFn(adminUnblockIp);
  const queryClient = useQueryClient();

  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");

  const blocked = useQuery({
    queryKey: ["admin", "blocked-ips"],
    queryFn: () => list(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "blocked-ips"] });

  const createMutation = useMutation({
    mutationFn: () => block({ data: { ip: ip.trim(), reason: reason.trim() || undefined } }),
    onSuccess: () => {
      toast.success("IP bloqueado.");
      setIp("");
      setReason("");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível bloquear o IP."),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => unblock({ data: { id } }),
    onSuccess: () => {
      toast.success("IP liberado.");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível liberar o IP."),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <header className="flex items-center gap-2">
        <ShieldBan className="size-5 text-destructive" aria-hidden />
        <div>
          <h2 className="font-display text-base font-semibold">IPs bloqueados</h2>
          <p className="text-xs text-muted-foreground">
            Impeça o acesso de endereços usados em tentativas de fraude ou abuso.
          </p>
        </div>
      </header>

      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (ip.trim().length < 3) {
            toast.error("Informe o endereço IP.");
            return;
          }
          createMutation.mutate();
        }}
      >
        <div className="w-48">
          <Label htmlFor="block-ip">Endereço IP</Label>
          <Input
            id="block-ip"
            value={ip}
            onChange={(event) => setIp(event.target.value)}
            placeholder="203.0.113.45"
            className="mt-1.5"
          />
        </div>
        <div className="min-w-56 flex-1">
          <Label htmlFor="block-reason">Motivo (opcional)</Label>
          <Input
            id="block-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Tentativas de fraude no cadastro"
            className="mt-1.5"
          />
        </div>
        <Button type="submit" variant="destructive" disabled={createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Bloquear
        </Button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IP</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Bloqueado em</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocked.isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center">
                  <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : (blocked.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum IP bloqueado.
                </TableCell>
              </TableRow>
            ) : (
              (blocked.data ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm">{row.ip}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.reason ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(row.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={removeMutation.isPending}
                      onClick={() => removeMutation.mutate(row.id)}
                    >
                      <Trash2 className="size-4" />
                      Liberar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
