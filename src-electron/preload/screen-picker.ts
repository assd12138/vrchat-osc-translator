import { contextBridge, ipcRenderer } from "electron";
import type {
  ScreenPickerData,
  ScreenPickerSelection,
} from "../shared/screen-picker.types";

// 选择器窗口的专用 preload。
// 由于 contextIsolation + sandbox 默认开启，选择器渲染进程无法直接访问
// ipcRenderer，必须通过此 preload 暴露的最小 API 进行通信。
contextBridge.exposeInMainWorld("pickerAPI", {
  onSources: (cb: (data: ScreenPickerData) => void) => {
    const handler = (_e: unknown, data: ScreenPickerData) => cb(data);
    ipcRenderer.on("screen-picker:sources", handler);
    return () => ipcRenderer.removeListener("screen-picker:sources", handler);
  },
  select: (selection: ScreenPickerSelection) =>
    ipcRenderer.send("screen-picker:select", selection),
  cancel: () => ipcRenderer.send("screen-picker:cancel"),
});
