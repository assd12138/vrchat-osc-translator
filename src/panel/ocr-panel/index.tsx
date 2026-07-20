import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  transformOCRRouter,
  translateSingleLanguageRouter,
} from "@/api/commonRouter";
import { languages } from "@/constants/language";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import { EApiProviderType } from "../../store/rehydrate/rehydrate-constant";
import {
  setOcrTargetLanguage,
  togglePanelExpansion,
} from "../../store/settings";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function OcrPanel() {
  const { t } = useTranslation();
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
  const isExpanded = settings.panelExpansion.ocr;
  const [ocr, setOCR] = useState("");
  const [trans, setTrans] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CUSTOM provider 不支持 OCR，隐藏面板
  if (settings.api_provider_type === EApiProviderType.CUSTOM) {
    return null;
  }

  const runOcr = async (file: Blob) => {
    const base64String = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setOCR("");
    setTrans("");
    const ocrContent = await transformOCRRouter({ base64: base64String });
    setOCR(ocrContent);
    const translation = await translateSingleLanguageRouter({
      text: ocrContent,
      language: settings.ocrTargetLanguage,
    });
    setTrans(translation);
  };

  const ocrRecogonition = async () => {
    const items = await navigator.clipboard.read();
    console.log(items);
    let picked: Blob | null = null;
    try {
      for (const item of items) {
        if (
          item.types.includes("image/png") ||
          item.types.includes("image/jpeg") ||
          item.types.includes("image/webp")
        ) {
          picked = await item.getType(
            item.types.find((type) => type.startsWith("image/")) ||
              item.types[0],
          );

          break; // 找到第一张图片后退出
        }
      }
      if (!picked) {
        console.log("剪贴板无图片");
      } else {
        await runOcr(picked);
      }
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
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>
        {t("图片翻译")}
        <button
          type="button"
          className={globalStyles.panelToggle}
          onClick={() => dispatch(togglePanelExpansion("ocr"))}
          aria-expanded={isExpanded}
          aria-controls="ocr-panel-content"
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${t("图片翻译")}`}
        >
          <span aria-hidden="true">{isExpanded ? "−" : "+"}</span>
        </button>
      </div>
      <div id="ocr-panel-content" hidden={!isExpanded}>
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
              onClick={ocrRecogonition}
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
              accept="image/png,image/jpeg,image/webp"
              className={styles.fileInput}
              onChange={handleFileChange}
            />
          </div>
        </div>
        <div className={styles.logContainer}>
          <textarea
            style={{ width: "42%", height: "200px" }}
            value={ocr}
          ></textarea>
          ➡
          <textarea
            style={{ width: "42%", height: "200px" }}
            value={trans}
          ></textarea>
        </div>
      </div>
    </div>
  );
}
