import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  setOutputTemplate,
  setTargetLanguages,
  type TargetLanguage,
} from "../../store/settings";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";

const AVAILABLE_LANGUAGES: TargetLanguage[] = ["cn", "en", "jp", "kr"];
const LANGUAGE_LABELS: Record<TargetLanguage, string> = {
  cn: "中文",
  en: "English",
  jp: "日本語",
  kr: "한국어",
};

export default function TranslationPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const outputTemplate = useAppSelector(
    (state) => state.settings.outputTemplate,
  );
  const targetLanguages = useAppSelector(
    (state) => state.settings.targetLanguages,
  );

  const handleLanguageToggle = (lang: TargetLanguage) => {
    const current = targetLanguages || [];
    const newLanguages = current.includes(lang)
      ? current.filter((l) => l !== lang)
      : [...current, lang];
    dispatch(setTargetLanguages(newLanguages));
  };

  const handleTemplateChange = (template: string) => {
    dispatch(setOutputTemplate(template));
  };

  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>🌐 {t("翻译设置")}</div>

      {/* Language Selection Section */}
      <label className={globalStyles.labelS}>{t("目标语言")}</label>
      <div className={styles.languageCheckboxGroup}>
        {AVAILABLE_LANGUAGES.map((lang) => (
          <label key={lang} className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={targetLanguages?.includes(lang) ?? false}
              onChange={() => handleLanguageToggle(lang)}
            />
            {LANGUAGE_LABELS[lang]}
          </label>
        ))}
      </div>

      {/* Output Template Section */}
      <label className={globalStyles.labelS}>{t("输出模板")}</label>
      <textarea
        style={{ height: "140px" }}
        onChange={(e) => handleTemplateChange(e.target.value)}
        value={outputTemplate}
        className={styles.transTemplate}
        placeholder={`[中]#{cn}\n[En]#{en}\n[日]#{jp}\n[한]#{kr}`}
      ></textarea>
      <div className={styles.templateHint}>{t("模板提示")}</div>
    </div>
  );
}
