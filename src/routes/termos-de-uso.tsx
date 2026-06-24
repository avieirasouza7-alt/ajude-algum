import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TERMS_VERSION } from "@/lib/terms";
import { absoluteSiteUrl } from "@/lib/site-meta";

const DESCRIPTION =
  "Termos de Uso da plataforma Ajude Alguém. Leia as regras, responsabilidades e condições para criar campanhas solidárias e receber doações via PIX.";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Ajude Alguém" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Termos de Uso — Ajude Alguém" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: absoluteSiteUrl("/termos-de-uso") },
    ],
    links: [{ rel: "canonical", href: absoluteSiteUrl("/termos-de-uso") }],
  }),
  component: TermosDeUso,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function TermosDeUso() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Versão {TERMS_VERSION}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Termos de Uso</h1>
        <p className="mt-3 text-muted-foreground">
          Ao criar conta, entrar ou utilizar o Ajude Alguém, você declara que leu, compreendeu e
          concorda integralmente com estes Termos de Uso.
        </p>

        <div className="prose prose-sm mt-8 max-w-none">
          <Section title="1. O que é o Ajude Alguém">
            <p>
              O Ajude Alguém é uma plataforma digital que permite a divulgação de campanhas
              solidárias e a conexão entre pessoas que desejam ajudar e pessoas ou causas que
              precisam de apoio. A plataforma{" "}
              <strong>
                não arrecada, não recebe, não guarda e não repassa valores financeiros
              </strong>
              . Todas as doações são feitas diretamente via PIX, da conta do doador para a chave PIX
              informada pelo criador da campanha.
            </p>
          </Section>

          <Section title="2. Quem pode usar">
            <p>
              Para utilizar recursos de criação e gestão de campanhas, você deve ter pelo menos 18
              anos, possuir capacidade civil plena e fornecer informações verdadeiras no cadastro.
              Menores de idade só podem utilizar a plataforma com autorização e supervisão de
              responsável legal, quando permitido pela legislação aplicável.
            </p>
          </Section>

          <Section title="3. Sua responsabilidade pelas campanhas">
            <p>
              Ao publicar uma campanha, você é o único responsável por todo o conteúdo enviado,
              incluindo título, história, fotos, vídeos, valores de meta, nome do beneficiário,
              categoria, localização e qualquer outra informação exibida.
            </p>
            <p>Você garante que:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>as informações são verdadeiras, completas e atualizadas;</li>
              <li>tem autorização para usar imagens, textos e dados de terceiros;</li>
              <li>a campanha não viola leis, direitos de terceiros ou estes Termos;</li>
              <li>o valor arrecadado será utilizado conforme descrito na campanha.</li>
            </ul>
          </Section>

          <Section title="4. Responsabilidade pela chave PIX">
            <p>
              A chave PIX cadastrada na campanha é de sua exclusiva responsabilidade. Você declara
              ser titular ou possuir autorização legal para receber os valores na chave informada.
            </p>
            <p>
              O Ajude Alguém <strong>não se responsabiliza</strong> por erros de digitação, chaves
              incorretas, fraudes, desvios de valores, problemas bancários ou qualquer prejuízo
              decorrente do uso da chave PIX ou do recebimento de doações. Doações são voluntárias e
              feitas diretamente entre doador e recebedor.
            </p>
          </Section>

          <Section title="5. Anúncios, divulgação e conteúdo publicado">
            <p>
              Você é integralmente responsável pela forma como divulga sua campanha, inclusive em
              redes sociais, WhatsApp, anúncios pagos, grupos, e-mails ou qualquer outro meio.
            </p>
            <p>
              Compromissos, promessas, valores, prazos, imagens e textos usados na divulgação são de
              sua responsabilidade. A plataforma pode exibir anúncios de terceiros (como Google
              AdSense) em páginas públicas; isso não implica endosso, patrocínio ou responsabilidade
              do Ajude Alguém sobre campanhas individuais.
            </p>
          </Section>

          <Section title="6. Moderação e aprovação">
            <p>
              Campanhas podem passar por análise antes de serem publicadas. O Ajude Alguém pode
              aprovar, recusar, suspender, editar solicitações de alteração ou remover campanhas a
              qualquer momento, especialmente quando houver indícios de fraude, informação falsa,
              conteúdo ilegal, ofensivo, discriminatório ou que viole estes Termos.
            </p>
            <p>
              A aprovação de uma campanha não significa validação da veracidade dos fatos, garantia
              de resultado ou responsabilidade solidária da plataforma.
            </p>
          </Section>

          <Section title="7. Condutas proibidas">
            <p>É proibido utilizar a plataforma para:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>criar campanhas falsas, enganosas ou que induzam doadores a erro;</li>
              <li>simular doações, metas ou comprovantes;</li>
              <li>publicar conteúdo ilegal, difamatório, odioso ou que viole privacidade;</li>
              <li>usar dados ou imagens de terceiros sem autorização;</li>
              <li>burlar moderação, denúncias ou sistemas de segurança;</li>
              <li>praticar spam, phishing ou qualquer forma de golpe.</li>
            </ul>
          </Section>

          <Section title="8. Doações e relação com doadores">
            <p>
              O Ajude Alguém não participa da transação financeira entre doador e criador da
              campanha. Eventuais disputas, reembolsos, comprovantes ou descumprimento de promessas
              devem ser tratados diretamente entre as partes envolvidas, observada a legislação
              aplicável.
            </p>
          </Section>

          <Section title="9. Limitação de responsabilidade">
            <p>
              Na máxima extensão permitida pela lei, o Ajude Alguém não responde por danos diretos,
              indiretos, lucros cessantes, perda de dados, fraudes de usuários, falhas de internet,
              indisponibilidade temporária do serviço ou conteúdo publicado por terceiros.
            </p>
          </Section>

          <Section title="10. Privacidade e dados pessoais">
            <p>
              Ao utilizar a plataforma, você concorda com o tratamento dos dados necessários para
              funcionamento do serviço, autenticação, moderação, segurança e comunicações
              relacionadas à sua conta, em conformidade com a Lei Geral de Proteção de Dados (Lei nº
              13.709/2018).
            </p>
          </Section>

          <Section title="11. Encerramento de conta">
            <p>
              Você pode encerrar sua conta a qualquer momento. O Ajude Alguém pode suspender ou
              encerrar contas que violem estes Termos, sem prejuízo de medidas legais cabíveis.
            </p>
          </Section>

          <Section title="12. Alterações destes Termos">
            <p>
              Estes Termos podem ser atualizados a qualquer momento. Quando houver mudança
              relevante, a versão vigente será publicada nesta página. O uso continuado da
              plataforma após a atualização implica aceite da nova versão. Se você não concordar,
              deve deixar de usar o serviço.
            </p>
          </Section>

          <Section title="13. Foro e legislação">
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o
              foro da comarca do domicílio do usuário, salvo disposição legal em contrário.
            </p>
          </Section>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
          Leia também a{" "}
          <Link
            to="/politica-de-privacidade"
            className="font-semibold text-primary hover:underline"
          >
            Política de Privacidade
          </Link>
          . Dúvidas sobre estes Termos? Entre em contato pelos canais oficiais informados na
          plataforma.
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link to="/auth" className="font-semibold text-primary hover:underline">
            Voltar para entrar ou cadastrar
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
