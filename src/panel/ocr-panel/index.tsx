import { useState } from "react";
import { useTranslation } from "react-i18next";
import { transformOCRRouter, translateRouter } from "@/api/commonRouter";
import { useAppSelector } from "../../store/hook";
import { EApiProviderType } from "../../store/rehydrate/rehydrate-constant";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";

export default function OcrPanel() {
  const { t } = useTranslation();
  const settings = useAppSelector((state) => state.settings);
  const [ocr, setOCR] = useState("");
  const [trans, setTrans] = useState("");

  // CUSTOM provider 不支持 OCR，隐藏面板
  if (settings.api_provider_type === EApiProviderType.CUSTOM) {
    return null;
  }

  const ocrRecogonition = async () => {
    const items = await navigator.clipboard.read();
    console.log(items);
    let base64String: string | null = null;
    try {
      for (const item of items) {
        if (
          item.types.includes("image/png") ||
          item.types.includes("image/jpeg") ||
          item.types.includes("image/webp")
        ) {
          const blob = await item.getType(
            item.types.find((type) => type.startsWith("image/")) ||
              item.types[0],
          );
          base64String = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          break; // 找到第一张图片后退出
        }
      }
      if (!base64String) {
        console.log("剪贴板无图片");
      } else {
        setOCR("");
        setTrans("");
        const ocrContent = await transformOCRRouter({ base64: base64String });
        setOCR(ocrContent);
        const translation = await translateRouter({
          text: ocrContent,
        });
        setTrans(translation);
      }
    } catch (error) {
      console.error("Error processing items:", error);
    }
  };
  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>📷 OCR </div>
      <div className={styles.btnCon}>
        <button
          type="button"
          onClick={ocrRecogonition}
          className={globalStyles.button}
        >
          {t("剪贴板图片翻译")}
        </button>
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
  );
}
