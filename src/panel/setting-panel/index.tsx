import i18next from "i18next";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import { EApiProviderType } from "../../store/rehydrate/rehydrate-constant";
import {
  reinit,
  setApiProviderType,
  setLanguage,
  setTheme,
  type ThemePreference,
} from "../../store/settings";
import globalStyles from "../../styles/index.module.css";
import CustomProviderConfig from "./components/CustomProviderConfig";
import OmniProviderConfig from "./components/OmniProviderConfig";
import styles from "./index.module.css";

export default function SettingPanel() {
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const handleLanguageChange = (language: string) => {
    i18next.changeLanguage(language === "auto" ? navigator.language : language);
    dispatch(setLanguage(language));
  };

  const handleApiProviderChange = (provider: EApiProviderType) => {
    dispatch(setApiProviderType(provider));
  };

  const renderProviderConfig = () => {
    switch (settings.api_provider_type) {
      case EApiProviderType.CUSTOM:
        return <CustomProviderConfig />;
      case EApiProviderType.OMNI:
        return <OmniProviderConfig />;
      default:
        return null;
    }
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
      <label className={globalStyles.labelS}>{t("应用主题")}</label>
      <select
        className={globalStyles.selectS}
        value={settings.theme}
        onChange={(e) => dispatch(setTheme(e.target.value as ThemePreference))}
      >
        <option value="default">{t("默认")}</option>
        <option value="liquid-glass">{t("流体玻璃")}</option>
        <option value="hand-drawn">{t("手绘风格")}</option>
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
        <option value={EApiProviderType.OMNI}>Omni</option>
      </select>
      {renderProviderConfig()}
    </div>
  );
}
