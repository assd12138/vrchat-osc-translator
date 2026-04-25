/**
 * 语言描述映射
 */
const LANGUAGE_DESCRIPTIONS: Record<string, string> = {
  zh: "zh translate result",
  en: "en translate result",
  ja: "ja translate result",
  ko: "ko translate result",
};

/**
 * 从输出模板中提取语言列表
 * 例如: "[中]#{zh}\n[En]#{en}" => ["zh", "en"]
 */
export const extractLanguagesFromTemplate = (template: string): string[] => {
  const regex = /#\{([a-z]{2})\}/g;
  const languages: string[] = [];
  let match: RegExpExecArray | null = regex.exec(template);
  while (match !== null) {
    if (!languages.includes(match[1])) {
      languages.push(match[1]);
    }
    match = regex.exec(template);
  }
  return languages;
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
  return `Translate the text within the brackets into ${langList}, without additional explanation.\n\n[${(text || "").replace(/\n/g, ". ")}]`;
};

export async function loadMicDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();

  const micDevices = devices.filter((device) => device.kind === "audioinput");
  return micDevices;
}
