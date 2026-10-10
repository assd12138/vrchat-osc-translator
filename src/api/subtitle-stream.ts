import { isStreamModelType } from "@/store/api-config";
import store from "@/store/store";
import type { SubtitleAudioChunk } from "@/utils/display-audio";
import { translateSubtitleText } from "./commonRouter";
import { resolveModel } from "./provider";
import {
  type PcmAudioData,
  StreamTranslationProcessor,
  streamPcmTranscription,
} from "./stream";

const MAX_INITIAL_AUDIO_CHUNKS = 20;

export interface SubtitleRecognitionSession {
  connect: () => Promise<void>;
  pushAudio: (chunk: SubtitleAudioChunk) => void;
}

/** 每次开始使用独立的转写连接和翻译队列，配置在开始时确定。 */
export function createSubtitleRecognitionSession(
  signal: AbortSignal,
): SubtitleRecognitionSession {
  const { apiConfig } = store.getState().settings;
  const transcription = resolveModel(apiConfig, "subtitleTranscription");
  const translation = resolveModel(apiConfig, "subtitleTranslation");
  const targetLanguage = apiConfig.subtitleTargetLanguage;
  const modelType = transcription.model.type;
  if (!isStreamModelType(modelType)) {
    throw new Error("Subtitle transcription requires a streaming model");
  }

  let stopped = false;
  let audioListener: ((chunk: PcmAudioData) => void) | null = null;
  let initialAudio: ArrayBuffer[] = [];
  const translationProcessor = new StreamTranslationProcessor({
    translate: (text, requestSignal) =>
      translateSubtitleText(translation, text, targetLanguage, requestSignal),
    onTranslation: (translatedText, originalText) => {
      console.log("[字幕翻译]", {
        transcription: originalText,
        translation: translatedText,
        targetLanguage,
      });
    },
  });

  const stop = () => {
    if (stopped) return;
    stopped = true;
    initialAudio = [];
    audioListener = null;
    translationProcessor.stop();
    signal.removeEventListener("abort", stop);
  };
  // 外层通过同一信号停止采集和转写；这里仅清理会话自身的缓冲和翻译队列。
  if (signal.aborted) stop();
  else signal.addEventListener("abort", stop, { once: true });

  return {
    connect: async () => {
      if (stopped) throw new DOMException("Aborted", "AbortError");
      await streamPcmTranscription({
        config: {
          modelId: transcription.model.modelId,
          apiKey: transcription.provider.apiKey,
          baseURL: transcription.provider.baseURL,
          modelType,
        },
        signal,
        subscribeAudio: (listener) => {
          audioListener = listener;
          const bufferedAudio = initialAudio;
          initialAudio = [];
          for (const pcm of bufferedAudio) listener(pcm);
          return () => {
            audioListener = null;
          };
        },
        onTranscript: (text) => {
          if (stopped) return;
          console.log("[字幕转写]", text);
          translationProcessor.push(text);
        },
      });
      if (stopped) {
        throw new DOMException("Aborted", "AbortError");
      }
    },
    pushAudio: (chunk) => {
      if (stopped) return;
      if (
        chunk.sampleRate !== 16000 ||
        chunk.channels !== 1 ||
        chunk.format !== "pcm_s16le"
      ) {
        throw new Error("Subtitle transcription requires 16 kHz mono PCM16 audio");
      }
      if (audioListener) audioListener(chunk.pcm);
      else {
        // 连接初始化期间最多暂存两秒音频，避免第一句话丢失或无限积压。
        initialAudio.push(chunk.pcm);
        if (initialAudio.length > MAX_INITIAL_AUDIO_CHUNKS) {
          initialAudio.shift();
        }
      }
    },
  };
}
