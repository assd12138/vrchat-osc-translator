import { Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";

export default function RecognitionStatus({
  recognizing = false,
  speaking = false,
}: {
  recognizing?: boolean;
  speaking?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="toolbar" role="status">
      <span className="text-muted">{t("识别状态")}</span>
      <Chip
        size="sm"
        variant="soft"
        color={!recognizing ? "default" : speaking ? "success" : "warning"}
      >
        <Chip.Label>
          {!recognizing ? t("未识别") : speaking ? t("识别中") : t("无声音")}
        </Chip.Label>
      </Chip>
    </div>
  );
}
