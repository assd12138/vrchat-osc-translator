import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { REHYDRATE_KEYS } from "./rehydrate/rehydrateConstant";
import { redux_store } from "./rehydrate/rehydrateStore";

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    osc_url: 'ws://localhost:8080',
    backend_url: 'http://localhost:8000',
    ai_template: '请将以下文本翻译成英语:{text}'
  },
  reducers: {
    setOscUrl: (state, action: PayloadAction<string>) => {
      state.osc_url = action.payload
      redux_store(REHYDRATE_KEYS.SETTING_OSC_URL, action.payload)
    },
    setBackendUrl: (state, action: PayloadAction<string>) => {
      state.backend_url = action.payload
      redux_store(REHYDRATE_KEYS.SETTING_BACKEND_URL, action.payload)
    },
    setAiTemplate: (state, action: PayloadAction<string>) => {
      state.ai_template = action.payload
      redux_store(REHYDRATE_KEYS.SETTING_AI_TEMPLATE, action.payload)
    }
  }
})

export const { setOscUrl, setBackendUrl, setAiTemplate } = settingsSlice.actions

export default settingsSlice