import { languages as LANGUAGE_OPTIONS } from "@/constants/language";

const LANGUAGE_NAME_MAP: Record<string, string> = Object.fromEntries(
  LANGUAGE_OPTIONS.map((item) => [item.code, item.englishName]),
);

export const getLanguageEnglishName = (code: string): string =>
  LANGUAGE_NAME_MAP[code] ?? code;

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
      description: `${getLanguageEnglishName(lang)} translate result`,
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
 * 生成翻译 翻译工具
 */
export const generateTranslationTool = (languages: string[]): object => {
  const properties: Record<string, object> = {};

  for (const lang of languages) {
    properties[lang] = {
      type: "string",
      description: `${getLanguageEnglishName(lang)} translate result`,
    };
  }

  return {
    type: "function",
    function: {
      name: "translateFormat",
      description: "Format the translate result",
      parameters: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: properties,
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
  const langList = languages.map(getLanguageEnglishName).join("/");
  return `Translate the text within the brackets into ${langList}, without additional explanation and brackets it self, if the content is already in the target language, output the original text.\n\n[${(text || "").replace(/\n/g, ". ")}]`;
};

export async function loadMicDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();

  const micDevices = devices.filter((device) => device.kind === "audioinput");
  return micDevices;
}
