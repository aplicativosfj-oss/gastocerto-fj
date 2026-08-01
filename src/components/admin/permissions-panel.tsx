import { useQuery, useMutation } from "@tanstack/react-query";
import { adminUpdateStaffPermissions } from "@/lib/admin-permissions.functions";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Shield, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const PERMISSION_KEYS = [
  { key: "clear_audit", label: "Limpar Auditoria", icon: ShieldAlert },
  { key: "manage_integrations", label: "Gerenciar Integrações", icon: Shield },
  { key: "edit_plans", label: "Editar Planos e Preços", icon: ShieldCheck },
];

export function PermissionsPanel({ targetUserId, currentPermissions = {} }: { targetUserId: string, currentPermissions?: Record<string, boolean> }) {
  const updatePermissions = useServerFn(adminUpdateStaffPermissions);
  const [perms, setPerms] = useState<Record<string, boolean>>(currentPermissions);

  const mutation = useMutation({
    mutationFn: (newPerms: Record<string, boolean>) => 
      updatePermissions({ data: { targetUserId, permissions: newPerms } }),
    onSuccess: () => toast.success("Permissões atualizadas com sucesso."),
    onError: () => toast.error("Falha ao atualizar permissões.")
  });

  const toggle = (key: string) => {
    const next = { ...perms, [key]: !perms[key] };
    setPerms(next);
  };

  return (
    <Card className="border-brand/20 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Shield className="size-4 text-brand" /> Controle de Acesso Staff
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {PERMISSION_KEYS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.key} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <Label htmlFor={`perm-${p.key}`} className="text-xs cursor-pointer">{p.label}</Label>
                </div>
                <Checkbox 
                  id={`perm-${p.key}`} 
                  checked={perms[p.key] || false} 
                  onCheckedChange={() => toggle(p.key)}
                />
              </div>
            );
          })}
        </div>
        <Button 
          size="sm" 
          className="w-full h-8" 
          onClick={() => mutation.mutate(perms)}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <Loader2 className="size-3 animate-spin mr-2" /> : null}
          Salvar Permissões
        </Button>
      </CardContent>
    </Card>
  );
}