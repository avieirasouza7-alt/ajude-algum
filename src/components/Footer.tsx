import { Link } from "@tanstack/react-router";
import { HeartHandshake, Mail } from "lucide-react";
import { SITE_CONTACT_EMAILS, SITE_NAME } from "@/lib/site-meta";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-6">
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
          <h4 className="text-sm font-bold">Contato</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {SITE_CONTACT_EMAILS.map(({ label, address }) => (
              <li key={address}>
                <a
                  href={`mailto:${address}`}
                  className="inline-flex items-start gap-1.5 hover:text-primary"
                >
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    <span className="block text-xs text-muted-foreground/80">{label}</span>
                    {address}
                  </span>
                </a>
              </li>
            ))}
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
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SITE_NAME} — Feito com 💚 para conectar pessoas.
      </div>
    </footer>
  );
}
