import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { transformOCRRouter } from "@/api/commonRouter";
import { languages } from "@/constants/language";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import { setOcrTargetLanguage } from "../../store/settings";
import globalStyles from "../../styles/index.module.css";
import CollapsiblePanel from "../CollapsiblePanel";
import styles from "./index.module.css";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export default function OcrPanel() {
  const { t } = useTranslation();
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
  const [ocr, setOCR] = useState("");
  const [trans, setTrans] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const runOcr = async (file: Blob) => {
    const base64String = await blobToDataUrl(file);
    setOCR("");
    setTrans("");
    const result = await transformOCRRouter({ base64: base64String });
    setOCR(result.original);
    setTrans(result.translation);
  };

  const recognizeClipboardImage = async () => {
    const items = await navigator.clipboard.read();
    try {
      const item = items.find((candidate) =>
        ACCEPTED_IMAGE_TYPES.some((type) => candidate.types.includes(type)),
      );
      if (!item) {
        console.log("剪贴板无图片");
        return;
      }

      const imageType = item.types.find((type) => type.startsWith("image/"));
      await runOcr(await item.getType(imageType || item.types[0]));
    } catch (error) {
      console.error("Error processing items:", error);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      console.warn(`Unsupported image type: ${file.type}`);
      return;
    }
    try {
      await runOcr(file);
    } catch (error) {
      console.error("Error processing file:", error);
    }
  };

  return (
    <CollapsiblePanel
      panel="ocr"
      title={t("图片翻译")}
      contentId="ocr-panel-content"
    >
      <div className={styles.btnCon}>
        <div className={styles.targetLanguage}>
          <label
            className={styles.targetLanguageLabel}
            htmlFor="ocr-target-language"
          >
            {t("目标语言")}
          </label>
          <select
            id="ocr-target-language"
            className={`${globalStyles.selectS} ${styles.targetLanguageSelect}`}
            value={settings.ocrTargetLanguage}
            onChange={(e) => dispatch(setOcrTargetLanguage(e.target.value))}
          >
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.nativeName}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={recognizeClipboardImage}
            className={globalStyles.button}
          >
            {t("剪贴板")}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={globalStyles.button}
          >
            {t("文件选择")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className={styles.fileInput}
            onChange={handleFileChange}
          />
        </div>
      </div>
      <div className={styles.logContainer}>
        <textarea
          style={{ width: "42%", height: "200px" }}
          value={ocr}
          readOnly
        ></textarea>
        ➡
        <textarea
          style={{ width: "42%", height: "200px" }}
          value={trans}
          readOnly
        ></textarea>
      </div>
    </CollapsiblePanel>
  );
}
