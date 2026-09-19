import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import {
  addTranslationPromptTemplate,
  DEFAULT_TRANSLATION_PROMPT_CONTENT,
  DEFAULT_TRANSLATION_PROMPT_ID,
  removeTranslationPromptTemplate,
  setSelectedTranslationPrompt,
  type TranslationPromptTemplate,
  updateTranslationPromptTemplate,
} from "@/store/settings";
import styles from "../index.module.css";

export default function PromptSettings() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const templates = useAppSelector(
    (state) => state.settings.translationPromptTemplates,
  );
  const selectedId = useAppSelector(
    (state) => state.settings.selectedTranslationPromptId,
  );
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");

  const select = (uid: string) => dispatch(setSelectedTranslationPrompt(uid));
  const close = () => {
    dialogRef.current?.close();
    setEditingTitle(null);
  };
  const startTitleEdit = (template: TranslationPromptTemplate) => {
    setEditingTitle(template.uid);
    setTitleDraft(template.title);
  };
  const saveTitle = () => {
    if (!editingTitle) return;
    dispatch(
      updateTranslationPromptTemplate({ uid: editingTitle, title: titleDraft }),
    );
    setEditingTitle(null);
  };
  const addTemplate = () => {
    dispatch(
      addTranslationPromptTemplate({
        uid: crypto.randomUUID(),
        title: t("新建提示词"),
        content: DEFAULT_TRANSLATION_PROMPT_CONTENT,
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
        {t("提示词设置")}
      </button>
      <dialog
        ref={dialogRef}
        className={styles.providerDialog}
        onClose={() => setEditingTitle(null)}
        aria-label={t("提示词设置")}
      >
        <div className={styles.dialogShell}>
          <header>
            <div className={styles.dialogHeaderIntro}>
              <span>{t("提示词设置")}</span>
              <small>{t("管理翻译提示词")}</small>
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
          <div className={styles.promptList}>
            <p className={styles.promptHint}>{t("提示词占位符说明")}</p>
            <div className={styles.promptCards}>
              <article
                className={
                  selectedId === DEFAULT_TRANSLATION_PROMPT_ID
                    ? styles.promptCardSelected
                    : undefined
                }
              >
                <div className={styles.promptCardHeader}>
                  <div className={styles.promptSelector}>
                    <input
                      type="checkbox"
                      checked={selectedId === DEFAULT_TRANSLATION_PROMPT_ID}
                      onChange={() => select(DEFAULT_TRANSLATION_PROMPT_ID)}
                    />
                    <button
                      type="button"
                      className={styles.promptTitleButton}
                      onClick={() => select(DEFAULT_TRANSLATION_PROMPT_ID)}
                    >
                      {t("默认提示词")}
                    </button>
                  </div>
                </div>
                <textarea
                  className={styles.promptContent}
                  value={DEFAULT_TRANSLATION_PROMPT_CONTENT}
                  rows={5}
                  readOnly
                  aria-label={t("默认提示词")}
                />
              </article>
              {templates.map((template) => (
                <article
                  key={template.uid}
                  className={
                    selectedId === template.uid
                      ? styles.promptCardSelected
                      : undefined
                  }
                >
                  <div className={styles.promptCardHeader}>
                    <div className={styles.promptSelector}>
                      <input
                        type="checkbox"
                        checked={selectedId === template.uid}
                        onChange={() => select(template.uid)}
                      />
                      {editingTitle === template.uid ? (
                        <input
                          className={styles.promptTitleInput}
                          value={titleDraft}
                          onChange={(event) =>
                            setTitleDraft(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              saveTitle();
                            }
                          }}
                          aria-label={t("提示词标题")}
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          className={styles.promptTitleButton}
                          onClick={() => select(template.uid)}
                        >
                          {template.title}
                        </button>
                      )}
                    </div>
                    <div className={styles.promptCardActions}>
                      {editingTitle === template.uid ? (
                        <button type="button" onClick={saveTitle}>
                          {t("保存")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startTitleEdit(template)}
                        >
                          {t("编辑标题")}
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.dangerButton}
                        onClick={() => {
                          dispatch(
                            removeTranslationPromptTemplate(template.uid),
                          );
                          if (editingTitle === template.uid)
                            setEditingTitle(null);
                        }}
                      >
                        {t("删除")}
                      </button>
                    </div>
                  </div>
                  <textarea
                    className={styles.promptContent}
                    value={template.content}
                    rows={5}
                    onChange={(event) =>
                      dispatch(
                        updateTranslationPromptTemplate({
                          uid: template.uid,
                          content: event.target.value,
                        }),
                      )
                    }
                    aria-label={`${template.title} ${t("提示词内容")}`}
                  />
                </article>
              ))}
            </div>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={addTemplate}
            >
              + {t("新建提示词")}
            </button>
          </div>
          <footer>
            <button
              type="button"
              className={styles.dialogFooterClose}
              onClick={close}
            >
              {t("关闭")}
            </button>
          </footer>
        </div>
      </dialog>
    </>
  );
}
