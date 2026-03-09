import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  REDUX_STORAGE_KEY,
  REHYDRATE_KEYS,
} from "./rehydrate/rehydrateConstant";
import { redux_store } from "./rehydrate/rehydrateStore";

interface SettingState {
  transcription_url: string;
  transcription_model: string;
  transcription_token: string;
  openai_api_url: string;
  openai_model: string;
  openai_token: string;
  ai_template: string;
  language: string;
}

export const initialState: SettingState = {
  transcription_url: import.meta.env.VITE_DEFAULT_TRANSCRIPTION_URL,
  transcription_model: import.meta.env.VITE_DEFAULT_TRANSCRIPTION_MODEL,
  transcription_token: import.meta.env.VITE_DEFAULT_TRANSCRIPTION_TOKEN,
  openai_api_url: import.meta.env.VITE_DEFAULT_OPENAI_API_URL,
  openai_model: import.meta.env.VITE_DEFAULT_OPENAI_MODEL,
  openai_token: import.meta.env.VITE_DEFAULT_OPENAI_TOKEN,
  ai_template: `请自动检测文本原文的语言类型并按以下模板翻译：
【中】{中文翻译}
【En】{英文翻译}
【日】{日文翻译}
【한】{韩文翻译}
文本原文：{text}`,
  language: "auto",
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    reinit: (state) => {
      localStorage.removeItem(REDUX_STORAGE_KEY);
      for (const key in initialState) {
        if (Object.hasOwn(initialState, key)) {
          state[key as keyof SettingState] =
            initialState[key as keyof SettingState];
        }
      }
    },
    setTranscriptionUrl: (state, action: PayloadAction<string>) => {
      state.transcription_url = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_TRANSCRIPTION_URL, action.payload);
    },
    setTranscriptionModel: (state, action: PayloadAction<string>) => {
      state.transcription_model = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_TRANSCRIPTION_MODEL, action.payload);
    },
    setTranscriptionToken: (state, action: PayloadAction<string>) => {
      state.transcription_token = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_TRANSCRIPTION_TOKEN, action.payload);
    },
    setAiTemplate: (state, action: PayloadAction<string>) => {
      state.ai_template = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_AI_TEMPLATE, action.payload);
    },
    setOpenaiApiUrl: (state, action: PayloadAction<string>) => {
      state.openai_api_url = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_OPENAI_API_URL, action.payload);
    },
    setOpenaiModel: (state, action: PayloadAction<string>) => {
      state.openai_model = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_OPENAI_MODEL, action.payload);
    },
    setOpenaiToken: (state, action: PayloadAction<string>) => {
      state.openai_token = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_OPENAI_TOKEN, action.payload);
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_LANGUAGE, action.payload);
    },
  },
});

export const {
  setTranscriptionUrl,
  setAiTemplate,
  setOpenaiApiUrl,
  setOpenaiModel,
  setOpenaiToken,
  setLanguage,
  setTranscriptionModel,
  setTranscriptionToken,
  reinit,
} = settingsSlice.actions;

export default settingsSlice;
