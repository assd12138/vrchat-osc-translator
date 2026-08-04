/** biome-ignore-all lint/suspicious/noExplicitAny: 对应的库暂未提供定义文件，所以允许any */
import { globalVariant } from "../../globalVariant";

const sherpa = require("sherpa-onnx");

export const initRecognizer = ({ modelPath }: { modelPath: string }) => {
  console.log({ modelPath, sherpa });
  try {
    const config = {
      featConfig: { sampleRate: 16000, featureDim: 80 },
      modelConfig: {
        transducer: {
          encoder: `${modelPath}/encoder-epoch-99-avg-1.onnx`,
          decoder: `${modelPath}/decoder-epoch-99-avg-1.onnx`,
          joiner: `${modelPath}/joiner-epoch-99-avg-1.onnx`,
        },
        tokens: `${modelPath}/tokens.txt`,
        numThreads: 2,
        provider: "cpu",
        modelType: "zipformer",
      },
    };
    const recognizer = new sherpa.createOnlineRecognizer(config);
    const stream = recognizer.createStream();

    globalVariant.recognizer = recognizer;
    globalVariant.stream = stream;
    return { recognizer, stream };
  } catch (error) {
    console.log(error);
  }
};

export const sendAudioBufferToSherpa = (chunk: Buffer): string | null => {
  const int16 = new Int16Array(
    chunk.buffer,
    chunk.byteOffset,
    chunk.length / 2,
  );
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }

  const { recognizer, stream } = globalVariant;
  if (!recognizer || !stream) {
    console.error("Recognizer or stream is not initialized.");
    return null;
  }

  stream.acceptWaveform(16000, float32);
  while (recognizer.isReady(stream)) {
    recognizer.decode(stream);
  }

  const text = recognizer.getResult(stream).text.trim();
  return text || null;
};

export const cleanRecognizer = ({
  recognizer,
  stream,
}: {
  recognizer: any;
  stream: any;
}) => {
  try {
    stream.free();
    recognizer.free();
  } catch (e) {
    console.error("[decibri] Error occurred while cleaning recognizer:", e);
  }
};
