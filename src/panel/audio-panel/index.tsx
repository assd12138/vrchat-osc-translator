import { MicVAD } from "@ricky0123/vad-web";
import { encodeWAV } from "@ricky0123/vad-web/dist/utils";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadMicDevices } from "@/utils";
import { transcriptionAudio, translateByAI, translateByAIStream } from "../../api/translate";
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

          // 流式翻译
          const translationRes = await translateByAI({
            text: ask,
            token: settings.openai_token,
            api: settings.openai_api_url,
            model: settings.openai_model,
            assignObj: {
              max_tokens: 500,
              stream: true,
            },
          });

          // 处理流式响应
          const reader = translationRes.body?.getReader();
          if (!reader) {

            return;
          }

          let fullTranslation = "";
          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              // 解析 SSE 格式的数据行
              const lines = chunk.split("\n");
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const dataStr = line.slice(6);
                  if (dataStr === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) {
                      fullTranslation += delta;
                      console.log('翻译', fullTranslation);

                      // 实时发送到 VRChat
                      invoke("send_to_vrc_chat", {
                        text: fullTranslation,
                      });
                    }
                  } catch {
                    // 跳过无法解析的行
                  }
                }
              }
            }

            // 完成后添加日志
            eventBus.emit(
              EventBusEvent.ADD_LOG,
              t("识别成功", {
                transcription: transcriptionRes.text,
                translation: fullTranslation,
              }),
            );
          } catch (error) {
            console.error("流式翻译错误:", error);
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

  const test = async () => {
    const ask = settings.ai_template.replace(
      "{text}",
      `I used to work for Lotus, supporting 1-2-3.
Mucking around with autoexec.bat, config.sys, emm386 etc to get 1-2-3 to load was fun. Lots of TSRs using up memory. The amount of times I had to tell people to create a "clean config" by commenting out most of autoexec.bat...

We also had to post people floppy disks with the correct printer driver on. No downloads in those days.

"What would a piece of software have to do today to make you cheer and applaud upon seeing a demo?"

I was at LotusSphere when Lotus Notes 4 was announced and demo-ed. That got a standing ovation.
`,
    );
    console.log(ask);


    // 流式翻译
    const translationRes = await translateByAIStream({
      text: ask,
      token: settings.openai_token,
      api: settings.openai_api_url,
      model: settings.openai_model,
      assignObj: {
        max_tokens: 500
      },
    });
    console.log('bbbb');


    // 处理流式响应
    const reader = translationRes.body?.getReader();
    if (!reader) {

      return;
    }

    let fullTranslation = "";
    const decoder = new TextDecoder();


    console.log('aaa');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // 解析 SSE 格式的数据行
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6);
          if (dataStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullTranslation += delta;
              console.log('翻译', fullTranslation);

              // 实时发送到 VRChat
              invoke("send_to_vrc_chat", {
                text: fullTranslation,
              });
            }
          } catch {
            // 跳过无法解析的行
          }
        }
      }
    }

  }

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
        <button onClick={test} className={globalStyles.button}>
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
