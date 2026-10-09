/** biome-ignore-all lint/suspicious/noExplicitAny: 通用代码，真正的调用部分类型需要在渲染端约束 */
import { contextBridge, type IpcRendererEvent, ipcRenderer } from "electron";
import { camelToSnake } from "../shared/utils";

const ipcApi: Record<string, any> = {};
// 定义要暴露的 API 函数名列表 (驼峰式)
const apiFunctions = [
  "open_external",
  "send_to_vrc_chat",
  "get_local_service",
  "open_subtitle_window",
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

// 缓存最近的悬浮状态，组件在通知之后挂载时也能拿到当前状态。
let subtitleHovered = false;
ipcRenderer.on("subtitle-window:hover", (_event, hovered: boolean) => {
  subtitleHovered = hovered;
});
ipcApi.onSubtitleHover = (callback: (hovered: boolean) => void) => {
  const listener = (_event: IpcRendererEvent, hovered: boolean) => {
    callback(hovered);
  };
  ipcRenderer.on("subtitle-window:hover", listener);
  callback(subtitleHovered);
  return () => {
    ipcRenderer.removeListener("subtitle-window:hover", listener);
  };
};

ipcApi.startSubtitleDrag = () => {
  ipcRenderer.send("subtitle-window:drag-start");
};
ipcApi.startSubtitleResize = (edge: string) => {
  ipcRenderer.send("subtitle-window:resize-start", edge);
};
ipcApi.stopSubtitleInteraction = () => {
  ipcRenderer.send("subtitle-window:interaction-stop");
};

contextBridge.exposeInMainWorld("electronAPI", ipcApi);
