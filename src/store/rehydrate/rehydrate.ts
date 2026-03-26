import {
  setAiTemplate,
  setLanguage,
  setOpenaiApiUrl,
  setOpenaiModel,
  setOpenaiToken,
  setTranscriptionModel,
  setTranscriptionToken,
  setTranscriptionUrl,
  setApiProviderType,
  setLongcatApiAuth,
} from "../settings";
import store from "../store";
import {
  REDUX_STORAGE_KEY,
  REHYDRATE_KEYS,
  rehydrateFlag,
  EApiProviderType,
} from "./rehydrate-constant";

export const rehydrateMapper = {
  [REHYDRATE_KEYS.SETTING_AI_TEMPLATE]: setAiTemplate,
  [REHYDRATE_KEYS.SETTING_TRANSCRIPTION_URL]: setTranscriptionUrl,
  [REHYDRATE_KEYS.SETTING_TRANSCRIPTION_MODEL]: setTranscriptionModel,
  [REHYDRATE_KEYS.SETTING_TRANSCRIPTION_TOKEN]: setTranscriptionToken,
  [REHYDRATE_KEYS.SETTING_AI_TEMPLATE]: setAiTemplate,
  [REHYDRATE_KEYS.SETTING_OPENAI_API_URL]: setOpenaiApiUrl,
  [REHYDRATE_KEYS.SETTING_OPENAI_MODEL]: setOpenaiModel,
  [REHYDRATE_KEYS.SETTING_OPENAI_TOKEN]: setOpenaiToken,
  [REHYDRATE_KEYS.SETTING_LANGUAGE]: setLanguage,
  [REHYDRATE_KEYS.SETTING_API_PROVIDER_TYPE]: (value: string) =>
    setApiProviderType(value as EApiProviderType),
  [REHYDRATE_KEYS.SETTING_LONGCAT_API_AUTH]: setLongcatApiAuth,
};

export function rehydrate() {
  // biome-ignore lint/suspicious/noExplicitAny: 任意存储，无需定义
  const obj: any = JSON.parse(
    localStorage.getItem(REDUX_STORAGE_KEY) || JSON.stringify({}),
  );
  for (const key in rehydrateMapper) {
    const setter = rehydrateMapper[key];
    if (obj[key]) {
      store.dispatch(setter(obj[key]));
    }
  }
  // 初始化已完成
  rehydrateFlag.flag = true;
}

rehydrate();
