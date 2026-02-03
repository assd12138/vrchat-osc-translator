import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  setTranscriptionUrl,
  setOpenaiApiUrl,
  setOpenaiToken,
  setOpenaiModel,
  setLanguage,
  setTranscriptionModel,
  setTranscriptionToken,
  reinit,
} from "../../store/settings";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";
import i18next from "i18next";

export default function () {
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const handleChangeBackend = (url: string) => {
    dispatch(setTranscriptionUrl(url));
  };

  const handleChangeTranscriptionModel = (url: string) => {
    dispatch(setTranscriptionModel(url));
  };

  const handleChangeTranscriptionToken = (token: string) => {
    dispatch(setTranscriptionToken(token));
  };

  const handleOpenAIApiChange = (url: string) => {
    dispatch(setOpenaiApiUrl(url));
  };

  const handleOpenAITokenChange = (token: string) => {
    dispatch(setOpenaiToken(token));
  };
  const handleOpenAIModelChange = (model: string) => {
    dispatch(setOpenaiModel(model));
  };

  const handleLanguageChange = (language: string) => {
    i18next.changeLanguage(language === "auto" ? navigator.language : language);
    dispatch(setLanguage(language));
  };

  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>
        ⚙️ {t("系统设置")}&nbsp;
        <a className={styles.initBtn} onClick={() => dispatch(reinit())}>
           {t("恢复默认")}
        </a>
      </div>
      <label className={globalStyles.labelS}>{t("应用语言")}</label>
      <select
        className={globalStyles.selectS}
        value={settings.language}
        onChange={(e) => handleLanguageChange(e.target.value)}
      >
        <option value="auto">Auto</option>
        <option value="en">English</option>
        <option value="zh">中文</option>
        <option value="ja">日本語</option>
        <option value="ko">한국어</option>
      </select>
      <label className={globalStyles.labelS}>{t("转译地址")}</label>
      <input
        className={globalStyles.inputS}
        value={settings.transcription_url}
        onChange={(e) => handleChangeBackend(e.target.value)}
      />
      <label className={globalStyles.labelS}>{t("转译模型")}</label>
      <input
        className={globalStyles.inputS}
        value={settings.transcription_model}
        onChange={(e) => handleChangeTranscriptionModel(e.target.value)}
      />
      <label className={globalStyles.labelS}>{t("转译Token")}</label>
      <input
        className={globalStyles.inputS}
        value={settings.transcription_token}
        onChange={(e) => handleChangeTranscriptionToken(e.target.value)}
      />
      <label className={globalStyles.labelS}>{t("openai地址")}</label>
      <input
        className={globalStyles.inputS}
        value={settings.openai_api_url}
        onChange={(e) => handleOpenAIApiChange(e.target.value)}
      />
      <label className={globalStyles.labelS}>OpenAI token</label>
      <input
        className={globalStyles.inputS}
        value={settings.openai_token}
        onChange={(e) => handleOpenAITokenChange(e.target.value)}
      />
      <label className={globalStyles.labelS}>{t("模型名称")}</label>
      <input
        className={globalStyles.inputS}
        value={settings.openai_model}
        onChange={(e) => handleOpenAIModelChange(e.target.value)}
      />
    </div>
  );
}
