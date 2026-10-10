import {
  Button,
  Card,
  Checkbox,
  Input,
  Label,
  TextArea,
  TextField,
} from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Icon from "@/components/Icon";
import { CheckField, SectionCard } from "@/components/ui";
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

export default function PromptSettings() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const templates = useAppSelector(
    (state) => state.settings.translationPromptTemplates,
  );
  const selectedId = useAppSelector(
    (state) => state.settings.selectedTranslationPromptId,
  );
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");

  const select = (uid: string) => dispatch(setSelectedTranslationPrompt(uid));
  const startTitleEdit = (template: TranslationPromptTemplate) => {
    setEditingTitle(template.uid);
    setTitleDraft(template.title);
  };
  const saveTitle = (uid: string, title: string) => {
    dispatch(updateTranslationPromptTemplate({ uid, title }));
    setEditingTitle((current) => (current === uid ? null : current));
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
    <SectionCard title={t("提示词设置")} hideHeading>
      <div className="settings-prompt-help">
        <p className="text-muted">{t("提示词占位符说明")}</p>
        <Button size="sm" variant="secondary" onPress={addTemplate}>
          + {t("新建提示词")}
        </Button>
      </div>
      <Card className="settings-prompt" variant="secondary">
        <Card.Header className="settings-prompt-header">
          <CheckField
            isSelected={selectedId === DEFAULT_TRANSLATION_PROMPT_ID}
            onChange={() => select(DEFAULT_TRANSLATION_PROMPT_ID)}
          >
            {t("默认提示词")}
          </CheckField>
        </Card.Header>
        <Card.Content>
          <TextField
            isReadOnly
            value={DEFAULT_TRANSLATION_PROMPT_CONTENT}
            aria-label={t("默认提示词")}
          >
            <TextArea rows={4} />
          </TextField>
        </Card.Content>
      </Card>
      {templates.map((template) => (
        <Card
          key={template.uid}
          className="settings-prompt"
          variant="secondary"
        >
          <Button
            isIconOnly
            size="sm"
            variant="secondary"
            className="settings-prompt-delete"
            aria-label={`${t("删除")} ${template.title}`}
            onPress={() => {
              dispatch(removeTranslationPromptTemplate(template.uid));
              if (editingTitle === template.uid) setEditingTitle(null);
            }}
          >
            <Icon name="close" width="12" height="12" />
          </Button>
          <Card.Header className="settings-prompt-header">
            <Checkbox
              className="settings-prompt-selector"
              aria-label={template.title}
              isSelected={selectedId === template.uid}
              onChange={() => select(template.uid)}
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
              </Checkbox.Content>
            </Checkbox>
            {editingTitle === template.uid ? (
              <TextField
                className="settings-prompt-title-field"
                value={titleDraft}
                onChange={setTitleDraft}
                aria-label={t("提示词标题")}
              >
                <Input
                  autoFocus
                  onBlur={(event) =>
                    saveTitle(template.uid, event.currentTarget.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                />
              </TextField>
            ) : (
              <button
                type="button"
                className="settings-prompt-title"
                aria-label={`${t("编辑标题")} ${template.title}`}
                onClick={() => startTitleEdit(template)}
              >
                {template.title}
              </button>
            )}
          </Card.Header>
          <Card.Content className="field-stack">
            <TextField
              value={template.content}
              onChange={(content) =>
                dispatch(
                  updateTranslationPromptTemplate({
                    uid: template.uid,
                    content,
                  }),
                )
              }
            >
              <Label>{t("提示词内容")}</Label>
              <TextArea rows={5} />
            </TextField>
          </Card.Content>
        </Card>
      ))}
    </SectionCard>
  );
}
