/** biome-ignore-all lint/suspicious/noExplicitAny: 统一格式，真正重要的接口定义在渲染端定义 */
import type { IpcMainInvokeEvent } from "electron/main";

export type IpcHandlerFunction = (
  event: IpcMainInvokeEvent,
  ...args: any[]
) => Promise<any> | any;

export type IpcControllerMap = Record<string, IpcHandlerFunction>;
