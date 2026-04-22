import {
  AutoProcessor,
  env,
  Gemma4ForConditionalGeneration,
  load_image,
  type Message,
  type PreTrainedModel,
  type Processor,
  read_audio,
  type Tensor,
  TextStreamer,
} from "@huggingface/transformers";

const MODEL_ID = "onnx-community/gemma-4-E4B-it-ONNX";

const transformerRuntime: {
  loading: boolean;
  processor: Processor | null;
  model: PreTrainedModel | null;
} = {
  loading: false,
  processor: null,
  model: null,
};

/**
 * 检查模型是否已缓存
 */
export const checkModelCached = async (): Promise<boolean> => {
  try {
    const cache = await caches.open("transformers-cache");
    const cachedFiles = await cache.keys();
    return cachedFiles.some((req) => req.url.includes(MODEL_ID));
  } catch {
    return false;
  }
};

/**
 * 公共运行配置类型
 */
type CommonRunConfig = {
  messages: Message[];
  image?: unknown;
  audio?: Float32Array;
  onChunk?: (text: string) => void;
};

/**
 * 公共运行方法 - 执行模型推理
 */
const runModel = async (config: CommonRunConfig): Promise<string> => {
  if (!transformerRuntime.processor || !transformerRuntime.model) {
    throw new Error("模型未加载");
  }
  const processor = transformerRuntime.processor;
  const model = transformerRuntime.model;

  const prompt = processor.apply_chat_template(config.messages, {
    add_generation_prompt: true,
  });

  const inputs = await processor(prompt, config.image, config.audio, {
    add_special_tokens: true,
  });

  if (!processor.tokenizer) return "";

  const outputs = (await model.generate({
    ...inputs,
    max_new_tokens: 512,
    do_sample: false,
    streamer: new TextStreamer(processor.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: false,
      callback_function: config.onChunk
        ? (arg) => {
            if (arg === "<turn|>") {
              return;
            }
            config.onChunk?.(arg);
          }
        : (text: string) => console.log(text),
    }),
  })) as Tensor;

  const decoded = processor.batch_decode(
    outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true },
  );
  return decoded[0];
};

/**
 * 文本翻译
 * WebGPU 本地模型不支持 JSON Schema，使用提示词方式要求 JSON 输出
 */
export const translateByLocalTransformer = ({
  text,
  languages,
}: {
  text: string;
  languages: string[];
}): Promise<string> => {
  const langList = languages.join("/");
  const langKeys = languages.join(", ");
  const messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Translate the following text into ${langList} and return as JSON with keys: ${langKeys}. Only return the JSON object, no explanation.`,
        },
        {
          type: "text",
          text: text,
        },
      ],
    },
  ];
  return runModel({ messages });
};

/**
 * @deprecated 流式翻译已弃用，使用 translateByLocalTransformer 配合 JSON 输出
 * 此函数保留用于向后兼容，但不应在新实现中使用
 */
export const translateByLocalTransformerStream = (
  { text }: { text: string },
  onChunk: (text: string) => void,
): Promise<string> => {
  const messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "你是一个翻译专家，当用户让你翻译的时候，严格按照翻译格式输出，不要输出其他内容",
        },
        {
          type: "text",
          text: text,
        },
      ],
    },
  ];
  return runModel({ messages, onChunk });
};

/**
 * 语音转译 (Speech-to-Text)
 */
export const transcribeByLocalTransformer = async ({
  audioData,
}: {
  audioData: File | Blob;
}): Promise<string> => {
  const processor = transformerRuntime.processor;
  const model = transformerRuntime.model;
  if (!processor || !model) {
    throw new Error("模型未加载");
  }

  const messages = [
    {
      role: "user",
      content: [
        { type: "audio" },
        {
          type: "text",
          text: "Transcribe this audio.",
        },
      ],
    },
  ];

  const audioObjectURL = URL.createObjectURL(audioData);
  const audio = await read_audio(audioObjectURL, 16000);
  URL.revokeObjectURL(audioObjectURL);

  return runModel({ messages, audio });
};

/**
 * OCR识别
 */
export const ocrByLocalTransformer = async ({
  base64,
}: {
  base64: string;
}): Promise<string> => {
  const processor = transformerRuntime.processor;
  const model = transformerRuntime.model;
  if (!processor || !model) {
    throw new Error("模型未加载");
  }

  const messages = [
    {
      role: "user",
      content: [
        { type: "image" },
        {
          type: "text",
          text: "OCR this image and extract all text.",
        },
      ],
    },
  ];

  const byteString = atob(base64.split(",")[1] ?? base64);
  const mimeString =
    base64.split(",")[0]?.split(":")[1]?.split(";")[0] ?? "image/png";
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeString });
  const imageFile = new File([blob], "image.png", { type: mimeString });
  const imageObjectURL = URL.createObjectURL(imageFile);
  const image = await load_image(imageObjectURL);
  URL.revokeObjectURL(imageObjectURL);

  return runModel({ messages, image });
};

/**
 * @deprecated 流式 OCR 已弃用
 * 此函数保留用于向后兼容，但不应在新实现中使用
 */
export const ocrByLocalTransformerStream = async (
  { base64 }: { base64: string },
  onChunk: (text: string) => void,
): Promise<string> => {
  const processor = transformerRuntime.processor;
  const model = transformerRuntime.model;
  if (!processor || !model) {
    throw new Error("模型未加载");
  }

  const messages = [
    {
      role: "user",
      content: [
        { type: "image" },
        {
          type: "text",
          text: "OCR this image and extract all text.",
        },
      ],
    },
  ];

  const byteString = atob(base64.split(",")[1] ?? base64);
  const mimeString =
    base64.split(",")[0]?.split(":")[1]?.split(";")[0] ?? "image/png";
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeString });
  const imageFile = new File([blob], "image.png", { type: mimeString });
  const imageObjectURL = URL.createObjectURL(imageFile);
  const image = await load_image(imageObjectURL);
  URL.revokeObjectURL(imageObjectURL);

  return runModel({ messages, image, onChunk });
};

/**
 * 加载模型
 */
export const loadModel = async ({
  onProgress,
}: {
  onProgress: (percent: number) => void;
}) => {
  if (
    transformerRuntime.loading ||
    transformerRuntime.processor ||
    transformerRuntime.model
  )
    return;
  transformerRuntime.loading = true;
  if (navigator.language.includes("zh")) {
    env.remoteHost = "https://modelscope.cn/";
  }
  const processor = await AutoProcessor.from_pretrained(MODEL_ID);
  const model = await Gemma4ForConditionalGeneration.from_pretrained(MODEL_ID, {
    dtype: "q4f16",
    device: "webgpu",
    progress_callback: (info) => {
      // console.log(info);

      if (info.status === "progress_total") {
        onProgress(info.progress);
      }
    },
  });
  transformerRuntime.processor = processor;
  transformerRuntime.model = model;
  transformerRuntime.loading = false;
};
