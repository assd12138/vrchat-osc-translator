// 恢复持久化数据
export const REDUX_STORAGE_KEY = 'redux-persist';

// 在初始化水合完成前，这里都保持false，避免，一边水合一边又存一遍
export let rehydrateFlag = { flag: false };

export const REHYDRATE_KEYS = {
  SETTING_OSC_URL: 'SETTING_OSC_URL',
  SETTING_BACKEND_URL: 'SETTING_BACKEND_URL',
  SETTING_AI_TEMPLATE: 'SETTING_AI_TEMPLATE'
}

