import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { parseAmount } from "@/lib/finance";
import { amountToInput } from "@/lib/money-input";
import { useSaveKidsGoal, type KidsSavingsGoal } from "@/lib/kids-goals";

/** Cadastro de metas mágicas (poupança) de cada criança. */
export function KidsGoalDialog({
  open,
  onOpenChange,
  dependentId,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dependentId: string;
  goal?: KidsSavingsGoal | null;
}) {
  const save = useSaveKidsGoal();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [reward, setReward] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(goal?.title ?? "");
    setTarget(amountToInput(goal?.target_amount ?? ""));
    setCurrent(amountToInput(goal?.current_amount ?? ""));
    setReward(goal?.reward ?? "");
  }, [open, goal]);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Dê um nome para a meta.");
      return;
    }
    const targetValue = target ? parseAmount(target) : 0;
    if (targetValue <= 0) {
      toast.error("Informe quanto a criança precisa juntar.");
      return;
    }
    const currentValue = current ? parseAmount(current) : 0;
    try {
      await save.mutateAsync({
        id: goal?.id,
        values: {
          dependent_id: dependentId,
          title: title.trim(),
          target_amount: targetValue,
          current_amount: currentValue,
          reward: reward.trim() || null,
          completed_at: currentValue >= targetValue ? new Date().toISOString() : null,
        },
      });
      toast.success(goal ? "Meta atualizada." : "Meta mágica criada!");
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível salvar a meta.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{goal ? "Editar meta" : "Nova meta mágica"}</DialogTitle>
          <DialogDescription>
            Defina o objetivo, quanto já foi guardado e a recompensa da conquista.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="goal-title">Objetivo</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Bicicleta nova"
              maxLength={80}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="goal-target">Valor da meta</Label>
              <MoneyInput
                id="goal-target"
                value={target}
                onValueChange={setTarget}
                placeholder="0,00"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="goal-current">Já guardado</Label>
              <MoneyInput
                id="goal-current"
                value={current}
                onValueChange={setCurrent}
                placeholder="0,00"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="goal-reward">Recompensa (opcional)</Label>
            <Input
              id="goal-reward"
              value={reward}
              onChange={(event) => setReward(event.target.value)}
              placeholder="Ex.: passeio no parque"
              maxLength={120}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={save.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
