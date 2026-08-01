import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminGetAnnouncements, adminCreateAnnouncement } from "@/lib/admin-expansion.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Megaphone, Plus } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export function AnnouncementsPanel() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data: list, isLoading } = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: () => adminGetAnnouncements(),
  });

  const createMutation = useMutation({
    mutationFn: adminCreateAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
      toast.success("Aviso publicado");
      setShowForm(false);
    },
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg">Avisos Globais</h3>
          <p className="text-xs text-muted-foreground">Gerencie comunicados e alertas exibidos para todos os usuários.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className={cn("mr-2 size-4 transition-transform", showForm && "rotate-45")} />
          {showForm ? "Cancelar" : "Novo Aviso"}
        </Button>
      </div>

      {showForm && (
        <form className="p-5 border border-brand/20 rounded-2xl bg-brand/5 space-y-4 shadow-sm" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          createMutation.mutate({ data: {
            title: String(fd.get('title')),
            content: String(fd.get('content')),
            type: 'info',
            active: true
          }});
        }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">Título do Comunicado</Label>
              <Input name="title" placeholder="Ex: Manutenção Programada" required className="bg-background/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">Tipo de Alerta</Label>
              <Select defaultValue="info">
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Informação (Azul)</SelectItem>
                  <SelectItem value="warning">Aviso (Amarelo)</SelectItem>
                  <SelectItem value="error">Crítico (Vermelho)</SelectItem>
                  <SelectItem value="success">Novidade (Verde)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider">Mensagem Detalhada</Label>
            <Textarea name="content" placeholder="Descreva o que os usuários precisam saber..." required className="bg-background/50 min-h-[100px]" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={createMutation.isPending} className="bg-brand text-white hover:bg-brand/90">
              {createMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Megaphone className="mr-2 size-4" />}
              Publicar Comunicado
            </Button>
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {(list ?? []).length === 0 ? (
          <div className="col-span-full py-12 text-center border border-dashed rounded-2xl border-border bg-muted/20">
            <Megaphone className="size-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground font-medium">Nenhum aviso ativo no momento.</p>
          </div>
        ) : (
          (list ?? []).map((a: any) => (
            <div key={a.id} className="p-4 border rounded-2xl bg-card/50 flex items-start gap-3 relative group overflow-hidden">
              <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="grid size-9 place-items-center rounded-xl bg-brand/10 text-brand shrink-0">
                <Megaphone className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-sm truncate">{a.title}</div>
                  <Badge variant="outline" className="text-[10px] h-5 bg-background">
                    Ativo
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{a.content}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                   <div className="text-[10px] text-muted-foreground font-mono">{formatDateTime(a.created_at)}</div>
                   <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-3.5" />
                   </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
