import { useTranslation } from "react-i18next";
import styles from "./audio-panel/index.module.css";

export default function RecognitionStatus({
  recognizing = false,
  speaking = false,
}: {
  recognizing?: boolean;
  speaking?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.recognitionStatus} role="status">
      <span
        aria-hidden="true"
        className={[
          styles.statusIndicator,
          !recognizing
            ? styles.statusInactive
            : speaking
              ? styles.statusSpeaking
              : styles.statusPausing,
        ].join(" ")}
      />
      <span>
        {t("识别状态")}：
        <span>
          {!recognizing ? t("未识别") : speaking ? t("识别中") : t("无声音")}
        </span>
      </span>
    </div>
  );
}
