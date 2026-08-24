import type { ApiProvider } from "@/store/api-config";

export type ProviderEndpoint =
  | "models"
  | "audio-transcriptions"
  | "chat-completions";

const endpointPaths: Record<ProviderEndpoint, string> = {
  models: "/models",
  "audio-transcriptions": "/audio/transcriptions",
  "chat-completions": "/chat/completions",
};

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
};
