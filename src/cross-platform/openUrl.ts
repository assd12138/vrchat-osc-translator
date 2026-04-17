import { openUrl as tauriOpenUrl } from "@tauri-apps/plugin-opener";
import { RUNTIME, runtime } from "./environmentDetect";

/**
 * 在默认浏览器中打开URL
 */
export function openUrl(url: string) {
  if (runtime === RUNTIME.TAURI) {
    return tauriOpenUrl(url);
  }

  if (runtime === RUNTIME.ELECTRON) {
    const electronAPI = window.electronAPI;
    if (electronAPI) {
      return electronAPI.open_external({ url });
    }
  }

  // Web环境fallback
  window.open(url, "_blank", "noopener,noreferrer");
}
