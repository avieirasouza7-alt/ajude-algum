import { Link } from "@tanstack/react-router";
import { HeartHandshake } from "lucide-react";
import { SITE_CONTACT_EMAILS, SITE_NAME, mailtoContactUrl } from "@/lib/site-meta";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl gradient-warm text-primary-foreground">
                <HeartHandshake className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-extrabold">{SITE_NAME}</span>
            </div>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Uma plataforma de vaquinhas solidárias para transformar histórias com a força da
              comunidade. 100% via PIX, sem taxas escondidas.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold">Plataforma</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/campanhas" className="hover:text-primary">
                  Ver campanhas
                </Link>
              </li>
              <li>
                <Link to="/nova-campanha" className="hover:text-primary">
                  Criar campanha
                </Link>
              </li>
              <li>
                <Link to="/sobre" className="hover:text-primary">
                  Como funciona
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/denuncias" className="hover:text-primary">
                  Canal de denúncias
                </Link>
              </li>
              <li>
                <Link to="/termos-de-uso" className="hover:text-primary">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/politica-de-privacidade" className="hover:text-primary">
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold">Conta</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/auth" className="hover:text-primary">
                  Entrar
                </Link>
              </li>
              <li>
                <Link to="/painel" className="hover:text-primary">
                  Meu painel
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border/60 pt-8">
          <h4 className="text-sm font-bold">Contato</h4>
          <ul className="mt-3 flex flex-col gap-3 md:flex-row md:gap-4">
            {SITE_CONTACT_EMAILS.map(({ label, address, subject }) => (
              <li key={address} className="flex-1">
                <a
                  href={mailtoContactUrl(address, subject)}
                  className="group flex w-full flex-col rounded-lg border border-border/50 bg-muted/20 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/40"
                >
                  <span className="text-sm font-medium text-foreground group-hover:text-primary">
                    {label}
                  </span>
                  <span className="mt-1 whitespace-nowrap text-sm text-muted-foreground group-hover:text-primary">
                    {address}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-5 sm:px-6">
        <p className="mx-auto max-w-4xl text-center text-xs leading-relaxed text-muted-foreground">
          O {SITE_NAME} é uma plataforma de conexão solidária. Não processamos pagamentos, não
          administramos doações e não cobramos qualquer comissão. Todas as contribuições são
          realizadas diretamente entre o doador e o beneficiário.
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          © <span suppressHydrationWarning>{new Date().getFullYear()}</span> {SITE_NAME} — Feito com
          💚 para conectar pessoas.
        </p>
      </div>
    </footer>
  );
}
