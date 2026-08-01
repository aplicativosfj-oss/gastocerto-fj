import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  KeyRound,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  adminDeleteMercadoPagoCredentials,
  adminGetMercadoPagoStatus,
  adminSaveMercadoPagoCredentials,
  adminTestMercadoPago,
  adminTestMercadoPagoOAuth,
} from "@/lib/admin-integrations.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";

type TestState = {
  ok: boolean;
  message: string;
  detail?: string;
  instructions?: string;
} | null;

/** Credenciais do Mercado Pago com teste de Access Token e de Client ID/Secret. */
export function MercadoPagoPanel() {
  const getStatus = useServerFn(adminGetMercadoPagoStatus);
  const saveCredentials = useServerFn(adminSaveMercadoPagoCredentials);
  const testToken = useServerFn(adminTestMercadoPago);
  const testOAuth = useServerFn(adminTestMercadoPagoOAuth);
  const removeCredentials = useServerFn(adminDeleteMercadoPagoCredentials);

  const [form, setForm] = useState({ publicKey: "", accessToken: "", clientId: "", clientSecret: "" });
  const [tokenResult, setTokenResult] = useState<TestState>(null);
  const [oauthResult, setOauthResult] = useState<TestState>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "mercadopago", "status"],
    queryFn: () => getStatus(),
    refetchInterval: 60_000,
  });

  const save = useMutation({
    mutationFn: () =>
      saveCredentials({
        data: {
          publicKey: form.publicKey || undefined,
          accessToken: form.accessToken || undefined,
          clientId: form.clientId || undefined,
          clientSecret: form.clientSecret || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Credenciais salvas", { description: "Passaram a valer imediatamente no servidor." });
      setForm({ publicKey: "", accessToken: "", clientId: "", clientSecret: "" });
      refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const runTokenTest = useMutation({
    mutationFn: () => testToken(),
    onSuccess: (result) => {
      setTokenResult(result);
      if (result.ok) toast.success(result.message, { description: result.detail });
      else toast.error(result.message, { description: result.instructions });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const runOAuthTest = useMutation({
    mutationFn: () => testOAuth(),
    onSuccess: (result) => {
      setOauthResult(result);
      if (result.ok) toast.success(result.message, { description: result.detail });
      else toast.error(result.message, { description: result.instructions });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const wipe = useMutation({
    mutationFn: () => removeCredentials(),
    onSuccess: () => {
      toast.success("Chaves removidas do banco de dados.");
      setTokenResult(null);
      setOauthResult(null);
      refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card className="border-brand/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-500">
              <CreditCard className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base">Mercado Pago</CardTitle>
              <CardDescription className="text-xs">
                Public key, Access token, Client ID e Client Secret com teste de conexão.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {data?.source === "database"
                ? "Chaves no banco"
                : data?.source === "environment"
                  ? "Chaves do ambiente"
                  : "Sem credenciais"}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {data?.environment === "sandbox" ? "Sandbox" : "Produção"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <RefreshCw className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <Summary label="Public key" value={data?.publicKeyMasked} filled={data?.hasPublicKey} />
              <Summary label="Access token" value={data?.accessTokenMasked} filled={data?.hasAccessToken} />
              <Summary label="Client ID" value={data?.clientIdMasked} filled={data?.hasClientId} />
              <Summary label="Client Secret" value={data?.clientSecretMasked} filled={data?.hasClientSecret} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Public key"
                value={form.publicKey}
                placeholder="APP_USR-..."
                onChange={(value) => setForm((prev) => ({ ...prev, publicKey: value }))}
              />
              <Field
                label="Access token"
                value={form.accessToken}
                placeholder="APP_USR-..."
                type="password"
                onChange={(value) => setForm((prev) => ({ ...prev, accessToken: value }))}
              />
              <Field
                label="Client ID"
                value={form.clientId}
                placeholder="3186086737"
                onChange={(value) => setForm((prev) => ({ ...prev, clientId: value }))}
              />
              <Field
                label="Client Secret"
                value={form.clientSecret}
                placeholder="••••••••"
                type="password"
                onChange={(value) => setForm((prev) => ({ ...prev, clientSecret: value }))}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" className="h-9 gap-2 text-xs" disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? <RefreshCw className="size-3 animate-spin" /> : <Save className="size-3" />}
                Salvar credenciais
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 text-xs"
                disabled={runTokenTest.isPending}
                onClick={() => runTokenTest.mutate()}
              >
                {runTokenTest.isPending ? (
                  <RefreshCw className="size-3 animate-spin" />
                ) : (
                  <ShieldCheck className="size-3" />
                )}
                Testar Access token
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 text-xs"
                disabled={runOAuthTest.isPending}
                onClick={() => runOAuthTest.mutate()}
              >
                {runOAuthTest.isPending ? (
                  <RefreshCw className="size-3 animate-spin" />
                ) : (
                  <KeyRound className="size-3" />
                )}
                Testar Client ID / Secret
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 gap-2 text-xs text-destructive"
                disabled={wipe.isPending}
                onClick={() => {
                  if (window.confirm("Remover as chaves salvas no banco de dados?")) wipe.mutate();
                }}
              >
                <Trash2 className="size-3" /> Remover chaves
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <ResultBox title="Access token" result={tokenResult} />
              <ResultBox title="Client ID / Client Secret" result={oauthResult} />
            </div>

            <p className="text-[11px] text-muted-foreground">
              Última rotação: {data?.rotatedAt ? formatDateTime(data.rotatedAt) : "—"}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Summary({ label, value, filled }: { label: string; value?: string; filled?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card/60 px-3 py-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono text-[11px] ${filled ? "" : "text-muted-foreground"}`}>
        {filled ? value : "não configurado"}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 font-mono text-xs"
      />
    </div>
  );
}

function ResultBox({ title, result }: { title: string; result: TestState }) {
  if (!result) {
    return (
      <div className="rounded-xl border border-dashed border-border p-3 text-[11px] text-muted-foreground">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 flex items-center gap-1">
          <AlertCircle className="size-3" /> Nenhum teste executado ainda.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-3 text-[11px] ${
        result.ok
          ? "border-success/30 bg-success/10 text-success"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      <p className="flex items-center gap-1 font-semibold">
        {result.ok ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
        {title} — {result.ok ? "conectado" : "desconectado"}
      </p>
      <p className="mt-1">{result.message}</p>
      {result.detail ? <p className="mt-1 break-words opacity-80">{result.detail}</p> : null}
      {result.instructions ? <p className="mt-1 opacity-80">{result.instructions}</p> : null}
    </div>
  );
}
