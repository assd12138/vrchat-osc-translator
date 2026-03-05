import { useTranslation } from "react-i18next";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";
import { transformOCR, translateByAI } from "../../api/translate";
import { useState } from "react";
import { useAppSelector } from "../../store/hook";

export default function () {
  const { t } = useTranslation()
  const settings = useAppSelector((state) => state.settings);
  const [ocr, setOCR] = useState("");
  const [trans, setTrans] = useState("");
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
        console.time("ocr");
        const res = await transformOCR({ base64: base64String });
        console.log({ res });
        const ocrContent = res.choices[0].message.content;
        setOCR(ocrContent);
        console.timeEnd("ocr");

        const translationRes = await translateByAI({
          text: `将以下内容翻译成中文：${ocrContent.replace(/\n/g, "")}`,
          token: settings.openai_token,
          api: settings.openai_api_url,
          model: settings.openai_model,
        });
        const translation = translationRes.choices[0].message.content;
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
        <button onClick={ocrRecogonition} className={globalStyles.button}>
          {t('剪贴板图片翻译')}
        </button>
        
      </div>
      <div className={styles.logContainer}>
        <textarea style={{ width: '45%', height: '200px' }} value={ocr}></textarea>
        ➡
        <textarea style={{ width: '45%', height: '200px' }} value={trans}></textarea>
      </div>
    </div>
  );
}
