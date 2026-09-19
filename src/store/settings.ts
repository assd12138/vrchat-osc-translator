import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { languages } from "@/constants/language";
import {
  type ApiConfig,
  type ApiProvider,
  createInitialApiConfig,
  isProviderIdentifierAvailable,
  type ModelSelection,
  type ModelSlot,
  sanitizeApiConfig,
  type TranslationMode,
} from "./api-config";
import {
  REDUX_STORAGE_KEY,
  REHYDRATE_KEYS,
} from "./rehydrate/rehydrate-constant";
import { redux_store } from "./rehydrate/rehydrate-store";

export type ThemePreference = "default" | "liquid-glass" | "hand-drawn";

export const DEFAULT_TRANSLATION_PROMPT_ID = "default";
export const DEFAULT_TRANSLATION_PROMPT_CONTENT =
  "Translate the text within the brackets into #target, without additional explanation and brackets it self, if the content is already in the target language, output the original text.\n\n[#text]";

export interface TranslationPromptTemplate {
  uid: string;
  title: string;
  content: string;
}

const getInitialOcrTargetLanguage = () => {
  const browserLanguage =
    typeof navigator === "undefined" ? undefined : navigator.language;
  const primarySubtag = browserLanguage?.split("-")[0].toLowerCase();

  return primarySubtag && languages.some(({ code }) => code === primarySubtag)
    ? primarySubtag
    : "zh";
};

export interface PanelExpansionState {
  audio: boolean;
  translation: boolean;
  settings: boolean;
  systemLog: boolean;
  ocr: boolean;
}

export interface SettingState {
  /** Deepwork provider configuration. This is the only persisted API configuration. */
  apiConfig: ApiConfig;
  outputTemplate: string;
  translationPromptTemplates: TranslationPromptTemplate[];
  selectedTranslationPromptId: string;
  language: string;
  ocrTargetLanguage: string;
  theme: ThemePreference;
  panelExpansion: PanelExpansionState;
}

export const initialState: SettingState = {
  apiConfig: createInitialApiConfig(),
  outputTemplate: `[中]#{zh}
[En]#{en}
[日]#{ja}
[한]#{ko}
[ru]#{ru}`,
  translationPromptTemplates: [],
  selectedTranslationPromptId: DEFAULT_TRANSLATION_PROMPT_ID,
  language: "auto",
  ocrTargetLanguage: getInitialOcrTargetLanguage(),
  theme: "default",
  panelExpansion: {
    audio: true,
    translation: true,
    settings: true,
    systemLog: true,
    ocr: true,
  },
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
    setOutputTemplate: (state, action: PayloadAction<string>) => {
      state.outputTemplate = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_OUTPUT_TEMPLATE, action.payload);
    },
    setTranslationPromptTemplates: (
      state,
      action: PayloadAction<TranslationPromptTemplate[]>,
    ) => {
      state.translationPromptTemplates = sanitizeTranslationPromptTemplates(
        action.payload,
      );
      ensureSelectedTranslationPrompt(state);
      persistTranslationPromptSettings(state);
    },
    addTranslationPromptTemplate: (
      state,
      action: PayloadAction<TranslationPromptTemplate>,
    ) => {
      const [template] = sanitizeTranslationPromptTemplates([action.payload]);
      if (
        template &&
        !state.translationPromptTemplates.some(
          ({ uid }) => uid === template.uid,
        )
      ) {
        state.translationPromptTemplates.push(template);
        persistTranslationPromptSettings(state);
      }
    },
    updateTranslationPromptTemplate: (
      state,
      action: PayloadAction<{
        uid: string;
        title?: string;
        content?: string;
      }>,
    ) => {
      const template = state.translationPromptTemplates.find(
        ({ uid }) => uid === action.payload.uid,
      );
      if (!template) return;
      if (typeof action.payload.title === "string") {
        template.title = action.payload.title.trim() || template.title;
      }
      if (typeof action.payload.content === "string") {
        template.content = action.payload.content;
      }
      persistTranslationPromptSettings(state);
    },
    removeTranslationPromptTemplate: (state, action: PayloadAction<string>) => {
      state.translationPromptTemplates =
        state.translationPromptTemplates.filter(
          ({ uid }) => uid !== action.payload,
        );
      ensureSelectedTranslationPrompt(state);
      persistTranslationPromptSettings(state);
    },
    setSelectedTranslationPrompt: (state, action: PayloadAction<string>) => {
      state.selectedTranslationPromptId = action.payload;
      ensureSelectedTranslationPrompt(state);
      persistTranslationPromptSettings(state);
    },
    setBatchTranslate: (state, action: PayloadAction<boolean>) => {
      state.apiConfig.batchTranslate = action.payload;
      state.apiConfig = sanitizeApiConfig(state.apiConfig);
      redux_store(REHYDRATE_KEYS.SETTING_API_CONFIG, state.apiConfig);
    },
    setTranslationMode: (state, action: PayloadAction<TranslationMode>) => {
      state.apiConfig.translationMode = action.payload;
      state.apiConfig = sanitizeApiConfig(state.apiConfig);
      redux_store(REHYDRATE_KEYS.SETTING_API_CONFIG, state.apiConfig);
    },
    setModelSelection: (
      state,
      action: PayloadAction<{ slot: ModelSlot; selection: ModelSelection }>,
    ) => {
      state.apiConfig.selections[action.payload.slot] =
        action.payload.selection;
      state.apiConfig = sanitizeApiConfig(state.apiConfig);
      redux_store(REHYDRATE_KEYS.SETTING_API_CONFIG, state.apiConfig);
    },
    upsertProvider: (state, action: PayloadAction<ApiProvider>) => {
      const provider = action.payload;
      const identifier = provider.identifier.trim();
      if (
        !isProviderIdentifierAvailable(
          identifier,
          state.apiConfig.providers,
          provider.uid,
        )
      ) {
        return;
      }
      const index = state.apiConfig.providers.findIndex(
        ({ uid }) => uid === provider.uid,
      );
      const nextProvider = { ...provider, identifier };
      if (index === -1) {
        state.apiConfig.providers.push(nextProvider);
      } else {
        state.apiConfig.providers[index] = nextProvider;
      }
      state.apiConfig = sanitizeApiConfig(state.apiConfig);
      redux_store(REHYDRATE_KEYS.SETTING_API_CONFIG, state.apiConfig);
    },
    removeProvider: (state, action: PayloadAction<string>) => {
      state.apiConfig.providers = state.apiConfig.providers.filter(
        ({ uid }) => uid !== action.payload,
      );
      state.apiConfig = sanitizeApiConfig(state.apiConfig);
      redux_store(REHYDRATE_KEYS.SETTING_API_CONFIG, state.apiConfig);
    },
    /** Internal rehydrate action; not a user-facing configuration mutation. */
    hydrateApiConfig: (state, action: PayloadAction<ApiConfig>) => {
      state.apiConfig = sanitizeApiConfig(action.payload);
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_LANGUAGE, action.payload);
    },
    setOcrTargetLanguage: (state, action: PayloadAction<string>) => {
      state.ocrTargetLanguage = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_OCR_TARGET_LANGUAGE, action.payload);
    },
    setTheme: (state, action: PayloadAction<ThemePreference>) => {
      state.theme = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_THEME, action.payload);
    },
    setPanelExpansion: (state, action: PayloadAction<PanelExpansionState>) => {
      state.panelExpansion = action.payload;
      redux_store(REHYDRATE_KEYS.SETTING_PANEL_EXPANSION, action.payload);
    },
    togglePanelExpansion: (
      state,
      action: PayloadAction<keyof PanelExpansionState>,
    ) => {
      const panel = action.payload;
      state.panelExpansion[panel] = !state.panelExpansion[panel];
      redux_store(REHYDRATE_KEYS.SETTING_PANEL_EXPANSION, state.panelExpansion);
    },
  },
});

