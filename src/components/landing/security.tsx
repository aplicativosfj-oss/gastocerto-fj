import { Download, Fingerprint, KeyRound, Lock, ScrollText, Trash2 } from "lucide-react";

const items = [
  {
    icon: Lock,
    title: "Dados protegidos",
    description: "Comunicação criptografada e armazenamento em infraestrutura gerenciada.",
  },
  {
    icon: Fingerprint,
    title: "Controle individual de acesso",
    description:
      "Regras no banco de dados garantem que cada usuário acesse somente os próprios registros.",
  },
  {
    icon: KeyRound,
    title: "Senhas protegidas",
    description: "As senhas são tratadas pelo provedor de autenticação e nunca ficam visíveis.",
  },
  {
    icon: Download,
    title: "Exporte seus dados",
    description: "Baixe todo o seu histórico em CSV ou PDF quando quiser.",
  },
  {
    icon: Trash2,
    title: "Exclua sua conta",
    description: "A exclusão remove seus dados pessoais e financeiros da plataforma.",
  },
  {
    icon: ScrollText,
    title: "Adequação à LGPD",
    description: "Transparência sobre o que é coletado, por quê e por quanto tempo.",
  },
];

export function Security() {
  return (
    <section id="seguranca" className="border-y border-border bg-secondary/40 py-14 sm:py-16">
      <div className="section-shell">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand">Segurança e privacidade</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Seus dados financeiros são seus — e só seus
          </h2>
          <p className="mt-4 text-muted-foreground">
            Privacidade não é um recurso extra: é a base do GastoCerto.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-success/12 text-success">
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
