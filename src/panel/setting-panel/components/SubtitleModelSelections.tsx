import { useTranslation } from "react-i18next";
import { languages } from "@/constants/language";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { setSubtitleTargetLanguage } from "@/store/settings";
import styles from "../index.module.css";
import ModelSelect from "./ModelSelect";

export default function SubtitleModelSelections() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const targetLanguage = useAppSelector(
    (state) => state.settings.apiConfig.subtitleTargetLanguage,
  );

  return (
    <section className={styles.apiChoices}>
      <div className={styles.choiceHeading}>
        <span>{t("字幕API配置")}</span>
      </div>
      <ModelSelect slot="subtitleTranscription" label={t("转写模型")} />
      <ModelSelect slot="subtitleTranslation" label={t("翻译模型")} />
      <label className={styles.selectionField}>
        <span>{t("目标语言")}</span>
        <select
          value={targetLanguage}
          onChange={(event) =>
            dispatch(setSubtitleTargetLanguage(event.target.value))
          }
        >
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.nativeName}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
