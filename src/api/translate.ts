import { request } from ".";

/**
 * 根据ai翻译模板和音频文件翻译
 */
export const translateByAudio = (data: {
  /** 音频文件 */
  file: File;
}) => {
  const formData = new FormData();
  formData.append("file", data.file, "audio.wav");
  return request("/inference", {
    method: "POST",
    body: formData,
  });
};

export const translateByAI = (data: {
  token: string;
  text: string;
  api: string;
  model: string;
}) => {
  return request(data.api + "/v1/chat/completions", {
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
      temperature: 0.7
    }),
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
  });
};
