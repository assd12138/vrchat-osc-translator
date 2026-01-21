import { useTranslation } from "react-i18next";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";
export default function () {
  const { t } = useTranslation()
  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>📋 {t('系统日志')}</div>
      <div className={styles.logContainer}>
        <div className={styles.logItem}>
          <div>[16:13:01]</div>
          <div>🟢 开始语音识别</div>
        </div>
      </div>
    </div>
  );
}
