import { contextBridge, ipcRenderer } from "electron";

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld("electronAPI", {
  // 发送OSC消息到VRChat
  send_to_vrc_chat: (args: { text: string }): Promise<void> =>
    ipcRenderer.invoke("send_to_vrc_chat", args),

  upload_oss: (args: {
    region: string;
    endpoint: string;
    ak: string;
    sk: string;
    bucket: string;
  }): Promise<string> => ipcRenderer.invoke("upload_oss", args),
  // 打开外部URL
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke("open_external", url),
});
