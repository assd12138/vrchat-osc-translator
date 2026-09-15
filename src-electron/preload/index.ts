/** biome-ignore-all lint/suspicious/noExplicitAny: 通用代码，真正的调用部分类型需要在渲染端约束 */
import { contextBridge, ipcRenderer } from "electron";
import { camelToSnake } from "../shared/utils";

const ipcApi: Record<string, any> = {};
// 定义要暴露的 API 函数名列表 (驼峰式)
const apiFunctions = ["open_external", "send_to_vrc_chat", "get_local_service"];

// 动态生成 API 对象
apiFunctions.forEach((funcName) => {
  ipcApi[funcName] = async (...args: any) => {
    console.log(`[IPC Send] ${funcName}`, args);
    const channel = camelToSnake(funcName);
    const result = await ipcRenderer.invoke(channel, ...args);
    return result;
  };
});

contextBridge.exposeInMainWorld("electronAPI", ipcApi);
