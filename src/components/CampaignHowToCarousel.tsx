import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  LogIn,
  FilePenLine,
  QrCode,
  ShieldCheck,
  Share2,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = {
  id: number;
  kicker: string;
  title: string;
  lead: string;
  details: string[];
  tip: string;
  accent: string;
  glow: string;
  icon: typeof LogIn;
  art: ReactNode;
};

function ArtFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto flex h-56 w-full max-w-sm items-center justify-center sm:h-64",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-6 rounded-[2rem] bg-white/40 blur-2xl"
        aria-hidden
      />
      <svg
        viewBox="0 0 320 240"
        className="relative h-full w-full drop-shadow-sm"
        role="img"
        aria-hidden
      >
        {children}
      </svg>
    </div>
  );
}

const STEPS: Step[] = [
  {
    id: 1,
    kicker: "Passo 1",
    title: "Entre no site e faça login",
    lead: "Tudo começa com a sua conta. É rápida, gratuita e segura.",
    details: [
      "Acesse o Ajude Alguém Online pelo computador ou celular.",
      "Clique em Entrar e faça login com o seu e-mail.",
      "Com a conta ativa, você já pode criar e acompanhar suas campanhas.",
    ],
    tip: "Sem conta não dá para publicar campanha — o login protege você e a comunidade.",
    accent: "from-emerald-600 to-teal-500",
    glow: "bg-emerald-300/40",
    icon: LogIn,
    art: (
      <ArtFrame>
        <defs>
          <linearGradient id="ht1a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="ht1b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ecfdf5" />
            <stop offset="100%" stopColor="#d1fae5" />
          </linearGradient>
        </defs>
        <rect x="48" y="28" width="224" height="168" rx="28" fill="url(#ht1b)" />
        <rect x="72" y="52" width="176" height="120" rx="18" fill="#fff" />
        <circle cx="160" cy="96" r="22" fill="url(#ht1a)" />
        <path
          d="M148 96c0-6.6 5.4-12 12-12s12 5.4 12 12-5.4 12-12 12-12-5.4-12-12zm-14 28c2.8-10 12-16 26-16s23.2 6 26 16"
          fill="#fff"
          opacity="0.95"
        />
        <rect x="104" y="138" width="112" height="18" rx="9" fill="url(#ht1a)" />
        <circle cx="250" cy="48" r="10" fill="#fbbf24" opacity="0.9" />
        <circle cx="70" cy="180" r="8" fill="#34d399" opacity="0.8" />
      </ArtFrame>
    ),
  },
  {
    id: 2,
    kicker: "Passo 2",
    title: "Crie a sua campanha",
    lead: "Conte a sua história com clareza — título, foto e o motivo da ajuda.",
    details: [
      "Clique em Criar campanha.",
      "Escreva um título objetivo e explique a necessidade com respeito.",
      "Adicione fotos verdadeiras: isso gera confiança e aproxima doadores.",
    ],
    tip: "Seja honesto e claro. Campanhas reais e bem explicadas recebem mais apoio.",
    accent: "from-teal-600 to-cyan-500",
    glow: "bg-cyan-300/35",
    icon: FilePenLine,
    art: (
      <ArtFrame>
        <defs>
          <linearGradient id="ht2a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <rect x="70" y="24" width="180" height="192" rx="22" fill="#ecfeff" />
        <rect x="88" y="42" width="144" height="72" rx="14" fill="url(#ht2a)" opacity="0.2" />
        <rect x="108" y="58" width="40" height="40" rx="10" fill="url(#ht2a)" />
        <rect x="88" y="128" width="120" height="10" rx="5" fill="#99f6e4" />
        <rect x="88" y="146" width="96" height="10" rx="5" fill="#a5f3fc" />
        <rect x="88" y="164" width="108" height="10" rx="5" fill="#99f6e4" />
        <circle cx="240" cy="60" r="16" fill="#f59e0b" />
        <path d="M234 60h12M240 54v12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </ArtFrame>
    ),
  },
  {
    id: 3,
    kicker: "Passo 3",
    title: "Informe a sua chave PIX",
    lead: "É por ela que as doações chegam. Use a chave que você realmente controla.",
    details: [
      "Cadastre e-mail, CPF, telefone ou chave aleatória do seu banco.",
      "Confira digitação e espaços — um erro impede o doador de pagar.",
      "O site gera o QR Code a partir da chave que você informou.",
    ],
    tip: "Use sempre a sua chave PIX pessoal. Nunca coloque chave de terceiros sem autorização.",
    accent: "from-emerald-700 to-lime-500",
    glow: "bg-lime-300/35",
    icon: QrCode,
    art: (
      <ArtFrame>
        <defs>
          <linearGradient id="ht3a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="100%" stopColor="#84cc16" />
          </linearGradient>
        </defs>
        <rect
          x="92"
          y="36"
          width="136"
          height="136"
          rx="20"
          fill="#fff"
          stroke="#d1fae5"
          strokeWidth="4"
        />
        <rect x="112" y="56" width="28" height="28" rx="4" fill="url(#ht3a)" />
        <rect x="180" y="56" width="28" height="28" rx="4" fill="url(#ht3a)" />
        <rect x="112" y="124" width="28" height="28" rx="4" fill="url(#ht3a)" />
        <rect x="152" y="90" width="16" height="16" rx="2" fill="#065f46" />
        <rect x="176" y="114" width="20" height="20" rx="3" fill="#10b981" />
        <rect x="70" y="188" width="180" height="22" rx="11" fill="#ecfdf5" />
        <text
          x="160"
          y="203"
          textAnchor="middle"
          fontSize="11"
          fill="#047857"
          fontFamily="sans-serif"
        >
          Chave PIX
        </text>
      </ArtFrame>
    ),
  },
  {
    id: 4,
    kicker: "Passo 4",
    title: "Revise tudo com atenção",
    lead: "Antes de publicar, confira se a campanha está correta e completa.",
    details: [
      "Leia de novo título, história, meta e fotos.",
      "Confirme a chave PIX uma última vez.",
      "Envie para análise: a moderação ajuda a manter confiança na plataforma.",
    ],
    tip: "Campanha clara e revisada passa mais confiança — e facilita a aprovação.",
    accent: "from-amber-500 to-emerald-600",
    glow: "bg-amber-300/40",
    icon: ShieldCheck,
    art: (
      <ArtFrame>
        <defs>
          <linearGradient id="ht4a" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>
        <path
          d="M160 34c28 12 58 16 78 20v58c0 42-28 72-78 94-50-22-78-52-78-94V54c20-4 50-8 78-20z"
          fill="url(#ht4a)"
          opacity="0.18"
        />
        <path
          d="M160 48c22 10 46 14 62 17v48c0 34-22 58-62 76-40-18-62-42-62-76V65c16-3 40-7 62-17z"
          fill="url(#ht4a)"
        />
        <path
          d="M138 118l14 14 30-34"
          fill="none"
          stroke="#fff"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </ArtFrame>
    ),
  },
  {
    id: 5,
    kicker: "Passo 5",
    title: "Compartilhe nas redes sociais",
    lead: "A arrecadação cresce quando a sua rede vê a campanha.",
    details: [
      "Depois de aprovada, a campanha fica pública no site.",
      "Compartilhe no WhatsApp, Instagram, Facebook e com amigos.",
      "Peça para familiares e conhecidos também divulgarem.",
    ],
    tip: "Quanto mais pessoas conhecerem a história, maior a chance de receber apoio.",
    accent: "from-rose-500 to-emerald-600",
    glow: "bg-rose-300/35",
    icon: Share2,
    art: (
      <ArtFrame>
        <defs>
          <linearGradient id="ht5a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <circle cx="160" cy="120" r="26" fill="url(#ht5a)" />
        <circle cx="92" cy="72" r="18" fill="#34d399" />
        <circle cx="236" cy="78" r="18" fill="#fb7185" />
        <circle cx="98" cy="176" r="16" fill="#fbbf24" />
        <circle cx="228" cy="170" r="16" fill="#2dd4bf" />
        <path d="M140 108L106 82" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
        <path d="M180 108L220 88" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
        <path d="M146 138L112 164" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
        <path d="M176 138L214 160" stroke="#047857" strokeWidth="4" strokeLinecap="round" />
        <path d="M150 120h20M160 110v20" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      </ArtFrame>
    ),
  },
  {
    id: 6,
    kicker: "Passo 6",
    title: "O valor vai direto para você",
    lead: "O site é só a ponte. O dinheiro da doação não fica conosco.",
    details: [
      "O doador paga pela chave PIX da campanha — direto no seu banco.",
      "O Ajude Alguém Online não retém o valor das doações.",
      "Somos intermediários da conexão: unimos quem precisa com quem pode ajudar.",
    ],
    tip: "Transparência total: campanha no site, dinheiro no seu PIX.",
    accent: "from-emerald-800 to-amber-400",
    glow: "bg-emerald-400/35",
    icon: Landmark,
    art: (
      <ArtFrame>
        <defs>
          <linearGradient id="ht6a" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#065f46" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <rect
          x="40"
          y="70"
          width="84"
          height="100"
          rx="18"
          fill="#ecfdf5"
          stroke="#a7f3d0"
          strokeWidth="3"
        />
        <text
          x="82"
          y="128"
          textAnchor="middle"
          fontSize="13"
          fill="#047857"
          fontFamily="sans-serif"
          fontWeight="700"
        >
          Site
        </text>
        <path
          d="M134 120h48"
          stroke="url(#ht6a)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="8 8"
        />
        <path d="M176 108l20 12-20 12z" fill="#10b981" />
        <rect
          x="196"
          y="70"
          width="84"
          height="100"
          rx="18"
          fill="#fffbeb"
          stroke="#fcd34d"
          strokeWidth="3"
        />
        <text
          x="238"
          y="120"
          textAnchor="middle"
          fontSize="12"
          fill="#92400e"
          fontFamily="sans-serif"
          fontWeight="700"
        >
          Seu PIX
        </text>
        <text
          x="238"
          y="140"
          textAnchor="middle"
          fontSize="10"
          fill="#b45309"
          fontFamily="sans-serif"
        >
          100% direto
        </text>
        <circle cx="160" cy="48" r="14" fill="#10b981" />
        <path
          d="M154 48l5 5 10-12"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </ArtFrame>
    ),
  },
];

const AUTOPLAY_MS = 7000;

export function CampaignHowToCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<number | null>(null);
  const step = STEPS[index];
  const Icon = step.icon;

  const go = useCallback((next: number) => {
    setVisible(false);
    window.setTimeout(() => {
      setIndex((next + STEPS.length) % STEPS.length);
      setVisible(true);
    }, 220);
  }, []);

  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  useEffect(() => {
    if (paused) return;
    timerRef.current = window.setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [index, paused, go]);

  return (
    <section
      className="mt-12 sm:mt-16"
      aria-label="Como criar uma campanha"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-[linear-gradient(145deg,#fffdf7_0%,#ecfdf5_45%,#fff7ed_100%)] p-5 shadow-warm sm:p-8 lg:p-10">
        <div
          className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-amber-300/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-emerald-300/25 blur-3xl"
          aria-hidden
        />
        <div
          className={cn(
            "pointer-events-none absolute left-1/2 top-24 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl transition-colors duration-700",
            step.glow,
          )}
          aria-hidden
        />

        <div className="relative mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-emerald-950 sm:text-3xl">
              Como criar sua campanha
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-emerald-900/75 sm:text-base">
              Um passo a passo completo: do login ao PIX, do compartilhamento até a doação chegando
              direto na sua conta.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              className="grid h-11 w-11 place-items-center rounded-full border border-emerald-200 bg-white text-emerald-800 shadow-soft transition hover:bg-emerald-50"
              aria-label="Passo anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="grid h-11 w-11 place-items-center rounded-full border border-emerald-200 bg-white text-emerald-800 shadow-soft transition hover:bg-emerald-50"
              aria-label="Próximo passo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progress rail */}
        <div className="relative mb-6 flex gap-1.5 sm:gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(i)}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                i === index
                  ? "bg-gradient-to-r from-emerald-600 to-amber-400"
                  : i < index
                    ? "bg-emerald-400/80"
                    : "bg-emerald-100",
              )}
              aria-label={`Ir para ${s.kicker}`}
              aria-current={i === index ? "step" : undefined}
            />
          ))}
        </div>

        <div
          className={cn(
            "relative grid items-center gap-6 transition-all duration-300 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10",
            visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
          )}
        >
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full bg-gradient-to-r px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-warm",
                  step.accent,
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {step.kicker} de {STEPS.length}
              </span>
            </div>

            <h3 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-emerald-950 sm:text-3xl">
              {step.title}
            </h3>
            <p className="mt-2 text-base font-medium text-emerald-800/90 sm:text-lg">{step.lead}</p>

            <ul className="mt-5 space-y-3">
              {step.details.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm leading-relaxed text-emerald-950/85 sm:text-[15px]"
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br shadow-sm",
                      step.accent,
                    )}
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-950">
              <span className="font-extrabold text-amber-800">Dica: </span>
              {step.tip}
            </div>

            {step.id === STEPS.length && (
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="gradient-warm text-primary-foreground shadow-warm">
                  <Link to="/nova-campanha">Criar minha campanha</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/campanhas">Ver campanhas</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/70 p-4 shadow-soft backdrop-blur-sm sm:p-6">
            <div
              className={cn(
                "absolute inset-x-8 top-0 h-1 rounded-b-full bg-gradient-to-r",
                step.accent,
              )}
              aria-hidden
            />
            {step.art}
            <p className="mt-1 text-center text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700/70">
              {step.kicker} · ilustração
            </p>
          </div>
        </div>

        <div className="relative mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100 pt-5">
          <p className="text-xs font-medium text-emerald-800/70 sm:text-sm">
            O site conecta pessoas. A doação vai direto no PIX de quem criou a campanha.
          </p>
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                className={cn(
                  "h-2.5 rounded-full transition-all duration-300",
                  i === index ? "w-8 bg-emerald-600" : "w-2.5 bg-emerald-200 hover:bg-emerald-300",
                )}
                aria-label={`Passo ${s.id}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
