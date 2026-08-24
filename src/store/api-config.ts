/** Shared provider configuration contract. UIDs are persisted and never derived from display values. */
export type TranslationMode = "direct" | "transcribe-then-translate";

export interface ChatCapabilities {
  audio: boolean;
  image: boolean;
  text: boolean;
  tools: boolean;
}

export interface AudioTranscriptionModel {
  uid: string;
  modelId: string;
  type: "audio-transcription";
}

export interface ChatCompletionModel {
  uid: string;
  modelId: string;
  type: "chat-completion";
  capabilities: ChatCapabilities;
}

export type ApiModel = AudioTranscriptionModel | ChatCompletionModel;

export interface ApiProvider {
  uid: string;
  identifier: string;
  baseURL: string;
  apiKey: string;
  models: ApiModel[];
}

export interface SelectedModel {
  providerUid: string;
  modelUid: string;
}

export type ModelSelection = SelectedModel | null;
export type ModelSlot = "direct" | "transcription" | "translation" | "ocr";

export interface ApiConfig {
  providers: ApiProvider[];
  translationMode: TranslationMode;
  selections: Record<ModelSlot, ModelSelection>;
  batchTranslate: boolean;
}

export const createApiProvider = (): ApiProvider => ({
  uid: crypto.randomUUID(),
  identifier: "",
  baseURL: "",
  apiKey: "",
  models: [],
});

export const createAudioTranscriptionModel = (
  modelId = "",
): AudioTranscriptionModel => ({
  uid: crypto.randomUUID(),
  modelId,
  type: "audio-transcription",
});

export const createChatCompletionModel = (
  modelId = "",
  capabilities: Partial<ChatCapabilities> = {},
): ChatCompletionModel => ({
  uid: crypto.randomUUID(),
  modelId,
  type: "chat-completion",
  capabilities: {
    audio: true,
    image: true,
    text: true,
    tools: true,
    ...capabilities,
  },
});

export const createInitialApiConfig = (): ApiConfig => ({
  providers: [],
  translationMode: "transcribe-then-translate",
  selections: {
    direct: null,
    transcription: null,
    translation: null,
    ocr: null,
  },
  batchTranslate: false,
});

export const isModelEligible = (slot: ModelSlot, model: ApiModel): boolean => {
  if (slot === "transcription") {
    return model.type === "audio-transcription" || model.capabilities.audio;
  }
  if (model.type !== "chat-completion") return false;
  if (slot === "direct") {
    return (
      model.capabilities.audio &&
      model.capabilities.text &&
      model.capabilities.tools
    );
  }
  if (slot === "translation") return model.capabilities.text;
  return (
    model.capabilities.image &&
    model.capabilities.text &&
    model.capabilities.tools
  );
};

export const isSelectionValid = (
  slot: ModelSlot,
  selection: ModelSelection,
  providers: ApiProvider[],
): boolean => {
  if (!selection) return false;
  const provider = providers.find(({ uid }) => uid === selection.providerUid);
  const model = provider?.models.find(({ uid }) => uid === selection.modelUid);
  return !!model && isModelEligible(slot, model);
};

export interface EligibleProviderModels {
  provider: ApiProvider;
  models: ApiModel[];
}

export const getEligibleProviderModels = (
  slot: ModelSlot,
  providers: ApiProvider[],
): EligibleProviderModels[] =>
  providers
    .map((provider) => ({
      provider,
      models: provider.models.filter((model) => isModelEligible(slot, model)),
    }))
    .filter(({ models }) => models.length > 0);

export const isProviderIdentifierAvailable = (
  identifier: string,
  providers: ApiProvider[],
  currentUid?: string,
): boolean => {
  const normalized = canonicalizeProviderIdentifier(identifier);
  return (
    normalized.length > 0 &&
    !providers.some(
      (provider) =>
        provider.uid !== currentUid &&
        canonicalizeProviderIdentifier(provider.identifier) === normalized,
    )
  );
};

export const sanitizeApiConfig = (config: ApiConfig): ApiConfig => {
  const raw = config as unknown;
  const value = isRecord(raw) ? raw : {};
  const identifiers = new Set<string>();
  const providerCandidates = Array.isArray(value.providers)
    ? value.providers.flatMap(sanitizeProvider)
    : [];
  const providerUidCounts = countUids(providerCandidates);
  const providers = providerCandidates.filter((provider) => {
    const identifier = canonicalizeProviderIdentifier(provider.identifier);
    if (
      providerUidCounts.get(provider.uid) !== 1 ||
      identifiers.has(identifier)
    )
      return false;
    identifiers.add(identifier);
    return true;
  });
  const rawSelections = isRecord(value.selections) ? value.selections : {};
  const selections = {} as Record<ModelSlot, ModelSelection>;
  for (const slot of modelSlots) {
    const selection = sanitizeSelection(rawSelections[slot]);
    selections[slot] = isSelectionValid(slot, selection, providers)
      ? selection
      : null;
  }
  return {
    providers,
    translationMode:
      value.translationMode === "direct"
        ? "direct"
        : "transcribe-then-translate",
    selections,
    batchTranslate: value.batchTranslate === true,
  };
};

const modelSlots: ModelSlot[] = [
  "direct",
  "transcription",
  "translation",
  "ocr",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const canonicalizeProviderIdentifier = (identifier: string): string =>
  identifier.trim().toLowerCase();

const countUids = (items: Array<{ uid: string }>): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const { uid } of items) counts.set(uid, (counts.get(uid) ?? 0) + 1);
  return counts;
};

const sanitizeSelection = (value: unknown): ModelSelection => {
  if (
    !isRecord(value) ||
    typeof value.providerUid !== "string" ||
    typeof value.modelUid !== "string"
  ) {
    return null;
  }
  const providerUid = value.providerUid.trim();
  const modelUid = value.modelUid.trim();
  return providerUid && modelUid ? { providerUid, modelUid } : null;
};

const sanitizeProvider = (value: unknown): ApiProvider[] => {
  if (
    !isRecord(value) ||
    typeof value.uid !== "string" ||
    typeof value.identifier !== "string"
  ) {
    return [];
  }
  const uid = value.uid.trim();
  const identifier = value.identifier.trim();
  if (!uid || !identifier) return [];
  const modelCandidates = Array.isArray(value.models)
    ? value.models.flatMap(sanitizeModel)
    : [];
  const modelUidCounts = countUids(modelCandidates);
  return [
    {
      uid,
      identifier,
      baseURL:
        typeof value.baseURL === "string"
          ? value.baseURL.trim().replace(/\/+$/, "")
          : "",
      apiKey: typeof value.apiKey === "string" ? value.apiKey.trim() : "",
      models: modelCandidates.filter(
        (model) => modelUidCounts.get(model.uid) === 1,
      ),
    },
  ];
};

const sanitizeModel = (value: unknown): ApiModel[] => {
  if (
    !isRecord(value) ||
    typeof value.uid !== "string" ||
    typeof value.modelId !== "string"
  ) {
    return [];
  }
  const uid = value.uid.trim();
  if (!uid) return [];
  if (value.type === "audio-transcription") {
    return [{ uid, modelId: value.modelId.trim(), type: value.type }];
  }
  if (value.type !== "chat-completion") return [];
  const capabilities = isRecord(value.capabilities) ? value.capabilities : {};
  return [
    {
      uid,
      modelId: value.modelId.trim(),
      type: value.type,
      capabilities: {
        audio: capabilities.audio === true,
        image: capabilities.image === true,
        text: capabilities.text === true,
        tools: capabilities.tools === true,
      },
    },
  ];
};
