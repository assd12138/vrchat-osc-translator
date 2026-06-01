import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  EApiProviderType,
  REDUX_STORAGE_KEY,
  REHYDRATE_KEYS,
} from "./rehydrate/rehydrate-constant";
import { redux_store } from "./rehydrate/rehydrate-store";

export interface SettingState {
  transcription_url: string;
  transcription_model: string;
  transcription_token: string;
  openai_api_url: string;
  openai_model: string;
  openai_token: string;
  outputTemplate: string;
  /** 批量翻译模式 - 每个语言单独发送请求（仅 CUSTOM provider） */
  batchTranslate: boolean;
  language: string;
  api_provider_type: EApiProviderType;
  /** Omni模式下是否保留音频base64类型信息 */
  omni_keep_audio_type: boolean;
}

export const initialState: SettingState = {
  transcription_url: import.meta.env.VITE_DEFAULT_TRANSCRIPTION_URL,
  transcription_model: import.meta.env.VITE_DEFAULT_TRANSCRIPTION_MODEL,
  transcription_token: import.meta.env.VITE_DEFAULT_TRANSCRIPTION_TOKEN,
  openai_api_url: import.meta.env.VITE_DEFAULT_OPENAI_API_URL,
  openai_model: import.meta.env.VITE_DEFAULT_OPENAI_MODEL,
  openai_token: import.meta.env.VITE_DEFAULT_OPENAI_TOKEN,
  outputTemplate: `[中]#{zh}
[En]#{en}
[日]#{ja}
[한]#{ko}
[ru]#{ru}`,
  batchTranslate: false,
  language: "auto",
  api_provider_type: EApiProviderType.CUSTOM,
  omni_keep_audio_type: false,
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
    setOutputTemplate: (state, action: PayloadAction<string>) => {
      state.outputTemplate = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_OUTPUT_TEMPLATE, action.payload);
    },
    setBatchTranslate: (state, action: PayloadAction<boolean>) => {
      state.batchTranslate = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_BATCH_TRANSLATE, action.payload);
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
    setOmniKeepAudioType: (state, action: PayloadAction<boolean>) => {
      state.omni_keep_audio_type = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_OMNI_KEEP_AUDIO_TYPE, action.payload);
    },
  },
});

export const {
  setTranscriptionUrl,
  setOutputTemplate,
  setBatchTranslate,
  setOpenaiApiUrl,
  setOpenaiModel,
  setOpenaiToken,
  setLanguage,
  setTranscriptionModel,
  setTranscriptionToken,
  setApiProviderType,
  setOmniKeepAudioType,
  reinit,
} = settingsSlice.actions;

export default settingsSlice;
