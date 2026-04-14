import { ipcMain } from "electron/main";
import type { IpcControllerMap } from "../../shared/ipc.types";
import { camelToKebab } from "../../shared/utils";
import * as appController from "./controllers/app.controller";

// 1. 将所有控制器放入一个数组，方便统一管理
const controllers: IpcControllerMap[] = [appController];

/**
 * 初始化并注册所有 IPC 路由
 */
export function initializeIpcRouter() {
  console.log("Initializing IPC Router...");
  controllers.forEach((controller) => {
    for (const functionName in controller) {
      if (typeof controller[functionName] === "function") {
        const handler = controller[functionName];
        // 3. 使用函数名生成 IPC 通道名
        const channel = camelToKebab(functionName);

        // 4. 统一注册到 ipcMain.handle，支持异步和返回值
        ipcMain.handle(channel, async (event, ...args) => {
          console.log(`[IPC Recv] ${channel}`, args);
          try {
            const result = await handler(event, ...args);
            // 5. 返回统一的成功格式
            return result;
          } catch (error) {
            if (!(error instanceof Error)) {
              return;
            }
            console.error(`[IPC Error] on channel ${channel}:`, error);
            // 6. 返回统一的错误格式
            return { success: false, error: { message: error.message } };
          }
        });
        console.log(`[IPC Route] Registered: ${channel}`);
      }
    }
  });
}
