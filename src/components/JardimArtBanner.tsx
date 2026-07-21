/** Arte abstrata do jardim — sem captura real do jogo. */
export function JardimArtBanner({ className = "" }: { className?: string }) {
  return (
    <div className={`jardim-art relative overflow-hidden ${className}`} aria-hidden>
      <div className="jardim-art__sky" />
      <div className="jardim-art__mist" />
      <div className="jardim-art__hills" />
      <div className="jardim-art__glow" />
      <svg
        className="jardim-art__sprouts"
        viewBox="0 0 640 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M80 180 C90 140 70 110 95 80"
          stroke="oklch(0.55 0.14 145)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <ellipse cx="108" cy="78" rx="18" ry="10" fill="oklch(0.62 0.16 145)" transform="rotate(-25 108 78)" />
        <ellipse cx="88" cy="70" rx="16" ry="9" fill="oklch(0.58 0.15 150)" transform="rotate(20 88 70)" />

        <path
          d="M220 185 C235 145 210 115 240 85"
          stroke="oklch(0.5 0.13 155)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <ellipse cx="255" cy="82" rx="20" ry="11" fill="oklch(0.6 0.15 148)" transform="rotate(-18 255 82)" />
        <ellipse cx="230" cy="74" rx="17" ry="10" fill="oklch(0.56 0.14 152)" transform="rotate(28 230 74)" />

        <path
          d="M340 188 C350 150 330 120 355 90"
          stroke="oklch(0.52 0.14 140)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <ellipse cx="370" cy="88" rx="19" ry="11" fill="oklch(0.64 0.15 142)" transform="rotate(-22 370 88)" />
        <ellipse cx="345" cy="80" rx="16" ry="9" fill="oklch(0.58 0.14 148)" transform="rotate(24 345 80)" />

        <path
          d="M460 182 C475 140 455 115 480 88"
          stroke="oklch(0.48 0.12 155)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <ellipse cx="495" cy="86" rx="18" ry="10" fill="oklch(0.6 0.15 150)" transform="rotate(-20 495 86)" />
        <ellipse cx="470" cy="78" rx="15" ry="9" fill="oklch(0.55 0.13 145)" transform="rotate(30 470 78)" />

        <path
          d="M560 186 C570 148 555 122 575 95"
          stroke="oklch(0.5 0.13 148)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <ellipse cx="590" cy="92" rx="17" ry="10" fill="oklch(0.62 0.15 146)" transform="rotate(-16 590 92)" />
        <ellipse cx="568" cy="86" rx="14" ry="8" fill="oklch(0.57 0.14 150)" transform="rotate(22 568 86)" />

        <circle cx="160" cy="150" r="4" fill="oklch(0.72 0.16 55)" opacity="0.85" />
        <circle cx="300" cy="160" r="3.5" fill="oklch(0.75 0.15 35)" opacity="0.8" />
        <circle cx="410" cy="145" r="4" fill="oklch(0.7 0.14 350)" opacity="0.75" />
        <circle cx="520" cy="155" r="3" fill="oklch(0.78 0.14 85)" opacity="0.8" />
      </svg>
    </div>
  );
}
