import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";
import { activateLicense } from "@/lib/licenses.functions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  active: "Ativa",
  expired: "Expirada",
  revoked: "Revogada",
};

export function LicenseCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [key, setKey] = useState("");

  const license = useQuery({
    queryKey: ["my-license", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("licenses")
        .select("*, plans(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const activate = useMutation({
    mutationFn: () => activateLicense({ data: { licenseKey: key } }),
    onSuccess: async () => {
      toast.success("Licença ativada com sucesso");
      setKey("");
      await queryClient.invalidateQueries({ queryKey: ["my-license"] });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const current = license.data as any;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <KeyRound className="size-4 text-primary" />
        <h2 className="font-display text-base font-semibold">Assinatura e licença</h2>
      </div>

      {current ? (
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{current.license_key}</span>
            <Badge variant={current.status === "active" ? "default" : "secondary"}>
              {STATUS_LABEL[current.status] ?? current.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Plano {current.plans?.name ?? "—"} ·{" "}
            {current.billing_cycle === "annual" ? "Anual" : "Mensal"}
            {current.expires_at ? ` · válido até ${formatDateTime(current.expires_at)}` : ""}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Você ainda não possui uma licença ativa. Informe a chave recebida por e-mail após o
          pagamento via Pix.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Label htmlFor="license-key">Chave de licença</Label>
          <Input
            id="license-key"
            value={key}
            placeholder="GC-XXXX-XXXX-XXXX"
            onChange={(event) => setKey(event.target.value.toUpperCase())}
            className="font-mono"
          />
        </div>
        <Button disabled={key.length < 6 || activate.isPending} onClick={() => activate.mutate()}>
          {activate.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Ativar licença
        </Button>
      </div>
    </section>
  );
}
