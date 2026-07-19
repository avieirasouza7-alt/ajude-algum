export type GardenRenderQuality = "low" | "balanced" | "high";

export type GardenRenderProfile = {
  initial: GardenRenderQuality;
  ceiling: GardenRenderQuality;
  softwareRenderer: boolean;
};

const QUALITY_ORDER: GardenRenderQuality[] = ["low", "balanced", "high"];

export function lowerGardenQuality(current: GardenRenderQuality): GardenRenderQuality {
  return QUALITY_ORDER[Math.max(0, QUALITY_ORDER.indexOf(current) - 1)] ?? current;
}

export function raiseGardenQuality(
  current: GardenRenderQuality,
  ceiling: GardenRenderQuality,
): GardenRenderQuality {
  const next = Math.min(QUALITY_ORDER.indexOf(current) + 1, QUALITY_ORDER.indexOf(ceiling));
  return QUALITY_ORDER[next] ?? current;
}

/**
 * Faz a primeira escolha antes de montar o Canvas. Depois o PerformanceMonitor
 * confirma a decisão com FPS real e pode subir/descer um nível.
 */
export function detectGardenRenderProfile(isMobile = false): GardenRenderProfile {
  const device = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const cores = device.hardwareConcurrency ?? 4;
  const memory = device.deviceMemory ?? 4;
  const saveData = device.connection?.saveData === true;
  const slowNetwork = /(^|-)2g$/.test(device.connection?.effectiveType ?? "");

  let softwareRenderer = false;
  let webgl2 = false;
  let maxTextureSize = 0;

  try {
    const canvas = document.createElement("canvas");
    const gl2 = canvas.getContext("webgl2");
    const gl = gl2 || (canvas.getContext("webgl") as WebGLRenderingContext | null);
    webgl2 = !!gl2;
    if (gl) {
      maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE) ?? 0);
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? "") : "";
      softwareRenderer = /basic render driver|swiftshader|llvmpipe|software|warp/i.test(renderer);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    // Os demais sinais de hardware ainda permitem uma escolha segura.
  }

  if (softwareRenderer || saveData || slowNetwork || cores <= 2 || memory <= 2) {
    return { initial: "low", ceiling: softwareRenderer ? "low" : "balanced", softwareRenderer };
  }

  const strongDesktop = !isMobile && webgl2 && cores >= 8 && memory >= 8 && maxTextureSize >= 8192;
  const strongMobile = isMobile && webgl2 && cores >= 8 && memory >= 6 && maxTextureSize >= 8192;

  if (strongDesktop) {
    return { initial: "high", ceiling: "high", softwareRenderer };
  }

  if (strongMobile) {
    return { initial: "balanced", ceiling: "high", softwareRenderer };
  }

  if (cores >= 4 && memory >= 4 && maxTextureSize >= 4096) {
    return { initial: "balanced", ceiling: isMobile ? "balanced" : "high", softwareRenderer };
  }

  return { initial: "low", ceiling: "balanced", softwareRenderer };
}

/** Orçamento único de fauna e efeitos — evita estourar a GPU e manter o jardim vivo. */
export type GardenWildlifeBudget = {
  butterflies: number;
  bees: number;
  birds: number;
  perchedBirds: number;
  rabbits: number;
  babyRabbits: number;
  squirrels: number;
  foxes: number;
  deer: number;
  fallingLeaves: number;
  windStrength: number;
  distantWildlife: boolean;
  premiumForest: boolean;
  contactShadows: boolean;
};

export function gardenWildlifeBudget(opts: {
  quality: GardenRenderQuality;
  isMobile?: boolean;
  softwareGpu?: boolean;
  reduceMotion?: boolean;
  growth?: number;
}): GardenWildlifeBudget {
  const quality = opts.reduceMotion
    ? "low"
    : opts.softwareGpu && opts.quality === "low"
      ? "low"
      : opts.quality;
  const ultraLow = !!opts.softwareGpu && quality === "low";
  const mobile = !!opts.isMobile;
  const dens = Math.min(1, (opts.growth ?? 800) / 2800);

  if (ultraLow || opts.reduceMotion) {
    return {
      butterflies: opts.reduceMotion ? 1 : 1,
      bees: 0,
      birds: opts.reduceMotion ? 0 : 1,
      perchedBirds: 0,
      rabbits: 1,
      babyRabbits: 0,
      squirrels: 0,
      foxes: 0,
      deer: 0,
      fallingLeaves: opts.reduceMotion ? 0 : 4,
      windStrength: opts.reduceMotion ? 0 : 0.35,
      distantWildlife: false,
      premiumForest: false,
      contactShadows: false,
    };
  }

  if (quality === "low") {
    return {
      butterflies: mobile ? 3 : 4,
      bees: 1,
      birds: 1,
      perchedBirds: 1,
      rabbits: 1,
      babyRabbits: mobile ? 0 : 1,
      squirrels: mobile ? 0 : 1,
      foxes: 1,
      deer: 0,
      fallingLeaves: mobile ? 8 : 12,
      windStrength: 0.55,
      distantWildlife: true,
      premiumForest: true,
      contactShadows: false,
    };
  }

  if (quality === "balanced") {
    return {
      butterflies: mobile ? 6 : 9,
      bees: mobile ? 2 : 4,
      birds: mobile ? 2 : 3,
      perchedBirds: 2,
      rabbits: 2,
      babyRabbits: 1,
      squirrels: mobile ? 1 : 2,
      foxes: mobile ? 1 : 2,
      deer: mobile ? 0 : 1,
      fallingLeaves: mobile ? 14 : 22,
      windStrength: 0.85,
      distantWildlife: true,
      premiumForest: true,
      contactShadows: !mobile,
    };
  }

  // high
  return {
    butterflies: Math.min(mobile ? 10 : 14, Math.max(mobile ? 7 : 10, Math.floor(7 + dens * 7))),
    bees: mobile ? 3 : 6,
    birds: mobile ? 3 : 5,
    perchedBirds: mobile ? 2 : 3,
    rabbits: 2,
    babyRabbits: mobile ? 1 : 2,
    squirrels: mobile ? 2 : 3,
    foxes: 2,
    deer: mobile ? 1 : 2,
    fallingLeaves: mobile ? 18 : 32,
    windStrength: 1,
    distantWildlife: true,
    premiumForest: true,
    contactShadows: !mobile,
  };
}
