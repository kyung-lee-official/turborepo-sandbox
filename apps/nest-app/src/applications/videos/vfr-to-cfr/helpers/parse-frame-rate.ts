import { VFR_TO_CFR_TARGET_FPS_PRESETS } from "../vfr-to-cfr.constants";

export function parseFrameRateToFps(
  raw: string | null | undefined,
): number | null {
  if (!raw || raw === "0/0") {
    return null;
  }

  if (raw.includes("/")) {
    const [numeratorText, denominatorText] = raw.split("/");
    const numerator = Number(numeratorText);
    const denominator = Number(denominatorText);
    if (
      !Number.isFinite(numerator) ||
      !Number.isFinite(denominator) ||
      denominator === 0
    ) {
      return null;
    }
    const fps = numerator / denominator;
    return fps > 0 ? fps : null;
  }

  const fps = Number(raw);
  return Number.isFinite(fps) && fps > 0 ? fps : null;
}

export function formatFrameRateForDisplay(
  raw: string | null | undefined,
): string {
  const fps = parseFrameRateToFps(raw);
  if (fps == null) {
    return "unknown";
  }
  if (raw?.includes("/")) {
    return `${fps.toFixed(3)} fps (${raw})`;
  }
  return `${fps.toFixed(3)} fps`;
}

export function snapFrameRateToPreset(fps: number): number {
  let best: number = VFR_TO_CFR_TARGET_FPS_PRESETS[0]!;
  let bestDiff = Math.abs(fps - best);

  for (const preset of VFR_TO_CFR_TARGET_FPS_PRESETS) {
    const diff = Math.abs(fps - preset);
    if (diff < bestDiff) {
      best = preset;
      bestDiff = diff;
    }
  }

  return best;
}

export function suggestTargetFpsFromAverageFrameRate(
  raw: string | null | undefined,
): number | null {
  const fps = parseFrameRateToFps(raw);
  if (fps == null) {
    return null;
  }
  return snapFrameRateToPreset(fps);
}
