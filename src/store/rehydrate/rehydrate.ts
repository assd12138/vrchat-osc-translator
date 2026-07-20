import {
  setApiProviderType,
  setBatchTranslate,
  setLanguage,
  setOcrTargetLanguage,
  setOmniKeepAudioType,
  setOpenaiApiUrl,
  setOpenaiModel,
  setOpenaiToken,
  setOutputTemplate,
  setPanelExpansion,
  setTheme,
  setTranscriptionModel,
  setTranscriptionToken,
  setTranscriptionUrl,
} from "../settings";
import store from "../store";
import {
  REDUX_STORAGE_KEY,
  REHYDRATE_KEYS,
  rehydrateFlag,
} from "./rehydrate-constant";

export const rehydrateMapper = {
  [REHYDRATE_KEYS.SETTING_OUTPUT_TEMPLATE]: setOutputTemplate,
  [REHYDRATE_KEYS.SETTING_BATCH_TRANSLATE]: setBatchTranslate,
  [REHYDRATE_KEYS.SETTING_TRANSCRIPTION_URL]: setTranscriptionUrl,
  [REHYDRATE_KEYS.SETTING_TRANSCRIPTION_MODEL]: setTranscriptionModel,
  [REHYDRATE_KEYS.SETTING_TRANSCRIPTION_TOKEN]: setTranscriptionToken,
  [REHYDRATE_KEYS.SETTING_OPENAI_API_URL]: setOpenaiApiUrl,
  [REHYDRATE_KEYS.SETTING_OPENAI_MODEL]: setOpenaiModel,
  [REHYDRATE_KEYS.SETTING_OPENAI_TOKEN]: setOpenaiToken,
  [REHYDRATE_KEYS.SETTING_LANGUAGE]: setLanguage,
  [REHYDRATE_KEYS.SETTING_OCR_TARGET_LANGUAGE]: setOcrTargetLanguage,
  [REHYDRATE_KEYS.SETTING_THEME]: setTheme,
  [REHYDRATE_KEYS.SETTING_PANEL_EXPANSION]: setPanelExpansion,
  [REHYDRATE_KEYS.SETTING_API_PROVIDER_TYPE]: setApiProviderType,
  [REHYDRATE_KEYS.SETTING_OMNI_KEEP_AUDIO_TYPE]: setOmniKeepAudioType,
};

export function rehydrate() {
  // biome-ignore lint/suspicious/noExplicitAny: 任意存储，无需定义
  const obj: any = JSON.parse(
    localStorage.getItem(REDUX_STORAGE_KEY) || JSON.stringify({}),
  );
  for (const key in rehydrateMapper) {
    const setter = rehydrateMapper[key];
    if (obj[key]) {
      store.dispatch(setter(obj[key] as never));
    }
  }
  // 初始化已完成
  rehydrateFlag.flag = true;
}

rehydrate();
