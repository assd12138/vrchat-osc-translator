// tauri invoke
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { RUNTIME, runtime } from "./environmentDetect";

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __TAURI__?: unknown;
  }
}

export enum NATIVE_COMMAND {
  SEND_TO_VRC_CHAT = "send_to_vrc_chat",
  /** 仅electron */
  OPEN_EXTERNAL = "open_external",
}

// 命令参数类型映射
interface CommandArgsMap {
  [NATIVE_COMMAND.SEND_TO_VRC_CHAT]: SEND_TO_VRC_CHAT_REQUEST;
  [NATIVE_COMMAND.OPEN_EXTERNAL]: OPEN_EXTERNAL_REQUEST;
}

// 命令返回值类型映射
interface CommandReturnMap {
  [NATIVE_COMMAND.SEND_TO_VRC_CHAT]: undefined;
  [NATIVE_COMMAND.OPEN_EXTERNAL]: undefined;
}

interface SEND_TO_VRC_CHAT_REQUEST extends Record<string, string> {
  text: string;
}
interface OPEN_EXTERNAL_REQUEST extends Record<string, string> {
  url: string;
}

type ElectronAPI = {
  [K in NATIVE_COMMAND]: (
    arg: CommandArgsMap[K],
  ) => Promise<CommandReturnMap[K]>;
};

export default function invoke<T extends NATIVE_COMMAND>(
  command: T,
  args: CommandArgsMap[T],
): Promise<CommandReturnMap[T]> {
  if (runtime === RUNTIME.TAURI) {
    return tauriInvoke<CommandReturnMap[T]>(command, args);
  } else if (window.electronAPI) {
    return window.electronAPI[command](args);
  }
  // biome-ignore lint/suspicious/noExplicitAny: 无需处理的代码点
  return new Promise<any>(() => {
    return {};
  });
}
