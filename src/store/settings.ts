import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  EApiProviderType,
  REDUX_STORAGE_KEY,
  REHYDRATE_KEYS,
} from "./rehydrate/rehydrate-constant";
import { redux_store } from "./rehydrate/rehydrate-store";

export type TargetLanguage = "cn" | "en" | "jp" | "kr";

export interface SettingState {
  transcription_url: string;
  transcription_model: string;
  transcription_token: string;
  openai_api_url: string;
  openai_model: string;
  openai_token: string;
  /** @deprecated 已改用 outputTemplate */
  ai_template?: string;
  outputTemplate: string;
  targetLanguages: TargetLanguage[];
  language: string;
  api_provider_type: EApiProviderType;
  longcat_api_auth: string;
  openai_api_auth: string;
}

export const initialState: SettingState = {
  transcription_url: import.meta.env.VITE_DEFAULT_TRANSCRIPTION_URL,
  transcription_model: import.meta.env.VITE_DEFAULT_TRANSCRIPTION_MODEL,
  transcription_token: import.meta.env.VITE_DEFAULT_TRANSCRIPTION_TOKEN,
  openai_api_url: import.meta.env.VITE_DEFAULT_OPENAI_API_URL,
  openai_model: import.meta.env.VITE_DEFAULT_OPENAI_MODEL,
  openai_token: import.meta.env.VITE_DEFAULT_OPENAI_TOKEN,
  ai_template: undefined,
  outputTemplate: `[中]#{cn}
[En]#{en}
[日]#{jp}
[한]#{kr}`,
  targetLanguages: ["cn", "en", "jp", "kr"],
  language: "auto",
  api_provider_type: EApiProviderType.LONG_CAT,
  longcat_api_auth: import.meta.env.VITE_DEFAULT_LONGCAT_API_AUTH,
  openai_api_auth: import.meta.env.VITE_DEFAULT_OPENAI_API_AUTH || "",
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    reinit: (state) => {
      localStorage.removeItem(REDUX_STORAGE_KEY);
      for (const key in initialState) {
        if (Object.hasOwn(initialState, key)) {
          // biome-ignore lint/suspicious/noExplicitAny: 重新初始化需要任意类型赋值
          (state as any)[key] = initialState[key as keyof SettingState];
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
    setOutputTemplate: (state, action: PayloadAction<string>) => {
      state.outputTemplate = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_OUTPUT_TEMPLATE, action.payload);
    },
    setTargetLanguages: (
      state,
      action: PayloadAction<TargetLanguage[]>,
    ) => {
      state.targetLanguages = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_TARGET_LANGUAGES, action.payload);
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
    setApiProviderType: (state, action: PayloadAction<EApiProviderType>) => {
      state.api_provider_type = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_API_PROVIDER_TYPE, action.payload);
    },
    setLongcatApiAuth: (state, action: PayloadAction<string>) => {
      state.longcat_api_auth = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_LONGCAT_API_AUTH, action.payload);
    },
    setOpenaiApiAuth: (state, action: PayloadAction<string>) => {
      state.openai_api_auth = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_OPENAI_API_AUTH, action.payload);
    },
  },
});

export const {
  setTranscriptionUrl,
  setAiTemplate,
  setOutputTemplate,
  setTargetLanguages,
  setOpenaiApiUrl,
  setOpenaiModel,
  setOpenaiToken,
  setLanguage,
  setTranscriptionModel,
  setTranscriptionToken,
  setApiProviderType,
  setLongcatApiAuth,
  setOpenaiApiAuth,
  reinit,
} = settingsSlice.actions;

export default settingsSlice;
