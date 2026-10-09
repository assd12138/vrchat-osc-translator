export type SubtitleFontWeight = "normal" | "bold";

export const SUBTITLE_MIN_FONT_SIZE = 12;
export const SUBTITLE_MAX_FONT_SIZE = 26;

export interface SubtitleConfig {
  backgroundColor: string;
  backgroundOpacity: number;
  originalColor: string;
  originalFontSize: number;
  originalFontWeight: SubtitleFontWeight;
  translatedColor: string;
  translatedFontSize: number;
  translatedFontWeight: SubtitleFontWeight;
}

export const DEFAULT_SUBTITLE_CONFIG: SubtitleConfig = {
  backgroundColor: "#000000",
  backgroundOpacity: 0.25,
  originalColor: "#ffffff",
  originalFontSize: 20,
  originalFontWeight: "normal",
  translatedColor: "#fff36a",
  translatedFontSize: 26,
  translatedFontWeight: "bold",
};

export function sanitizeSubtitleConfig(value: unknown): SubtitleConfig {
  const source =
    typeof value === "object" && value !== null
      ? (value as Partial<SubtitleConfig>)
      : {};
  const number = (key: keyof SubtitleConfig, min: number, max: number) => {
    const candidate = source[key];
    return typeof candidate === "number" && Number.isFinite(candidate)
      ? Math.min(max, Math.max(min, candidate))
      : (DEFAULT_SUBTITLE_CONFIG[key] as number);
  };
  const color = (
    key: "backgroundColor" | "originalColor" | "translatedColor",
  ) => {
    const candidate = source[key];
    return typeof candidate === "string" && /^#[\da-f]{6}$/i.test(candidate)
      ? candidate
      : DEFAULT_SUBTITLE_CONFIG[key];
  };
  const fontWeight = (
    key: "originalFontWeight" | "translatedFontWeight",
  ): SubtitleFontWeight => {
    const candidate = source[key];
    return candidate === "normal" || candidate === "bold"
      ? candidate
      : DEFAULT_SUBTITLE_CONFIG[key];
  };

  return {
    backgroundColor: color("backgroundColor"),
    backgroundOpacity: number("backgroundOpacity", 0, 1),
    originalColor: color("originalColor"),
    originalFontSize: number(
      "originalFontSize",
      SUBTITLE_MIN_FONT_SIZE,
      SUBTITLE_MAX_FONT_SIZE,
    ),
    originalFontWeight: fontWeight("originalFontWeight"),
    translatedColor: color("translatedColor"),
    translatedFontSize: number(
      "translatedFontSize",
      SUBTITLE_MIN_FONT_SIZE,
      SUBTITLE_MAX_FONT_SIZE,
    ),
    translatedFontWeight: fontWeight("translatedFontWeight"),
  };
}
