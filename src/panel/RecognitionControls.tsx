import { useTranslation } from "react-i18next";
import globalStyles from "@/styles/index.module.css";
import styles from "./audio-panel/index.module.css";

interface RecognitionControlsProps {
  deviceSelectId: string;
  deviceLabel: string;
  devices: Pick<MediaDeviceInfo, "deviceId" | "label">[];
  deviceId: string;
  onDeviceChange: (deviceId: string) => void;
  recognizing?: boolean;
  speaking?: boolean;
}

export default function RecognitionControls({
  deviceSelectId,
  deviceLabel,
  devices,
  deviceId,
  onDeviceChange,
  recognizing = false,
  speaking = false,
}: RecognitionControlsProps) {
  const { t } = useTranslation();

  return (
    <>
      <div>
        <select
          disabled={recognizing}
          className={globalStyles.selectS}
          name={deviceSelectId}
          id={deviceSelectId}
          aria-label={deviceLabel}
          value={deviceId}
          onChange={(event) => onDeviceChange(event.target.value)}
        >
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.recognitionStatus} role="status">
        <span
          aria-hidden="true"
          className={[
            styles.statusIndicator,
            !recognizing
              ? styles.statusInactive
              : speaking
                ? styles.statusSpeaking
                : styles.statusPausing,
          ].join(" ")}
        />
        <span>
          {t("识别状态")}：
          <span>
            {!recognizing ? t("未识别") : speaking ? t("识别中") : t("无声音")}
          </span>
        </span>
      </div>
    </>
  );
}
