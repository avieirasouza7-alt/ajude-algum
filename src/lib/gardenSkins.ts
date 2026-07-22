/** Aparências do Jardim da Esperança — compradas com moedas do jogo. */

export const GARDEN_SKIN_PRICE = 50;

export type GardenSkinId =
  | "classic"
  | "sunset"
  | "cherry"
  | "mystic"
  | "winter"
  | "golden"
  | "aurora"
  | "tropical"
  | "lagoon";

export type GardenSkinTheme = {
  /** Cor da neblina de dia (céu limpo). */
  fogDay: string;
  fogRain: string;
  fogClear: string;
  fogNight: string;
  /** Fundo do céu (sem shader Sky / chuva). */
  skyDay: string;
  skyRain: string;
  skyClear: string;
  ambientDay: string;
  ambientTwilight: string;
  ambientClear: string;
  sunDay: string;
  sunTwilight: string;
  sunClear: string;
  /** Vagalumes / partículas noturnas. */
  sparkleA: string;
  sparkleB: string;
  /** Neblina rasteira. */
  groundFogDay: string;
  groundFogNight: string;
  /** Multiplicadores de luz (1 = padrão). */
  ambientMul: number;
  sunMul: number;
  /** Turbidez extra do céu (0 = padrão). */
  turbidityBonus: number;
  rayleighBonus: number;
};

export type GardenSkin = {
  id: GardenSkinId;
  name: string;
  description: string;
  /** Texto curto na loja. */
  mood: string;
  price: number;
  /** Preview do card. */
  preview: string;
  /** Filtro CSS leve sobre a cena (camada de atmosfera). */
  filter: string;
  /** Vinheta / lavagem de cor sobre o canvas. */
  overlay: string;
  theme: GardenSkinTheme;
};

const classicTheme: GardenSkinTheme = {
  fogDay: "#c2ca92",
  fogRain: "#98a894",
  fogClear: "#e0e8b8",
  fogNight: "#1a2430",
  skyDay: "#c8d6a0",
  skyRain: "#a3b2a0",
  skyClear: "#e4ecc0",
  ambientDay: "#ffeabf",
  ambientTwilight: "#d99a72",
  ambientClear: "#fff5d8",
  sunDay: "#ffdf9a",
  sunTwilight: "#f07848",
  sunClear: "#ffe3a0",
  sparkleA: "#c8ff8f",
  sparkleB: "#8fffe0",
  groundFogDay: "#e8f0dd",
  groundFogNight: "#8aa4c0",
  ambientMul: 1,
  sunMul: 1,
  turbidityBonus: 0,
  rayleighBonus: 0,
};

