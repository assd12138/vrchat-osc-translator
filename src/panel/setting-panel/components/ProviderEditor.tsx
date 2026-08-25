import { useState } from "react";
import { useTranslation } from "react-i18next";
import { discoverModels, normalizeBaseURL } from "@/api/provider";
import {
  type ApiModel,
  type ApiProvider,
  createAudioTranscriptionModel,
  createChatCompletionModel,
  isProviderIdentifierAvailable,
} from "@/store/api-config";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { upsertProvider } from "@/store/settings";
import styles from "../index.module.css";
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
  const [openCandidate, setOpenCandidate] = useState<string | null>(null);
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
  return (
    <form
      className={styles.editor}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className={styles.editorIntro}>
        <button type="button" className={styles.backButton} onClick={onDone}>
          ← {t("返回列表")}
        </button>
        <span>{provider.identifier ? t("编辑供应商") : t("新建供应商")}</span>
      </div>
      <div className={styles.profileGrid}>
        <label>
          <span>{t("供应商标识")}</span>
          <input
            autoFocus
            value={draft.identifier}
            onChange={(e) => set("identifier", e.target.value)}
            aria-invalid={!!identifierError}
          />
          {identifierError && (
            <small className={styles.inlineError}>{identifierError}</small>
          )}
        </label>
        <label>
          <span>Base URL</span>
          <input
            value={draft.baseURL}
            placeholder="https://api.openai.com/v1"
            onChange={(e) => set("baseURL", e.target.value)}
            aria-invalid={!draft.baseURL.trim()}
          />
          {!draft.baseURL.trim() ? (
            <small className={styles.inlineError}>{t("Base URL必填")}</small>
          ) : (
            <small>{t("填写到 /v1，不要尾斜杠")}</small>
          )}
        </label>
        <label className={styles.keyField}>
          <span>API Key</span>
          <div>
            <input
              type={showKey ? "text" : "password"}
              defaultValue={draft.apiKey}
              onChange={(e) => set("apiKey", e.target.value)}
              aria-invalid={!draft.apiKey.trim()}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              aria-label={showKey ? t("隐藏API Key") : t("显示API Key")}
            >
              <span
                aria-hidden="true"
                className={`${styles.keyIcon} ${showKey ? styles.keyIconHidden : styles.keyIconVisible}`}
              />
            </button>
          </div>
          <small className={styles.inlineError}>{t("API Key必填")}</small>
        </label>
      </div>
      <div className={styles.discovery}>
        <button
          type="button"
          onClick={discover}
          disabled={fetchState === "loading"}
        >
          {fetchState === "loading" ? t("获取中") : t("获取模型列表")}
        </button>
        <span aria-live="polite">
          {fetchState === "success" && t("已获取模型")}
          {fetchState === "empty" && t("没有可用模型")}
          {fetchState === "error" && t("请先填写Base URL和API Key，或检查连接")}
        </span>
      </div>
      <div className={styles.modelsHeader}>
        <div className={styles.modelsHeaderInfo}>
          <span>{t("模型")}</span>
          <small>{t("能力按实际接口填写")}</small>
        </div>
        <button
          type="button"
          onClick={() =>
            set("models", [...draft.models, createChatCompletionModel()])
          }
        >
          + {t("增加模型")}
        </button>
      </div>
      <div className={styles.modelList}>
        {draft.models.length === 0 && (
          <div className={styles.modelEmpty}>
            {t("还没有模型，可手动增加或先获取列表")}
          </div>
        )}
        {draft.models.map((model) => (
          <div className={styles.modelCard} key={model.uid}>
            <div className={styles.modelTop}>
              <label className={styles.modelIdField}>
                <span>{t("模型名称")}</span>
                <input
                  value={model.modelId}
                  aria-invalid={!model.modelId.trim()}
                  onChange={(e) =>
                    updateModel(model.uid, {
                      ...model,
                      modelId: e.target.value,
                    })
                  }
                />
                {!model.modelId.trim() && (
                  <small className={styles.inlineError}>
                    {t("模型名称必填")}
                  </small>
                )}
              </label>
              <div className={styles.candidateWrap}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenCandidate(
                      openCandidate === model.uid ? null : model.uid,
                    )
                  }
                >
                  {t("候选模型")} ▾
                </button>
                {openCandidate === model.uid && (
                  <div className={styles.candidateMenu}>
                    <div className={styles.candidateMenuHeader}>
                      <strong>{t("候选模型")}</strong>
                      <button
                        type="button"
                        onClick={() => setOpenCandidate(null)}
                        aria-label={t("关闭")}
                      >
                        ×
                      </button>
                    </div>
                    {candidates?.length ? (
                      candidates.map((candidate) => (
                        <button
                          type="button"
                          key={candidate}
                          onClick={() => {
                            updateModel(model.uid, {
                              ...model,
                              modelId: candidate,
                            });
                            setOpenCandidate(null);
                          }}
                        >
                          {candidate}
                        </button>
                      ))
                    ) : (
                      <p>{t("先获取模型列表，或手动输入模型名称")}</p>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                className={styles.removeModel}
                onClick={() =>
                  set(
                    "models",
                    draft.models.filter((m) => m.uid !== model.uid),
                  )
                }
                aria-label={t("删除模型")}
              >
                ×
              </button>
            </div>
            <label className={styles.typePicker}>
              <span>{t("模型类型")}</span>
              <select
                value={model.type}
                onChange={(e) =>
                  updateModel(
                    model.uid,
                    e.target.value === "audio-transcription"
                      ? {
                          ...createAudioTranscriptionModel(model.modelId),
                          uid: model.uid,
                        }
                      : {
                          ...createChatCompletionModel(model.modelId),
                          uid: model.uid,
                        },
                  )
                }
              >
                <option value="audio-transcription">
                  {t("语音转写")} /audio/transcriptions
                </option>
                <option value="chat-completion">
                  {t("文本补全")} /chat/completions
                </option>
              </select>
            </label>
            {model.type === "chat-completion" && (
              <div className={styles.capabilities}>
                {(["audio", "image", "text", "tools"] as const).map(
                  (capability) => (
                    <label key={capability}>
                      <input
                        type="checkbox"
                        checked={model.capabilities[capability]}
                        onChange={(e) =>
                          updateModel(model.uid, {
                            ...model,
                            capabilities: {
                              ...model.capabilities,
                              [capability]: e.target.checked,
                            },
                          })
                        }
                      />
                      {t(capabilityTranslationKeys[capability])}
                    </label>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={styles.editorActions}>
        <button type="button" onClick={onDone}>
          {t("取消")}
        </button>
        <button type="submit" className={styles.primaryButton}>
          {t("保存")}
        </button>
      </div>
    </form>
  );
}
