import { request } from "./index";

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
          role: "system",
          content: [
            {
              type: "text",
              text: "你是语音转文本的专家，严格将语音转文本，不要输出其他内容",
            },
          ],
        },
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
              text: "请自动检测语言并将以上语音转为文本",
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
    }),
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
  });
};
