declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export enum NATIVE_COMMAND {
  SEND_TO_VRC_CHAT = "send_to_vrc_chat",
  OPEN_EXTERNAL = "open_external",
  GET_LOCAL_SERVICE = "get_local_service",
}

interface CommandArgsMap {
  [NATIVE_COMMAND.SEND_TO_VRC_CHAT]: SEND_TO_VRC_CHAT_REQUEST;
  [NATIVE_COMMAND.OPEN_EXTERNAL]: OPEN_EXTERNAL_REQUEST;
  [NATIVE_COMMAND.GET_LOCAL_SERVICE]: undefined;
}

interface CommandReturnMap {
  [NATIVE_COMMAND.SEND_TO_VRC_CHAT]: undefined;
  [NATIVE_COMMAND.OPEN_EXTERNAL]: undefined;
  [NATIVE_COMMAND.GET_LOCAL_SERVICE]: LocalService | null;
}

interface SEND_TO_VRC_CHAT_REQUEST extends Record<string, string> {
  text: string;
}

interface OPEN_EXTERNAL_REQUEST extends Record<string, string> {
  url: string;
}

interface LocalService {
  host: string;
  port: number;
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
  if (!window.electronAPI) {
    return Promise.reject(new Error("Electron preload API is unavailable"));
  }

  return window.electronAPI[command](args);
}
