import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import { setAiTemplate } from "../../store/settings";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";

export default function TranslationPanel() {
	const dispatch = useAppDispatch();
	const { t } = useTranslation();
	const aiTemplate = useAppSelector((state) => state.settings.ai_template);
	const handleChange = (template: string) => {
		dispatch(setAiTemplate(template));
	};
	return (
		<div className={globalStyles.panel}>
			<div className={globalStyles.title}>🌐 {t("翻译设置")}</div>
			<label className={globalStyles.labelS}>{t("AI翻译模板")}</label>
			<textarea
				style={{ height: "140px" }}
				onChange={(e) => handleChange(e.target.value)}
				value={aiTemplate}
				className={styles.transTemplate}
				placeholder={t("翻译提示")}
			></textarea>
		</div>
	);
}
