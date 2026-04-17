import {
  AutoProcessor,
  env,
  Gemma4ForConditionalGeneration,
  load_image,
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
 * 文本翻译
 * @param text - 待翻译的文本
 * @returns 翻译结果
 */
export const translateByLocalTransformer = async ({
  text,
}: {
  text: string;
}): Promise<string> => {
  if (!transformerRuntime.processor || !transformerRuntime.model) {
    throw new Error("模型未加载");
  }
  const processor = transformerRuntime.processor;
  const model = transformerRuntime.model;
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
  const prompt = processor.apply_chat_template(messages, {
    add_generation_prompt: true,
  });
  const inputs = await processor(prompt, null, null, {
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
      callback_function: (text) => {
        console.log(text);
      },
    }),
  })) as Tensor;
  const decoded = processor.batch_decode(
    outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true },
  );
  return decoded[0];
};

/**
 * 语音转译 (Speech-to-Text)
 * @param audioData - 音频数据
 * @returns 转译文本
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
  const prompt = processor.apply_chat_template(messages, {
    add_generation_prompt: true,
  });
  const audioObjectURL = URL.createObjectURL(audioData);
  const audio = await read_audio(audioObjectURL, 16000);
  URL.revokeObjectURL(audioObjectURL);
  const inputs = await processor(prompt, null, audio, {
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
      callback_function: (text) => {
        console.log(text);
      },
    }),
  })) as Tensor;
  const decoded = processor.batch_decode(
    outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true },
  );
  return decoded[0];
};

/**
 * OCR识别
 * @param imageData - 图片数据 (可以是 URL、Base64 或 ImageData)
 * @returns 识别文本
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
  const prompt = processor.apply_chat_template(messages, {
    add_generation_prompt: true,
  });
  const byteString = atob(base64.split(",")[1] ?? base64);
  const mimeString = base64.split(",")[0]?.split(":")[1]?.split(";")[0] ?? "image/png";
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
  const inputs = await processor(prompt, image, null, {
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
      callback_function: (text) => {
        console.log(text);
      },
    }),
  })) as Tensor;
  const decoded = processor.batch_decode(
    outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true },
  );
  return decoded[0];
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
      if (info.status === "progress_total") {
        onProgress(info.progress);
      }
    },
  });
  transformerRuntime.processor = processor;
  transformerRuntime.model = model;
  transformerRuntime.loading = false;
};
