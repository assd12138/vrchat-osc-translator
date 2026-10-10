import { Button, Chip, Label, Modal, TextArea, TextField } from "@heroui/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionCard } from "@/components/ui";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { setOutputTemplate } from "@/store/settings";
import { extractLanguagesFromTemplate } from "@/utils";
import TranslationTemplateHelper from "../translation-template-helper";

export default function TranslationPanel() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const outputTemplate = useAppSelector(
    (state) => state.settings.outputTemplate,
  );
  const detectedLanguages = useMemo(
    () => extractLanguagesFromTemplate(outputTemplate),
    [outputTemplate],
  );
  return (
    <SectionCard title={t("翻译设置")} hideHeading>
      <TextField
        value={outputTemplate}
        className="settings-template"
        onChange={(value) => dispatch(setOutputTemplate(value))}
      >
        <div className="settings-template-heading">
          <Label>{t("输出模板")}</Label>
          <Button size="sm" variant="secondary" onPress={() => setOpen(true)}>
            {t("模板生成器")}
          </Button>
        </div>
        <TextArea rows={5} placeholder={t("模板placeholder")} />
      </TextField>
      <div className="toolbar">
        <span className="text-muted">{t("检测到的语言")}</span>
        {detectedLanguages.length ? (
          detectedLanguages.map((code) => (
            <Chip key={code} size="sm" variant="soft" color="accent">
              <Chip.Label>{code}</Chip.Label>
            </Chip>
          ))
        ) : (
          <span className="text-warning text-xs">
            {t("未检测到语言占位符")}
          </span>
        )}
      </div>
      <Modal isOpen={open} onOpenChange={setOpen}>
        <Modal.Backdrop>
          <Modal.Container size="lg" scroll="inside">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t("模板生成器")}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <TranslationTemplateHelper
                  initialValue={detectedLanguages}
                  onConfirm={(value) => {
                    dispatch(setOutputTemplate(value));
                    setOpen(false);
                  }}
                  onCancel={() => setOpen(false)}
                />
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </SectionCard>
  );
}
