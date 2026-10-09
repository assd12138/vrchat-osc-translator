import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import invoke, { NATIVE_COMMAND } from "@/electron/ipc";
import globalStyles from "@/styles/index.module.css";
import eventBus, { EventBusEvent } from "@/utils/event-bus";
import styles from "../audio-panel/index.module.css";
import CollapsiblePanel from "../CollapsiblePanel";
import RecognitionControls from "../RecognitionControls";

export default function SubtitleRecognitionPanel() {
  const { t } = useTranslation();
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("default");

  const openSubtitleWindow = async () => {
    try {
      const result = await invoke(
        NATIVE_COMMAND.OPEN_SUBTITLE_WINDOW,
        undefined,
      );
      if (result?.success === false) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      eventBus.emit(
        EventBusEvent.ADD_LOG,
        `${t("字幕弹窗打开失败")}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  useEffect(() => {
    let active = true;
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices) return;

    const loadSpeakers = async () => {
      try {
        const devices = await mediaDevices.enumerateDevices();
        if (active) {
          const speakers = devices.filter(
            (device) => device.kind === "audiooutput",
          );
          setSpeakerDevices(speakers);
          setDeviceId((selected) =>
            speakers.some((device) => device.deviceId === selected)
              ? selected
              : "default",
          );
        }
      } catch (error) {
        console.error(error);
      }
    };

    void loadSpeakers();
    mediaDevices.addEventListener("devicechange", loadSpeakers);
    return () => {
      active = false;
      mediaDevices.removeEventListener("devicechange", loadSpeakers);
    };
  }, []);

  const devices = [
    {
      deviceId: "default",
      label:
        speakerDevices.find((device) => device.deviceId === "default")?.label ||
        t("系统默认扬声器"),
    },
    ...speakerDevices
      .filter((device) => device.deviceId !== "default")
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `${t("系统扬声器")} ${index + 1}`,
      })),
  ];

  return (
    <CollapsiblePanel
      panel="subtitleRecognition"
      title={t("字幕识别")}
      icon="🔊"
      contentId="subtitle-recognition-panel-content"
    >
      {/* 先复刻界面，识别入口待配置逻辑确定后接入。 */}
      <div className={styles.buttongroup}>
        <button type="button" className={globalStyles.button} disabled>
          {t("开始")}
        </button>
        <button type="button" className={globalStyles.button} disabled>
          {t("停止")}
        </button>
        <button
          type="button"
          onClick={openSubtitleWindow}
          className={globalStyles.button}
          disabled={!window.electronAPI}
        >
          {t("打开字幕")}
        </button>
      </div>
      <RecognitionControls
        deviceSelectId="subtitle-speaker"
        deviceLabel={t("系统扬声器")}
        devices={devices}
        deviceId={deviceId}
        onDeviceChange={setDeviceId}
      />
    </CollapsiblePanel>
  );
}
