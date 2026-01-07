import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";
export default function () {
  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>🎙️ 语音识别控制</div>
      <div className={styles.buttongroup}>
        <button className={globalStyles.button}>🎤 开始监听</button>
        <button className={globalStyles.button}>⏹️ 停止监听</button>
        <button className={globalStyles.button}>🔄️ 刷新页面</button>
      </div>
      <div className={styles.recordingStatus}>
        <span
          className={[styles.statusIndicator, styles.statusInactive]
            .filter(Boolean)
            .join(" ")}
        ></span>
        <span >
          录音状态：
          <span>未录音</span>
        </span>
      </div>
    </div>
  );
}
