/** biome-ignore-all lint/suspicious/noExplicitAny: 通用代码，真正的调用部分类型需要在渲染端约束 */
import { contextBridge, ipcRenderer } from "electron";
import { camelToSnake } from "../shared/utils";

const ipcApi: Record<string, any> = {};
const ipcPostApi: Record<string, any> = {};
// 定义要暴露的 API 函数名列表 (驼峰式)
const apiFunctions = [
  "open_external",
  "send_to_vrc_chat",
  "init_sherpa_transcription",
];

// 动态生成 API 对象
apiFunctions.forEach((funcName) => {
  ipcApi[funcName] = async (...args: any) => {
    console.log(`[IPC Send] ${funcName}`, args);
    const channel = camelToSnake(funcName);
    const result = await ipcRenderer.invoke(channel, ...args);
    return result;
  };
});

const sendVoiceToSherpaPort: {
  port1: MessagePort | null;
  port2: MessagePort | null;
} = {
  port1: null,
  port2: null,
};
ipcPostApi.sendVoiceToSherpa = (data: Buffer) => {
  // 初始化port
  if (!sendVoiceToSherpaPort.port1 || !sendVoiceToSherpaPort.port2) {
    const { port1, port2 } = new MessageChannel();
    sendVoiceToSherpaPort.port1 = port1;
    sendVoiceToSherpaPort.port2 = port2;
    ipcRenderer.postMessage("init_sherpa_recognize_port", null, [port1]);
  }
  sendVoiceToSherpaPort.port2?.postMessage(data);
};

contextBridge.exposeInMainWorld("electronAPI", ipcApi);
contextBridge.exposeInMainWorld("electronPostAPI", ipcPostApi);
