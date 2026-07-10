import Audiopanel from "@/panel/audio-panel";
import Ocrpanel from "@/panel/ocr-panel";
import Settingpanel from "@/panel/setting-panel";
import Systemlog from "@/panel/system-log";
import Translationpanel from "@/panel/translation-panel";

export default function Root() {
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
