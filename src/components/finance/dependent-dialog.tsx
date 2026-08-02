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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { amountToInput } from "@/lib/money-input";
import { parseAmount } from "@/lib/finance";
import {
  DEPENDENT_RELATIONS,
  useSaveDependent,
  type Dependent,
} from "@/lib/dependents";

const COLORS = ["#f97316", "#0ea5e9", "#22c55e", "#a855f7", "#f43f5e", "#eab308"];

/** Cadastro de filhos e dependentes usados nos gastos do dia a dia. */
export function DependentDialog({
  open,
  onOpenChange,
  dependent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dependent?: Dependent | null;
}) {
  const save = useSaveDependent();
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [relation, setRelation] = useState<string>("filho");
  const [birthDate, setBirthDate] = useState("");
  const [school, setSchool] = useState("");
  const [allowance, setAllowance] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(dependent?.name ?? "");
    setNickname(dependent?.nickname ?? "");
    setRelation(dependent?.relation ?? "filho");
    setBirthDate(dependent?.birth_date ?? "");
    setSchool(dependent?.school ?? "");
    setAllowance(amountToInput(dependent?.monthly_allowance ?? ""));
    setColor(dependent?.color ?? COLORS[0]);
    setNotes(dependent?.notes ?? "");
  }, [open, dependent]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Informe o nome do dependente.");
      return;
    }
    try {
      await save.mutateAsync({
        id: dependent?.id,
        values: {
          name: name.trim(),
          nickname: nickname.trim() || null,
          relation,
          birth_date: birthDate || null,
          school: school.trim() || null,
          monthly_allowance: allowance ? parseAmount(allowance) : null,
          color,
          notes: notes.trim() || null,
          active: true,
        },
      });
      toast.success(dependent ? "Dependente atualizado." : `${name.trim()} cadastrado.`);
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível salvar.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dependent ? "Editar dependente" : "Novo filho / dependente"}</DialogTitle>
          <DialogDescription>
            Cadastre cada filho para acompanhar os gastos extras separados por pessoa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="dep-name">Nome</Label>
            <Input
              id="dep-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1"
              maxLength={80}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="dep-nick">Apelido (opcional)</Label>
              <Input
                id="dep-nick"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                className="mt-1"
                maxLength={40}
              />
            </div>
            <div>
              <Label htmlFor="dep-relation">Parentesco</Label>
              <Select value={relation} onValueChange={setRelation}>
                <SelectTrigger id="dep-relation" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPENDENT_RELATIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="dep-birth">Nascimento (opcional)</Label>
              <Input
                id="dep-birth"
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dep-allowance">Mesada mensal (opcional)</Label>
              <MoneyInput
                id="dep-allowance"
                value={allowance}
                onValueChange={setAllowance}
                placeholder="0,00"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="dep-school">Escola / faculdade (opcional)</Label>
            <Input
              id="dep-school"
              value={school}
              onChange={(event) => setSchool(event.target.value)}
              className="mt-1"
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="dep-pin">PIN de Acesso (4 dígitos)</Label>
              <Input
                id="dep-pin"
                value={(dependent as any)?.pin_code || ""}
                onChange={(e) => setName(name)} // Placeholder, will fix handleSave
                placeholder="Ex: 1234"
                maxLength={4}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dep-recur">Dia da Mesada (1-28)</Label>
              <Input
                id="dep-recur"
                type="number"
                min="1"
                max="28"
                placeholder="Ex: 5"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="dep-limit">Limite de Alerta de Gastos</Label>
            <MoneyInput
              id="dep-limit"
              placeholder="0,00"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Cor de identificação</Label>

            <div className="mt-1.5 flex gap-2">
              {COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Cor ${option}`}
                  onClick={() => setColor(option)}
                  className={
                    color === option
                      ? "size-7 rounded-full ring-2 ring-ring ring-offset-2 ring-offset-background"
                      : "size-7 rounded-full"
                  }
                  style={{ backgroundColor: option }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="dep-notes">Observações</Label>
            <Textarea
              id="dep-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1"
              rows={2}
              maxLength={400}
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
