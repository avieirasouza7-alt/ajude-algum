/**
 * Banco de áudios ambientais do Jardim da Esperança.
 *
 * Os MP3 ficam em `src/assets/nature/` (versionados com o site — não no Postgres).
 * Este arquivo é o catálogo: quando usar cada faixa e como escolher uma só por vez.
 *
 * Pacote ultra-realista (jul/2026) — ~125s / 128 kbps cada:
 * - ultra-gentle-rain          → chuva suave (dia/geral)
 * - ultra-night-forest-rain    → chuva à noite na floresta
 * - ultra-forest-thunderstorm  → trovoada forte (chuva intensa)
 * - ultra-botanical-garden     → jardim botânico diurno (lush)
 * - ultra-peaceful-forest      → floresta pacífica (dia / entardecer)
 */
import lightRainUrl from "@/assets/nature/light-rain.mp3";
import nightCricketsUrl from "@/assets/nature/night-crickets.mp3";
import peacefulRain1Url from "@/assets/nature/peaceful-rain-1.mp3";
import peacefulRain2Url from "@/assets/nature/peaceful-rain-2.mp3";
import sunriseForestUrl from "@/assets/nature/sunrise-forest.mp3";
import forestStreamUrl from "@/assets/nature/forest-stream.mp3";
import forestNightContinuousUrl from "@/assets/nature/forest-night-continuous.mp3";
import forestGentleRainUrl from "@/assets/nature/forest-gentle-rain.mp3";
import forestMidnightUrl from "@/assets/nature/forest-midnight.mp3";
import forestMidnightPeacefulUrl from "@/assets/nature/forest-midnight-peaceful.mp3";

/* —— Pacote ultra-realista (AUDIOS PARA O JOGO) —— */
import ultraGentleRainUrl from "@/assets/nature/ultra-gentle-rain.mp3";
import ultraNightForestRainUrl from "@/assets/nature/ultra-night-forest-rain.mp3";
import ultraForestThunderstormUrl from "@/assets/nature/ultra-forest-thunderstorm.mp3";
import ultraBotanicalGardenUrl from "@/assets/nature/ultra-botanical-garden.mp3";
import ultraPeacefulForestUrl from "@/assets/nature/ultra-peaceful-forest.mp3";

export type NatureMood =
  | "rain-gentle"
  | "rain-night"
  | "rain-storm"
  | "day-garden"
  | "day-forest"
  | "day-sunrise"
  | "night-forest"
  | "night-crickets"
  | "midnight";

export type NatureTrackMeta = {
  id: string;
  url: string;
  mood: NatureMood;
  /** Uso previsto no jardim. */
  useWhen: string;
  /** Duração aproximada em segundos (loop). */
  approxSec: number;
  sourceFile?: string;
};

/**
 * Catálogo completo — referência para o jogo e para futuras misturas.
 * Preferir sempre `pickNatureTrack` em vez de tocar várias ao mesmo tempo.
 */
export const NATURE_AUDIO_BANK: readonly NatureTrackMeta[] = [
  {
    id: "ultra-gentle-rain",
    url: ultraGentleRainUrl,
    mood: "rain-gentle",
    useWhen: "Chuva suave de dia ou chuva geral (prioridade)",
    approxSec: 125,
    sourceFile: "ultra-realistic-gentle-rain-in_072326.mp3",
  },
  {
    id: "ultra-night-forest-rain",
    url: ultraNightForestRainUrl,
    mood: "rain-night",
    useWhen: "Chuva à noite / floresta molhada",
    approxSec: 125,
    sourceFile: "ultra-realistic-nighttime-forest-rain_072326.mp3",
  },
  {
    id: "ultra-forest-thunderstorm",
    url: ultraForestThunderstormUrl,
    mood: "rain-storm",
    useWhen: "Trovoada / chuva pesada (rodízio de chuva)",
    approxSec: 125,
    sourceFile: "ultra-realistic-forest-thunderstorm-heavy_072326.mp3",
  },
  {
    id: "ultra-botanical-garden",
    url: ultraBotanicalGardenUrl,
    mood: "day-garden",
    useWhen: "Dia no jardim (ambiente botânico lush — identidade do Hopeful Garden)",
    approxSec: 125,
    sourceFile: "photorealistic-botanical-garden-ambience-lush_072326.mp3",
  },
  {
    id: "ultra-peaceful-forest",
    url: ultraPeacefulForestUrl,
    mood: "day-forest",
    useWhen: "Dia / fim de tarde — floresta pacífica sem chuva",
    approxSec: 125,
    sourceFile: "ultra-realistic-peaceful-forest-ambience_072326.mp3",
  },
  {
    id: "forest-gentle-rain",
    url: forestGentleRainUrl,
    mood: "rain-gentle",
    useWhen: "Fallback chuva suave",
    approxSec: 0,
  },
  {
    id: "light-rain",
    url: lightRainUrl,
    mood: "rain-gentle",
    useWhen: "Fallback chuva leve",
    approxSec: 0,
  },
  {
    id: "peaceful-rain-1",
    url: peacefulRain1Url,
    mood: "rain-gentle",
    useWhen: "Fallback chuva pacífica A",
    approxSec: 0,
  },
  {
    id: "peaceful-rain-2",
    url: peacefulRain2Url,
    mood: "rain-gentle",
    useWhen: "Fallback chuva pacífica B",
    approxSec: 0,
  },
  {
    id: "sunrise-forest",
    url: sunriseForestUrl,
    mood: "day-sunrise",
    useWhen: "Amanhecer",
    approxSec: 0,
  },
  {
    id: "forest-stream",
    url: forestStreamUrl,
    mood: "day-forest",
    useWhen: "Fallback dia com riacho",
    approxSec: 0,
  },
  {
    id: "forest-night-continuous",
    url: forestNightContinuousUrl,
    mood: "night-forest",
    useWhen: "Noite sem chuva",
    approxSec: 0,
  },
  {
    id: "night-crickets",
    url: nightCricketsUrl,
    mood: "night-crickets",
    useWhen: "Reserva / grilos",
    approxSec: 0,
  },
  {
    id: "forest-midnight",
    url: forestMidnightUrl,
    mood: "midnight",
    useWhen: "Madrugada profunda A",
    approxSec: 0,
  },
  {
    id: "forest-midnight-peaceful",
    url: forestMidnightPeacefulUrl,
    mood: "midnight",
    useWhen: "Madrugada profunda B",
    approxSec: 0,
  },
] as const;

