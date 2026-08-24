import {
  type ApiConfig,
  createInitialApiConfig,
  sanitizeApiConfig,
} from "../api-config";
import {
  hydrateApiConfig,
  setLanguage,
  setOcrTargetLanguage,
  setOutputTemplate,
  setPanelExpansion,
  setTheme,
} from "../settings";
import store from "../store";
import {
  REDUX_STORAGE_KEY,
  REHYDRATE_KEYS,
  rehydrateFlag,
} from "./rehydrate-constant";

export const rehydrateMapper = {
  [REHYDRATE_KEYS.SETTING_OUTPUT_TEMPLATE]: setOutputTemplate,
  [REHYDRATE_KEYS.SETTING_LANGUAGE]: setLanguage,
  [REHYDRATE_KEYS.SETTING_OCR_TARGET_LANGUAGE]: setOcrTargetLanguage,
  [REHYDRATE_KEYS.SETTING_THEME]: setTheme,
  [REHYDRATE_KEYS.SETTING_PANEL_EXPANSION]: setPanelExpansion,
};

export function rehydrate() {
  let obj: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(REDUX_STORAGE_KEY) || "{}",
    );
    if (typeof parsed === "object" && parsed !== null)
      obj = parsed as Record<string, unknown>;
  } catch {
    // Ignore corrupt storage and continue with defaults.
  }
  const storedApiConfig = obj[REHYDRATE_KEYS.SETTING_API_CONFIG];
  const source =
    typeof storedApiConfig === "object" && storedApiConfig !== null
      ? (storedApiConfig as Partial<ApiConfig>)
      : {};
  // Restore the nested shape in dependency order: providers, then selections, then sanitize.
  const apiConfig = sanitizeApiConfig({
    ...createInitialApiConfig(),
    providers: source.providers ?? [],
    selections: source.selections ?? createInitialApiConfig().selections,
    translationMode: source.translationMode ?? "transcribe-then-translate",
    batchTranslate: source.batchTranslate ?? false,
  });
  store.dispatch(hydrateApiConfig(apiConfig));
  for (const key in rehydrateMapper) {
    const setter = rehydrateMapper[key];
    if (obj[key] !== undefined) {
      store.dispatch(setter(obj[key] as never));
    }
  }
  obj[REHYDRATE_KEYS.SETTING_API_CONFIG] = apiConfig;
  // API secrets/configuration were historically persisted as independent keys.
  // Do not migrate them; remove them from the envelope before future writes.
  for (const key of [
    "SETTING_TRANSCRIPTION_URL",
    "SETTING_TRANSCRIPTION_MODEL",
    "SETTING_TRANSCRIPTION_TOKEN",
    "SETTING_OPENAI_API_URL",
    "SETTING_OPENAI_MODEL",
    "SETTING_OPENAI_TOKEN",
    "SETTING_API_PROVIDER_TYPE",
    "SETTING_OMNI_KEEP_AUDIO_TYPE",
    "SETTING_BATCH_TRANSLATE",
  ])
    delete obj[key];
  localStorage.setItem(REDUX_STORAGE_KEY, JSON.stringify(obj));
  // 初始化已完成
  rehydrateFlag.flag = true;
}

rehydrate();
