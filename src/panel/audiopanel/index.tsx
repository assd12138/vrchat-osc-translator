import { useRef, useState } from "react";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";
import { MicVAD } from "@ricky0123/vad-web";
import { encodeWAV } from "@ricky0123/vad-web/dist/utils";
import { translateByAI, translateByAudio } from "../../api/translate";
import { useAppSelector } from "../../store/hook";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";

export default function () {
  const { t } = useTranslation();
  const settings = useAppSelector((state) => state.settings);
  const myVad = useRef<MicVAD>(null);
  // 是否正在录音
  const [recording, setRecording] = useState(false);
  // 是否正在说话
  const [speaking, setSpeaking] = useState(false);

  const start = async () => {
    try {
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
        onSpeechEnd: async (audio) => {
          console.log("停止说话");

          const wavBuffer = encodeWAV(audio);
          const audioBlob = new Blob([wavBuffer], { type: "audio/wav" });
          const file = new File([audioBlob], "audio.wav", {
            type: audioBlob.type,
            lastModified: Date.now(),
          });
          const res = await translateByAudio({ file });
          const ask = settings.ai_template.replace("{text}", res.text);
          const translateRes = await translateByAI({
            token: settings.openai_token,
            text: ask,
            api: settings.openai_api_url,
            model: settings.openai_model,
          });
          invoke("send_to_vrc_chat", {
            text: translateRes.choices[0].message.content,
          });
          setSpeaking(false);
        },
      });
      vad.start();
      myVad.current = vad;
      setRecording(true);
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
  };

  const refresh = () => {
    window.location.reload()
  };

  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>🎙️ {t('语音识别控制')}</div>
      <div className={styles.buttongroup}>
        <button onClick={start} className={globalStyles.button}>
          🎤 {t('开始')}
        </button>
        <button onClick={stop} className={globalStyles.button}>
          ⏹️ {t('停止')}
        </button>
        <button onClick={refresh} className={globalStyles.button}>
          🔄️ {t('刷新')}
        </button>
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
          {t('录音状态')}：
          <span>{!recording ? t('未录音') : speaking ? t('说话中') : t('无声音')}</span>
        </span>
      </div>
    </div>
  );
}