/** Chuva — ultra primeiro; trovoada no rodízio; antigas como reserva. */
export const RAIN_TRACKS = [
  ultraGentleRainUrl,
  ultraForestThunderstormUrl,
  forestGentleRainUrl,
  lightRainUrl,
  peacefulRain1Url,
  peacefulRain2Url,
] as const;

/** Chuva noturna dedicada (floresta à noite). */
export const NIGHT_RAIN_TRACK = ultraNightForestRainUrl;

/** Dia: jardim botânico (pacote novo) — combina com o tema do jogo. */
export const DAY_GARDEN_TRACK = ultraBotanicalGardenUrl;

/** Dia: amanhecer até o meio da manhã. */
export const DAY_SUNRISE_TRACK = sunriseForestUrl;

/** Dia: floresta pacífica (pacote novo) + riacho antigo como variação por hora. */
export const DAY_FOREST_TRACK = ultraPeacefulForestUrl;
export const DAY_FOREST_ALT_TRACK = forestStreamUrl;

/**
 * Noite geral (entardecer → ~23h e madrugada tardia → amanhecer).
 * Ambiente contínuo de floresta noturna — substitui o críquete sozinho.
 */
export const NIGHT_FOREST_TRACK = forestNightContinuousUrl;

/** Reserva: grilos (caso queira misturar ou fallback). */
export const NIGHT_CRICKETS_TRACK = nightCricketsUrl;

/** Madrugada profunda — duas variações para não repetir sempre a mesma. */
export const MIDNIGHT_TRACKS = [forestMidnightUrl, forestMidnightPeacefulUrl] as const;

/**
 * Escolhe a faixa de natureza pelo clima e pela hora local (0–24).
 * Chuva tem prioridade; à noite com chuva usa a faixa noturna dedicada.
 */
export function pickNatureTrack(opts: {
  raining: boolean;
  localHour: number;
  rainTrackIdx: number;
}): string {
  const { raining, localHour, rainTrackIdx } = opts;
  const isNight = localHour < 5.25 || localHour >= 20.25;

  if (raining) {
    if (isNight) return NIGHT_RAIN_TRACK;
    return RAIN_TRACKS[rainTrackIdx % RAIN_TRACKS.length];
  }

  if (!isNight) {
    if (localHour < 9) return DAY_SUNRISE_TRACK;
    /* Manhã/tarde: jardim botânico; fim de tarde: floresta pacífica; hora par: riacho. */
    if (localHour >= 16 && localHour < 20.25) return DAY_FOREST_TRACK;
    return Math.floor(localHour) % 2 === 0 ? DAY_GARDEN_TRACK : DAY_FOREST_ALT_TRACK;
  }

  /* Madrugada profunda: 23h → 4h — atmosfera mais quieta e imersiva. */
  const deepNight = localHour >= 23 || localHour < 4;
  if (deepNight) {
    const hourBucket = Math.floor(localHour) % MIDNIGHT_TRACKS.length;
    return MIDNIGHT_TRACKS[hourBucket];
  }

  return NIGHT_FOREST_TRACK;
}

/** Consulta rápida do catálogo (ex.: painel admin / debug). */
export function listNatureTracksByMood(mood: NatureMood): NatureTrackMeta[] {
  return NATURE_AUDIO_BANK.filter((t) => t.mood === mood);
}
