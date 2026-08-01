import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminGetPlanConfigs, adminUpdatePlanConfig } from "@/lib/admin-expansion.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";

export function PlanConfigsPanel() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin", "plan-configs"],
    queryFn: () => adminGetPlanConfigs(),
  });

  const updateMutation = useMutation({
    mutationFn: adminUpdatePlanConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "plan-configs"] });
      toast.success("Plano atualizado");
      setEditingId(null);
    },
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Slug</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Mensal (R$)</TableHead>
            <TableHead>Anual (R$)</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(plans ?? []).map((plan: any) => (
            <TableRow key={plan.id}>
              <TableCell className="font-mono text-xs">{plan.slug}</TableCell>
              <TableCell>{plan.name}</TableCell>
              <TableCell>
                {editingId === plan.id ? (
                  <Input 
                    type="number" 
                    defaultValue={plan.monthly_price} 
                    className="w-24 h-8"
                    id={`price-m-${plan.id}`}
                  />
                ) : (
                  plan.monthly_price
                )}
              </TableCell>
              <TableCell>
                {editingId === plan.id ? (
                  <Input 
                    type="number" 
                    defaultValue={plan.annual_price} 
                    className="w-24 h-8"
                    id={`price-a-${plan.id}`}
                  />
                ) : (
                  plan.annual_price
                )}
              </TableCell>
              <TableCell className="text-right">
                {editingId === plan.id ? (
                  <Button 
                    size="sm" 
                    onClick={() => {
                      const m = Number((document.getElementById(`price-m-${plan.id}`) as HTMLInputElement).value);
                      const a = Number((document.getElementById(`price-a-${plan.id}`) as HTMLInputElement).value);
                      updateMutation.mutate({ data: { id: plan.id, monthlyPrice: m, annualPrice: a, limits: plan.limits } });
                    }}
                  >
                    <Save className="mr-2 size-4" />
                    Salvar
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setEditingId(plan.id)}>Editar</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
