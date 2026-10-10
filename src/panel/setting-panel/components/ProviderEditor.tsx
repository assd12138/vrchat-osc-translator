import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { discoverModels, normalizeBaseURL } from "@/api/provider";
import { CheckField, SectionCard, SelectField } from "@/components/ui";
import {
  type ApiModel,
  type ApiProvider,
  createChatCompletionModel,
  createModel,
  isProviderIdentifierAvailable,
  ModelType,
} from "@/store/api-config";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { upsertProvider } from "@/store/settings";
import { capabilityTranslationKeys } from "./ModelSelect";

export default function ProviderEditor({
  provider,
  onDone,
}: {
  provider: ApiProvider;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const providers = useAppSelector((s) => s.settings.apiConfig.providers);
  const [draft, setDraft] = useState<ApiProvider>(() =>
    structuredClone(provider),
  );
  const [showKey, setShowKey] = useState(false);
  const [candidates, setCandidates] = useState<string[] | null>(null);
  const [fetchState, setFetchState] = useState<
    "idle" | "loading" | "empty" | "success" | "error"
  >("idle");
  const identifierError = !draft.identifier.trim()
    ? t("供应商标识必填")
    : !isProviderIdentifierAvailable(draft.identifier, providers, draft.uid)
      ? t("供应商标识已存在")
      : "";
  const set = <K extends keyof ApiProvider>(key: K, value: ApiProvider[K]) =>
    setDraft((old) => ({ ...old, [key]: value }));
  const updateModel = (uid: string, next: ApiModel) =>
    set(
      "models",
      draft.models.map((m) => (m.uid === uid ? next : m)),
    );
  const hasEmptyModelId = draft.models.some((model) => !model.modelId.trim());
  const discover = async () => {
    if (!draft.baseURL.trim() || !draft.apiKey.trim()) {
      setFetchState("error");
      return;
    }
    setFetchState("loading");
    try {
      const found = await discoverModels({
        ...draft,
        baseURL: normalizeBaseURL(draft.baseURL),
      });
      setCandidates(found);
      setFetchState(found.length ? "success" : "empty");
    } catch {
      setFetchState("error");
    }
  };
  const save = () => {
    if (
      identifierError ||
      !draft.baseURL.trim() ||
      !draft.apiKey.trim() ||
      hasEmptyModelId
    )
      return;
    dispatch(
      upsertProvider({ ...draft, baseURL: normalizeBaseURL(draft.baseURL) }),
    );
    onDone();
  };
  const typeOptions = [
    {
      value: ModelType.AUDIO_TRANSCRIPTION,
      label: `${t("语音转写")} /audio/transcriptions`,
    },
    {
      value: ModelType.AUDIO_CPP_LIVE,
      label: `${t("流式转写")}(audio.cpp) /audio/transcriptions/live`,
    },
    {
      value: ModelType.CHAT_COMPLETION,
      label: `${t("文本补全")} /chat/completions`,
    },
    {
      value: ModelType.MINIMAX_AUDIO_SPEECH_TO_TEXT,
      label: `${t("语音转写")}(minimax) /speech_to_text`,
    },
    {
      value: ModelType.NARILAB_AUDIO_SPEECH_TO_TEXT,
      label: `${t("流式转写")}(nariLab) /realtime`,
    },
    {
      value: ModelType.QWEN_AUDIO_SPEECH_TO_TEXT_REALTIME,
      label: `${t("流式转写")}(qwen-asr-realtime) /realtime`,
    },
    {
      value: ModelType.QWEN_AUDIO_SPEECH_TO_TEXT_INFERENCE,
      label: `${t("流式转写")}(qwen-audio / fun-asr) /inference`,
    },
  ];
  return (
    <form
      className="field-stack"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="toolbar between">
        <Button variant="ghost" onPress={onDone}>
          ← {t("返回列表")}
        </Button>
        <span className="text-muted">
          {provider.identifier ? t("编辑供应商") : t("新建供应商")}
        </span>
      </div>
      <SectionCard title={t("编辑供应商档案")}>
        <div className="form-grid">
          <TextField
            value={draft.identifier}
            onChange={(value) => set("identifier", value)}
            isInvalid={!!identifierError}
          >
            <Label>{t("供应商标识")}</Label>
            <Input autoFocus />
            <FieldError>{identifierError}</FieldError>
          </TextField>
          <TextField
            value={draft.baseURL}
            onChange={(value) => set("baseURL", value)}
            isInvalid={!draft.baseURL.trim()}
          >
            <Label>Base URL</Label>
            <Input placeholder="https://api.openai.com/v1" />
            <Description>{t("填写到 /v1，不要尾斜杠")}</Description>
            <FieldError>{t("Base URL必填")}</FieldError>
          </TextField>
          <TextField
            className="full-width"
            value={draft.apiKey}
            onChange={(value) => set("apiKey", value)}
            isInvalid={!draft.apiKey.trim()}
          >
            <Label>API Key</Label>
            <div className="inline-field">
              <Input type={showKey ? "text" : "password"} autoComplete="off" />
              <Button variant="secondary" onPress={() => setShowKey(!showKey)}>
                {showKey ? t("隐藏API Key") : t("显示API Key")}
              </Button>
            </div>
            <FieldError>{t("API Key必填")}</FieldError>
          </TextField>
        </div>
        <div className="toolbar">
          <Button
            variant="secondary"
            onPress={discover}
            isDisabled={fetchState === "loading"}
          >
            {fetchState === "loading" ? t("获取中") : t("获取模型列表")}
          </Button>
          <span className="text-muted" aria-live="polite">
            {fetchState === "success" && t("已获取模型")}
            {fetchState === "empty" && t("没有可用模型")}
            {fetchState === "error" &&
              t("请先填写Base URL和API Key，或检查连接")}
          </span>
        </div>
      </SectionCard>
      <div className="toolbar between">
        <div>
          <h2 className="font-semibold">{t("模型")}</h2>
          <p className="text-muted">{t("能力按实际接口填写")}</p>
        </div>
        <Button
          variant="secondary"
          onPress={() =>
            set("models", [...draft.models, createChatCompletionModel()])
          }
        >
          + {t("增加模型")}
        </Button>
      </div>
      {draft.models.length === 0 && (
        <p className="text-muted">{t("还没有模型，可手动增加或先获取列表")}</p>
      )}
      {draft.models.map((model, index) => (
        <SectionCard
          key={model.uid}
          title={`${t("模型")} ${index + 1}`}
          actions={
            <Button
              size="sm"
              variant="danger-soft"
              onPress={() =>
                set(
                  "models",
                  draft.models.filter((item) => item.uid !== model.uid),
                )
              }
            >
              {t("删除模型")}
            </Button>
          }
        >
          <div className="form-grid">
            <TextField
              value={model.modelId}
              isInvalid={!model.modelId.trim()}
              onChange={(value) =>
                updateModel(model.uid, { ...model, modelId: value })
              }
            >
              <Label>{t("模型名称")}</Label>
              <Input />
              <FieldError>{t("模型名称必填")}</FieldError>
            </TextField>
            <SelectField
              label={t("候选模型")}
              value={candidates?.includes(model.modelId) ? model.modelId : ""}
              isDisabled={!candidates?.length}
              placeholder={t("候选模型")}
              description={
                !candidates?.length
                  ? t("先获取模型列表，或手动输入模型名称")
                  : undefined
              }
              options={(candidates ?? []).map((value) => ({
                value,
                label: value,
              }))}
              onChange={(value) =>
                updateModel(model.uid, { ...model, modelId: value })
              }
            />
            <div className="full-width">
              <SelectField
                label={t("模型类型")}
                value={model.type}
                options={typeOptions}
                onChange={(value) =>
                  updateModel(model.uid, {
                    ...createModel({
                      modelId: model.modelId,
                      type: value as ModelType,
                      capabilities:
                        model.type === ModelType.CHAT_COMPLETION
                          ? model.capabilities
                          : {},
                    }),
                    uid: model.uid,
                  })
                }
              />
            </div>
          </div>
          {model.type === ModelType.CHAT_COMPLETION && (
            <div className="toolbar">
              {(["audio", "image", "text", "tools"] as const).map(
                (capability) => (
                  <CheckField
                    key={capability}
                    isSelected={model.capabilities[capability]}
                    onChange={(selected) =>
                      updateModel(model.uid, {
                        ...model,
                        capabilities: {
                          ...model.capabilities,
                          [capability]: selected,
                        },
                      })
                    }
                  >
                    {t(capabilityTranslationKeys[capability])}
                  </CheckField>
                ),
              )}
            </div>
          )}
        </SectionCard>
      ))}
      <div className="toolbar">
        <Button type="submit">{t("保存")}</Button>
        <Button variant="secondary" onPress={onDone}>
          {t("取消")}
        </Button>
      </div>
    </form>
  );
}
