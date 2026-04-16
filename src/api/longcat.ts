import { request } from "./index";
import { streamRequest } from "./translate";

const url = "https://api.longcat.chat/openai/v1/chat/completions";
export const translateByLongCat = (data: {
  token: string;
  text: string;
  model: string;
}) => {
  return request(url, {
    method: "POST",
    body: JSON.stringify({
      model: data.model,
      messages: [
        {
          role: "system",
          content:
            "你是一个翻译专家，当用户让你翻译的时候，严格按照翻译格式输出，不要输出其他内容",
        },
        {
          role: "user",
          content: data.text,
        },
      ],
      temperature: 0.3,
      stream: false,
    }),
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
  });
};

/**
 * 流式翻译（LongCat）
 * @param data 翻译参数
 * @param onChunk 每个增量文本块的回调
 * @param signal 可选的 AbortSignal 用于取消请求
 */
export const translateByLongCatStream = async (
  data: {
    token: string;
    text: string;
    model: string;
  },
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) => {
  await streamRequest(
    url,
    JSON.stringify({
      model: data.model,
      messages: [
        {
          role: "system",
          content:
            "你是一个翻译专家，当用户让你翻译的时候，严格按照翻译格式输出，不要输出其他内容",
        },
        {
          role: "user",
          content: data.text,
        },
      ],
      temperature: 0.3,
      stream: true,
      output_modalities: ["text"],
    }),
    {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
    onChunk,
    signal,
  );
};

export const transcriptionByLongCat = (data: {
  model: string;
  audio_base64: string;
  token: string;
}) => {
  return request(url, {
    method: "POST",
    body: JSON.stringify({
      model: data.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_audio",
              input_audio: {
                type: "base64",
                data: data.audio_base64,
                format: "wav",
              },
            },
            {
              type: "text",
              text: "请自动检测语言并将以上语音转为文本，不要输出其他理解性的回复内容。",
            },
          ],
        },
      ],
      temperature: 0.3,
      output_modalities: ["text"],
      stream: false,
    }),
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
  });
};

export const ocrByLongCat = (data: { token: string; base64: string }) => {
  return request(url, {
    method: "POST",
    body: JSON.stringify({
      model: "LongCat-Flash-Omni-2603",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_image",
              input_image: {
                type: "base64",
                data: [data.base64],
              },
            },
            {
              type: "text",
              text: "Text Recognition:",
            },
          ],
        },
      ],
      temperature: 0.3,
      stream: false,
      output_modalities: ["text"],
    }),
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
  });
};

/**
 * 流式 OCR（LongCat）
 * @param data OCR 参数
 * @param onChunk 每个增量文本块的回调
 * @param signal 可选的 AbortSignal 用于取消请求
 */
export const ocrByLongCatStream = async (
  data: { token: string; base64: string },
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) => {
  await streamRequest(
    url,
    JSON.stringify({
      model: "LongCat-Flash-Omni-2603",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_image",
              input_image: {
                type: "base64",
                data: [data.base64],
              },
            },
            {
              type: "text",
              text: "Text Recognition:",
            },
          ],
        },
      ],
      temperature: 0.3,
      stream: true,
      output_modalities: ["text"],
    }),
    {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
    onChunk,
    signal,
  );
};
