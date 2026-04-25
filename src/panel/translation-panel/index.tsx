import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import { setOutputTemplate } from "../../store/settings";
import globalStyles from "../../styles/index.module.css";
import { extractLanguagesFromTemplate } from "../../utils";
import TranslationTemplateHelper from "../translation-template-helper";
import styles from "./index.module.css";

export default function TranslationPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const outputTemplate = useAppSelector(
    (state) => state.settings.outputTemplate,
  );

  const detectedLanguages = extractLanguagesFromTemplate(outputTemplate);

  const handleTemplateChange = (template: string) => {
    dispatch(setOutputTemplate(template));
  };

  const openDialog = () => {
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const handleTemplateConfirm = (template: string) => {
    dispatch(setOutputTemplate(template));
    closeDialog();
  };

  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>🌐 {t("翻译设置")}</div>

      {/* Detected Languages Preview */}
      <label className={globalStyles.labelS}>{t("检测到的语言")}</label>
      <div className={styles.detectedLanguages}>
        {detectedLanguages.length > 0 ? (
          <textarea
            disabled
            className={styles.transTemplate}
            value={detectedLanguages.join("|")}
          />
        ) : (
          <span className={styles.warningText}>{t("未检测到语言占位符")}</span>
        )}
      </div>

      {/* Output Template Section */}
      <label className={globalStyles.labelS}>{t("输出模板")}</label>
      <textarea
        style={{ height: "140px" }}
        onChange={(e) => handleTemplateChange(e.target.value)}
        value={outputTemplate}
        className={styles.transTemplate}
        placeholder={t("模板placeholder")}
      ></textarea>
      <button onClick={openDialog} className={styles.templateGeneratorButton}>
        {t("模板生成器")}
      </button>

      {/* Template Helper Dialog */}
      <dialog ref={dialogRef} className={styles.templateHelperDialog}>
        <TranslationTemplateHelper
          initialValue={detectedLanguages}
          onConfirm={handleTemplateConfirm}
          onCancel={closeDialog}
        />
      </dialog>
    </div>
  );
}