export const {
  setOutputTemplate,
  setTranslationPromptTemplates,
  addTranslationPromptTemplate,
  updateTranslationPromptTemplate,
  removeTranslationPromptTemplate,
  setSelectedTranslationPrompt,
  setBatchTranslate,
  setTranslationMode,
  setModelSelection,
  upsertProvider,
  removeProvider,
  setLanguage,
  setOcrTargetLanguage,
  setTheme,
  setPanelExpansion,
  togglePanelExpansion,
  hydrateApiConfig,
  reinit,
} = settingsSlice.actions;

export const getSelectedTranslationPromptContent = (
  settings: Pick<
    SettingState,
    "translationPromptTemplates" | "selectedTranslationPromptId"
  >,
): string =>
  settings.translationPromptTemplates.find(
    ({ uid }) => uid === settings.selectedTranslationPromptId,
  )?.content ?? DEFAULT_TRANSLATION_PROMPT_CONTENT;

const sanitizeTranslationPromptTemplates = (
  templates: unknown,
): TranslationPromptTemplate[] => {
  if (!Array.isArray(templates)) return [];

  const seen = new Set<string>();
  return templates.flatMap((template): TranslationPromptTemplate[] => {
    if (
      typeof template !== "object" ||
      template === null ||
      typeof (template as TranslationPromptTemplate).uid !== "string" ||
      typeof (template as TranslationPromptTemplate).title !== "string" ||
      typeof (template as TranslationPromptTemplate).content !== "string"
    ) {
      return [];
    }
    const uid = (template as TranslationPromptTemplate).uid.trim();
    if (!uid || uid === DEFAULT_TRANSLATION_PROMPT_ID || seen.has(uid))
      return [];
    seen.add(uid);
    return [
      {
        uid,
        title:
          (template as TranslationPromptTemplate).title.trim() ||
          "Untitled prompt",
        content: (template as TranslationPromptTemplate).content,
      },
    ];
  });
};

const ensureSelectedTranslationPrompt = (state: SettingState) => {
  if (
    state.selectedTranslationPromptId !== DEFAULT_TRANSLATION_PROMPT_ID &&
    !state.translationPromptTemplates.some(
      ({ uid }) => uid === state.selectedTranslationPromptId,
    )
  ) {
    state.selectedTranslationPromptId = DEFAULT_TRANSLATION_PROMPT_ID;
  }
};

const persistTranslationPromptSettings = (state: SettingState) => {
  redux_store(
    REHYDRATE_KEYS.SETTING_TRANSLATION_PROMPT_TEMPLATES,
    state.translationPromptTemplates,
  );
  redux_store(
    REHYDRATE_KEYS.SETTING_SELECTED_TRANSLATION_PROMPT,
    state.selectedTranslationPromptId,
  );
};

export default settingsSlice;
