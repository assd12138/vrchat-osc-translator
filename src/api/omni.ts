import fetch from "@/cross-platform/fetch";
import { generateTranslationPrompt, generateTranslationSchema } from "@/utils";
import { request } from "./index";

/**
 * 流式请求处理 SSE 响应
 * @param url API URL
 * @param body 请求体（JSON 字符串）
 * @param headers 请求头
 * @param onChunk 每个增量文本块的回调
 * @param signal 可选的 AbortSignal 用于取消请求
 */
export const streamRequestFromOmni = async (
  url: string,
  body: string,
  headers: Record<string, string>,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> => {
  const response = await fetch(url, {
    method: "POST",
    body,
    headers,
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // 解析 SSE 格式的数据
    const lines = buffer.split("\n");
    buffer = "";

    for (const line of lines) {
      if (line.startsWith("data:")) {
        const data = line.slice(5);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            onChunk(content);
          }
        } catch (e) {
          console.log(data, e);
          // 可能是 JSON 解析错误，忽略
        }
      }
    }
  }
};

/**
 * 根据ai翻译模板和音频文件翻译
 */
export const transcriptionAudioFromOmni = (data: {
  /** 音频文件 */
  file: File;
  api: string;
  model: string;
  auth: string;
}) => {
  const formData = new FormData();
  formData.append("file", data.file, "audio.wav");
  formData.append("model", data.model);
  return request(data.api, {
    method: "POST",
    body: formData,
    headers: {
      Authorization: `Bearer ${data.auth}`,
    },
  });
};

export const translateByAIFromOmni = (data: {
  token: string;
  text: string;
  api: string;
  model: string;
  languages: string[];
  assignObj?: object;
}) => {
  const schema = generateTranslationSchema(data.languages);
  const prompt = generateTranslationPrompt(data.text, data.languages);
  return request(data.api, {
    method: "POST",
    body: JSON.stringify({
      model: data.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: schema,
      ...(data.assignObj || {}),
    }),
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
  });
};

/**
 * @deprecated 流式翻译已弃用
 * 此函数保留用于向后兼容，但不应在新实现中使用
 */
export const translateByAIStreamFromOmni = async (
  data: {
    token: string;
    text: string;
    api: string;
    model: string;
    assignObj?: object;
  },
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) => {
  await streamRequestFromOmni(
    data.api,
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
      temperature: 1,
      thinking: {
        type: "disabled",
      },
      stream: true,
      ...(data.assignObj || {}),
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
 * @deprecated 流式 OCR 已弃用
 * 此函数保留用于向后兼容，但不应在新实现中使用
 */
export const transformOCRStreamFromOmni = async (
  { base64 }: { base64: string },
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) => {
  await streamRequestFromOmni(
    import.meta.env.VITE_DEFAULT_OCR_URL,
    JSON.stringify({
      model: import.meta.env.VITE_DEFAULT_OCR_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: base64,
              },
            },
            {
              type: "text",
              text: "Text Recognition:",
            },
          ],
        },
      ],
      stream: true,
    }),
    {
      "Content-Type": "application/json",
    },
    onChunk,
    signal,
  );
};

/**
 * 直接从音频翻译（OMNI Provider）
 * 使用 JSON Schema 结构化输出
 */
export const translateAudioDirectlyFromOmni = (data: {
  token: string;
  audio_base64: string;
  languages: string[];
  api: string;
  model: string;
  assignObj?: object;
}) => {
  const schema = generateTranslationSchema(data.languages);
  const langList = data.languages.join("/");
  return request(data.api, {
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
              text: `Translate into ${langList}, without additional explanation.`,
            },
          ],
        },
      ],
      temperature: 0.7,
      response_format: schema,
      ...(data.assignObj || {}),
    }),
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
  });
};
