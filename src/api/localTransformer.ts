import {
  AutoProcessor,
  env,
  Gemma4ForConditionalGeneration,
  type PreTrainedModel,
  type Processor,
  read_audio,
  type Tensor,
  TextStreamer,
} from "@huggingface/transformers";

const transformerRuntime: {
  loading: boolean;
  processor: Processor | null;
  model: PreTrainedModel | null;
} = {
  loading: false,
  processor: null,
  model: null,
};

const _ask = async () => {
  if (!transformerRuntime.processor || !transformerRuntime.model) {
    throw new Error("模型未加载");
  }
  const processor = transformerRuntime.processor;
  const model = transformerRuntime.model;
  const messages = [
    {
      role: "user",
      content: [
        { type: "image" },
        { type: "audio" },
        {
          type: "text",
          text: "",
        },
      ],
    },
  ];
  const prompt = processor.apply_chat_template(messages, {
    // enable_thinking: false,
    add_generation_prompt: true,
  });
  const audio = await read_audio("http://127.0.0.1:5500/ww.wav", 16000);
  const inputs = await processor(prompt, null, audio, {
    add_special_tokens: true,
  });
  if (!processor.tokenizer) return;
  console.time("耗时");
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
  console.log(decoded[0]);
  console.timeEnd("耗时");
};

export const translateByLocalTransformer = async ({
  text,
}: {
  text: string;
}) => {
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
  if (!processor.tokenizer) return;
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
  env.remoteHost = "https://modelscope.cn/";
  const model_id = "onnx-community/gemma-4-E4B-it-ONNX";
  const processor = await AutoProcessor.from_pretrained(model_id);
  const model = await Gemma4ForConditionalGeneration.from_pretrained(model_id, {
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
