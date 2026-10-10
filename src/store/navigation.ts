export enum PanelId {
  SpeechRecognition = "speechRecognition",
  Settings = "settings",
  Providers = "providers",
  Ocr = "ocr",
  SystemLog = "systemLog",
}

export const DEFAULT_PANEL_ORDER = [
  PanelId.SpeechRecognition,
  PanelId.Settings,
  PanelId.Providers,
  PanelId.Ocr,
  PanelId.SystemLog,
] as const;

/** Restore only a complete permutation of the current navigation entries. */
export function sanitizePanelOrder(value: unknown): PanelId[] {
  if (!Array.isArray(value) || value.length !== DEFAULT_PANEL_ORDER.length) {
    return [...DEFAULT_PANEL_ORDER];
  }
  const known = new Set<string>(DEFAULT_PANEL_ORDER);
  const order = value.filter(
    (id): id is PanelId => typeof id === "string" && known.has(id),
  );
  return new Set(order).size === DEFAULT_PANEL_ORDER.length
    ? order
    : [...DEFAULT_PANEL_ORDER];
}
