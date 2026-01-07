import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";
export default function () {
  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>🌐 翻译设置</div>
      <label className={globalStyles.labelS}>AI翻译模板</label>
      <textarea className={styles.transTemplate} name="" id="" placeholder="请输入翻译模板，例如：请将以下文本翻译成英语：{text}">
      </textarea>
    </div>
  );
}
