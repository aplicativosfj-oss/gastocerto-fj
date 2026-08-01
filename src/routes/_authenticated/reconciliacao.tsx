import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, CheckCircle2, Landmark, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/hooks/use-auth";
import { useTransactions } from "@/lib/transactions";
import { formatCurrency, formatDate } from "@/lib/format";
import { monthRange, MONTH_NAMES } from "@/lib/finance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getReconciliationData } from "@/lib/reconciliation.functions";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/reconciliacao")({
  head: () => ({
    meta: [
      { title: "Reconciliação Mensal — GastoCerto" },
      { name: "description", content: "Acompanhe receitas transferidas e o impacto no saldo." },
    ],
  }),
  component: ReconciliationPage,
});

function ReconciliationPage() {
  const { user } = useAuth();
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  
  const range = monthRange(currentYear, currentMonth);
  const { data: transactions } = useTransactions(range);
  
  const { data: recon } = useQuery({
    queryKey: ["reconciliation", user?.id, currentYear, currentMonth],
    enabled: !!user?.id,
    queryFn: () => getReconciliationData({ data: { userId: user!.id, year: currentYear, month: currentMonth } }),
  });

  const totals = useMemo(() => {
    const rows = transactions || [];
    const income = rows.filter(r => r.transaction_type === "income").reduce((s, r) => s + Number(r.amount), 0);
    const expense = rows.filter(r => r.transaction_type === "expense").reduce((s, r) => s + Number(r.amount), 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="page-title">Reconciliação Mensal</h1>
          <p className="text-muted-foreground">
            Acompanhe receitas transferidas e o impacto no saldo de {MONTH_NAMES[currentMonth - 1]}.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Receita Total do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.income)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Transferido de Julho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(recon?.totalTransferred || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.balance)}</div>
            </CardContent>
          </Card>
        </div>

        <Alert className="bg-primary/5 border-primary/20">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertTitle>Regra de Fluxo de Caixa</AlertTitle>
          <AlertDescription>
            Receitas da Prefeitura/Estado recebidas no final do mês passado foram automaticamente movidas para o dia 01/{String(currentMonth).padStart(2, '0')} para cobrir os gastos deste mês.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-muted-foreground" />
              Detalhamento das Receitas Transferidas
            </CardTitle>
            <CardDescription>
              Lançamentos que impactam o início do mês corrente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recon?.transferredIn.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma receita transferida identificada para este período.</p>
            ) : (
              <div className="space-y-4">
                {recon?.transferredIn.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                        <Wallet className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(t.transaction_date)} • {t.notes}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">{formatCurrency(Number(t.amount))}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center">
           <Alert variant="destructive" className="max-w-md">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Importante</AlertTitle>
             <AlertDescription>
               Lançamentos com datas incoerentes são detectados automaticamente pelo sistema para evitar erros de fluxo.
             </AlertDescription>
           </Alert>
        </div>
      </div>
    </AppShell>
  );
}
