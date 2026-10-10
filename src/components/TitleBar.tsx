import { Button } from "@heroui/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import invoke, { NATIVE_COMMAND } from "@/electron/ipc";
import type {
  WindowAction,
  WindowState,
} from "../../src-electron/shared/window.types";
import AppIcon from "./AppIcon";
import Icon from "./Icon";

export default function TitleBar({ title }: { title: string }) {
  const { t } = useTranslation();
  const [state, setState] = useState<WindowState>({
    platform: navigator.platform.toLowerCase().includes("mac")
      ? "darwin"
      : "browser",
    maximized: false,
  });
  useEffect(() => {
    if (!window.electronAPI) return;
    let mounted = true;
    const unsubscribe = window.electronAPI.onWindowState(setState);
    invoke(NATIVE_COMMAND.GET_WINDOW_STATE, undefined).then((value) => {
      if (mounted && typeof value?.platform === "string") setState(value);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);
  const control = (action: WindowAction) =>
    invoke(NATIVE_COMMAND.CONTROL_WINDOW, { action });
  return (
    <header
      className={`titlebar ${state.platform === "darwin" ? "titlebar-mac" : ""}`}
    >
      <div className="titlebar-brand">
        <span className="brand-mark">
          <AppIcon />
        </span>
        <span>Translator</span>
      </div>
      <div className="titlebar-main">
        <h1>{title}</h1>
        {window.electronAPI && state.platform !== "darwin" && (
          <div className="window-controls">
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={t("最小化")}
              onPress={() => control("minimize")}
            >
              <Icon name="minimize" />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={t(state.maximized ? "还原窗口" : "最大化")}
              onPress={() => control("toggle-maximize")}
            >
              <Icon name={state.maximized ? "restore" : "maximize"} />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              className="window-close"
              aria-label={t("关闭")}
              onPress={() => control("close")}
            >
              <Icon name="close" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
