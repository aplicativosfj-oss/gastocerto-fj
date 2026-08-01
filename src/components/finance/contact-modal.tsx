import { useState } from "react";
import { Mail, Send, Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useProfile } from "@/lib/queries";
import { createSupportTicket } from "@/lib/admin-expansion.functions";
import { useServerFn } from "@tanstack/react-start";

export function ContactModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: profile } = useProfile();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createTicket = useServerFn(createSupportTicket);

  const [subject, setSubject] = useState("Suporte GastoCerto");
  const [message, setMessage] = useState(
    profile
      ? `Olá! Sou o(a) ${profile.full_name} e gostaria de ajuda com...`
      : "Olá! Gostaria de saber mais sobre o GastoCerto..."
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!subject.trim() || !message.trim()) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setSending(true);

    try {
      // Simula envio de e-mail (em produção integraria com serviço de e-mail)
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // 5% de chance de erro simulado para testar UI
          if (Math.random() > 0.95) reject(new Error("Falha na conexão com o servidor."));
          else resolve(true);
        }, 1200);
      });

      setSent(true);
      toast.success("Mensagem enviada com sucesso!");
      
      setTimeout(() => {
        onOpenChange(false);
        setSent(false);
      }, 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar mensagem.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-5 text-brand" />
            Entre em contato
          </DialogTitle>
          <DialogDescription>
            Envie sua dúvida ou sugestão para nossa equipe técnica.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="size-12 text-success mb-4" />
            <p className="font-semibold">Mensagem Enviada!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Responderemos em breve no seu e-mail de cadastro.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {error && (
              <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="contact-dest">Para</Label>
              <Input
                id="contact-dest"
                value="aplicativosfj@gmail.com"
                readOnly
                className="bg-muted text-muted-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-subject">Assunto</Label>
              <Input
                id="contact-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Dúvida sobre orçamentos"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-message">Mensagem</Label>
              <Textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva como podemos ajudar..."
                className="min-h-[120px]"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              {sending ? "Enviando..." : "Enviar Mensagem"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
