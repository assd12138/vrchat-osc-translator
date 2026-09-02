import { encodeWAV } from "@ricky0123/vad-web/dist/utils";
import {
  type ApiConfig,
  type ApiModel,
  type ApiProvider,
  isSelectionValid,
  type ModelSlot,
} from "@/store/api-config";
import store from "@/store/store";
import {
  extractLanguagesFromTemplate,
  generateTranslationPrompt,
  generateTranslationTool,
  getLanguageEnglishName,
} from "@/utils";
import { request } from "./index";
import { buildProviderEndpoint } from "./provider";

const translationToolName = "translateFormat";

type ResolvedModel = { provider: ApiProvider; model: ApiModel };

const configurationError = (message: string): Error =>
  new Error(`Provider configuration error: ${message}`);

/** 根据功能槽位解析已选供应商和模型，并统一校验调用所需配置。 */
const resolveModel = (apiConfig: ApiConfig, slot: ModelSlot): ResolvedModel => {
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

const postChat = (resolved: ResolvedModel, body: object) =>
  request(
    buildProviderEndpoint(resolved.provider.baseURL, "chat-completions"),
    {
      method: "POST",
      body: JSON.stringify({
        model: resolved.model.modelId,
        ...body,
        thinking: { type: "disabled" },
      }),
      headers: {
        Authorization: `Bearer ${resolved.provider.apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

const getMessageContent = (response: unknown): string => {
  const content = (
    response as { choices?: Array<{ message?: { content?: unknown } }> }
  )?.choices?.[0]?.message?.content;
  if (typeof content !== "string")
    throw new Error("Provider protocol error: missing string response content");
  return content;
};

/** 从模型响应中提取指定工具调用的 JSON 参数，并校验其结构。 */
const getToolArguments = (
  response: unknown,
  toolName: string,
): Record<string, unknown> => {
  const calls = (
    response as { choices?: Array<{ message?: { tool_calls?: unknown } }> }
  )?.choices?.[0]?.message?.tool_calls;
  const call = Array.isArray(calls)
    ? calls.find(
        (item) =>
          (item as { function?: { name?: unknown } })?.function?.name ===
          toolName,
      )
    : undefined;
  const argumentsText = (
    call as { function?: { arguments?: unknown } } | undefined
  )?.function?.arguments;
  if (typeof argumentsText !== "string")
    throw new Error("Provider protocol error: missing required tool call");
  try {
    const parsed: unknown = JSON.parse(argumentsText);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("Provider protocol error: malformed tool arguments");
  }
};

const applyTranslationTemplate = (
  values: Record<string, unknown>,
  languages: string[],
  template: string,
): string => {
  let result = template;
  for (const language of languages) {
    if (typeof values[language] !== "string") {
      throw new Error(
        `Provider protocol error: missing translation for ${language}`,
      );
    }
    result = result.replace(
      new RegExp(`#\\{${language}\\}`, "g"),
      values[language],
    );
  }
  return result;
};

const translateWithTool = async (
  resolved: ResolvedModel,
  content: string | object[],
  languages: string[],
  template: string,
): Promise<string> => {
  const response = await postChat(resolved, {
    messages: [{ role: "user", content }],
    temperature: 0.7,
    tools: [generateTranslationTool(languages)],
    tool_choice: { type: "function", function: { name: translationToolName } },
  });
  return applyTranslationTemplate(
    getToolArguments(response, translationToolName),
    languages,
    template,
  );
};

const translateWithRequests = async (
  resolved: ResolvedModel,
  text: string,
  languages: string[],
  template: string,
) => {
  const values = await Promise.all(
    languages.map(async (language) => {
      const response = await postChat(resolved, {
        messages: [
          {
            role: "user",
            content: generateTranslationPrompt(text, [language]),
          },
        ],
        temperature: 0.7,
      });
      return [language, getMessageContent(response)] as const;
    }),
  );
  return applyTranslationTemplate(
    Object.fromEntries(values),
    languages,
    template,
  );
};

/** 根据调用要求，在工具调用与逐语言请求之间选择翻译策略。 */
const translateText = (
  resolved: ResolvedModel,
  text: string,
  forceTool: boolean,
  template: string,
  languages: string[],
) => {
  if (languages.length === 0)
    throw configurationError(
      "the output template must contain target languages",
    );
  return forceTool
    ? translateWithTool(
        resolved,
        generateTranslationPrompt(text, languages),
        languages,
        template,
      )
    : translateWithRequests(resolved, text, languages, template);
};

/** 处理纯文本翻译，并根据当前翻译模式选择对应模型。 */
export const translateRouter = ({
  text,
}: {
  text: string;
}): Promise<string> => {
  const { apiConfig, outputTemplate } = store.getState().settings;
  const languages = extractLanguagesFromTemplate(outputTemplate);
  const direct = apiConfig.translationMode === "direct";
  const resolved = resolveModel(apiConfig, direct ? "direct" : "translation");
  return translateText(
    resolved,
    text,
    direct ||
      (resolved.model.type === "chat-completion" &&
        resolved.model.capabilities.tools &&
        !apiConfig.batchTranslate),
    outputTemplate,
    languages,
  );
};

const audioToFile = (audio: Float32Array<ArrayBufferLike>): File => {
  const wavBuffer = encodeWAV(audio);
  return new File([new Blob([wavBuffer], { type: "audio/wav" })], "audio.wav", {
    type: "audio/wav",
  });
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string" || !result.includes(","))
        reject(new Error("Unable to encode audio"));
      else resolve(result.split(",", 2)[1]);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** 根据模型类型，通过转写接口或聊天音频输入生成转写文本。 */
const transcribe = async (
  audio: Float32Array<ArrayBufferLike>,
  resolved: ResolvedModel,
): Promise<string> => {
  const file = audioToFile(audio);
  if (resolved.model.type === "audio-transcription") {
    const form = new FormData();
    form.append("file", file, "audio.wav");
    form.append("model", resolved.model.modelId);
    const response = await request(
      buildProviderEndpoint(resolved.provider.baseURL, "audio-transcriptions"),
      {
        method: "POST",
        body: form,
        headers: { Authorization: `Bearer ${resolved.provider.apiKey}` },
      },
    );
    const text = (response as { text?: unknown }).text;
    if (typeof text !== "string")
      throw new Error("Provider protocol error: missing transcription text");
    return text.replace(/^[\s\S]*?<asr_text>/, "");
  }
  const content: object[] = [
    {
      type: "input_audio",
      input_audio: { data: await fileToBase64(file), format: "wav" },
    },
  ];
  if (resolved.model.capabilities.text) {
    content.push({
      type: "text",
      text: "Transcribe this audio without adding any answers or translated content.",
    });
  }
  return getMessageContent(
    await postChat(resolved, { messages: [{ role: "user", content }] }),
  ).replace(/^[\s\S]*?<asr_text>/, "");
};

/** 处理音频翻译：直接翻译音频，或先转写再翻译。 */
export const processAudioRouter = async ({
  audio,
}: {
  audio: Float32Array<ArrayBufferLike>;
}) => {
  const { apiConfig, outputTemplate } = store.getState().settings;
  const languages = extractLanguagesFromTemplate(outputTemplate);
  if (languages.length === 0)
    throw configurationError(
      "the output template must contain target languages",
    );
  if (apiConfig.translationMode === "direct") {
    const resolved = resolveModel(apiConfig, "direct");
    const file = audioToFile(audio);
    return {
      transcription: null,
      translation: await translateWithTool(
        resolved,
        [
          {
            type: "input_audio",
            input_audio: { data: await fileToBase64(file), format: "wav" },
          },
          {
            type: "text",
            text: "Translate this audio without additional explanation.",
          },
        ],
        languages,
        outputTemplate,
      ),
    };
  }
  const transcriptionModel = resolveModel(apiConfig, "transcription");
  const translationModel = resolveModel(apiConfig, "translation");
  const transcription = await transcribe(audio, transcriptionModel);
  return {
    transcription,
    translation: await translateText(
      translationModel,
      transcription,
      translationModel.model.type === "chat-completion" &&
        translationModel.model.capabilities.tools &&
        !apiConfig.batchTranslate,
      outputTemplate,
      languages,
    ),
  };
};

/** 使用 OCR 模型识别图片文本，并返回原文及目标语言译文。 */
export const transformOCRRouter = async ({
  base64,
}: {
  base64: string;
}): Promise<{ original: string; translation: string }> => {
  const { apiConfig, ocrTargetLanguage } = store.getState().settings;
  const resolved = resolveModel(apiConfig, "ocr");
  const toolName = "ocr_result";
  const response = await postChat(resolved, {
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: base64 } },
          {
            type: "text",
            text: `Recognize this image and translate it into ${getLanguageEnglishName(ocrTargetLanguage)}.`,
          },
        ],
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: toolName,
          parameters: {
            type: "object",
            properties: {
              original: { type: "string" },
              translation: { type: "string" },
            },
            required: ["original", "translation"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: toolName } },
  });
  const result = getToolArguments(response, toolName);
  if (
    typeof result.original !== "string" ||
    typeof result.translation !== "string" ||
    Object.keys(result).length !== 2
  ) {
    throw new Error("Provider protocol error: malformed OCR result");
  }
  return { original: result.original, translation: result.translation };
};
