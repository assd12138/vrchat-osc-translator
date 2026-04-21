import i18next from "i18next";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { checkModelCached, loadModel } from "@/api/localTransformer";
import { openUrl } from "../../cross-platform/openUrl";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import { EApiProviderType } from "../../store/rehydrate/rehydrate-constant";
import {
  reinit,
  setApiProviderType,
  setLanguage,
  setLongcatApiAuth,
  setOpenaiApiAuth,
  setOpenaiApiUrl,
  setOpenaiModel,
  setOpenaiToken,
  setTranscriptionModel,
  setTranscriptionToken,
  setTranscriptionUrl,
} from "../../store/settings";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";

export default function SettingPanel() {
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [localProgress, setLocalProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isCached, setIsCached] = useState<boolean | null>(null);

  useEffect(() => {
    if (settings.api_provider_type === EApiProviderType.LOCAL_TRANSFORMER) {
      checkModelCached().then(setIsCached);
    }
  }, [settings.api_provider_type]);

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

  const handleApiProviderChange = (provider: EApiProviderType) => {
    dispatch(setApiProviderType(provider));
  };

  const handleLongcatApiAuthChange = (auth: string) => {
    dispatch(setLongcatApiAuth(auth));
  };

  const handleOpenaiApiAuthChange = (auth: string) => {
    dispatch(setOpenaiApiAuth(auth));
  };

  const loadLocalTransformer = () => {
    setLoading(true);
    loadModel({
      onProgress(percentNative) {
        const percent = Math.round((percentNative * 100) / 100);
        setLocalProgress(percent);
        if (percent === 100) {
          setLoading(false);
        } else {
          setLoading(true);
        }
      },
    });
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
      <label className={globalStyles.labelS}>{t("API供应商")}</label>
      <select
        className={globalStyles.selectS}
        value={settings.api_provider_type}
        onChange={(e) =>
          handleApiProviderChange(e.target.value as EApiProviderType)
        }
      >
        <option value={EApiProviderType.CUSTOM}>Custom</option>
        <option value={EApiProviderType.LOCAL_TRANSFORMER}>Local</option>
        <option value={EApiProviderType.LONG_CAT}>LongCat</option>
        <option value={EApiProviderType.OPEN_AI}>OpenAI</option>
      </select>
      {settings.api_provider_type === EApiProviderType.CUSTOM ? (
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
        </>
      ) : settings.api_provider_type === EApiProviderType.LONG_CAT ? (
        <>
          <label className={globalStyles.labelS}>
            Authorization
            <a
              className={styles.initBtn}
              onClick={() => openUrl("https://longcat.chat/login")}
            >
              {t("去申请")}
            </a>
          </label>
          <input
            className={globalStyles.inputS}
            value={settings.longcat_api_auth}
            onChange={(e) => handleLongcatApiAuthChange(e.target.value)}
          />
        </>
      ) : settings.api_provider_type === EApiProviderType.LOCAL_TRANSFORMER ? (
        <>
          <label className={globalStyles.labelS}>{t("本地模型")}</label>
          <table className={styles.localModelTable}>
            <thead>
              <tr>
                <th className={styles.localModelTh}>{t("缓存情况")}</th>
                <th className={styles.localModelTh}>{t("加载情况")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={styles.localModelTd}>
                  {isCached === null
                    ? t("检查中")
                    : t(isCached ? "已缓存" : "未缓存")}
                </td>
                <td className={styles.localModelTd}>
                  {t(localProgress === 100 ? "已加载" : "未加载")}
                </td>
              </tr>
            </tbody>
          </table>
          {loading && (
            <div>
              <progress value={localProgress} max={100}></progress>
              <span style={{ fontSize: "12px", marginLeft: "10px" }}>
                {localProgress}%
              </span>
            </div>
          )}
          <div>
            <button
              disabled={localProgress === 100}
              onClick={loadLocalTransformer}
              className={globalStyles.button}
            >
              {t("加载")}
            </button>
          </div>
        </>
      ) : (
        <>
          <label className={globalStyles.labelS}>
            API Key
            <a
              className={styles.initBtn}
              onClick={() => openUrl("https://platform.openai.com/api-keys")}
            >
              {t("去申请")}
            </a>
          </label>
          <input
            className={globalStyles.inputS}
            type="password"
            value={settings.openai_api_auth}
            onChange={(e) => handleOpenaiApiAuthChange(e.target.value)}
          />
        </>
      )}
    </div>
  );
}
