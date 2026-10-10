import { Label, Switch } from "@heroui/react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SectionCard, SelectField } from "@/components/ui";
import { ModelType, type TranslationMode } from "@/store/api-config";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { setBatchTranslate, setTranslationMode } from "@/store/settings";
import ModelSelect from "./ModelSelect";

export default function ModelSelections() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const config = useAppSelector((state) => state.settings.apiConfig);
  const translationModel = useMemo(() => {
    const s = config.selections.translation;
    return config.providers
      .find((p) => p.uid === s?.providerUid)
      ?.models.find((m) => m.uid === s?.modelUid);
  }, [config]);
  const showBatch =
    translationModel?.type === ModelType.CHAT_COMPLETION &&
    translationModel.capabilities.tools;
  return (
    <SectionCard title={t("麦克风和OCR识别配置")} hideHeading>
      <div className="settings-rows">
        <ModelSelect slot="ocr" label={t("OCR模型")} />
        <SelectField
          layout="row"
          label={t("翻译方式")}
          value={config.translationMode}
          onChange={(value) =>
            dispatch(setTranslationMode(value as TranslationMode))
          }
          options={[
            { value: "transcribe-then-translate", label: t("先转写再翻译") },
            { value: "direct", label: t("直接输出翻译") },
          ]}
        />
        {config.translationMode === "direct" ? (
          <ModelSelect slot="direct" label={t("语音直接翻译模型")} />
        ) : (
          <>
            <ModelSelect slot="transcription" label={t("语音转写模型")} />
            <ModelSelect slot="translation" label={t("语音翻译模型")} />
            {showBatch && (
              <Switch
                className="settings-switch"
                isSelected={config.batchTranslate}
                onChange={(selected) => dispatch(setBatchTranslate(selected))}
              >
                <Switch.Content>
                  <Label>{t("批量翻译")}</Label>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
}
