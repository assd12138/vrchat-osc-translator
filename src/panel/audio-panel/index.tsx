import { MicVAD } from "@ricky0123/vad-web";
import { encodeWAV } from "@ricky0123/vad-web/dist/utils";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadMicDevices } from "@/utils";
import { transcriptionAudio, translateByAI } from "../../api/translate";
import invoke from "../../cross-platform/invoke";
import { useAppSelector } from "../../store/hook";
import globalStyles from "../../styles/index.module.css";
import eventBus, { EventBusEvent } from "../../utils/event-bus";
import styles from "./index.module.css";

export default function AudioPanel() {
  const { t } = useTranslation();
  const settings = useAppSelector((state) => state.settings);
  const myVad = useRef<MicVAD>(null);
  // 是否正在录音
  const [recording, setRecording] = useState(false);
  // 是否正在说话
  const [speaking, setSpeaking] = useState(false);
  // 麦克风设备选择
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  // 选择的麦克风
  const [deviceId, setDeviceId] = useState<string>();

  const start = async () => {
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
              deviceId: {
                exact: deviceId,
              },
            },
          });
          return stream;
        },
        onSpeechEnd: async (audio) => {
          setSpeaking(false);

          const wavBuffer = encodeWAV(audio);
          const audioBlob = new Blob([wavBuffer], { type: "audio/wav" });
          const file = new File([audioBlob], "audio.wav", {
            type: audioBlob.type,
            lastModified: Date.now(),
          });
          const transcriptionRes = await transcriptionAudio({
            file,
            api: settings.transcription_url,
            auth: settings.transcription_token,
            model: settings.transcription_model,
          });
          const ask = settings.ai_template.replace(
            "{text}",
            transcriptionRes.text,
          );

          const translationRes = await translateByAI({
            text: ask,
            token: settings.openai_token,
            api: settings.openai_api_url,
            model: settings.openai_model,
            assignObj: {
              max_tokens: 500,
            },
          });
          const translation = translationRes.choices[0].message.content;
          invoke("send_to_vrc_chat", {
            text: translation,
          });
          eventBus.emit(
            EventBusEvent.ADD_LOG,
            t("识别成功", {
              transcription: transcriptionRes.text,
              translation,
            }),
          );
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

  const stop = () => {
    if (!myVad.current) return;
    myVad.current.destroy();
    myVad.current = null;
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

  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>🎙️ {t("语音识别控制")}</div>
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
    </div>
  );
}
