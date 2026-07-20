import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { languages } from "@/constants/language";
import styles from "./index.module.css";

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

  const getRowClassName = (code: string, index: number) => {
    if (selectedCodes.has(code)) {
      return styles.rowSelected;
    }
    return index % 2 === 0 ? styles.rowEven : styles.rowOdd;
  };

  return (
    <div className={styles.container}>
      <button onClick={onCancel} className={styles.closeButton}>
        {t("关闭")}
      </button>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            <th className={styles.checkboxCell}></th>
            <th className={styles.codeCell}>{t("ISO 639-1")}</th>
            <th className={styles.headerCell}>{t("英文全称")}</th>
            <th className={styles.headerCell}>{t("本地全称")}</th>
          </tr>
        </thead>
        <tbody>
          {languages.map((lang, index) => (
            <tr
              key={lang.code}
              onClick={() => toggleLanguage(lang.code)}
              className={getRowClassName(lang.code, index)}
            >
              <td className={styles.centerCell}>
                <input
                  type="checkbox"
                  checked={selectedCodes.has(lang.code)}
                  onChange={() => toggleLanguage(lang.code)}
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
              <td className={styles.dataCell}>{lang.code}</td>
              <td className={styles.dataCell}>{lang.englishName}</td>
              <td className={styles.dataCell}>{lang.nativeName}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.buttonGroup}>
        <button onClick={handleConfirm} className={styles.confirmButton}>
          {t("确定")}
        </button>
        <button onClick={onCancel} className={styles.cancelButton}>
          {t("取消")}
        </button>
      </div>
    </div>
  );
}
