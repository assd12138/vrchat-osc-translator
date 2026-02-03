import { REDUX_STORAGE_KEY, REHYDRATE_KEYS, rehydrateFlag } from "./rehydrateConstant";
import { setAiTemplate, setTranscriptionUrl, setLanguage, setOpenaiApiUrl, setTranscriptionModel, setOpenaiModel, setTranscriptionToken, setOpenaiToken } from "../settings";
import store from "../store";

export const rehydrateMapper = {
  [REHYDRATE_KEYS.SETTING_AI_TEMPLATE]: setAiTemplate,
  [REHYDRATE_KEYS.SETTING_TRANSCRIPTION_URL]: setTranscriptionUrl,
  [REHYDRATE_KEYS.SETTING_TRANSCRIPTION_MODEL]: setTranscriptionModel,
  [REHYDRATE_KEYS.SETTING_TRANSCRIPTION_TOKEN]: setTranscriptionToken,
  [REHYDRATE_KEYS.SETTING_AI_TEMPLATE]: setAiTemplate,
  [REHYDRATE_KEYS.SETTING_OPENAI_API_URL]: setOpenaiApiUrl,
  [REHYDRATE_KEYS.SETTING_OPENAI_MODEL]: setOpenaiModel,
  [REHYDRATE_KEYS.SETTING_OPENAI_TOKEN]: setOpenaiToken,
  [REHYDRATE_KEYS.SETTING_LANGUAGE]: setLanguage
}

export function rehydrate() {
  const obj: any = JSON.parse(localStorage.getItem(REDUX_STORAGE_KEY) || JSON.stringify({}));
  for (const key in rehydrateMapper) {
    const setter = rehydrateMapper[key];
    if (obj[key]) {
      store.dispatch(setter(obj[key]))
    }
  }
  // 初始化已完成
  rehydrateFlag.flag = true
}

rehydrate()