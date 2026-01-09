import { REDUX_STORAGE_KEY, REHYDRATE_KEYS, rehydrateFlag } from "./rehydrateConstant";
import { setAiTemplate, setBackendUrl, setOscUrl } from "../settings";
import store from "../store";

export const rehydrateMapper = {
  [REHYDRATE_KEYS.SETTING_OSC_URL]: setOscUrl,
  [REHYDRATE_KEYS.SETTING_BACKEND_URL]: setBackendUrl,
  [REHYDRATE_KEYS.SETTING_AI_TEMPLATE]: setAiTemplate
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