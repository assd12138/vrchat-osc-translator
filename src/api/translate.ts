import { request } from ".";

/**
 * 根据ai翻译模板和音频文件翻译
 */
export const translateByAudio = (data: {
  /** 音频文件 */
  file: File;
  /** 翻译模板 */
  template: string;
}) => {
  const formData = new FormData();
  formData.append("file", data.file, "a.mp3");
  formData.append("template", data.template);
  return request("/asr-translate", {
    method: "POST",
    body: formData
  });
};
