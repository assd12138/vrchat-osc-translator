import { useLayoutEffect } from "react";
import Audiopanel from "@/panel/audio-panel";
import Ocrpanel from "@/panel/ocr-panel";
import Settingpanel from "@/panel/setting-panel";
import Systemlog from "@/panel/system-log";
import Translationpanel from "@/panel/translation-panel";
import { useAppSelector } from "@/store/hook";

export default function Root() {
  const theme = useAppSelector((state) => state.settings.theme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="container">
      <Audiopanel />
      <Translationpanel />
      <Settingpanel />
      <Systemlog />
      <Ocrpanel />
    </div>
  );
}
