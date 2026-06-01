import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../../store/hook";
import {
  setOpenaiApiUrl,
  setOpenaiModel,
  setOpenaiToken,
  setOmniKeepAudioType,
} from "../../../store/settings";
import globalStyles from "../../../styles/index.module.css";

export default function OmniProviderConfig() {
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const handleOpenAIApiChange = (url: string) => {
    dispatch(setOpenaiApiUrl(url));
  };

  const handleOpenAITokenChange = (token: string) => {
    dispatch(setOpenaiToken(token));
  };

  const handleOpenAIModelChange = (model: string) => {
    dispatch(setOpenaiModel(model));
  };

  const handleOmniKeepAudioTypeChange = (checked: boolean) => {
    dispatch(setOmniKeepAudioType(checked));
  };

  return (
    <>
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
      <div className={globalStyles.checkboxRow}>
        <input
          type="checkbox"
          id="omniKeepAudioType"
          checked={settings.omni_keep_audio_type}
          onChange={(e) => handleOmniKeepAudioTypeChange(e.target.checked)}
        />
        <label htmlFor="omniKeepAudioType">{t("携带音频类型信息")}</label>
      </div>
    </>
  );
}
