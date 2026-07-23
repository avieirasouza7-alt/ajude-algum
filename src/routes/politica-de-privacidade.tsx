import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PRIVACY_VERSION, PRIVACY_CONTACT_EMAIL, PRIVACY_CONTACT_FALLBACK } from "@/lib/privacy";
import { metaAbsoluteUrl, canonicalHeadLink, SITE_NAME } from "@/lib/site-meta";

const DESCRIPTION =
  "Política de Privacidade do Ajude Alguém Online. Saiba como coletamos, usamos e protegemos seus dados pessoais em campanhas solidárias via PIX.";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: `Política de Privacidade — ${SITE_NAME}` },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: `Política de Privacidade — ${SITE_NAME}` },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: metaAbsoluteUrl("/politica-de-privacidade") },
    ],
    links: [canonicalHeadLink("/politica-de-privacidade")],
  }),
  component: PoliticaDePrivacidade,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function PoliticaDePrivacidade() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Versão {PRIVACY_VERSION}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
          Política de Privacidade
        </h1>
        <p className="mt-3 text-muted-foreground">
          Esta Política explica como o Ajude Alguém trata dados pessoais de visitantes, doadores e
          criadores de campanhas, em conformidade com a Lei Geral de Proteção de Dados (Lei nº
          13.709/2018 — LGPD).
        </p>

        <div className="prose prose-sm mt-8 max-w-none">
          <Section title="1. Quem somos (controlador)">
            <p>
              O Ajude Alguém Online (<strong>{SITE_NAME}</strong>) é o controlador do tratamento dos
              dados pessoais descritos nesta Política, na qualidade de provedor da plataforma digital
              de campanhas solidárias. Atuamos como vitrine e canal de comunicação;{" "}
              <strong>não processamos pagamentos</strong> — as doações via PIX ocorrem diretamente
              entre doador e recebedor.
            </p>
            <p>
              Contato do encarregado / privacidade (LGPD):{" "}
              <a
                href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
                className="font-semibold text-primary hover:underline"
              >
                {PRIVACY_CONTACT_EMAIL}
              </a>{" "}
              (alternativa:{" "}
              <a
                href={`mailto:${PRIVACY_CONTACT_FALLBACK}`}
                className="font-semibold text-primary hover:underline"
              >
                {PRIVACY_CONTACT_FALLBACK}
              </a>
              ). Se você tiver CNPJ/MEI, complete os dados cadastrais oficiais junto à equipe para
              constarem nesta seção.
            </p>
          </Section>

          <Section title="2. Quais dados coletamos">
            <p>Podemos coletar e tratar as seguintes categorias de dados:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Dados de cadastro:</strong> nome, e-mail, senha (armazenada de forma
                criptografada pelo provedor de autenticação) e foto de perfil (quando login social
                for utilizado).
              </li>
              <li>
                <strong>Dados de campanha:</strong> título, história, categoria, cidade, estado,
                meta de arrecadação, nome do beneficiário, chave PIX, imagens enviadas e status de
                moderação.
              </li>
              <li>
                <strong>Interações:</strong> comentários, denúncias e registros de aceite de termos.
              </li>
              <li>
                <strong>Dados técnicos:</strong> endereço IP, tipo de navegador, páginas visitadas,
                data e hora de acesso, cookies e identificadores similares.
              </li>
            </ul>
            <p>
              Dados sensíveis não devem ser incluídos voluntariamente em campanhas ou comentários.
              Evite publicar documentos, CPF completo ou informações médicas desnecessárias.
            </p>
          </Section>

          <Section title="3. Para que usamos seus dados">
            <p>Utilizamos dados pessoais para:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>criar, autenticar e gerenciar sua conta;</li>
              <li>publicar, moderar e exibir campanhas solidárias;</li>
              <li>permitir comentários, denúncias e comunicação entre usuários;</li>
              <li>garantir segurança, prevenir fraudes e cumprir obrigações legais;</li>
              <li>melhorar a experiência e o funcionamento da plataforma;</li>
              <li>exibir anúncios de terceiros em páginas públicas, quando aplicável;</li>
              <li>responder solicitações, suporte e exercício de direitos do titular.</li>
            </ul>
          </Section>

          <Section title="4. Bases legais (LGPD)">
            <p>O tratamento de dados pessoais ocorre com fundamento em:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Consentimento:</strong> ao criar conta, aceitar termos ou utilizar recursos
                opcionais;
              </li>
              <li>
                <strong>Execução de contrato:</strong> para prestar os serviços da plataforma;
              </li>
              <li>
                <strong>Legítimo interesse:</strong> segurança, moderação, melhorias e prevenção a
                fraudes;
              </li>
              <li>
                <strong>Obrigação legal:</strong> quando exigido por autoridades ou legislação
                aplicável.
              </li>
            </ul>
          </Section>

          <Section title="5. Compartilhamento de dados">
            <p>
              Não vendemos seus dados pessoais. Podemos compartilhá-los apenas quando necessário
              com:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Provedores de infraestrutura:</strong> serviços de hospedagem, banco de
                dados e autenticação (como Supabase), para operação técnica da plataforma;
              </li>
              <li>
                <strong>Login social:</strong> Google, quando você optar por entrar com essa conta;
              </li>
              <li>
                <strong>Publicidade:</strong> parceiros como Google AdSense, que podem usar cookies
                próprios conforme suas políticas;
              </li>
              <li>
                <strong>Autoridades públicas:</strong> mediante ordem judicial ou requisição legal
                válida.
              </li>
            </ul>
            <p>
              Campanhas aprovadas são <strong>públicas</strong> e podem ser vistas por qualquer
              visitante, incluindo título, história, localização, imagens e chave PIX informada pelo
              criador.
            </p>
          </Section>

          <Section title="6. Doações via PIX">
            <p>
              O Ajude Alguém não recebe, armazena nem processa valores de doações. A chave PIX
              exibida na campanha é fornecida pelo criador e a transação ocorre diretamente no
              aplicativo bancário do doador. Dados financeiros da transação (comprovantes, extratos,
              saldo) permanecem entre as instituições financeiras e as partes envolvidas.
            </p>
            <p>
              A exibição da chave PIX no site é de <strong>responsabilidade única do criador</strong>{" "}
              da campanha. O doador está ciente de que seus dados bancários e/ou identificação da
              transferência podem aparecer no extrato de quem recebeu a doação, conforme regras do
              banco.
            </p>
          </Section>

          <Section title="7. Cookies e tecnologias similares">
            <p>
              Utilizamos cookies e tecnologias semelhantes para manter sessão de login, lembrar
              preferências, medir audiência e, quando habilitado, exibir anúncios. Você pode
              gerenciar cookies nas configurações do seu navegador; a desativação pode limitar
              funcionalidades da plataforma.
            </p>
          </Section>

          <Section title="8. Retenção e eliminação">
            <p>
              Mantemos dados enquanto sua conta estiver ativa ou enquanto forem necessários para
              cumprir finalidades descritas nesta Política, resolver disputas, cumprir obrigações
              legais ou proteger direitos da plataforma. Após exclusão da conta, dados podem ser
              mantidos de forma anonimizada ou pelo prazo legal mínimo exigido.
            </p>
            <p>
              <strong>Registros de acesso (Marco Civil da Internet):</strong> guardamos endereço IP,
              data/hora e ação associada (ex.: login, criação de campanha, denúncia) pelo prazo
              mínimo de <strong>6 (seis) meses</strong>, para cumprimento do art. 15 da Lei nº
              12.965/2014 e atendimento a autoridades competentes. Após esse prazo, os registros
              podem ser eliminados automaticamente.
            </p>
          </Section>

          <Section title="9. Segurança">
            <p>
              Adotamos medidas técnicas e organizacionais razoáveis para proteger dados pessoais,
              como controle de acesso, criptografia em trânsito e políticas de segurança em
              provedores. Nenhum sistema é 100% inviolável; recomendamos senhas fortes e cuidado ao
              compartilhar informações públicas em campanhas.
            </p>
          </Section>

          <Section title="10. Seus direitos como titular">
            <p>Nos termos da LGPD, você pode solicitar:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>confirmação da existência de tratamento;</li>
              <li>acesso, correção ou atualização de dados;</li>
              <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
              <li>portabilidade, quando aplicável;</li>
              <li>informação sobre compartilhamentos;</li>
              <li>revogação do consentimento, quando essa for a base legal.</li>
            </ul>
            <p>
              Para exercer seus direitos, utilize os canais de contato informados na plataforma.
              Responderemos dentro dos prazos legais.
            </p>
          </Section>

          <Section title="11. Crianças e adolescentes">
            <p>
              A plataforma não é direcionada a menores de 18 anos sem supervisão de responsável
              legal. Se identificarmos cadastro indevido de menor, poderemos suspender a conta e
              adotar medidas de proteção.
            </p>
          </Section>

          <Section title="12. Transferência internacional">
            <p>
              Alguns provedores de tecnologia utilizados pela plataforma podem processar dados em
              servidores fora do Brasil. Nesses casos, buscamos parceiros que ofereçam garantias
              adequadas de proteção, conforme exigido pela LGPD.
            </p>
          </Section>

          <Section title="13. Alterações desta Política">
            <p>
              Esta Política pode ser atualizada periodicamente. A versão vigente estará sempre
              disponível nesta página, com a data de revisão indicada no topo. Alterações relevantes
              podem ser comunicadas por meios razoáveis (aviso no site, e-mail ou painel da conta).
            </p>
          </Section>

          <Section title="14. Contato">
            <p>
              Em caso de dúvidas sobre privacidade ou tratamento de dados, entre em contato pelo
              e-mail do encarregado{" "}
              <a
                href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
                className="font-semibold text-primary hover:underline"
              >
                {PRIVACY_CONTACT_EMAIL}
              </a>{" "}
              ou pelo canal geral{" "}
              <a
                href={`mailto:${PRIVACY_CONTACT_FALLBACK}`}
                className="font-semibold text-primary hover:underline"
              >
                {PRIVACY_CONTACT_FALLBACK}
              </a>
              . Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados
              (ANPD), se entender necessário.
            </p>
          </Section>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
          Leia também os{" "}
          <Link to="/termos-de-uso" className="font-semibold text-primary hover:underline">
            Termos de Uso
          </Link>{" "}
          da plataforma.
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
