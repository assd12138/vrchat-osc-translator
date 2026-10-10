import { Button, Input, TextField } from "@heroui/react";
import { MicVAD } from "@ricky0123/vad-web";
import { Microphone } from "decibri";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  processAudioRouter,
  translateRouter,
  translateStreamTranscript,
} from "@/api/commonRouter";
import { resolveModel } from "@/api/provider";
import {
  type StreamTranscriptionConfig,
  StreamTranslationProcessor,
  streamTranscription,
} from "@/api/stream";
import { SectionCard, SelectField } from "@/components/ui";
import { isStreamModelType } from "@/store/api-config";
import store from "@/store/store";
import { loadMicDevices } from "@/utils";
import { sendToVrcChat } from "@/utils/vrc-chat-queue";
import eventBus, { EventBusEvent } from "../../utils/event-bus";
import RecognitionStatus from "../RecognitionStatus";

export default function AudioPanel() {
  const { t } = useTranslation();
  const myVad = useRef<MicVAD>(null);
  const streamMic = useRef<Microphone | null>(null);
  const stopStreamTranscription = useRef<(() => void) | null>(null);
  const streamAbortController = useRef<AbortController | null>(null);
  const [streamTranslationProcessor] = useState(
    () =>
      new StreamTranslationProcessor({
        translate: translateStreamTranscript,
        onTranslation: sendToVrcChat,
      }),
  );
  // 是否正在录音
  const [recording, setRecording] = useState(false);
  // 是否正在说话
  const [speaking, setSpeaking] = useState(false);
  // 麦克风设备选择
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  // 选择的麦克风
  const [deviceId, setDeviceId] = useState<string>();

  const start = () => {
    if (myVad.current || streamMic.current || streamAbortController.current) {
      return;
    }
    const { apiConfig } = store.getState().settings;

    //  如果是流式的识别模型，使用stream采集
    if (apiConfig.translationMode === "transcribe-then-translate") {
      const resolvedConfig = resolveModel(apiConfig, "transcription");
      if (isStreamModelType(resolvedConfig.model.type)) {
        startStreamVoice({
          modelId: resolvedConfig.model.modelId,
          apiKey: resolvedConfig.provider.apiKey,
          baseURL: resolvedConfig.provider.baseURL,
          modelType: resolvedConfig.model.type,
        });
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
        model: "v6",
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

  const startStreamVoice = async (config: StreamTranscriptionConfig) => {
    const mic = new Microphone({
      sampleRate: 16000,
      channels: 1,
      dtype: "int16",
      device: deviceId,
      noiseSuppression: true,
      vad: "energy",
    });
    mic.on("speech", () => setSpeaking(true));
    mic.on("silence", () => setSpeaking(false));
    mic.on("end", () => setSpeaking(false));
    const abortController = new AbortController();
    streamAbortController.current = abortController;
    try {
      const stopStreaming = await streamTranscription({
        microphone: mic,
        config,
        onTranscript: (text) => {
          eventBus.emit(EventBusEvent.ADD_LOG, text);
          streamTranslationProcessor.push(text);
        },
        signal: abortController.signal,
      });
      streamMic.current = mic;
      stopStreamTranscription.current = stopStreaming;
      await mic.start();
      setRecording(true);
      eventBus.emit(EventBusEvent.ADD_LOG, t("开始语音识别"));
    } catch (error) {
      mic.stop();
      setSpeaking(false);
      stopStreamTranscription.current?.();
      stopStreamTranscription.current = null;
      streamMic.current = null;
      console.error(error);
    } finally {
      if (streamAbortController.current === abortController) {
        streamAbortController.current = null;
      }
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
    } else if (streamAbortController.current) {
      streamAbortController.current.abort();
      streamAbortController.current = null;
    } else {
      return;
    }
    setSpeaking(false);
    setRecording(false);
    eventBus.emit(EventBusEvent.ADD_LOG, t("停止语音识别"));
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
      const sendText = await translateRouter({
        text: manualText,
      });

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

  return (
    <>
      <SectionCard
        title={t("语音采集")}
        description={t("语音翻译并发送至VRChat")}
      >
        <div className="toolbar">
          <Button onPress={start}>{t("开始")}</Button>
          <Button variant="secondary" onPress={stop}>
            {t("停止")}
          </Button>
        </div>
        <SelectField
          label={t("麦克风")}
          value={deviceId ?? ""}
          onChange={setDeviceId}
          isDisabled={recording}
          placeholder={t("麦克风")}
          options={micDevices.map((device) => ({
            value: device.deviceId,
            label: device.label || t("麦克风"),
          }))}
        />
        <RecognitionStatus recognizing={recording} speaking={speaking} />
      </SectionCard>
      <SectionCard title={t("手动翻译")}>
        <TextField
          isDisabled={translating}
          value={manualText}
          onChange={setManualText}
        >
          <Input
            placeholder={t("输入文本手动翻译")}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing)
                handleManualTranslate();
            }}
          />
        </TextField>
        <div className="toolbar">
          <Button
            onPress={handleManualTranslate}
            isDisabled={translating || !manualText.trim()}
          >
            {translating ? t("翻译中...") : t("翻译发送")}
          </Button>
        </div>
      </SectionCard>
    </>
  );
}
