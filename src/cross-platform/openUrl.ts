import { RUNTIME, runtime } from "./environmentDetect";

/**
 * 在默认浏览器中打开URL
 */
export async function openUrl(url: string): Promise<void> {
  if (runtime === RUNTIME.TAURI) {
    const { openUrl: tauriOpenUrl } = await import("@tauri-apps/plugin-opener");
    return tauriOpenUrl(url);
  }

  if (runtime === RUNTIME.ELECTRON) {
    const electronAPI = (
      window as Window & {
        electronAPI?: { openExternal: (url: string) => Promise<void> };
      }
    ).electronAPI;
    if (electronAPI) {
      return electronAPI.openExternal(url);
    }
  }

  // Web环境fallback
  window.open(url, "_blank", "noopener,noreferrer");
}
