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
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import invoke, { NATIVE_COMMAND } from "@/cross-platform/invoke";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";

export default function FileSharePanel() {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [per, setPer] = useState("");
  const [question, setQuestion] = useState("");
  const processorRef = useRef<Processor | null>(null);
  const modelRef = useRef<PreTrainedModel | null>(null);

  const handleFileUpload = async () => {
    const file = await invoke(NATIVE_COMMAND.UPLOAD_OSS, {
      region: import.meta.env.VITE_DEFAULT_S3_REGION,
      endpoint: import.meta.env.VITE_DEFAULT_S3_ENDPOINT,
      ak: import.meta.env.VITE_DEFAULT_S3_ACCESS_KEY,
      sk: import.meta.env.VITE_DEFAULT_S3_SECRET_KEY,
      bucket: import.meta.env.VITE_DEFAULT_S3_BUCKET,
    });
    const externalLink = `${import.meta.env.VITE_DEFAULT_S3_URL}/${file}`;
    setUrl(externalLink);
  };

  const copy = () => {
    navigator.clipboard.writeText(url);
  };
  const ask = async () => {
    if (!processorRef.current || !modelRef.current) {
      setUrl("先点击加载模型");
      return;
    }
    setUrl("");
    const processor = processorRef.current;
    const model = modelRef.current;
    const messages = [
      {
        role: "user",
        content: [
          { type: "image" },
          { type: "audio" },
          {
            type: "text",
            text: question,
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
          // setPer(text);
          setUrl((u) => u + text);
        },
      }),
    })) as Tensor;
    const decoded = processor.batch_decode(
      outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
      { skip_special_tokens: true },
    );
    setUrl(decoded[0]);
    console.log(decoded[0]);
    console.timeEnd("耗时");
  };
  const loading = useRef(false);

  const load = async () => {
    if (loading.current || processorRef.current || modelRef.current) return;
    loading.current = true;
    console.log(123);
    env.remoteHost = "https://modelscope.cn/";
    const model_id = "onnx-community/gemma-4-E2B-it-ONNX";
    const processor = await AutoProcessor.from_pretrained(model_id);
    const model = await Gemma4ForConditionalGeneration.from_pretrained(
      model_id,
      {
        dtype: "q4f16",
        device: "webgpu",
        progress_callback: (info) => {
          if (info.status === "progress_total") {
            setPer(`Loading model: ${info.progress}%`);
            // console.log(`Loading model: ${info.progress}%`);
          }
        },
      },
    );
    processorRef.current = processor;
    modelRef.current = model;
  };

  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>
        onnx-community/gemma-4-E2B-it-ONNX
      </div>
      <div className={styles.btnCon}>
        {/* <button onClick={handleFileUpload} className={globalStyles.button}>
          {t("文件上传")}
        </button>
        <button onClick={copy} className={globalStyles.button}>
          {t("复制")}
        </button> */}
        <button onClick={load} className={globalStyles.button}>
          加载模型
        </button>
        <button onClick={ask} className={globalStyles.button}>
          提问
        </button>
      </div>
      <div>
        <div>{per}</div>
        <input
          placeholder="输入问题"
          className={globalStyles.inputS}
          type="text"
          onChange={(e) => setQuestion(e.target.value)}
        />
        <textarea style={{ height: "300px", width: "100%" }} value={url} />
      </div>
    </div>
  );
}
