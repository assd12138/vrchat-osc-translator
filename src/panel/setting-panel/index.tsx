import i18next from "i18next";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import {
  setLanguage,
  setTheme,
  type ThemePreference,
  togglePanelExpansion,
} from "../../store/settings";
import globalStyles from "../../styles/index.module.css";
import ProviderSettings, {
  ModelSelections,
} from "./components/ProviderSettings";

export default function SettingPanel() {
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const isExpanded = settings.panelExpansion.settings;

  const handleLanguageChange = (language: string) => {
    i18next.changeLanguage(language === "auto" ? navigator.language : language);
    dispatch(setLanguage(language));
  };

  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>
        ⚙️ {t("系统设置")}&nbsp;
        <ProviderSettings />
        <button
          type="button"
          className={globalStyles.panelToggle}
          onClick={() => dispatch(togglePanelExpansion("settings"))}
          aria-expanded={isExpanded}
          aria-controls="settings-panel-content"
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${t("系统设置")}`}
        >
          <span aria-hidden="true">{isExpanded ? "−" : "+"}</span>
        </button>
      </div>
      <div id="settings-panel-content" hidden={!isExpanded}>
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
          onChange={(e) =>
            dispatch(setTheme(e.target.value as ThemePreference))
          }
        >
          <option value="default">{t("默认")}</option>
          <option value="liquid-glass">{t("流体玻璃")}</option>
          <option value="hand-drawn">{t("手绘风格")}</option>
        </select>
        <ModelSelections />
      </div>
    </div>
  );
}
