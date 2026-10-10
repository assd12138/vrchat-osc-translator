import { Button } from "@heroui/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckField } from "@/components/ui";
import { languages } from "@/constants/language";

const languageCodeSet = new Set(languages.map((l) => l.code));

interface TranslationTemplateHelperProps {
  initialValue?: string[];
  onConfirm: (template: string) => void;
  onCancel: () => void;
}

export default function TranslationTemplateHelper({
  initialValue = [],
  onConfirm,
  onCancel,
}: TranslationTemplateHelperProps) {
  const { t } = useTranslation();
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const validCodes = initialValue.filter((code) => languageCodeSet.has(code));
    setSelectedCodes(new Set(validCodes));
  }, [initialValue]);

  const toggleLanguage = (code: string) => {
    setSelectedCodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    const template = Array.from(selectedCodes)
      .map((code) => `[${code}]#{${code}}`)
      .join("\n");
    onConfirm(template);
  };

  return (
    <div className="field-stack">
      <div className="language-grid">
        {languages.map((language) => (
          <CheckField
            key={language.code}
            isSelected={selectedCodes.has(language.code)}
            onChange={() => toggleLanguage(language.code)}
          >
            <span className="flex flex-col">
              <span>
                {language.nativeName}{" "}
                <small className="text-muted">{language.code}</small>
              </span>
              <small className="text-muted">{language.englishName}</small>
            </span>
          </CheckField>
        ))}
      </div>
      <div className="toolbar">
        <Button onPress={handleConfirm}>{t("确定")}</Button>
        <Button variant="secondary" onPress={onCancel}>
          {t("取消")}
        </Button>
      </div>
    </div>
  );
}
