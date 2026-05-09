import { generateTranslationTool } from "@/utils";
import { request } from "./index";

/**
 * 直接从音频翻译（OMNI Provider）
 * 使用工具调用结构化输出
 */
export const translateAudioDirectlyFromOmni = (data: {
  token: string;
  audio_base64: string;
  languages: string[];
  api: string;
  model: string;
  assignObj?: object;
}) => {
  const translateTool = generateTranslationTool(data.languages);
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
      tools: [translateTool],
      ...(data.assignObj || {}),
    }),
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
    },
  });
};
