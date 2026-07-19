/**
 * Banco de áudios ambientais do Jardim da Esperança.
 *
 * Use com sabedoria: cada faixa serve a um clima. Não toque todas ao mesmo
 * tempo — escolha uma por situação (chuva / dia / noite / madrugada).
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

/** Chuva suave — a ultra-realista vem primeiro; as demais rodízio. */
export const RAIN_TRACKS = [
  forestGentleRainUrl,
  lightRainUrl,
  peacefulRain1Url,
  peacefulRain2Url,
] as const;

/** Dia: amanhecer até o meio da manhã. */
export const DAY_SUNRISE_TRACK = sunriseForestUrl;

/** Dia: resto do dia (riacho / floresta). */
export const DAY_FOREST_TRACK = forestStreamUrl;

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
 * Chuva tem prioridade; madrugada (23h–4h) usa as faixas midnight.
 */
export function pickNatureTrack(opts: {
  raining: boolean;
  localHour: number;
  rainTrackIdx: number;
}): string {
  const { raining, localHour, rainTrackIdx } = opts;
  if (raining) {
    return RAIN_TRACKS[rainTrackIdx % RAIN_TRACKS.length];
  }

  const isNight = localHour < 5.25 || localHour >= 20.25;
  if (!isNight) {
    return localHour < 9 ? DAY_SUNRISE_TRACK : DAY_FOREST_TRACK;
  }

  /* Madrugada profunda: 23h → 4h — atmosfera mais quieta e imersiva. */
  const deepNight = localHour >= 23 || localHour < 4;
  if (deepNight) {
    /* Alterna a cada hora para variar sem precisar de estado extra. */
    const hourBucket = Math.floor(localHour) % MIDNIGHT_TRACKS.length;
    return MIDNIGHT_TRACKS[hourBucket];
  }

  return NIGHT_FOREST_TRACK;
}
