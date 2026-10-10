import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createSubtitleRecognitionSession } from "@/api/subtitle-stream";
import invoke, { NATIVE_COMMAND } from "@/electron/ipc";
import globalStyles from "@/styles/index.module.css";
import {
  DisplayAudioUnavailableError,
  startDisplayAudioCapture,
} from "@/utils/display-audio";
import eventBus, { EventBusEvent } from "@/utils/event-bus";
import styles from "../audio-panel/index.module.css";
import CollapsiblePanel from "../CollapsiblePanel";
import RecognitionStatus from "../RecognitionStatus";
import panelStyles from "./index.module.css";

type RecognitionPhase = "idle" | "starting" | "connecting" | "recognizing";

export default function SubtitleRecognitionPanel() {
  const { t } = useTranslation();
  const sessionRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const [phase, setPhase] = useState<RecognitionPhase>("idle");
  const [speaking, setSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const active = phase !== "idle";
  const capturing = phase === "connecting" || phase === "recognizing";

  const finishCapture = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    session?.abort();
    if (mountedRef.current) {
      setPhase("idle");
      setSpeaking(false);
      setAudioLevel(0);
    }
  }, []);

  const start = async () => {
    if (sessionRef.current) return;
    const controller = new AbortController();
    sessionRef.current = controller;
    setPhase("starting");

    try {
      // 配置校验同步完成，随后直接发起共享请求以保留点击的用户激活状态。
      const recognition = createSubtitleRecognitionSession(controller.signal);
      await startDisplayAudioCapture({
        signal: controller.signal,
        onChunk: (chunk) => {
          if (sessionRef.current !== controller || !mountedRef.current) return;
          setAudioLevel(chunk.peak);
          setSpeaking(chunk.rms >= 0.006);
          try {
            recognition.pushAudio(chunk);
          } catch (error) {
            finishCapture();
            console.error("[字幕识别] 音频格式错误", error);
            eventBus.emit(EventBusEvent.ADD_LOG, t("字幕识别失败"));
            return;
          }
        },
        onEnded: () => {
          if (sessionRef.current !== controller) return;
          finishCapture();
          eventBus.emit(EventBusEvent.ADD_LOG, t("字幕音频共享已结束"));
        },
        onError: (error) => {
          if (sessionRef.current !== controller) return;
          finishCapture();
          eventBus.emit(
            EventBusEvent.ADD_LOG,
            `${t("字幕音频采集失败")}: ${error.message}`,
          );
        },
      });
      if (sessionRef.current !== controller || !mountedRef.current) {
        return;
      }
      setPhase("connecting");
      await recognition.connect();
      if (sessionRef.current !== controller || !mountedRef.current) return;
      setPhase("recognizing");
      eventBus.emit(EventBusEvent.ADD_LOG, t("开始字幕音频采集"));
    } catch (error) {
      if (sessionRef.current !== controller) return;
      finishCapture();
      const message =
        error instanceof DisplayAudioUnavailableError
          ? t("未获取到系统音频")
          : error instanceof Error
            ? error.message
            : String(error);
      console.error("[字幕识别] 启动失败", error);
      eventBus.emit(EventBusEvent.ADD_LOG, `${t("字幕识别失败")}: ${message}`);
    }
  };

  const stop = () => {
    const wasCapturing = capturing;
    finishCapture();
    if (wasCapturing) {
      eventBus.emit(EventBusEvent.ADD_LOG, t("停止字幕音频采集"));
    }
  };

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
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      finishCapture();
    };
  }, [finishCapture]);

  return (
    <CollapsiblePanel
      panel="subtitleRecognition"
      title={t("字幕识别")}
      icon="🔊"
      contentId="subtitle-recognition-panel-content"
      collapseDisabled={active}
    >
      <div className={styles.buttongroup}>
        <button
          type="button"
          onClick={start}
          className={globalStyles.button}
          disabled={active}
        >
          {phase === "starting"
            ? t("启动识别中")
            : phase === "connecting"
              ? t("连接识别服务中")
              : t("开始")}
        </button>
        <button
          type="button"
          onClick={stop}
          className={globalStyles.button}
          disabled={!active}
        >
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
      <RecognitionStatus
        recognizing={phase === "recognizing"}
        speaking={speaking}
      />
      {capturing && (
        <label className={panelStyles.level}>
          {t("音量")}
          <meter min={0} max={1} value={audioLevel} />
        </label>
      )}
    </CollapsiblePanel>
  );
}
