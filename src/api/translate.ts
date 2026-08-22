import fetch from "@/cross-platform/fetch";
import { generateTranslationPrompt, generateTranslationTool } from "@/utils";
import { request } from "./index";

/**
 * 流式请求处理 SSE 响应
 * @param url API URL
 * @param body 请求体（JSON 字符串）
 * @param headers 请求头
 * @param onChunk 每个增量文本块的回调
 * @param signal 可选的 AbortSignal 用于取消请求
 */
export const streamRequest = async (
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
export const transcriptionAudio = (data: {
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

/**
 * 通过 chat/completions 接口转录音频（input_audio 格式）
 */
export const transcriptionAudioByChat = async (data: {
  /** 音频文件 */
  file: File;
  api: string;
  model: string;
  auth: string;
}) => {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(data.file);
  });
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
                data: base64,
              },
            },
          ],
        },
      ],
      stream: false,
    }),
    headers: {
      Authorization: `Bearer ${data.auth}`,
      "Content-Type": "application/json",
    },
  });
};

export const translateByAI = (data: {
  token: string;
  text: string;
  api: string;
  model: string;
  languages: string[];
  assignObj?: object;
}) => {
  const translateTool = generateTranslationTool(data.languages);
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
      tools: [translateTool],
      ...(data.assignObj || {}),
    }),
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
  });
};

/**
 * 单语言翻译（用于批量翻译模式）
 * 不使用 JSON Schema，直接返回翻译结果
 */
export const translateByAISingleLanguage = (data: {
  token: string;
  text: string;
  api: string;
  model: string;
  language: string;
  assignObj?: object;
}) => {
  const prompt = generateTranslationPrompt(data.text, [data.language]);
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
      ...(data.assignObj || {}),
    }),
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
  });
};
