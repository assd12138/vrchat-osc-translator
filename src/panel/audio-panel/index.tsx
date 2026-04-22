import { MicVAD } from "@ricky0123/vad-web";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  transcriptionRouter,
  translateRouter,
  // translateRouterStream,
} from "@/api/commonRouter";
import { translateByLocalTransformer } from "@/api/localTransformer";
import { EApiProviderType } from "@/store/rehydrate/rehydrate-constant";
import store from "@/store/store";
import { loadMicDevices } from "@/utils";
import invoke, { NATIVE_COMMAND } from "../../cross-platform/invoke";
import globalStyles from "../../styles/index.module.css";
import eventBus, { EventBusEvent } from "../../utils/event-bus";
import styles from "./index.module.css";

export default function AudioPanel() {
  const { t } = useTranslation();
  const myVad = useRef<MicVAD>(null);
  // 是否正在录音
  const [recording, setRecording] = useState(false);
  // 是否正在说话
  const [speaking, setSpeaking] = useState(false);
  // 麦克风设备选择
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  // 选择的麦克风
  const [deviceId, setDeviceId] = useState<string>();

  // 用于追踪最新的 onSpeechEnd 调用时间戳
  // const latestSpeechTimestampRef = useRef<number>(0);
  // 用于节流 invoke 的调用
  // const lastInvokeTimeRef = useRef<number>(0);

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
          setSpeaking(false);
          let sendText = "";
          const transcriptionResult = await transcriptionRouter({ audio });
          if (
            store.getState().settings.api_provider_type !==
            EApiProviderType.OMNI
          ) {
            const translationResult = await translateRouter({
              text: transcriptionResult,
            });
            sendText = translationResult;
          } else {
            sendText = transcriptionResult;
          }

          invoke(NATIVE_COMMAND.SEND_TO_VRC_CHAT, {
            text: sendText,
          });
          eventBus.emit(
            EventBusEvent.ADD_LOG,
            t("识别成功", {
              transcription: transcriptionResult,
              translation: sendText,
            }),
          );
          // 非流式 end

          // 下面是流式的
          // setSpeaking(false);
          // // 记录本次调用的时间戳
          // const currentTimestamp = Date.now();
          // latestSpeechTimestampRef.current = currentTimestamp;

          // // 转录音频
          // const transcriptionResult = await transcriptionRouter({ audio });

          // // 如果在转录过程中出现了新的 onSpeechEnd 调用，则放弃本次处理
          // if (latestSpeechTimestampRef.current !== currentTimestamp) {
          //   console.log("放弃旧会话的翻译处理");
          //   return;
          // }

          // // 流式翻译
          // let accumulatedText = "";
          // const controller = new AbortController();

          // await translateRouterStream(
          //   { text: transcriptionResult },
          //   (chunk) => {
          //     // 如果出现了新的会话，取消当前流式处理
          //     if (latestSpeechTimestampRef.current !== currentTimestamp) {
          //       controller.abort();
          //       return;
          //     }

          //     accumulatedText += chunk;

          //     // 节流 invoke：确保两次调用间隔至少 500ms
          //     const now = Date.now();
          //     if (now - lastInvokeTimeRef.current >= 500) {
          //       lastInvokeTimeRef.current = now;
          //       invoke(NATIVE_COMMAND.SEND_TO_VRC_CHAT, {
          //         text: accumulatedText,
          //       });
          //     }
          //   },
          //   controller.signal,
          // );

          // // 最终检查：如果当前会话仍然是最新的，发送最终结果并记录日志
          // if (latestSpeechTimestampRef.current === currentTimestamp) {
          //   invoke(NATIVE_COMMAND.SEND_TO_VRC_CHAT, {
          //     text: accumulatedText,
          //   });
          //   eventBus.emit(
          //     EventBusEvent.ADD_LOG,
          //     t("识别成功", {
          //       transcription: transcriptionResult,
          //       translation: accumulatedText,
          //     }),
          //   );
          // }
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
  const test = async () => {
    const settings = store.getState().settings;
    const languages = settings.targetLanguages?.length > 0
      ? settings.targetLanguages
      : ["zh", "en", "ja", "ko"];
    const a = await translateByLocalTransformer({
      text: "今天天气怎么样",
      languages,
    });

    console.log(a);
  };

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
        {/* <button onClick={test}>test</button> */}
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
