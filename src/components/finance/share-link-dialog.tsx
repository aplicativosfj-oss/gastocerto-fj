import { useState } from "react";
import { Copy, Link2, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/format";
import {
  shareLinkStatus,
  shareLinkUrl,
  useCreateShareLink,
  useDeleteShareLink,
  useRevokeShareLink,
  useShareLinks,
} from "@/lib/share-links";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DURATIONS = [
  { label: "7 dias", value: 7 },
  { label: "15 dias", value: 15 },
  { label: "30 dias", value: 30 },
  { label: "Sem expirar", value: null },
] as const;

type Props = { year: number; month: number };

/** Gera links somente leitura, protegidos por senha, para quem não tem conta. */
export function ShareLinkDialog({ year, month }: Props) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(7);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const { data: links } = useShareLinks();
  const create = useCreateShareLink();
  const revoke = useRevokeShareLink();
  const remove = useDeleteShareLink();

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  };

  const submit = async () => {
    if (password.trim().length < 4) {
      toast.error("Defina uma senha com pelo menos 4 caracteres.");
      return;
    }
    try {
      const row = await create.mutateAsync({
        label: label.trim() || undefined,
        password: password.trim(),
        year,
        month,
        includeTransactions,
        includeNotes,
        expiresInDays,
      });
      const url = shareLinkUrl(row.token);
      setLastUrl(url);
      setPassword("");
      setLabel("");
      await copy(url);
      toast.success("Link criado e copiado. Envie a senha por outro canal.");
    } catch {
      toast.error("Não foi possível criar o link.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Link2 className="mr-2 size-4" aria-hidden />
          Compartilhar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compartilhar com senha</DialogTitle>
          <DialogDescription>
            Gera um link somente leitura de {MONTHS[month - 1]} de {year}. Quem receber só precisa
            da senha — não é necessário criar conta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="share-label">Identificação (opcional)</Label>
              <Input
                id="share-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Ex.: Contador, esposa"
                maxLength={80}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="share-password">Senha de acesso</Label>
              <Input
                id="share-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="mínimo 4 caracteres"
                maxLength={64}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Validade
            </Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {DURATIONS.map((item) => (
                <Button
                  key={item.label}
                  type="button"
                  size="sm"
                  variant={expiresInDays === item.value ? "secondary" : "outline"}
                  onClick={() => setExpiresInDays(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="share-tx" className="text-sm font-normal">
                Mostrar a lista de lançamentos
              </Label>
              <Switch
                id="share-tx"
                checked={includeTransactions}
                onCheckedChange={setIncludeTransactions}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="share-notes" className="text-sm font-normal">
                Incluir minhas anotações
              </Label>
              <Switch
                id="share-notes"
                checked={includeNotes}
                onCheckedChange={setIncludeNotes}
                disabled={!includeTransactions}
              />
            </div>
          </div>

          <Button type="button" className="w-full" onClick={submit} disabled={create.isPending}>
            {create.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ) : (
              <ShieldCheck className="mr-2 size-4" aria-hidden />
            )}
            Gerar link protegido
          </Button>

          {lastUrl && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">Link gerado</p>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 truncate text-xs">{lastUrl}</code>
                <Button type="button" size="sm" variant="secondary" onClick={() => copy(lastUrl)}>
                  <Copy className="size-3.5" aria-hidden />
                </Button>
              </div>
            </div>
          )}

          {(links ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Links criados
              </p>
              {(links ?? []).map((link) => {
                const status = shareLinkStatus(link);
                return (
                  <div
                    key={link.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        {link.label ?? `${MONTHS[link.month - 1]}/${link.year}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {MONTHS[link.month - 1]}/{link.year} · {link.view_count} acesso(s)
                        {link.expires_at ? ` · até ${formatDate(link.expires_at)}` : " · sem expirar"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge variant={status === "ativo" ? "secondary" : "outline"}>{status}</Badge>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Copiar link"
                        onClick={() => copy(shareLinkUrl(link.token))}
                      >
                        <Copy className="size-3.5" aria-hidden />
                      </Button>
                      {status === "ativo" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => revoke.mutate(link.id)}
                        >
                          Revogar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Excluir link"
                          onClick={() => remove.mutate(link.id)}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
