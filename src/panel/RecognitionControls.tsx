import globalStyles from "@/styles/index.module.css";
import RecognitionStatus from "./RecognitionStatus";

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
      <RecognitionStatus recognizing={recognizing} speaking={speaking} />
    </>
  );
}
