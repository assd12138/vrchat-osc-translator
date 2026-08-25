import { useTranslation } from "react-i18next";
import {
  getEligibleProviderModels,
  isSelectionValid,
  type ModelSlot,
} from "@/store/api-config";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { setModelSelection } from "@/store/settings";
import styles from "../index.module.css";

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
    <label className={styles.selectionField}>
      <span>
        {label}
        {!selectionReady && (
          <b className={styles.requiredMark} title={t("需要选择模型")}>
            !
          </b>
        )}
      </span>
      <select
        value={selected ? `${selected.providerUid}:${selected.modelUid}` : ""}
        onChange={(e) => {
          const [providerUid, modelUid] = e.target.value.split(":");
          dispatch(
            setModelSelection({
              slot,
              selection:
                providerUid && modelUid ? { providerUid, modelUid } : null,
            }),
          );
        }}
      >
        <option value="">{t("选择模型")}</option>
        {getEligibleProviderModels(slot, config.providers).map(
          ({ provider, models }) => (
            <optgroup key={provider.uid} label={provider.identifier}>
              {models.map((model) => (
                <option key={model.uid} value={`${provider.uid}:${model.uid}`}>
                  {model.modelId || t("未命名模型")}
                </option>
              ))}
            </optgroup>
          ),
        )}
      </select>
    </label>
  );
}

export { capabilityTranslationKeys };
