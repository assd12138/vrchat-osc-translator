import { useTranslation } from "react-i18next";
import { SectionCard, SelectField } from "@/components/ui";
import { languages } from "@/constants/language";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { setSubtitleTargetLanguage } from "@/store/settings";
import ModelSelect from "./ModelSelect";

export default function SubtitleModelSelections() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const targetLanguage = useAppSelector(
    (state) => state.settings.apiConfig.subtitleTargetLanguage,
  );

  return (
      <SectionCard title={t("字幕API配置")} hideHeading>
        <div className="settings-rows">
        <ModelSelect
          slot="subtitleTranscription"
          label={t("系统音频转写模型")}
        />
        <ModelSelect
          slot="subtitleTranslation"
          label={t("系统音频翻译模型")}
        />
        <SelectField
          layout="row"
          label={t("系统音频目标语言")}
          value={targetLanguage}
          onChange={(value) => dispatch(setSubtitleTargetLanguage(value))}
          options={languages.map((language) => ({
            value: language.code,
            label: language.nativeName,
          }))}
        />
      </div>
    </SectionCard>
  );
}
