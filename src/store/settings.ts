import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    osc_url: 'ws://localhost:8080',
    backend_url: 'http://localhost:8000',
    ai_template: '请将以下文本翻译成英语:{text}'
  },
  reducers: {
    setOscUrl: (state, action: PayloadAction<string>) => {
      state.osc_url = action.payload
    },
    setBackendUrl: (state, action: PayloadAction<string>) => {
      state.backend_url = action.payload
    },
    setAiTemplate: (state, action: PayloadAction<string>) => {
      state.ai_template = action.payload
    }
  }
})

export const { setOscUrl, setBackendUrl, setAiTemplate } = settingsSlice.actions

export default settingsSlice