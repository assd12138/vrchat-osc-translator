import i18next from "i18next";
import { useTranslation } from "react-i18next";
import { SectionCard, SelectField } from "@/components/ui";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import { setLanguage } from "../../store/settings";
import TranslationPanel from "../translation-panel";
import ModelSelections from "./components/ModelSelections";
import PromptSettings from "./components/PromptSettings";
import SubtitleModelSelections from "./components/SubtitleModelSelections";

export default function SettingPanel() {
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const handleLanguageChange = (language: string) => {
    i18next.changeLanguage(language === "auto" ? navigator.language : language);
    dispatch(setLanguage(language));
  };

  return (
    <>
      <SectionCard title={t("系统设置")} hideHeading>
        <SelectField
          layout="row"
          label={t("应用语言")}
          value={settings.language}
          onChange={handleLanguageChange}
          options={[
            { value: "auto", label: "Auto" },
            { value: "en", label: "English" },
            { value: "zh", label: "中文" },
            { value: "ja", label: "日本語" },
            { value: "ko", label: "한국어" },
          ]}
        />
      </SectionCard>
      <ModelSelections />
      <SubtitleModelSelections />
      <TranslationPanel />
      <PromptSettings />
    </>
  );
}
