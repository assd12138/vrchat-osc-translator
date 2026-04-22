import {
  generateTranslationPrompt,
  generateTranslationSchema,
} from "@/utils";
import { request } from "./index";
import { streamRequest } from "./translate";

const url = "https://api.openai.com/v1/chat/completions";

/**
 * OpenAI 翻译
 * 使用 JSON Schema 结构化输出
 */
export const translateByOpenAI = (data: {
  token: string;
  text: string;
  languages: string[];
}) => {
  const schema = generateTranslationSchema(data.languages);
  const prompt = generateTranslationPrompt(data.text, data.languages);
  return request(url, {
    method: "POST",
    body: JSON.stringify({
      model: "gpt-5-nano",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      stream: false,
      response_format: schema,
    }),
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
  });
};

/**
 * @deprecated 流式翻译已弃用，使用 translateByOpenAI 配合 JSON Schema
 * 此函数保留用于向后兼容，但不应在新实现中使用
 */
export const translateByOpenAIStream = async (
  data: {
    token: string;
    text: string;
  },
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) => {
  await streamRequest(
    url,
    JSON.stringify({
      model: "gpt-5-nano",
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
    }),
    {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
    onChunk,
    signal,
  );
};

/**
 * OpenAI 转录
 * 使用 gpt-4o-mini-transcribe 模型
 */
export const transcriptionByOpenAI = (data: {
  audio_base64: string;
  token: string;
}) => {
  return request(url, {
    method: "POST",
    body: JSON.stringify({
      model: "gpt-4o-mini-transcribe",
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
      stream: false,
    }),
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
  });
};

/**
 * OpenAI OCR
 * 使用 gpt-4o-mini-transcribe 模型
 */
export const ocrByOpenAI = (data: { token: string; base64: string }) => {
  return request(url, {
    method: "POST",
    body: JSON.stringify({
      model: "gpt-4o-mini-transcribe",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: data.base64,
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
    }),
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
  });
};

/**
 * @deprecated 流式 OCR 已弃用
 * 此函数保留用于向后兼容，但不应在新实现中使用
 */
export const ocrByOpenAIStream = async (
  data: { token: string; base64: string },
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) => {
  await streamRequest(
    url,
    JSON.stringify({
      model: "gpt-4o-mini-transcribe",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: data.base64,
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
    }),
    {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
    onChunk,
    signal,
  );
};
