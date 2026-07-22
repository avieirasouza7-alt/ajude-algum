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
  lizards: number;
  frogs: number;
  turtles: number;
  hedgehogs: number;
  owls: number;
  woodpeckers: number;
  dragonflies: number;
  ladybugs: number;
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

  /*
   * Piso mínimo de vida: mesmo com FPS baixo / gravação de tela / reduceMotion,
   * o jardim não pode ficar “morto” (só 1 coelho + 1 sapo).
   */
  if (ultraLow || opts.reduceMotion) {
    return {
      butterflies: opts.reduceMotion ? 3 : 5,
      bees: opts.reduceMotion ? 1 : 2,
      birds: opts.reduceMotion ? 1 : 2,
      perchedBirds: 1,
      rabbits: 2,
      babyRabbits: 1,
      squirrels: 1,
      foxes: 1,
      deer: 0,
      lizards: 1,
      frogs: 2,
      turtles: 1,
      hedgehogs: 1,
      owls: 1,
      woodpeckers: 1,
      dragonflies: opts.reduceMotion ? 1 : 2,
      ladybugs: 2,
      fallingLeaves: opts.reduceMotion ? 6 : 12,
      windStrength: opts.reduceMotion ? 0.35 : 0.55,
      distantWildlife: !opts.reduceMotion,
      premiumForest: !opts.reduceMotion,
      contactShadows: false,
    };
  }

  if (quality === "low") {
    return {
      butterflies: mobile ? 5 : 7,
      bees: mobile ? 2 : 3,
      birds: mobile ? 2 : 3,
      perchedBirds: 2,
      rabbits: 2,
      babyRabbits: 1,
      squirrels: mobile ? 1 : 2,
      foxes: 1,
      deer: mobile ? 0 : 1,
      lizards: mobile ? 1 : 2,
      frogs: 2,
      turtles: 1,
      hedgehogs: 1,
      owls: 1,
      woodpeckers: 1,
      dragonflies: mobile ? 2 : 3,
      ladybugs: mobile ? 2 : 3,
      fallingLeaves: mobile ? 12 : 18,
      windStrength: 0.65,
      distantWildlife: true,
      premiumForest: true,
      contactShadows: false,
    };
  }

  if (quality === "balanced") {
    return {
      butterflies: mobile ? 8 : 11,
      bees: mobile ? 3 : 5,
      birds: mobile ? 3 : 4,
      perchedBirds: 2,
      rabbits: 2,
      babyRabbits: 2,
      squirrels: mobile ? 2 : 3,
      foxes: 2,
      deer: mobile ? 1 : 1,
      lizards: mobile ? 2 : 2,
      frogs: 2,
      turtles: 1,
      hedgehogs: 2,
      owls: 2,
      woodpeckers: 2,
      dragonflies: mobile ? 3 : 4,
      ladybugs: mobile ? 3 : 4,
      fallingLeaves: mobile ? 16 : 24,
      windStrength: 0.85,
      distantWildlife: true,
      premiumForest: true,
      contactShadows: !mobile,
    };
  }

  // high
  return {
    butterflies: Math.min(mobile ? 12 : 16, Math.max(mobile ? 8 : 11, Math.floor(8 + dens * 8))),
    bees: mobile ? 4 : 7,
    birds: mobile ? 4 : 6,
    perchedBirds: mobile ? 2 : 3,
    rabbits: 3,
    babyRabbits: 2,
    squirrels: mobile ? 2 : 3,
    foxes: 2,
    deer: mobile ? 1 : 2,
    lizards: mobile ? 2 : 3,
    frogs: 3,
    turtles: mobile ? 1 : 2,
    hedgehogs: 2,
    owls: 2,
    woodpeckers: 2,
    dragonflies: mobile ? 4 : 6,
    ladybugs: mobile ? 3 : 5,
    fallingLeaves: mobile ? 20 : 34,
    windStrength: 1,
    distantWildlife: true,
    premiumForest: true,
    contactShadows: !mobile,
  };
}
