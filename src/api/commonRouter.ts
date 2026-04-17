/**
 * 通过此通用路由，业务收集的信息统一在这里处理
 */
import { encodeWAV } from "@ricky0123/vad-web/dist/utils";
import { EApiProviderType } from "@/store/rehydrate/rehydrate-constant";
import store from "@/store/store";
import {
  ocrByLocalTransformer,
  ocrByLocalTransformerStream,
  transcribeByLocalTransformer,
  translateByLocalTransformer,
  translateByLocalTransformerStream,
} from "./localTransformer";
import {
  ocrByLongCat,
  ocrByLongCatStream,
  transcriptionByLongCat,
  translateByLongCat,
  translateByLongCatStream,
} from "./longcat";
import {
  ocrByOpenAI,
  ocrByOpenAIStream,
  transcriptionByOpenAI,
  translateByOpenAI,
  translateByOpenAIStream,
} from "./openai";
import {
  transcriptionAudio,
  transformOCR,
  transformOCRStream,
  translateByAI,
  translateByAIStream,
} from "./translate";

/**
 * 通用翻译路由
 * @param data
 * @returns
 */
export const translateRouter = async (data: { text: string }) => {
  let result: string = "";
  const settings = store.getState().settings;
  const ask = settings.ai_template.replace("{text}", data.text);
  if (settings.api_provider_type === EApiProviderType.CUSTOM) {
    const translationRes = await translateByAI({
      text: ask,
      token: settings.openai_token,
      api: settings.openai_api_url,
      model: settings.openai_model,
      assignObj: {
        max_tokens: 500,
      },
    });
    result = translationRes.choices[0].message.content;
  } else if (settings.api_provider_type === EApiProviderType.LONG_CAT) {
    const translationRes = await translateByLongCat({
      text: ask,
      token: settings.longcat_api_auth,
      model: "LongCat-Flash-Lite",
    });
    result = translationRes.choices[0].message.content;
  } else if (settings.api_provider_type === EApiProviderType.OPEN_AI) {
    const translationRes = await translateByOpenAI({
      text: ask,
      token: settings.openai_api_auth,
    });
    result = translationRes.choices[0].message.content;
  } else if (
    settings.api_provider_type === EApiProviderType.LOCAL_TRANSFORMER
  ) {
    result = (await translateByLocalTransformer({ text: ask })) || "";
  }

  return result;
};

/**
 * 通用翻译路由（流式）
 * @param data
 * @param onChunk 每个增量文本块的回调
 * @param signal 可选的 AbortSignal 用于取消请求
 */
export const translateRouterStream = async (
  data: { text: string },
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) => {
  const settings = store.getState().settings;
  const ask = settings.ai_template.replace("{text}", data.text);

  if (settings.api_provider_type === EApiProviderType.CUSTOM) {
    await translateByAIStream(
      {
        text: ask,
        token: settings.openai_token,
        api: settings.openai_api_url,
        model: settings.openai_model,
        assignObj: {
          max_tokens: 500,
        },
      },
      onChunk,
      signal,
    );
  } else if (settings.api_provider_type === EApiProviderType.LONG_CAT) {
    await translateByLongCatStream(
      {
        text: ask,
        token: settings.longcat_api_auth,
        model: "LongCat-Flash-Lite",
      },
      onChunk,
      signal,
    );
  } else if (settings.api_provider_type === EApiProviderType.OPEN_AI) {
    await translateByOpenAIStream(
      {
        text: ask,
        token: settings.openai_api_auth,
      },
      onChunk,
      signal,
    );
  } else if (
    settings.api_provider_type === EApiProviderType.LOCAL_TRANSFORMER
  ) {
    await translateByLocalTransformerStream({ text: ask }, onChunk);
  }
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
    result = transcriptionRes.text;
  } else if (settings.api_provider_type === EApiProviderType.LONG_CAT) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const transcriptionRes = await transcriptionByLongCat({
      token: settings.longcat_api_auth,
      model: "LongCat-Flash-Omni-2603",
      audio_base64: base64,
    });
    result = transcriptionRes.choices[0].message.content;
  } else if (settings.api_provider_type === EApiProviderType.OPEN_AI) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const transcriptionRes = await transcriptionByOpenAI({
      token: settings.openai_api_auth,
      audio_base64: base64,
    });
    result = transcriptionRes.choices[0].message.content;
  } else if (
    settings.api_provider_type === EApiProviderType.LOCAL_TRANSFORMER
  ) {
    result = await transcribeByLocalTransformer({ audioData: file });
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
  if (settings.api_provider_type === EApiProviderType.CUSTOM) {
    const ocrRes = await transformOCR({ base64 });
    result = ocrRes.choices[0].message.content;
  } else if (settings.api_provider_type === EApiProviderType.LONG_CAT) {
    const ocrRes = await ocrByLongCat({
      token: settings.longcat_api_auth,
      base64,
    });
    result = ocrRes.choices[0].message.content;
  } else if (settings.api_provider_type === EApiProviderType.OPEN_AI) {
    const ocrRes = await ocrByOpenAI({
      token: settings.openai_api_auth,
      base64,
    });
    result = ocrRes.choices[0].message.content;
  } else if (
    settings.api_provider_type === EApiProviderType.LOCAL_TRANSFORMER
  ) {
    result = await ocrByLocalTransformer({ base64 });
  }
  return result;
};

/**
 * 通用OCR路由（流式）
 * @param data
 * @param onChunk 每个增量文本块的回调
 * @param signal 可选的 AbortSignal 用于取消请求
 */
export const transformOCRRouterStream = async (
  { base64 }: { base64: string },
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) => {
  const settings = store.getState().settings;

  if (settings.api_provider_type === EApiProviderType.CUSTOM) {
    await transformOCRStream({ base64 }, onChunk, signal);
  } else if (settings.api_provider_type === EApiProviderType.LONG_CAT) {
    await ocrByLongCatStream(
      {
        token: settings.longcat_api_auth,
        base64,
      },
      onChunk,
      signal,
    );
  } else if (settings.api_provider_type === EApiProviderType.OPEN_AI) {
    await ocrByOpenAIStream(
      {
        token: settings.openai_api_auth,
        base64,
      },
      onChunk,
      signal,
    );
  } else if (
    settings.api_provider_type === EApiProviderType.LOCAL_TRANSFORMER
  ) {
    await ocrByLocalTransformerStream({ base64 }, onChunk);
  }
};
