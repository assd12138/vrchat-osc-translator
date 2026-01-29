import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { REHYDRATE_KEYS } from "./rehydrate/rehydrateConstant";
import { redux_store } from "./rehydrate/rehydrateStore";

const settingsSlice = createSlice({
  name: "settings",
  initialState: {
    osc_url: "ws://localhost:8080",
    transcription_url: "http://localhost:8000/v1/audio/transcriptions",
    transcription_model: "whisper-large-v3-turbo",
    transcription_token: "",
    openai_api_url: "http://localhost:11434/v1/chat/completions",
    openai_model: "gemma3:4b",
    openai_token: "",
    ai_template: `请自动检测文本原文的语言类型并按以下模板翻译：
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
      state.transcription_url = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_BACKEND_URL, action.payload);
    },
    setTranscriptionModel: (state, action: PayloadAction<string>) => {
      state.transcription_model = action.payload;
    },
    setTranscriptionToken: (state, action: PayloadAction<string>) => {
      state.transcription_token = action.payload;
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

export const { setOscUrl, setBackendUrl, setAiTemplate, setOpenaiApiUrl, setOpenaiModel, setOpenaiToken, setLanguage, setTranscriptionModel, setTranscriptionToken } =
  settingsSlice.actions;

export default settingsSlice;
