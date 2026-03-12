import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export const openOtherWindow = async () => {
  // 1. 尝试获取已存在的窗口，如果存在则直接显示并聚焦
  // const existingWindow = WebviewWindow.getByLabel('my-new-window');

  // if (existingWindow) {
  //   await existingWindow.show();
  //   await existingWindow.setFocus();
  //   return;
  // }

  // 2. 如果不存在，则创建新窗口
  // 注意：WebviewWindow 构造函数不会立即返回窗口实例，因为窗口是异步创建的
  const webview = new WebviewWindow("my-new-window", {
    url: "/mix-sound-translate", // 对应 src/pages/second.html 或路由路径
    title: "我的新窗口",
    width: 800,
    height: 600,
    resizable: true,
    fullscreen: false,
  });
};
