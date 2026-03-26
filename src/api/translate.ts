import { request } from "./index";
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

export const translateByAI = (data: {
  token: string;
  text: string;
  api: string;
  model: string;
  assignObj?: object;
}) => {
  return request(data.api, {
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
      thinking: {
        type: "disabled",
      },
      ...(data.assignObj || {}),
    }),
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
  });
};

export const transformOCR = async ({ base64 }: { base64: string }) => {
  return request(import.meta.env.VITE_DEFAULT_OCR_URL, {
    method: "POST",
    body: JSON.stringify({
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
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
};
