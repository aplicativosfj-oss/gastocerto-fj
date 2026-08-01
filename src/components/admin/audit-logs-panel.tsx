import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ScrollText, Download, FileText, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  AUDIT_CATEGORY_LABELS,
  auditLogsToCsv,
  categorizeAction,
  filterAuditLogs,
  periodLabel,
  type AuditCategory,
  type AuditLogRow,
} from "@/lib/audit-log";
import { adminListAuditLogs } from "@/lib/audit-logs.functions";
import { formatDateTime } from "@/lib/format";

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AuditLogsPanel() {
  const listLogs = useServerFn(adminListAuditLogs);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState<AuditCategory | "all">("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin", "audit-logs", from, to],
    queryFn: () =>
      listLogs({ data: { from: from || null, to: to || null } }),
    refetchInterval: 60_000,
  });

  const nameByUser = useMemo(() => {
    const map = new Map<string, string>();
    for (const person of data?.people ?? []) {
      if (person.full_name) map.set(person.user_id, person.full_name);
    }
    return map;
  }, [data]);

  const rows = useMemo(
    () =>
      filterAuditLogs((data?.logs ?? []) as AuditLogRow[], {
        from: null,
        to: null,
        category,
        search,
      }),
    [data, category, search],
  );

  function exportCsv() {
    const csv = auditLogsToCsv(rows, nameByUser);
    download(
      `auditoria-${from || "inicio"}-${to || "hoje"}.csv`,
      new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" }),
    );
  }

  async function exportPdf() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(15);
    doc.text("GastoCerto — Logs de auditoria administrativa", 14, 16);
    doc.setFontSize(9);
    doc.text(`Período: ${periodLabel(from || null, to || null)}`, 14, 23);
    doc.text(
      `Registros: ${rows.length} · Gerado em ${new Date().toLocaleString("pt-BR")}`,
      14,
      28,
    );

    autoTable(doc, {
      startY: 34,
      head: [["Data/Hora", "Categoria", "Ação", "Responsável", "Afetado", "Detalhes"]],
      body: rows.map((row) => [
        formatDateTime(row.created_at),
        AUDIT_CATEGORY_LABELS[categorizeAction(row.action)],
        row.action,
        nameByUser.get(row.actor_id) ?? "Equipe",
        row.target_user_id ? (nameByUser.get(row.target_user_id) ?? "—") : "—",
        JSON.stringify(row.details ?? {}).slice(0, 120),
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [16, 74, 58] },
      didDrawPage: () => {
        const page = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Página ${doc.getCurrentPageInfo().pageNumber} de ${page}`,
          doc.internal.pageSize.getWidth() - 40,
          doc.internal.pageSize.getHeight() - 8,
        );
      },
    });

    doc.save(`auditoria-${from || "inicio"}-${to || "hoje"}.pdf`);
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ScrollText className="size-5 text-primary" />
              Auditoria administrativa
            </CardTitle>
            <CardDescription>
              Geração e revogação de códigos, mudanças de permissões, planos e avisos.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
              <Download className="size-4" />
              CSV
            </Button>
            <Button size="sm" onClick={exportPdf} disabled={rows.length === 0}>
              <FileText className="size-4" />
              PDF
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="audit-from" className="text-xs">De</Label>
            <Input id="audit-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-to" className="text-xs">Até</Label>
            <Input id="audit-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as AuditCategory | "all")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {(Object.keys(AUDIT_CATEGORY_LABELS) as AuditCategory[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {AUDIT_CATEGORY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-search" className="text-xs">Buscar</Label>
            <Input
              id="audit-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ação ou detalhe"
            />
          </div>
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
            <ScrollText className="mb-2 size-8 opacity-20" />
            <p>Nenhum registro no período selecionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Quando</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Afetado</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(row.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">
                        {AUDIT_CATEGORY_LABELS[categorizeAction(row.action)]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{row.action}</TableCell>
                    <TableCell className="text-xs">
                      {nameByUser.get(row.actor_id) ?? "Equipe"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.target_user_id ? (nameByUser.get(row.target_user_id) ?? "—") : "—"}
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-xs text-muted-foreground">
                      {JSON.stringify(row.details ?? {})}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
