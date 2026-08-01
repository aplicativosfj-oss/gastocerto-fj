import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Clock, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { adminListLicenses } from "@/lib/licenses.functions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { remainingTime } from "@/lib/audit-log";
import { useNow } from "@/lib/use-now";

export function ClientCodesPanel({ globalSearch = "" }: { globalSearch?: string }) {
  const listLicenses = useServerFn(adminListLicenses);
  const [search, setSearch] = useState("");
  const now = useNow(1000);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "client-codes"],
    queryFn: () => listLicenses(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const rows = useMemo(() => {
    const term = (globalSearch || search).trim().toLowerCase();
    const licenses = (data?.licenses ?? []) as any[];
    if (!term) return licenses;
    return licenses.filter(
      (l) =>
        (l.email ?? "").toLowerCase().includes(term) ||
        (l.license_key ?? "").toLowerCase().includes(term) ||
        (l.full_name ?? "").toLowerCase().includes(term),
    );
  }, [data, search]);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="size-5 text-primary" />
          Códigos de acesso de clientes
        </CardTitle>
        <CardDescription>
          Situação de validade e tempo restante de cada chave entregue aos clientes — o contador
          atualiza automaticamente a cada segundo, sem recarregar a página.
        </CardDescription>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por e-mail, nome ou chave"
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <KeyRound className="mb-2 size-8 opacity-20" />
            <p>Nenhum código de cliente encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Chave / Cliente</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Tempo restante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((license) => {
                  const remaining = remainingTime(license.expires_at, now);
                  const isActive = license.status === "active" && remaining.tone !== "expired";
                  return (
                    <TableRow key={license.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <code className="font-mono text-sm font-bold text-primary">
                            {license.license_key}
                          </code>
                          <span className="text-xs text-muted-foreground">
                            {license.full_name || license.email || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{license.plans?.name ?? "—"}</TableCell>
                      <TableCell>
                        {isActive ? (
                          <Badge variant="outline" className="border-income/30 bg-income/10 text-income">
                            Ativa
                          </Badge>
                        ) : license.status === "pending" ? (
                          <Badge variant="secondary">Pendente</Badge>
                        ) : license.status === "revoked" ? (
                          <Badge variant="secondary">Revogada</Badge>
                        ) : (
                          <Badge variant="destructive" className="opacity-80">
                            Expirada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {license.expires_at ? formatDateTime(license.expires_at) : "—"}
                      </TableCell>
                      <TableCell>
                        <div
                          className={
                            remaining.tone === "expired"
                              ? "flex items-center gap-1.5 text-xs font-medium text-expense"
                              : remaining.tone === "soon"
                                ? "flex items-center gap-1.5 text-xs font-medium text-warning"
                                : "flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                          }
                        >
                          <Clock className="size-3" />
                          {remaining.text}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
