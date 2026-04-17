import { useState } from "react";
import { useTranslation } from "react-i18next";
import invoke, { NATIVE_COMMAND } from "@/cross-platform/invoke";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";

export default function FileSharePanel() {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");

  const handleFileUpload = async () => {
    const file = await invoke(NATIVE_COMMAND.UPLOAD_OSS, {
      region: import.meta.env.VITE_DEFAULT_S3_REGION,
      endpoint: import.meta.env.VITE_DEFAULT_S3_ENDPOINT,
      ak: import.meta.env.VITE_DEFAULT_S3_ACCESS_KEY,
      sk: import.meta.env.VITE_DEFAULT_S3_SECRET_KEY,
      bucket: import.meta.env.VITE_DEFAULT_S3_BUCKET,
    });
    const externalLink = `${import.meta.env.VITE_DEFAULT_S3_URL}/${file}`;
    setUrl(externalLink);
  };

  const copy = () => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>{t("文件分享")}</div>
      <div className={styles.btnCon}>
        <button onClick={handleFileUpload} className={globalStyles.button}>
          {t("文件上传")}
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
