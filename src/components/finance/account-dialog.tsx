import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACCOUNT_TYPES, useSaveAccount, type Account } from "@/lib/accounts";
import { parseAmount } from "@/lib/finance";
import { amountToInput, maskAmountInput } from "@/lib/money-input";
import { sanitizeText } from "@/lib/validation";

/** Cadastro de bancos, carteiras e cartões usados nos lançamentos. */
export function AccountDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
}) {
  const save = useSaveAccount();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState(account?.account_type ?? "checking");
  const [institution, setInstitution] = useState(account?.institution ?? "");
  const [balance, setBalance] = useState(
    account ? amountToInput(account.initial_balance) : "",
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cleanName = sanitizeText(name);
    const nextErrors: Record<string, string> = {};
    if (cleanName.length < 2) nextErrors.name = "Informe o nome da conta ou cartão.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const initial = balance ? parseAmount(balance) : 0;

    try {
      await save.mutateAsync({
        ...(account ? { id: account.id } : {}),
        values: {
          name: cleanName,
          account_type: type,
          institution: sanitizeText(institution) || null,
          initial_balance: initial,
          current_balance: account ? account.current_balance : initial,
          active: true,
        },
      });
      toast.success(account ? "Conta atualizada." : "Conta cadastrada.");
      onOpenChange(false);
    } catch (error) {
      console.error("[contas] falha ao salvar", error);
      toast.error("Não foi possível salvar a conta.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Editar conta" : "Nova conta, banco ou cartão"}</DialogTitle>
          <DialogDescription>
            Cadastre onde o dinheiro entra e sai para acompanhar cada saldo separadamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="account-name">Nome</Label>
            <Input
              id="account-name"
              className="mt-1.5"
              placeholder="Ex.: Nubank, Caixa, Cartão Visa"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name ? (
              <p className="mt-1 text-xs text-destructive" role="alert">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="account-type">Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="account-type" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="account-institution">Instituição</Label>
              <Input
                id="account-institution"
                className="mt-1.5"
                placeholder="Banco / bandeira"
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="account-balance">Saldo inicial</Label>
            <Input
              id="account-balance"
              className="mt-1.5"
              inputMode="decimal"
              placeholder="0,00"
              value={balance}
              onChange={(event) => setBalance(maskAmountInput(event.target.value))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
