export enum RUNTIME {
  WEB,
  TAURI,
  ELECTRON,
}
export const getRuntime = () => {
  if ("__TAURI_INTERNALS__" in window) {
    return RUNTIME.TAURI;
  } else if ("ElectronApi" in window) {
    return RUNTIME.ELECTRON;
  } else {
    return RUNTIME.WEB;
  }
};

export const runtime = getRuntime();
