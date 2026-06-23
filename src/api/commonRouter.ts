/**
 * 通过此通用路由，业务收集的信息统一在这里处理
 */
import { encodeWAV } from "@ricky0123/vad-web/dist/utils";
import { EApiProviderType } from "@/store/rehydrate/rehydrate-constant";
import store from "@/store/store";
import { extractLanguagesFromTemplate } from "@/utils";
import { ocrByOmni, translateAudioDirectlyFromOmni } from "./omni";
import {
  transcriptionAudio,
  translateByAI,
  translateByAISingleLanguage,
} from "./translate";

/**
 * 处理翻译响应 - 尝试 JSON 解析并替换模板占位符
 * JSON 解析失败则直接返回原始内容
 */
const processTranslationResponse = (
  rawContent: string,
  template: string,
): string => {
  try {
    const response = JSON.parse(rawContent);
    let result = template;
    for (const [lang, value] of Object.entries(response)) {
      if (value) {
        result = result.replace(
          new RegExp(`#\\{${lang}\\}`, "g"),
          String(value),
        );
      }
    }
    return result;
  } catch {
    return rawContent;
  }
};

/**
 * 通用翻译路由
 * @param data
 * @returns
 */
export const translateRouter = async (data: { text: string }) => {
  const settings = store.getState().settings;
  const extractedLanguages = extractLanguagesFromTemplate(
    settings.outputTemplate,
  );
  const languages = extractedLanguages || [];
  let rawContent = "";

  // 批量翻译模式（仅 CUSTOM provider）
  if (
    settings.api_provider_type === EApiProviderType.CUSTOM &&
    settings.batchTranslate
  ) {
    const results = await Promise.all(
      languages.map((lang) =>
        translateByAISingleLanguage({
          text: data.text,
          token: settings.openai_token,
          api: settings.openai_api_url,
          model: settings.openai_model,
          language: lang,
          assignObj: {
            thinking: {
              type: "disabled",
            },
            reasoning_effort: "none",
          },
        }),
      ),
    );

    // 汇总结果为对象
    const responseObj: Record<string, string> = {};
    languages.forEach((lang, i) => {
      responseObj[lang] = results[i].choices[0].message.content;
    });

    return processTranslationResponse(
      JSON.stringify(responseObj),
      settings.outputTemplate,
    );
  }

  // 普通翻译模式（使用 JSON Schema）
  if (
    [EApiProviderType.CUSTOM, EApiProviderType.OMNI].includes(
      settings.api_provider_type,
    )
  ) {
    const translationRes = await translateByAI({
      text: data.text,
      token: settings.openai_token,
      api: settings.openai_api_url,
      model: settings.openai_model,
      languages,
      assignObj: {
        thinking: {
          type: "disabled",
        },
        reasoning_effort: "none",
      },
    });
    rawContent =
      translationRes.choices[0].message.tool_calls[0].function.arguments;
  }

  return processTranslationResponse(rawContent, settings.outputTemplate);
};

/**
 * 通用转录路由
 * @param data
 * @returns
 */
export const transcriptionRouter = async (data: {
  audio: Float32Array<ArrayBufferLike>;
}) => {
  let result: string = "";
  const settings = store.getState().settings;
  const wavBuffer = encodeWAV(data.audio);
  const audioBlob = new Blob([wavBuffer], { type: "audio/wav" });
  const file = new File([audioBlob], "audio.wav", {
    type: audioBlob.type,
    lastModified: Date.now(),
  });
  if (settings.api_provider_type === EApiProviderType.CUSTOM) {
    const transcriptionRes = await transcriptionAudio({
      file,
      api: settings.transcription_url,
      auth: settings.transcription_token,
      model: settings.transcription_model,
    });
    result = transcriptionRes.text.replace(/^[\s\S]*?<asr_text>/, "");
  } else if (settings.api_provider_type === EApiProviderType.OMNI) {
    const extractedLanguages = extractLanguagesFromTemplate(
      settings.outputTemplate,
    );
    const languages = extractedLanguages;
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const transcriptionRes = await translateAudioDirectlyFromOmni({
      token: settings.openai_token,
      audio_base64: settings.omni_keep_audio_type
        ? base64
        : base64.split(",")[1],
      languages,
      api: settings.openai_api_url,
      model: settings.openai_model,
      assignObj: {
        thinking: {
          type: "disabled",
        },
        reasoning_effort: "none",
      },
    });
    const rawContent =
      transcriptionRes.choices[0].message.tool_calls[0].function.arguments;
    result = processTranslationResponse(rawContent, settings.outputTemplate);
  }
  return result;
};

/**
 * 通用OCR路由
 * @param data
 * @returns
 */
export const transformOCRRouter = async ({ base64 }: { base64: string }) => {
  const settings = store.getState().settings;
  let result: string = "";
  if (settings.api_provider_type === EApiProviderType.OMNI) {
    const ocrRes = await ocrByOmni({
      token: settings.openai_token,
      base64,
      api: settings.openai_api_url,
      model: settings.openai_model,
    });
    result = ocrRes.choices[0].message.content;
  }
  return result;
};
