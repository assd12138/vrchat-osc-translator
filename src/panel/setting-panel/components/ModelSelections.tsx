import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { setBatchTranslate, setTranslationMode } from "@/store/settings";
import styles from "../index.module.css";
import ModelSelect from "./ModelSelect";

export default function ModelSelections() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const config = useAppSelector((state) => state.settings.apiConfig);
  const translationModel = useMemo(() => {
    const s = config.selections.translation;
    return config.providers
      .find((p) => p.uid === s?.providerUid)
      ?.models.find((m) => m.uid === s?.modelUid);
  }, [config]);
  const showBatch =
    translationModel?.type === "chat-completion" &&
    translationModel.capabilities.tools;
  return (
    <section className={styles.apiChoices}>
      <div className={styles.choiceHeading}>
        <span>{t("外部API配置")}</span>
        <small>{t("从供应商设置中添加模型")}</small>
      </div>
      <ModelSelect slot="ocr" label={t("OCR模型")} />
      <label className={styles.selectionField}>
        <span>{t("翻译方式")}</span>
        <select
          value={config.translationMode}
          onChange={(e) =>
            dispatch(
              setTranslationMode(
                e.target.value as "direct" | "transcribe-then-translate",
              ),
            )
          }
        >
          <option value="transcribe-then-translate">{t("先转写再翻译")}</option>
          <option value="direct">{t("直接输出翻译")}</option>
        </select>
      </label>
      {config.translationMode === "direct" ? (
        <ModelSelect slot="direct" label={t("直接翻译模型")} />
      ) : (
        <>
          <ModelSelect slot="transcription" label={t("转写模型")} />
          <ModelSelect slot="translation" label={t("翻译模型")} />
          {showBatch && (
            <label className={styles.batchChoice}>
              <input
                type="checkbox"
                checked={config.batchTranslate}
                onChange={(e) => dispatch(setBatchTranslate(e.target.checked))}
              />
              {t("批量翻译")}
            </label>
          )}
        </>
      )}
    </section>
  );
}
