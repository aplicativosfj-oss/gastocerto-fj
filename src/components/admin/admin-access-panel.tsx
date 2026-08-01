import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { 
  KeyRound, 
  Plus, 
  History, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck,
  Calendar,
  User,
  ExternalLink,
  Copy,
  Hash
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { 
  listAdminAccessCodes, 
  createAdminAccessCode, 
  revokeAdminAccessCode,
  getAdminAccessLogs 
} from "@/lib/admin-code.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminAccessPanel() {
  const queryClient = useQueryClient();
  const listCodes = useServerFn(listAdminAccessCodes);
  const createCode = useServerFn(createAdminAccessCode);
  const revokeCode = useServerFn(revokeAdminAccessCode);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newDays, setNewDays] = useState(30);
  const [newMaxUses, setNewMaxUses] = useState(1);

  const { data: codes, isLoading } = useQuery({
    queryKey: ["admin-access-codes"],
    queryFn: () => listCodes(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { label: string; expiresInDays: number; maxUses: number }) => 
      createCode({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-access-codes"] });
      setIsCreateOpen(false);
      setNewLabel("");
      toast.success("Código de acesso gerado com sucesso!");
    },
    onError: () => toast.error("Falha ao gerar código."),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeCode({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-access-codes"] });
      toast.success("Código revogado.");
    },
  });

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado para a área de transferência.");
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="size-5 text-primary" />
            Acessos Administrativos
          </CardTitle>
          <CardDescription>
            Gerencie códigos de acesso rápido e audite quem acessou o painel.
          </CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="size-4" />
              Gerar Código
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Código de Acesso</DialogTitle>
              <DialogDescription>
                Crie um código temporário para acesso administrativo rápido.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="label">Descrição/Identificação</Label>
                <Input 
                  id="label" 
                  placeholder="Ex: Acesso Suporte, Tablet Evento..." 
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="days">Expira em (dias)</Label>
                  <Input 
                    id="days" 
                    type="number" 
                    value={newDays}
                    onChange={(e) => setNewDays(Number(e.target.value))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="uses">Máx. Utilizações</Label>
                  <Input 
                    id="uses" 
                    type="number" 
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => createMutation.mutate({ 
                  label: newLabel, 
                  expiresInDays: newDays, 
                  maxUses: newMaxUses 
                })}
                disabled={createMutation.isPending || !newLabel}
              >
                {createMutation.isPending ? "Gerando..." : "Gerar e Copiar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !codes || codes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <KeyRound className="mb-2 size-8 opacity-20" />
            <p>Nenhum código gerado ainda.</p>
          </div>
        ) : (
          <div className="rounded-md border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Código / Rótulo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uso / Limite</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => {
                  const isExpired = new Date(code.expires_at) < new Date();
                  const isRevoked = !!code.revoked_at;
                  const isFull = code.usage_count >= code.max_uses;
                  const isActive = !isExpired && !isRevoked && !isFull;

                  return (
                    <TableRow key={code.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <code className="font-mono font-bold text-primary">{code.code}</code>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="size-6"
                              onClick={() => handleCopy(code.code)}
                            >
                              <Copy className="size-3" />
                            </Button>
                          </div>
                          <span className="text-xs text-muted-foreground">{code.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isActive ? (
                          <Badge variant="outline" className="border-income/30 bg-income/10 text-income">Ativo</Badge>
                        ) : isRevoked ? (
                          <Badge variant="secondary">Revogado</Badge>
                        ) : isExpired ? (
                          <Badge variant="destructive" className="opacity-80">Expirado</Badge>
                        ) : (
                          <Badge variant="outline">Esgotado</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {code.usage_count} / {code.max_uses}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {format(new Date(code.expires_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <LogsDialog codeId={code.id} label={code.label} />
                          {isActive && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="size-8 text-expense hover:bg-expense/10 hover:text-expense"
                              onClick={() => revokeMutation.mutate(code.id)}
                              disabled={revokeMutation.isPending}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
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

function LogsDialog({ codeId, label }: { codeId: string; label: string }) {
  const getLogs = useServerFn(getAdminAccessLogs);
  
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-access-logs", codeId],
    queryFn: () => getLogs({ data: { codeId } }),
    enabled: !!codeId,
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <History className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" />
            Logs de Uso: {label}
          </DialogTitle>
          <DialogDescription>
            Histórico completo de acessos realizados com este código.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="mt-4 max-h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum registro de uso encontrado.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex flex-col gap-1 rounded-lg border border-border/40 p-3 text-sm">
                  <div className="flex items-center justify-between font-medium">
                    <div className="flex items-center gap-1.5 text-income">
                      <CheckCircle2 className="size-3.5" />
                      Acesso realizado
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.used_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Hash className="size-3" />
                      IP: log.ip_address || "Indisponível"
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                      <User className="size-3 shrink-0" />
                      {(log.user_agent as string)?.split(" ")[0] || "Navegador"}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