export const GARDEN_SKINS: GardenSkin[] = [
  {
    id: "classic",
    name: "Clássica",
    description: "O Jardim da Esperança como nasceu — luz de manhã e verde vivo.",
    mood: "Original",
    price: 0,
    preview: "linear-gradient(145deg, #e8f0c8 0%, #7cb342 55%, #2e7d32 100%)",
    filter: "none",
    overlay: "transparent",
    theme: classicTheme,
  },
  {
    id: "sunset",
    name: "Entardecer",
    description: "Sol baixo, céu em brasa e ouro derretido nas folhas.",
    mood: "Calor do fim de tarde",
    price: GARDEN_SKIN_PRICE,
    preview: "linear-gradient(145deg, #ffe082 0%, #ff8a50 45%, #c62828 100%)",
    filter: "saturate(1.18) contrast(1.06) brightness(1.02)",
    overlay:
      "radial-gradient(ellipse 90% 70% at 70% 15%, rgba(255,140,60,0.28), transparent 55%), linear-gradient(180deg, rgba(255,200,120,0.12), transparent 40%, rgba(180,40,20,0.18))",
    theme: {
      ...classicTheme,
      fogDay: "#d4a878",
      fogRain: "#a89078",
      fogClear: "#f0d0a0",
      fogNight: "#2a1820",
      skyDay: "#f0c090",
      skyRain: "#b0a090",
      skyClear: "#ffe0b0",
      ambientDay: "#ffd0a0",
      ambientTwilight: "#ff7040",
      ambientClear: "#ffe8c0",
      sunDay: "#ffb060",
      sunTwilight: "#ff5020",
      sunClear: "#ffd080",
      sparkleA: "#ffd080",
      sparkleB: "#ff9060",
      groundFogDay: "#ffe8d0",
      groundFogNight: "#c08070",
      ambientMul: 1.05,
      sunMul: 1.12,
      turbidityBonus: 1.4,
      rayleighBonus: 0.6,
    },
  },
  {
    id: "cherry",
    name: "Cerejeira",
    description: "Pétalas rosa no ar — primavera suave e romântica.",
    mood: "Floração rosa",
    price: GARDEN_SKIN_PRICE,
    preview: "linear-gradient(145deg, #fff0f5 0%, #f48fb1 45%, #ad1457 100%)",
    filter: "hue-rotate(-18deg) saturate(1.22) brightness(1.04)",
    overlay:
      "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(255,180,210,0.32), transparent 50%), linear-gradient(160deg, rgba(255,220,235,0.15), transparent 45%, rgba(180,60,100,0.12))",
    theme: {
      ...classicTheme,
      fogDay: "#e8c0d0",
      fogRain: "#b0a0a8",
      fogClear: "#f5d8e4",
      fogNight: "#281828",
      skyDay: "#f0d0e0",
      skyRain: "#c0b0b8",
      skyClear: "#ffe8f0",
      ambientDay: "#ffe0ec",
      ambientTwilight: "#e880a0",
      ambientClear: "#fff0f6",
      sunDay: "#ffc0d8",
      sunTwilight: "#ff6090",
      sunClear: "#ffd0e4",
      sparkleA: "#ffb0d0",
      sparkleB: "#ff80b0",
      groundFogDay: "#ffe8f0",
      groundFogNight: "#d090b0",
      ambientMul: 1.08,
      sunMul: 0.95,
      turbidityBonus: 0.4,
      rayleighBonus: 0.35,
    },
  },
  {
    id: "mystic",
    name: "Mística",
    description: "Aura violeta e névoa de sonho — o jardim vira santuário.",
    mood: "Magia serena",
    price: GARDEN_SKIN_PRICE,
    preview: "linear-gradient(145deg, #e1bee7 0%, #7e57c2 50%, #311b92 100%)",
    filter: "hue-rotate(42deg) saturate(1.2) brightness(0.97) contrast(1.05)",
    overlay:
      "radial-gradient(ellipse 70% 55% at 50% 30%, rgba(160,100,255,0.28), transparent 55%), linear-gradient(180deg, rgba(80,40,140,0.14), transparent 50%, rgba(40,20,80,0.22))",
    theme: {
      ...classicTheme,
      fogDay: "#b0a0d0",
      fogRain: "#9088a8",
      fogClear: "#d0c0e8",
      fogNight: "#1a1030",
      skyDay: "#c8b8e0",
      skyRain: "#a098b0",
      skyClear: "#e0d0f0",
      ambientDay: "#e0d0ff",
      ambientTwilight: "#a070e0",
      ambientClear: "#f0e8ff",
      sunDay: "#d0b0ff",
      sunTwilight: "#9060ff",
      sunClear: "#e0c8ff",
      sparkleA: "#d0a0ff",
      sparkleB: "#a080ff",
      groundFogDay: "#e8e0f8",
      groundFogNight: "#9080c0",
      ambientMul: 1.1,
      sunMul: 0.88,
      turbidityBonus: 0.8,
      rayleighBonus: 0.9,
    },
  },
  {
    id: "winter",
    name: "Inverno",
    description: "Prata, geada e silêncio — o jardim sob neve suave.",
    mood: "Frio delicado",
    price: GARDEN_SKIN_PRICE,
    preview: "linear-gradient(145deg, #e3f2fd 0%, #90caf9 45%, #546e7a 100%)",
    filter: "saturate(0.72) brightness(1.12) contrast(1.04)",
    overlay:
      "radial-gradient(ellipse 85% 70% at 50% 0%, rgba(220,240,255,0.35), transparent 55%), linear-gradient(180deg, rgba(180,210,240,0.18), transparent 40%, rgba(100,130,160,0.2))",
    theme: {
      ...classicTheme,
      fogDay: "#c8d8e8",
      fogRain: "#a0b0c0",
      fogClear: "#e0ecf5",
      fogNight: "#141c28",
      skyDay: "#d0e0f0",
      skyRain: "#b0c0d0",
      skyClear: "#e8f0f8",
      ambientDay: "#e8f0ff",
      ambientTwilight: "#a0b8d0",
      ambientClear: "#f0f6ff",
      sunDay: "#e0ecff",
      sunTwilight: "#b0c8e0",
      sunClear: "#f0f8ff",
      sparkleA: "#e0f0ff",
      sparkleB: "#a0d0ff",
      groundFogDay: "#f0f6ff",
      groundFogNight: "#a0b8d0",
      ambientMul: 1.15,
      sunMul: 0.75,
      turbidityBonus: -0.4,
      rayleighBonus: 0.2,
    },
  },
  {
    id: "golden",
    name: "Dourada",
    description: "Luz de ipê-amarelo — o jardim brilha como esperança plena.",
    mood: "Ouro vivo",
    price: GARDEN_SKIN_PRICE,
    preview: "linear-gradient(145deg, #fff8e1 0%, #ffc107 40%, #ff8f00 100%)",
    filter: "saturate(1.35) brightness(1.08) contrast(1.08)",
    overlay:
      "radial-gradient(ellipse 75% 55% at 55% 25%, rgba(255,220,80,0.38), transparent 50%), linear-gradient(180deg, rgba(255,200,40,0.16), transparent 45%, rgba(180,100,0,0.14))",
    theme: {
      ...classicTheme,
      fogDay: "#e8d080",
      fogRain: "#b0a878",
      fogClear: "#f5e8a8",
      fogNight: "#2a2010",
      skyDay: "#f0e090",
      skyRain: "#c0b890",
      skyClear: "#fff4b0",
      ambientDay: "#ffe8a0",
      ambientTwilight: "#ffb040",
      ambientClear: "#fff5c0",
      sunDay: "#ffd060",
      sunTwilight: "#ff9800",
      sunClear: "#ffe080",
      sparkleA: "#ffe080",
      sparkleB: "#ffc040",
      groundFogDay: "#fff5d0",
      groundFogNight: "#d0b060",
      ambientMul: 1.18,
      sunMul: 1.2,
      turbidityBonus: 0.6,
      rayleighBonus: 0.25,
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Cortinas verdes e ciano no céu — o norte mágico no jardim.",
    mood: "Luzes do norte",
    price: GARDEN_SKIN_PRICE,
    preview: "linear-gradient(145deg, #a7ffeb 0%, #26a69a 40%, #1a237e 100%)",
    filter: "hue-rotate(95deg) saturate(1.25) brightness(0.98) contrast(1.06)",
    overlay:
      "linear-gradient(115deg, rgba(80,255,200,0.22) 0%, transparent 35%, rgba(60,100,255,0.2) 70%, rgba(120,255,180,0.12) 100%), radial-gradient(ellipse 60% 40% at 40% 10%, rgba(100,255,220,0.3), transparent 60%)",
    theme: {
      ...classicTheme,
      fogDay: "#80c0b8",
      fogRain: "#709090",
      fogClear: "#a0e0d0",
      fogNight: "#0c1828",
      skyDay: "#90d0c8",
      skyRain: "#80a0a0",
      skyClear: "#b0f0e0",
      ambientDay: "#c0ffe8",
      ambientTwilight: "#60c0e0",
      ambientClear: "#e0fff5",
      sunDay: "#a0ffe0",
      sunTwilight: "#40e0ff",
      sunClear: "#c0fff0",
      sparkleA: "#80ffd0",
      sparkleB: "#60c0ff",
      groundFogDay: "#d0fff0",
      groundFogNight: "#60a0c0",
      ambientMul: 1.12,
      sunMul: 0.85,
      turbidityBonus: 0.5,
      rayleighBonus: 1.1,
    },
  },
  {
    id: "tropical",
    name: "Amazônia",
    description: "Verde profundo, ar úmido e calor de floresta viva.",
    mood: "Selva pulsante",
    price: GARDEN_SKIN_PRICE,
    preview: "linear-gradient(145deg, #c8e6c9 0%, #2e7d32 45%, #1b5e20 100%)",
    filter: "saturate(1.4) contrast(1.1) brightness(0.96)",
    overlay:
      "radial-gradient(ellipse 90% 80% at 50% 100%, rgba(20,80,30,0.35), transparent 55%), linear-gradient(180deg, rgba(100,180,80,0.12), transparent 35%, rgba(10,50,20,0.28))",
    theme: {
      ...classicTheme,
      fogDay: "#6a9860",
      fogRain: "#5a7860",
      fogClear: "#98c080",
      fogNight: "#0c1a10",
      skyDay: "#88b878",
      skyRain: "#709070",
      skyClear: "#a8d090",
      ambientDay: "#c0e890",
      ambientTwilight: "#70a050",
      ambientClear: "#d8f0b0",
      sunDay: "#d0f080",
      sunTwilight: "#90c040",
      sunClear: "#e0ff90",
      sparkleA: "#a0ff80",
      sparkleB: "#60e0a0",
      groundFogDay: "#d0f0c0",
      groundFogNight: "#508060",
      ambientMul: 0.95,
      sunMul: 1.05,
      turbidityBonus: 1.8,
      rayleighBonus: 0.4,
    },
  },
  {
    id: "lagoon",
    name: "Lagoa",
    description: "Águas cristalinas, brisa salgada e reflexos turquesa.",
    mood: "Brisa do litoral",
    price: GARDEN_SKIN_PRICE,
    preview: "linear-gradient(145deg, #e0f7fa 0%, #26c6da 45%, #006064 100%)",
    filter: "hue-rotate(160deg) saturate(1.15) brightness(1.05)",
    overlay:
      "radial-gradient(ellipse 80% 50% at 50% 85%, rgba(40,200,220,0.28), transparent 55%), linear-gradient(180deg, rgba(180,240,255,0.2), transparent 40%, rgba(0,100,120,0.18))",
    theme: {
      ...classicTheme,
      fogDay: "#90d0d8",
      fogRain: "#80a8b0",
      fogClear: "#b0e8f0",
      fogNight: "#0c2028",
      skyDay: "#a0e0e8",
      skyRain: "#90b8c0",
      skyClear: "#c0f0f8",
      ambientDay: "#d0f8ff",
      ambientTwilight: "#60c0d0",
      ambientClear: "#e8fcff",
      sunDay: "#c0f0ff",
      sunTwilight: "#40d0e0",
      sunClear: "#d8f8ff",
      sparkleA: "#80f0ff",
      sparkleB: "#40e0d0",
      groundFogDay: "#e0f8ff",
      groundFogNight: "#60a8b8",
      ambientMul: 1.1,
      sunMul: 1.0,
      turbidityBonus: -0.2,
      rayleighBonus: 0.7,
    },
  },
];

export function getGardenSkin(id: string | undefined | null): GardenSkin {
  return GARDEN_SKINS.find((s) => s.id === id) ?? GARDEN_SKINS[0]!;
}

export function isGardenSkinId(id: string): id is GardenSkinId {
  return GARDEN_SKINS.some((s) => s.id === id);
}
