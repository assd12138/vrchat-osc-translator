import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { discoverModels, normalizeBaseURL } from "@/api/provider";
import {
  type ApiModel,
  type ApiProvider,
  createApiProvider,
  createAudioTranscriptionModel,
  createChatCompletionModel,
  getEligibleProviderModels,
  isProviderIdentifierAvailable,
  isSelectionValid,
  type ModelSlot,
} from "@/store/api-config";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import {
  removeProvider,
  setBatchTranslate,
  setModelSelection,
  setTranslationMode,
  upsertProvider,
} from "@/store/settings";
import styles from "../index.module.css";

const capabilityTranslationKeys = {
  audio: "语音",
  image: "图像",
  text: "文本",
  tools: "工具调用",
} as const;

function ModelSelect({ slot, label }: { slot: ModelSlot; label: string }) {
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

export function ModelSelections() {
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
    translationModel?.type === "chat-completion" &&
    translationModel.capabilities.tools;
  return (
    <section className={styles.apiChoices}>
      <div className={styles.choiceHeading}>
        <span>{t("外部API配置")}</span>
        <small>{t("从供应商设置中添加模型")}</small>
      </div>
      <label className={styles.selectionField}>
        <span>{t("翻译方式")}</span>
        <select
          value={config.translationMode}
          onChange={(e) =>
            dispatch(
              setTranslationMode(
                e.target.value as "direct" | "transcribe-then-translate",
              ),
            )
          }
        >
          <option value="transcribe-then-translate">{t("先转写再翻译")}</option>
          <option value="direct">{t("直接输出翻译")}</option>
        </select>
      </label>
      {config.translationMode === "direct" ? (
        <ModelSelect slot="direct" label={t("直接翻译模型")} />
      ) : (
        <>
          <ModelSelect slot="transcription" label={t("转写模型")} />
          <ModelSelect slot="translation" label={t("翻译模型")} />
          {showBatch && (
            <label className={styles.batchChoice}>
              <input
                type="checkbox"
                checked={config.batchTranslate}
                onChange={(e) => dispatch(setBatchTranslate(e.target.checked))}
              />
              {t("批量翻译")}
            </label>
          )}
        </>
      )}
      <ModelSelect slot="ocr" label={t("OCR模型")} />
    </section>
  );
}

function ProviderEditor({
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

export default function ProviderSettings() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const providers = useAppSelector((s) => s.settings.apiConfig.providers);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<ApiProvider | null>(null);
  const close = () => {
    dialogRef.current?.close();
    setEditing(null);
  };
  const copy = (provider: ApiProvider) => {
    let n = 1;
    let identifier = `${provider.identifier}-copy`;
    while (!isProviderIdentifierAvailable(identifier, providers))
      identifier = `${provider.identifier}-copy-${++n}`;
    const copiedModels = provider.models.map((model) =>
      model.type === "audio-transcription"
        ? { ...createAudioTranscriptionModel(model.modelId) }
        : createChatCompletionModel(model.modelId, model.capabilities),
    );
    const copiedProvider = createApiProvider();
    dispatch(
      upsertProvider({
        ...copiedProvider,
        identifier,
        baseURL: provider.baseURL,
        apiKey: provider.apiKey,
        models: copiedModels,
      }),
    );
  };
  return (
    <>
      <button
        type="button"
        className={`${styles.providerLaunch} ${styles.providerHeaderLaunch}`}
        onClick={() => dialogRef.current?.showModal()}
      >
        {t("供应商设置")}
      </button>
      <dialog
        ref={dialogRef}
        className={styles.providerDialog}
        onClose={() => setEditing(null)}
        aria-label={t("供应商设置")}
      >
        <div className={styles.dialogShell}>
          <header>
            <div className={styles.dialogHeaderIntro}>
              <span>{t("供应商设置")}</span>
              <small>
                {editing ? t("编辑供应商档案") : t("管理连接和模型")}
              </small>
            </div>
            <button
              type="button"
              className={styles.dialogCloseButton}
              onClick={close}
              aria-label={t("关闭")}
            >
              ×
            </button>
          </header>
          {editing ? (
            <ProviderEditor
              provider={editing}
              onDone={() => setEditing(null)}
            />
          ) : (
            <div className={styles.providerList}>
              <div className={styles.listToolbar}>
                <span>{t("供应商列表")}</span>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setEditing(createApiProvider())}
                >
                  + {t("新建供应商")}
                </button>
              </div>
              {providers.length === 0 ? (
                <div className={styles.emptyState}>
                  <strong>{t("还没有供应商")}</strong>
                  <p>{t("添加一个供应商后，再为翻译和OCR选择模型")}</p>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setEditing(createApiProvider())}
                  >
                    + {t("新建供应商")}
                  </button>
                </div>
              ) : (
                <div className={styles.providerCards}>
                  {providers.map((provider) => (
                    <article key={provider.uid}>
                      <div className={styles.providerCardInfo}>
                        <strong>{provider.identifier}</strong>
                        <span>{provider.baseURL || "—"}</span>
                        <small>
                          {t("模型数量", { count: provider.models.length })}
                        </small>
                      </div>
                      <nav>
                        <button
                          type="button"
                          className={styles.providerCardAction}
                          onClick={() => setEditing(provider)}
                        >
                          {t("编辑")}
                        </button>
                        <button
                          type="button"
                          className={styles.providerCardAction}
                          onClick={() => copy(provider)}
                        >
                          {t("复制")}
                        </button>
                        <button
                          type="button"
                          className={`${styles.providerCardAction} ${styles.dangerButton}`}
                          onClick={() => dispatch(removeProvider(provider.uid))}
                        >
                          {t("删除")}
                        </button>
                      </nav>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
          <footer>
            {!editing && (
              <button type="button" onClick={close}>
                {t("关闭")}
              </button>
            )}
          </footer>
        </div>
      </dialog>
    </>
  );
}
