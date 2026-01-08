import { useAppDispatch, useAppSelector } from "../../store/hook";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";
import { setAiTemplate } from "../../store/settings";

export default function () {
  const dispatch = useAppDispatch()
  const aiTemplate = useAppSelector(state => state.settings.ai_template)
  const handleChange = (template: string) => {
    dispatch(setAiTemplate(template))
  }
  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>🌐 翻译设置</div>
      <label className={globalStyles.labelS}>AI翻译模板</label>
      <textarea
        onChange={e => handleChange(e.target.value)}
        value={aiTemplate}
        className={styles.transTemplate}
        placeholder="请输入翻译模板，例如：请将以下文本翻译成英语：{text}">
      </textarea>
    </div>
  );
}
