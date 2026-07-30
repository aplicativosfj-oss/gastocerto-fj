import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal/legal-page";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — GastoCerto" },
      {
        name: "description",
        content:
          "Condições de uso do GastoCerto: cadastro por CPF, responsabilidades do usuário, planos e cancelamento.",
      },
      { property: "og:title", content: "Termos de Uso — GastoCerto" },
      {
        property: "og:description",
        content: "Condições de uso do GastoCerto: cadastro, responsabilidades, planos e cancelamento.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      eyebrow="Documento legal"
      title="Termos de Uso"
      intro="Estes termos descrevem as regras para usar o GastoCerto, um aplicativo de controle de gastos pessoais. Ao criar uma conta, você concorda com as condições abaixo."
      updatedAt="2026-07-30"
      sections={[
        {
          id: "aceite",
          title: "Aceite dos termos",
          body: (
            <p>
              O uso do GastoCerto está condicionado ao aceite destes termos e da política de
              privacidade. Se você não concordar com algum ponto, não crie uma conta e não utilize o
              aplicativo.
            </p>
          ),
        },
        {
          id: "conta",
          title: "Conta e acesso",
          body: (
            <>
              <p>
                O cadastro é feito com CPF válido e uma senha numérica de 6 dígitos. Você é
                responsável por manter essa senha em sigilo e por todas as ações realizadas na sua
                conta.
              </p>
              <p>
                É proibido criar contas com dados de terceiros ou compartilhar o acesso. Suspeitas
                de uso indevido devem ser comunicadas imediatamente ao suporte.
              </p>
            </>
          ),
        },
        {
          id: "uso",
          title: "Uso permitido",
          body: (
            <>
              <p>
                O GastoCerto serve para registrar despesas, receitas, abastecimentos, contas
                recorrentes, orçamentos e metas pessoais. Você concorda em não usar o serviço para
                atividades ilícitas, tentativas de invasão, engenharia reversa ou sobrecarga
                proposital da plataforma.
              </p>
              <p>
                Os dados lançados são de sua responsabilidade. O aplicativo apresenta cálculos e
                alertas com base no que você informa e não substitui aconselhamento financeiro,
                contábil ou jurídico.
              </p>
            </>
          ),
        },
        {
          id: "conteudo",
          title: "Seus dados e conteúdo",
          body: (
            <p>
              Os lançamentos, comprovantes e anexos enviados continuam sendo seus. Você concede ao
              GastoCerto apenas a permissão técnica necessária para armazenar e exibir esse conteúdo
              dentro da sua própria conta.
            </p>
          ),
        },
        {
          id: "planos",
          title: "Planos, cobrança e cancelamento",
          body: (
            <p>
              Há um plano gratuito com recursos essenciais e planos pagos com recursos adicionais.
              Valores, ciclos de cobrança e condições de renovação são exibidos antes da
              contratação. O cancelamento pode ser solicitado a qualquer momento e passa a valer no
              fim do ciclo já pago, sem novas cobranças.
            </p>
          ),
        },
        {
          id: "disponibilidade",
          title: "Disponibilidade e alterações",
          body: (
            <p>
              Trabalhamos para manter o serviço disponível, mas podem ocorrer interrupções para
              manutenção, atualização ou por fatores fora do nosso controle. Recursos podem ser
              alterados ou descontinuados, com aviso prévio sempre que a mudança for relevante.
            </p>
          ),
        },
        {
          id: "encerramento",
          title: "Encerramento da conta",
          body: (
            <p>
              Você pode encerrar sua conta quando quiser. Também podemos suspender contas que violem
              estes termos ou coloquem em risco a segurança de outras pessoas. Após o encerramento,
              seus dados são removidos conforme descrito na política de privacidade.
            </p>
          ),
        },
        {
          id: "responsabilidade",
          title: "Limitação de responsabilidade",
          body: (
            <p>
              O GastoCerto é fornecido no estado em que se encontra. Não nos responsabilizamos por
              decisões financeiras tomadas com base nos relatórios, nem por perdas decorrentes de
              informações incorretas inseridas pelo usuário ou de uso indevido da senha.
            </p>
          ),
        },
        {
          id: "foro",
          title: "Legislação aplicável",
          body: (
            <p>
              Estes termos são regidos pela legislação brasileira, incluindo o Código de Defesa do
              Consumidor e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
            </p>
          ),
        },
      ]}
    />
  );
}
