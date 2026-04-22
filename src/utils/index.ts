/**
 * 语言描述映射
 */
const LANGUAGE_DESCRIPTIONS: Record<string, string> = {
  cn: "cn translate result",
  en: "en translate result",
  jp: "jp translate result",
  kr: "kr translate result",
};

/**
 * 生成翻译 JSON Schema
 */
export const generateTranslationSchema = (languages: string[]): object => {
  const properties: Record<string, object> = {};

  for (const lang of languages) {
    properties[lang] = {
      type: "string",
      description: LANGUAGE_DESCRIPTIONS[lang] || `${lang} translate result`,
    };
  }

  return {
    type: "json_schema",
    json_schema: {
      name: "translation_result",
      strict: true,
      schema: {
        type: "object",
        properties,
        required: languages,
        additionalProperties: false,
      },
    },
  };
};

/**
 * 生成翻译提示词
 */
export const generateTranslationPrompt = (
  text: string,
  languages: string[],
): string => {
  const langList = languages.join("/");
  return `Translate the text within the brackets into ${langList}, without additional explanation.\n\n[${(text || "").replace(/\n/g, " ")}]`;
};

export async function loadMicDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();

  const micDevices = devices.filter((device) => device.kind === "audioinput");
  return micDevices;
}
