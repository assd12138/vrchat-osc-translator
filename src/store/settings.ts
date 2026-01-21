import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { REHYDRATE_KEYS } from "./rehydrate/rehydrateConstant";
import { redux_store } from "./rehydrate/rehydrateStore";

const settingsSlice = createSlice({
  name: "settings",
  initialState: {
    osc_url: "ws://localhost:8080",
    backend_url: "http://localhost:8000",
    openai_api_url: "http://localhost:11434",
    openai_model: "gemma3:4b",
    openai_token: "",
    ai_template: `请将我的文本按以下模板翻译：
【中】{中文翻译}
【En】{英文翻译}
【日】{日文翻译}
【한】{韩文翻译}
文本原文：{text}`,
    language: 'auto'
  },
  reducers: {
    setOscUrl: (state, action: PayloadAction<string>) => {
      state.osc_url = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_OSC_URL, action.payload);
    },
    setBackendUrl: (state, action: PayloadAction<string>) => {
      state.backend_url = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_BACKEND_URL, action.payload);
    },
    setAiTemplate: (state, action: PayloadAction<string>) => {
      state.ai_template = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_AI_TEMPLATE, action.payload);
    },
    setOpenaiApiUrl: (state, action: PayloadAction<string>) => {
      state.openai_api_url = action.payload;
    },
    setOpenaiModel: (state, action: PayloadAction<string>) => {
      state.openai_model = action.payload;
    },
    setOpenaiToken: (state, action: PayloadAction<string>) => {
      state.openai_token = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_LANGUAGE, action.payload);
    },
  },
});

export const { setOscUrl, setBackendUrl, setAiTemplate, setOpenaiApiUrl, setOpenaiModel, setOpenaiToken, setLanguage } =
  settingsSlice.actions;

export default settingsSlice;
