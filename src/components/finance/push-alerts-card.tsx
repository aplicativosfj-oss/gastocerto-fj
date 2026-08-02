import { Bell, BellOff, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { usePushAlerts } from "@/lib/push-alerts";

/** Liga os avisos no celular/desktop para alertas, conquistas e resgates do Espaço Kids. */
export function PushAlertsCard() {
  const { permission, enabled, supported, request, setPreference } = usePushAlerts();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="size-4 text-brand" />
          Avisos no celular
        </CardTitle>
        <CardDescription>
          Receba um aviso na tela do aparelho quando houver alerta de saldo, conquista ou resgate no
          Espaço Kids. Funciona com o app aberto ou instalado na tela inicial.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!supported ? (
          <p className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            Este navegador não permite avisos no aparelho. Os alertas continuam aparecendo na
            central de notificações do aplicativo.
          </p>
        ) : permission !== "granted" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={async () => {
                const result = await request();
                if (result === "granted") toast.success("Avisos no aparelho ativados");
                if (result === "denied")
                  toast.error("Permissão negada. Libere as notificações nas configurações do navegador.");
              }}
              className="gap-2"
            >
              <Bell className="size-4" />
              Ativar avisos neste aparelho
            </Button>
            {permission === "denied" ? (
              <span className="text-xs text-muted-foreground">
                Bloqueado pelo navegador — libere nas permissões do site.
              </span>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold">
                {enabled ? "Avisos ativos neste aparelho" : "Avisos pausados"}
              </p>
              <p className="text-xs text-muted-foreground">
                Alertas de saldo baixo, limite, conquistas e resgates.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setPreference} />
          </div>
        )}

        {permission === "granted" && !enabled ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BellOff className="size-3.5" /> Você continua vendo tudo na central de avisos do app.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
