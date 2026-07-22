/** biome-ignore-all lint/suspicious/noExplicitAny: 选择器 preload 仅使用最小化类型 */
import { contextBridge, ipcRenderer } from "electron";

// 选择器窗口的专用 preload。
// 由于 contextIsolation + sandbox 默认开启，选择器渲染进程无法直接访问
// ipcRenderer，必须通过此 preload 暴露的最小 API 进行通信。
contextBridge.exposeInMainWorld("pickerAPI", {
  onSources: (cb: (data: any[]) => void) => {
    const handler = (_e: unknown, data: any[]) => cb(data);
    ipcRenderer.on("screen-picker:sources", handler);
    return () => ipcRenderer.removeListener("screen-picker:sources", handler);
  },
  select: (id: string) => ipcRenderer.send("screen-picker:select", id),
  cancel: () => ipcRenderer.send("screen-picker:cancel"),
});
