// tauri
import { openUrl as tauriOpenUrl } from "@tauri-apps/plugin-opener";
export const openUrl = (url: string) => tauriOpenUrl(url);

// web
// export const openUrl = (url: string) => window.open(url, "_blank");