import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../../store/hook";
import {
  setBatchTranslate,
  setOpenaiApiUrl,
  setOpenaiModel,
  setOpenaiToken,
  setTranscriptionModel,
  setTranscriptionToken,
  setTranscriptionUrl,
} from "../../../store/settings";
import globalStyles from "../../../styles/index.module.css";
import styles from "../index.module.css";

export default function CustomProviderConfig() {
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

  const handleBatchTranslateChange = (checked: boolean) => {
    dispatch(setBatchTranslate(checked));
  };

  return (
    <>
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
      <label className={globalStyles.labelS}>{t("批量翻译")}</label>
      <div className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={settings.batchTranslate}
          onChange={(e) => handleBatchTranslateChange(e.target.checked)}
        />
        <span className={styles.checkboxHint}>{t("批量翻译提示")}</span>
      </div>
    </>
  );
}
