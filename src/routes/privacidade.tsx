import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal/legal-page";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — GastoCerto" },
      {
        name: "description",
        content:
          "Como o GastoCerto coleta, usa, protege e exclui seus dados pessoais e financeiros, conforme a LGPD.",
      },
      { property: "og:title", content: "Política de Privacidade — GastoCerto" },
      {
        property: "og:description",
        content: "Como o GastoCerto trata seus dados pessoais e financeiros, conforme a LGPD.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Documento legal"
      title="Política de Privacidade"
      intro="Esta política explica quais dados o GastoCerto coleta, para que eles são usados, como são protegidos e quais são os seus direitos como titular, de acordo com a LGPD."
      updatedAt="2026-07-30"
      sections={[
        {
          id: "dados",
          title: "Dados que coletamos",
          body: (
            <>
              <p>
                <strong className="text-foreground">Cadastro:</strong> nome completo, CPF e, se você
                quiser, um e-mail de contato para recuperação de senha.
              </p>
              <p>
                <strong className="text-foreground">Uso do aplicativo:</strong> lançamentos de
                despesas e receitas, categorias, contas, cartões, orçamentos, metas, veículos,
                abastecimentos, odômetro e comprovantes que você anexar.
              </p>
              <p>
                <strong className="text-foreground">Técnicos:</strong> registros de acesso e de
                alterações sensíveis (como edições de odômetro), usados para segurança e auditoria.
              </p>
            </>
          ),
        },
        {
          id: "finalidade",
          title: "Como usamos seus dados",
          body: (
            <p>
              Os dados são usados para operar sua conta, calcular indicadores e relatórios, gerar
              alertas de vencimento e orçamento, dar suporte quando você solicitar e manter a
              segurança da plataforma. Não vendemos seus dados nem os usamos para publicidade de
              terceiros.
            </p>
          ),
        },
        {
          id: "base-legal",
          title: "Base legal (LGPD)",
          body: (
            <p>
              O tratamento se apoia na execução do contrato firmado com você (uso do serviço), no
              cumprimento de obrigações legais e no legítimo interesse de manter a segurança do
              sistema. Quando algum uso exigir consentimento específico, ele será solicitado de
              forma separada e poderá ser revogado.
            </p>
          ),
        },
        {
          id: "compartilhamento",
          title: "Compartilhamento",
          body: (
            <p>
              Compartilhamos dados apenas com os provedores de infraestrutura necessários para o
              funcionamento do aplicativo (hospedagem, banco de dados e armazenamento de arquivos),
              sempre limitados ao necessário, ou quando houver determinação legal ou judicial.
            </p>
          ),
        },
        {
          id: "seguranca",
          title: "Segurança e isolamento de contas",
          body: (
            <>
              <p>
                O tráfego é protegido por HTTPS e o banco de dados aplica regras de acesso por linha,
                de forma que cada conta só enxerga os próprios registros. Comprovantes ficam em
                armazenamento privado, acessível apenas por links temporários gerados para o dono do
                arquivo.
              </p>
              <p>
                Nenhum sistema é totalmente imune a incidentes. Em caso de evento de segurança
                relevante, comunicaremos os titulares afetados e a autoridade competente conforme a
                LGPD.
              </p>
            </>
          ),
        },
        {
          id: "retencao",
          title: "Retenção e exclusão",
          body: (
            <p>
              Mantemos seus dados enquanto a conta existir. Ao solicitar a exclusão, os dados
              pessoais e financeiros são removidos, salvo registros que precisem ser preservados por
              obrigação legal ou para defesa em processos.
            </p>
          ),
        },
        {
          id: "direitos",
          title: "Seus direitos",
          body: (
            <p>
              Você pode confirmar a existência de tratamento, acessar, corrigir, exportar (CSV/PDF
              dentro do próprio painel), solicitar anonimização ou exclusão dos dados e revogar
              consentimentos. Os pedidos podem ser feitos pelo canal de suporte informado no
              aplicativo.
            </p>
          ),
        },
        {
          id: "cookies",
          title: "Cookies e armazenamento local",
          body: (
            <p>
              Usamos armazenamento local do navegador para manter sua sessão ativa e lembrar
              preferências como tema e alto contraste. Não utilizamos cookies de publicidade
              comportamental.
            </p>
          ),
        },
        {
          id: "criancas",
          title: "Uso por menores",
          body: (
            <p>
              O GastoCerto é destinado a maiores de 18 anos. Contas identificadas como de menores
              sem responsável legal podem ser encerradas.
            </p>
          ),
        },
      ]}
    />
  );
}
