/**
 * 通过此通用路由，业务收集的信息统一在这里处理
 */
import { encodeWAV } from "@ricky0123/vad-web/dist/utils";
import { EApiProviderType } from "@/store/rehydrate/rehydrate-constant";
import store from "@/store/store";
import {
  ocrByLongCat,
  transcriptionByLongCat,
  translateByLongCat,
} from "./longcat";
import {
  ocrByOpenAI,
  transcriptionByOpenAI,
  translateByOpenAI,
} from "./openai";
import { transcriptionAudio, transformOCR, translateByAI } from "./translate";

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
  }

  return result;
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
  }
  return result;
};
