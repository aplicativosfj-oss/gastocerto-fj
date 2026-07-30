import { Link } from "@tanstack/react-router";
import {
  Download,
  Fingerprint,
  KeyRound,
  Lock,
  ScrollText,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const pillars = [
  {
    icon: ScrollText,
    title: "LGPD na prática",
    summary: "Você sabe o que coletamos, para quê e por quanto tempo.",
    points: [
      "Coletamos apenas o necessário: e-mail, nome e os lançamentos que você registra.",
      "Nunca vendemos nem compartilhamos seus dados com terceiros para publicidade.",
      "Você pode exportar tudo em CSV/PDF ou excluir a conta e os dados quando quiser.",
    ],
  },
  {
    icon: Lock,
    title: "Criptografia",
    summary: "Seus dados viajam e ficam guardados protegidos.",
    points: [
      "Todo o tráfego entre você e o app usa HTTPS/TLS.",
      "Os dados ficam em banco gerenciado com criptografia em repouso.",
      "Comprovantes ficam em armazenamento privado, acessível só por links temporários.",
    ],
  },
  {
    icon: Fingerprint,
    title: "Controle de acesso",
    summary: "Cada conta enxerga somente os próprios registros.",
    points: [
      "Regras de segurança no banco isolam os dados por usuário (row level security).",
      "Senhas são tratadas pelo provedor de autenticação e nunca ficam visíveis.",
      "Sessões podem ser encerradas a qualquer momento pelo seu perfil.",
    ],
  },
];

const extras = [
  { icon: KeyRound, label: "Login com senha forte e recuperação por e-mail" },
  { icon: Download, label: "Exportação completa do histórico em CSV ou PDF" },
  { icon: Trash2, label: "Exclusão definitiva da conta e dos dados financeiros" },
  { icon: ShieldCheck, label: "Nenhum acesso à sua conta bancária: você registra o que quiser" },
];

export function Security() {
  return (
    <section id="seguranca" className="border-y border-border bg-secondary/40 py-7 sm:py-10">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand">Segurança e privacidade</p>
          <h2 className="mt-2 font-display text-[1.5rem] font-bold tracking-[-0.025em] sm:text-[2rem] lg:text-4xl">
            Seus dados financeiros são seus — e só seus
          </h2>
          <p className="mt-4 text-muted-foreground">
            Antes de criar sua conta, veja de forma objetiva como tratamos LGPD, criptografia e
            controle de acesso.
          </p>
        </div>

        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-success/12 text-success">
                <pillar.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{pillar.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{pillar.summary}</p>
              <ul className="mt-4 space-y-2.5">
                {pillar.points.map((point) => (
                  <li key={point} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success"
                      aria-hidden="true"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {extras.map((extra) => (
              <div key={extra.label} className="flex gap-3">
                <extra.icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                <p className="text-sm leading-relaxed text-muted-foreground">{extra.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="sm:w-auto">
              <Link to="/auth" search={{ mode: "signup" }}>
                Criar conta com segurança
              </Link>
            </Button>
            <Button variant="outline" asChild className="sm:w-auto">
              <Link to="/demonstracao">Ver a demonstração antes</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
