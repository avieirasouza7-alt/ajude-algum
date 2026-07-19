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
