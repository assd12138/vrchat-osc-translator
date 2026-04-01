import { useState } from "react";
import { useTranslation } from "react-i18next";
import invoke, { NATIVE_COMMAND } from "@/cross-platform/invoke";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";

export default function ImagePanel() {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");

  const handleFileUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";

    const filePath = await new Promise<string | null>((resolve) => {
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          // Electron 环境下 file.path 包含完整文件路径
          // @ts-expect-error Electron 扩展的 file.path 属性
          resolve(file.path as string);
        } else {
          resolve(null);
        }
      };
      input.oncancel = () => resolve(null);
      input.click();
    });

    if (!filePath) return;

    // 从文件路径生成 key（文件名）
    const fileName = filePath.split(/[/\\]/).pop() || "image";

    await invoke(NATIVE_COMMAND.UPLOAD_OSS, {
      filePath,
      key: fileName,
      region: import.meta.env.VITE_DEFAULT_S3_REGION,
      endpoint: import.meta.env.VITE_DEFAULT_S3_ENDPOINT,
      ak: import.meta.env.VITE_DEFAULT_S3_ACCESS_KEY,
      sk: import.meta.env.VITE_DEFAULT_S3_SECRET_KEY,
      bucket: import.meta.env.VITE_DEFAULT_S3_BUCKET,
    });
  };

  const copy = () => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>{t("图片分享")}</div>
      <div className={styles.btnCon}>
        <button onClick={handleImageUpload} className={globalStyles.button}>
          {t("图片上传")}
        </button>
        <button onClick={copy} className={globalStyles.button}>
          {t("复制")}
        </button>
      </div>
      <div>
        <input className={globalStyles.inputS} type="text" value={url} />
      </div>
    </div>
  );
}
