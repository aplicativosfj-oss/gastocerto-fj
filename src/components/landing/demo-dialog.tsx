import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, Check, Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { DashboardPreview } from "@/components/landing/dashboard-preview";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const highlights = [
  "Resumo do mês com gasto, saldo e disponível",
  "Gráfico diário de despesas e comparativo mensal",
  "Orçamentos por categoria com alertas",
  "Combustível: consumo médio e custo por km",
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function DemoDialog({
  children,
  defaultTab = "imediato",
}: {
  children: React.ReactNode;
  defaultTab?: "imediato" | "agendar";
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState("10:00");

  function submitSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Preencha nome e e-mail para agendar.");
      return;
    }
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      setOpen(false);
      toast.success("Demonstração agendada!", {
        description: `Enviaremos a confirmação para ${email.trim()} — ${date
          .split("-")
          .reverse()
          .join("/")} às ${time}.`,
      });
    }, 700);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90svh] gap-4 overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-xl">Demonstração do GastoCerto</DialogTitle>
          <DialogDescription>
            Navegue pelo painel agora mesmo ou agende uma apresentação guiada — sem sair da
            homepage.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card p-2 shadow-soft">
            <div className="h-[420px] origin-top scale-[0.78] sm:h-[500px] sm:scale-90">
              <DashboardPreview />
            </div>
          </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="sm:flex-1" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Criar conta gratuita
                </Link>
              </Button>
              <Button variant="outline" className="sm:flex-1" asChild>
                <Link to="/demonstracao">Abrir demonstração completa</Link>
              </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
