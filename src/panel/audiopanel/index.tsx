import { useRef, useState } from "react";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";
import { MicVAD } from "@ricky0123/vad-web";
import { encodeWAV } from "@ricky0123/vad-web/dist/utils";
import { translateByAudio } from "../../api/translate";
import { useAppSelector } from "../../store/hook";

export default function () {
  const template = useAppSelector((state) => state.settings.ai_template);
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
          setSpeaking(true);
        },
        onSpeechEnd: async (audio) => {
          const wavBuffer = encodeWAV(audio);
          const audioBlob = new Blob([wavBuffer], { type: "audio/wav" });
          const file = new File([audioBlob], "audio.wav", {
            type: audioBlob.type,
            lastModified: Date.now(),
          });
          const res = await translateByAudio({ file, template });
          console.log({ res });

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
  };
  const test = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*"; // 只接受音频文件
    input.multiple = false; // 单个文件

    // 文件选择回调
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      const file = files?.[0]!;

      console.log(file);
      const res = await translateByAudio({ file, template });
      console.log(res);
      
    };

    // 触发点击
    input.click();
  };

  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>🎙️ 语音识别控制</div>
      <div className={styles.buttongroup}>
        <button onClick={start} className={globalStyles.button}>
          🎤 开始
        </button>
        <button onClick={stop} className={globalStyles.button}>
          ⏹️ 停止
        </button>
        <button onClick={test} className={globalStyles.button}>
          📁 选择
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
          录音状态：
          <span>未录音</span>
        </span>
      </div>
    </div>
  );
}
