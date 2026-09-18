import { MicVAD } from "@ricky0123/vad-web";
import { Microphone } from "decibri";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { processAudioRouter, translateRouter } from "@/api/commonRouter";
import { resolveModel } from "@/api/provider";
import { streamTranscription } from "@/api/stream";
import invoke, { NATIVE_COMMAND } from "@/electron/ipc";
import { ModelType } from "@/store/api-config";
import { togglePanelExpansion } from "@/store/settings";
import store from "@/store/store";
import { loadMicDevices } from "@/utils";
import { sendToVrcChat } from "@/utils/vrc-chat-queue";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import globalStyles from "../../styles/index.module.css";
import eventBus, { EventBusEvent } from "../../utils/event-bus";
import styles from "./index.module.css";

export default function AudioPanel() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isExpanded = useAppSelector(
    (state) => state.settings.panelExpansion.audio,
  );
  const myVad = useRef<MicVAD>(null);
  const streamMic = useRef<Microphone | null>(null);
  const stopStreamTranscription = useRef<(() => void) | null>(null);
  // 是否正在录音
  const [recording, setRecording] = useState(false);
  // 是否正在说话
  const [speaking, setSpeaking] = useState(false);
  // 麦克风设备选择
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  // 选择的麦克风
  const [deviceId, setDeviceId] = useState<string>();

  const start = () => {
    if (myVad.current || streamMic.current) return;
    const { apiConfig } = store.getState().settings;

    //  如果是流式的识别模型，使用stream采集
    if (apiConfig.translationMode === "transcribe-then-translate") {
      const resolvedConfig = resolveModel(apiConfig, "transcription");
      if (
        resolvedConfig.model.type === ModelType.NARILAB_AUDIO_SPEECH_TO_TEXT
      ) {
        startStreamVoice();
        return;
      }
    }
    startVadVoice();
  };

  const startVadVoice = async () => {
    try {
      if (myVad.current) return;
      const vad = await MicVAD.new({
        baseAssetPath: "/vad/",
        onnxWASMBasePath: "/vad/",
        model: "v5",
        positiveSpeechThreshold: 0.4,
        negativeSpeechThreshold: 0.4,
        minSpeechMs: 400,
        preSpeechPadMs: 300,
        onSpeechStart: () => {
          console.log("开始说话");
          setSpeaking(true);
        },
        getStream: async () => {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              echoCancellation: true,
              autoGainControl: true,
              noiseSuppression: true,
              deviceId: deviceId
                ? {
                    exact: deviceId,
                  }
                : undefined,
            },
          });
          return stream;
        },
        onSpeechEnd: async (audio) => {
          try {
            setSpeaking(false);
            const result = await processAudioRouter({ audio });
            const sendText = result.translation;

            sendToVrcChat(sendText);
            eventBus.emit(
              EventBusEvent.ADD_LOG,
              t("识别成功", {
                transcription: result.transcription ?? "",
                translation: sendText,
              }),
            );
          } catch (e) {
            if (!(e instanceof Error)) return;
            eventBus.emit(EventBusEvent.ADD_LOG, t("翻译失败") + e.message);
          }
        },
      });
      vad.start();
      myVad.current = vad;
      setRecording(true);
      eventBus.emit(EventBusEvent.ADD_LOG, t("开始语音识别"));
    } catch (e) {
      console.error(e);
    }
  };

  const startStreamVoice = async () => {
    const mic = new Microphone({
      sampleRate: 16000,
      channels: 1,
      dtype: "int16",
      device: deviceId,
    });
    try {
      const stopStreaming = await streamTranscription(mic, (text) => {
        eventBus.emit(EventBusEvent.ADD_LOG, text);
      });
      streamMic.current = mic;
      stopStreamTranscription.current = stopStreaming;
      await mic.start();
      setRecording(true);
      eventBus.emit(EventBusEvent.ADD_LOG, t("开始语音识别"));
    } catch (error) {
      mic.stop();
      stopStreamTranscription.current?.();
      stopStreamTranscription.current = null;
      streamMic.current = null;
      console.error(error);
    }
  };

  const stop = () => {
    if (myVad.current) {
      myVad.current.destroy();
      myVad.current = null;
    } else if (streamMic.current) {
      streamMic.current.stop();
      streamMic.current = null;
      stopStreamTranscription.current?.();
      stopStreamTranscription.current = null;
    } else {
      return;
    }
    setSpeaking(false);
    setRecording(false);
    eventBus.emit(EventBusEvent.ADD_LOG, t("停止语音识别"));
  };

  const refresh = () => {
    window.location.reload();
  };

  useEffect(() => {
    const load = async () => {
      const devices = await loadMicDevices();
      setDeviceId(
        devices.find((item) => item.deviceId === "default")?.deviceId || "",
      );
      setMicDevices(devices);
    };
    load();
  }, []);

  // 手动输入的文本
  const [manualText, setManualText] = useState("");
  // 是否正在翻译中
  const [translating, setTranslating] = useState(false);

  const handleManualTranslate = async () => {
    if (!manualText.trim() || translating) return;

    setTranslating(true);
    try {
      let sendText = "";

      const translationResult = await translateRouter({
        text: manualText,
      });
      sendText = translationResult;

      sendToVrcChat(sendText);
      eventBus.emit(
        EventBusEvent.ADD_LOG,
        t("手动翻译成功", {
          original: manualText,
          translation: sendText,
        }),
      );
      setManualText("");
    } catch (e) {
      if (!(e instanceof Error)) return;
      eventBus.emit(EventBusEvent.ADD_LOG, t("手动翻译失败") + e.message);
    } finally {
      setTranslating(false);
    }
  };

  const test = async () => {
    const a = await invoke(NATIVE_COMMAND.GET_LOCAL_SERVICE, undefined);
    console.log(a);
  };

  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>
        🎙️ {t("语音识别控制")}
        <button
          type="button"
          className={globalStyles.panelToggle}
          onClick={() => dispatch(togglePanelExpansion("audio"))}
          aria-expanded={isExpanded}
          aria-controls="audio-panel-content"
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${t("语音识别控制")}`}
          disabled={isExpanded && (recording || translating)}
        >
          <span aria-hidden="true">{isExpanded ? "−" : "+"}</span>
        </button>
      </div>
      <div id="audio-panel-content" hidden={!isExpanded}>
        <div className={styles.buttongroup}>
          <button onClick={start} className={globalStyles.button}>
            {t("开始")}
          </button>
          <button onClick={stop} className={globalStyles.button}>
            {t("停止")}
          </button>
          <button onClick={refresh} className={globalStyles.button}>
            {t("刷新")}
          </button>
          <button
            style={{ display: "none" }}
            onClick={test}
            className={globalStyles.button}
          >
            test
          </button>
        </div>
        <div>
          <select
            disabled={recording}
            className={globalStyles.selectS}
            name="microphones"
            id="mic"
            value={deviceId}
            onChange={(value) => {
              setDeviceId(value.target.value);
            }}
          >
            {micDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.recordingStatus}>
          <span
            className={[
              styles.statusIndicator,
              !recording && styles.statusInactive,
              speaking && styles.statusSpeaking,
              !speaking && styles.statusPausing,
            ]
              .filter(Boolean)
              .join(" ")}
          ></span>
          <span>
            {t("录音状态")}：
            <span>
              {!recording ? t("未录音") : speaking ? t("说话中") : t("无声音")}
            </span>
          </span>
        </div>
        <div className={styles.manualInput}>
          <input
            type="text"
            className={globalStyles.input}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleManualTranslate();
              }
            }}
            placeholder={t("输入文本手动翻译")}
            disabled={translating}
          />
          <button
            onClick={handleManualTranslate}
            className={globalStyles.button}
            disabled={translating || !manualText.trim()}
          >
            {translating ? t("翻译中...") : t("翻译发送")}
          </button>
        </div>
      </div>
    </div>
  );
}
