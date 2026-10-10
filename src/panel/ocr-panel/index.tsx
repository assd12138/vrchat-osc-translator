import { Button, Label, TextArea, TextField } from "@heroui/react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { transformOCRRouter } from "@/api/commonRouter";
import { SectionCard, SelectField } from "@/components/ui";
import { languages } from "@/constants/language";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import { setOcrTargetLanguage } from "../../store/settings";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export default function OcrPanel() {
  const { t } = useTranslation();
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
  const [ocr, setOCR] = useState("");
  const [trans, setTrans] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const runOcr = async (file: Blob) => {
    const base64String = await blobToDataUrl(file);
    setOCR("");
    setTrans("");
    const result = await transformOCRRouter({ base64: base64String });
    setOCR(result.original);
    setTrans(result.translation);
  };

  const recognizeClipboardImage = async () => {
    const items = await navigator.clipboard.read();
    try {
      const item = items.find((candidate) =>
        ACCEPTED_IMAGE_TYPES.some((type) => candidate.types.includes(type)),
      );
      if (!item) {
        console.log("剪贴板无图片");
        return;
      }

      const imageType = item.types.find((type) => type.startsWith("image/"));
      await runOcr(await item.getType(imageType || item.types[0]));
    } catch (error) {
      console.error("Error processing items:", error);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      console.warn(`Unsupported image type: ${file.type}`);
      return;
    }
    try {
      await runOcr(file);
    } catch (error) {
      console.error("Error processing file:", error);
    }
  };

  return (
    <>
      <SectionCard title={t("图片来源")}>
        <SelectField
          label={t("目标语言")}
          value={settings.ocrTargetLanguage}
          onChange={(value) => dispatch(setOcrTargetLanguage(value))}
          options={languages.map((language) => ({
            value: language.code,
            label: language.nativeName,
          }))}
        />
        <div className="toolbar">
          <Button onPress={recognizeClipboardImage}>{t("剪贴板")}</Button>
          <Button
            variant="secondary"
            onPress={() => fileInputRef.current?.click()}
          >
            {t("文件选择")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            hidden
            onChange={handleFileChange}
          />
        </div>
      </SectionCard>
      <SectionCard title={t("翻译结果")}>
        <div className="form-grid">
          <TextField isReadOnly value={ocr}>
            <Label>{t("原文")}</Label>
            <TextArea rows={10} />
          </TextField>
          <TextField isReadOnly value={trans}>
            <Label>{t("译文")}</Label>
            <TextArea rows={10} />
          </TextField>
        </div>
      </SectionCard>
    </>
  );
}
