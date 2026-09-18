import {
  type ApiConfig,
  type ApiProvider,
  isSelectionValid,
  type ModelSlot,
  ModelType,
} from "@/store/api-config";
import { configurationError, type ResolvedModel } from "./commonRouter";

export type ProviderEndpoint = "models" | ModelType;

const endpointPaths: Record<ProviderEndpoint, string> = {
  models: "/models",
  [ModelType.AUDIO_TRANSCRIPTION]: "/audio/transcriptions",
  [ModelType.CHAT_COMPLETION]: "/chat/completions",
  [ModelType.MINIMAX_AUDIO_SPEECH_TO_TEXT]: "/speech_to_text",
  [ModelType.NARILAB_AUDIO_SPEECH_TO_TEXT]: "/realtime",
};

/**
 * remove trailing slashes from the base URL and trim whitespace
 * @param baseURL
 * @returns
 */
export const normalizeBaseURL = (baseURL: string): string =>
  baseURL.trim().replace(/\/+$/, "");

export const buildProviderEndpoint = (
  baseURL: string,
  endpoint: ProviderEndpoint,
): string => {
  const normalized = normalizeBaseURL(baseURL);
  if (!normalized) throw new Error("Provider base URL is required");
  return `${normalized}${endpointPaths[endpoint]}`;
};

export const discoverModels = async (
  provider: ApiProvider,
): Promise<string[]> => {
  const baseURL = normalizeBaseURL(provider.baseURL);
  if (!baseURL) throw new Error("Provider base URL is required");
  if (!provider.apiKey.trim()) throw new Error("Provider API key is required");

  const response = await fetch(buildProviderEndpoint(baseURL, "models"), {
    method: "GET",
    headers: { Authorization: `Bearer ${provider.apiKey.trim()}` },
  });
  if (!response.ok)
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  const payload: unknown = await response.json();
  const data =
    typeof payload === "object" && payload !== null && "data" in payload
      ? (payload as { data?: unknown }).data
      : undefined;
  if (!Array.isArray(data)) return [];
  return [
    ...new Set(
      data
        .flatMap((item) =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as { id?: unknown }).id === "string"
            ? [(item as { id: string }).id.trim()]
            : [],
        )
        .filter(Boolean),
    ),
  ];
}; /** 根据功能槽位解析已选供应商和模型，并统一校验调用所需配置。 */

export const resolveModel = (
  apiConfig: ApiConfig,
  slot: ModelSlot,
): ResolvedModel => {
  const selection = apiConfig.selections[slot];
  if (!isSelectionValid(slot, selection, apiConfig.providers) || !selection) {
    throw configurationError(`a valid ${slot} model selection is required`);
  }
  const provider = apiConfig.providers.find(
    ({ uid }) => uid === selection.providerUid,
  );
  const model = provider?.models.find(({ uid }) => uid === selection.modelUid);
  if (
    !provider ||
    !model ||
    !provider.baseURL ||
    !provider.apiKey ||
    !model.modelId
  ) {
    throw configurationError(
      `${slot} provider URL, API key, and model ID are required`,
    );
  }
  return { provider, model };
};
