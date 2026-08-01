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
        <h3 className="font-semibold">Avisos Globais</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 size-4" />
          Novo Aviso
        </Button>
      </div>

      {showForm && (
        <form className="p-4 border rounded-xl bg-card space-y-3" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          createMutation.mutate({ data: {
            title: String(fd.get('title')),
            content: String(fd.get('content')),
            type: 'info',
            active: true
          }});
        }}>
          <div className="space-y-1">
            <Label>Título</Label>
            <Input name="title" required />
          </div>
          <div className="space-y-1">
            <Label>Conteúdo</Label>
            <Textarea name="content" required />
          </div>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="animate-spin" /> : "Publicar agora"}
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {(list ?? []).map((a: any) => (
          <div key={a.id} className="p-3 border rounded-xl bg-card flex items-start gap-3">
            <Megaphone className="size-5 text-primary shrink-0 mt-1" />
            <div>
              <div className="font-medium">{a.title}</div>
              <p className="text-sm text-muted-foreground">{a.content}</p>
              <div className="text-[10px] text-muted-foreground mt-2">{formatDateTime(a.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
