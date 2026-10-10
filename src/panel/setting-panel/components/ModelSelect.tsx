import { useTranslation } from "react-i18next";
import { SelectField } from "@/components/ui";
import {
  getEligibleProviderModels,
  isSelectionValid,
  type ModelSlot,
} from "@/store/api-config";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { setModelSelection } from "@/store/settings";

const capabilityTranslationKeys = {
  audio: "语音",
  image: "图像",
  text: "文本",
  tools: "工具调用",
} as const;

export default function ModelSelect({
  slot,
  label,
}: {
  slot: ModelSlot;
  label: string;
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const config = useAppSelector((state) => state.settings.apiConfig);
  const valid = isSelectionValid(
    slot,
    config.selections[slot],
    config.providers,
  );
  const selected = config.selections[slot];
  const selectedProvider = config.providers.find(
    (provider) => provider.uid === selected?.providerUid,
  );
  const selectedModel = selectedProvider?.models.find(
    (model) => model.uid === selected?.modelUid,
  );
  const selectionReady =
    valid &&
    !!selectedProvider?.baseURL.trim() &&
    !!selectedProvider.apiKey.trim() &&
    !!selectedModel?.modelId.trim();
  return (
    <SelectField
      layout="row"
      label={label}
      isInvalid={!selectionReady}
      description={!selectionReady ? t("需要选择模型") : undefined}
      placeholder={t("选择模型")}
      value={
        selected ? `${selected.providerUid}:${selected.modelUid}` : "unselected"
      }
      onChange={(value) => {
        const [providerUid, modelUid] = value.split(":");
        dispatch(
          setModelSelection({
            slot,
            selection:
              providerUid && modelUid ? { providerUid, modelUid } : null,
          }),
        );
      }}
      options={[{ value: "unselected", label: t("选择模型") }]}
      groups={getEligibleProviderModels(slot, config.providers).map(
        ({ provider, models }) => ({
          id: provider.uid,
          label: provider.identifier,
          options: models.map((model) => ({
            value: `${provider.uid}:${model.uid}`,
            label: model.modelId || t("未命名模型"),
          })),
        }),
      )}
    />
  );
}

export { capabilityTranslationKeys };
