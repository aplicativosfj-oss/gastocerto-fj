import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminGetSupportTickets, adminUpdateTicket } from "@/lib/admin-expansion.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, MessageSquare, CheckCircle, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";

export function SupportTicketsPanel() {
  const queryClient = useQueryClient();
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin", "tickets"],
    queryFn: () => adminGetSupportTickets(),
  });

  const updateMutation = useMutation({
    mutationFn: adminUpdateTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      toast.success("Chamado atualizado");
    },
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-brand/20 bg-brand/5 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 md:items-center">
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
            <LifeBuoy className="size-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-brand">Central de Suporte & Desenvolvedor</h3>
            <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Desenvolvedor:</span>
                <span className="font-medium">Franc Denis</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Contato:</span>
                <span className="font-medium">(68) 992031340</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">E-mail:</span>
                <a href="mailto:contato@gastocerto.com.br" className="font-medium text-brand hover:underline">contato@gastocerto.com.br</a>
              </div>
              <div className="flex items-start gap-2 sm:col-span-2">
                <span className="font-semibold text-muted-foreground shrink-0">Endereço:</span>
                <span className="font-medium italic leading-tight">
                  R. Joel de Sousa, nº 190, Bela Vista, CEP: 69960-000, Feijó-AC
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/30">
          <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="size-4 text-brand" />
            Fila de Atendimento
          </h4>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/10">
              <TableHead className="font-bold">Usuário</TableHead>
              <TableHead className="font-bold">Assunto</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold">Data</TableHead>
              <TableHead className="text-right font-bold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tickets ?? []).map((ticket: any) => (
              <TableRow key={ticket.id} className="hover:bg-muted/5 transition-colors">
                <TableCell>
                  <div className="font-bold">{ticket.profiles?.full_name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{ticket.profiles?.contact_email}</div>
                </TableCell>
                <TableCell className="max-w-[300px] truncate font-medium text-sm">{ticket.subject}</TableCell>
                <TableCell>
                  <Badge variant={ticket.status === 'open' ? 'default' : ticket.status === 'resolved' ? 'secondary' : 'outline'} className="capitalize px-2 py-0.5 text-[10px]">
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-[11px] text-muted-foreground font-mono">{formatDateTime(ticket.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    size="sm" 
                    variant={ticket.status === 'resolved' ? "ghost" : "outline"}
                    className={cn(ticket.status !== 'resolved' && "hover:border-success hover:text-success")}
                    onClick={() => updateMutation.mutate({ data: { id: ticket.id, status: 'resolved' } })}
                    disabled={updateMutation.isPending || ticket.status === 'resolved'}
                  >
                    <CheckCircle className="mr-2 size-4" />
                    {ticket.status === 'resolved' ? "Resolvido" : "Resolver"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(tickets ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground italic">
                  Nenhum chamado pendente na fila.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
