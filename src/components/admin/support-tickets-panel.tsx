import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminGetSupportTickets, adminUpdateTicket } from "@/lib/admin-expansion.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, MessageSquare, CheckCircle } from "lucide-react";

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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Assunto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(tickets ?? []).map((ticket: any) => (
            <TableRow key={ticket.id}>
              <TableCell>
                <div className="font-medium">{ticket.profiles?.full_name}</div>
                <div className="text-xs text-muted-foreground">{ticket.profiles?.contact_email}</div>
              </TableCell>
              <TableCell>{ticket.subject}</TableCell>
              <TableCell>
                <Badge variant={ticket.status === 'open' ? 'default' : ticket.status === 'resolved' ? 'secondary' : 'outline'}>
                  {ticket.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{formatDateTime(ticket.created_at)}</TableCell>
              <TableCell className="text-right">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => updateMutation.mutate({ data: { id: ticket.id, status: 'resolved' } })}
                  disabled={updateMutation.isPending || ticket.status === 'resolved'}
                >
                  <CheckCircle className="mr-2 size-4" />
                  Resolver
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {(tickets ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Nenhum chamado aberto
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
