import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type ApiProvider,
  createApiProvider,
  createAudioTranscriptionModel,
  createChatCompletionModel,
  isProviderIdentifierAvailable,
} from "@/store/api-config";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { removeProvider, upsertProvider } from "@/store/settings";
import styles from "../index.module.css";
import ProviderEditor from "./ProviderEditor";

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
