import { useRef, useState } from "react";
// import { useTranslation } from "react-i18next";
import {
	pushChunk,
	startTranscriptSession,
	streamFinish,
} from "@/api/streamtranslate";
import { concatFloat32, resampleLinear } from "@/utils";
// import { useAppDispatch, useAppSelector } from "../../store/hook";
import globalStyles from "../../styles/index.module.css";

const CHUNK_MS = 500;
const TARGET_SR = 16000;

export default function StreamTranlatePanel() {
	// const settings = useAppSelector((state) => state.settings);
	// const dispatch = useAppDispatch();
	const [transcriptText, setTranscriptText] = useState("");
	const [translationText, _setTranslationText] = useState("");
	const [detectLanguage, setDetectLanguage] = useState("-");
	const [status, setStatus] = useState("");

	const audioControlRef = useRef<{
		buf?: Float32Array<ArrayBuffer>;
		mediaStream?: MediaStream;
		audioCtx?: AudioContext;
		processor?: ScriptProcessorNode;
		source?: MediaStreamAudioSourceNode;
	}>({
		buf: undefined,
		mediaStream: undefined,
		audioCtx: undefined,
		processor: undefined,
		source: undefined,
	});

	const audioStateRef = useRef<{
		sessionId: string;
		running: boolean;
		pushing: boolean;
	}>({
		sessionId: "",
		running: false,
		pushing: false,
	});

	// const { t } = useTranslation();

	const pump = async () => {
		const audioState = audioStateRef.current;
		const audioControl = audioControlRef.current;
		const running = audioState.running;
		if (audioState.pushing) return;
		audioState.pushing = true;

		const chunkSamples = Math.round(TARGET_SR * (CHUNK_MS / 1000));

		try {
			if (!audioControl.buf) return;
			const buf = audioControl.buf;
			while (audioState.running && buf.length >= chunkSamples) {
				const chunk = buf.slice(0, chunkSamples);
				audioControl.buf = buf.slice(chunkSamples);

				const j = await pushChunk({
					sessionId: audioState.sessionId,
					float32_16k: chunk,
				});
				setTranscriptText(j.text || "");
				setDetectLanguage(j.language || "-");
				if (running) setStatus("Listening… / 识别中…");
			}
		} catch (err) {
			if (!(err instanceof Error)) return;
			console.error(err);
			if (running) setStatus(`Backend error / 后端错误: ${err.message}`);
		} finally {
			audioState.pushing = false;
		}
	};

	const stopAudioPipeline = async () => {
		const control = audioControlRef.current;
		try {
			if (control.processor) {
				control.processor.disconnect();
				control.processor.onaudioprocess = null;
			}
			if (control.source) control.source.disconnect();
			if (control.audioCtx) await control.audioCtx.close();
			if (control.mediaStream)
				control.mediaStream.getTracks().forEach((t) => {
					t.stop();
				});
		} catch (e) {
			console.log(e);
		}
		control.processor = undefined;
		control.source = undefined;
		control.audioCtx = undefined;
		control.mediaStream = undefined;
	};

	const start = async () => {
		const audioControl = audioControlRef.current;
		const audioState = audioStateRef.current;
		if (audioState.running) return;

		audioControl.buf = new Float32Array(0);

		try {
			audioState.sessionId = await startTranscriptSession();

			audioControl.mediaStream = await navigator.mediaDevices.getUserMedia({
				audio: {
					channelCount: 1,
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
				video: false,
			});

			audioControl.audioCtx = new AudioContext();
			audioControl.source = audioControl.audioCtx.createMediaStreamSource(
				audioControl.mediaStream,
			);

			audioControl.processor = audioControl.audioCtx.createScriptProcessor(
				4096,
				1,
				1,
			);
			// const chunkSamples = Math.round(TARGET_SR * (CHUNK_MS / 1000))

			audioControl.processor.onaudioprocess = (e) => {
				if (!audioState.running || !audioControl.audioCtx || !audioControl.buf)
					return;
				const input = e.inputBuffer.getChannelData(0);
				const resampled = resampleLinear(
					input,
					audioControl.audioCtx.sampleRate,
					TARGET_SR,
				);
				audioControl.buf = concatFloat32(audioControl.buf, resampled);
				if (!audioState.pushing) pump();
			};

			audioControl.source.connect(audioControl.processor);
			audioControl.processor.connect(audioControl.audioCtx.destination);

			audioState.running = true;
			setStatus("Listening… / 识别中…");
		} catch (e) {
			if (!(e instanceof Error)) return;
			console.log(e);
			setStatus(`Start failed / 启动失败: ${e.message}`);
			audioState.running = false;
			audioState.sessionId = "";
			await stopAudioPipeline();
		}
	};

	const stop = async () => {
		const audioState = audioStateRef.current;
		const sessionId = audioState.sessionId;
		if (!audioState.running) return;

		audioState.running = false;
		setStatus("Finishing… / 收尾中…");

		await stopAudioPipeline();

		try {
			if (sessionId) {
				const j = await streamFinish(sessionId);
				setDetectLanguage(j.language || "-");
				setTranscriptText(j.text || "");
			}
			setStatus("Stopped / 已停止");
		} catch (err) {
			if (!(err instanceof Error)) return;
			console.error(err);
			setStatus(`Finish failed / 收尾失败: ${err.message}`);
		} finally {
			audioState.sessionId = "";
			audioControlRef.current.buf = new Float32Array(0);
			audioState.pushing = false;
		}
	};

	return (
		<div className={globalStyles.panel}>
			<div className={globalStyles.title}>💧 流式转译&nbsp;</div>
			<button onClick={start}>开始</button>
			<button onClick={stop}>停止</button>
			<div>状态：{status}</div>
			<div>语言：{detectLanguage}</div>
			<div>
				<textarea
					style={{ width: "100%", height: "200px" }}
					value={transcriptText}
				></textarea>
				<textarea
					style={{ width: "100%", height: "200px" }}
					value={translationText}
				></textarea>
			</div>
		</div>
	);
}
