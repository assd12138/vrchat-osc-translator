import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/Sidebar";
import TitleBar from "@/components/TitleBar";
import OcrPanel from "@/panel/ocr-panel";
import SettingPanel from "@/panel/setting-panel";
import ProviderSettings from "@/panel/setting-panel/components/ProviderSettings";
import SpeechRecognitionPanel from "@/panel/speech-recognition-panel";
import SystemLog from "@/panel/system-log";
import { DEFAULT_PANEL_ORDER, PanelId } from "@/store/navigation";

const pages = {
  [PanelId.SpeechRecognition]: {
    title: "语音识别",
    Component: SpeechRecognitionPanel,
  },
  [PanelId.Settings]: {
    title: "系统配置",
    Component: SettingPanel,
  },
  [PanelId.Providers]: {
    title: "供应商设置",
    Component: ProviderSettings,
  },
  [PanelId.Ocr]: {
    title: "图片翻译",
    Component: OcrPanel,
  },
  [PanelId.SystemLog]: {
    title: "系统日志",
    Component: SystemLog,
  },
} as const;

const navigationItems = DEFAULT_PANEL_ORDER.map((id) => ({
  id,
  title: pages[id].title,
}));

// Switching pages changes visibility without rerendering or remounting their content.
const PageContent = memo(function PageContent({ id }: { id: PanelId }) {
  const { Component } = pages[id];
  return <Component />;
});

export default function Root() {
  const { t } = useTranslation();
  const [active, setActive] = useState<PanelId>(PanelId.SpeechRecognition);
  return (
    <div className="app-shell">
      <TitleBar title={t(pages[active].title)} />
      <Sidebar active={active} items={navigationItems} onSelect={setActive} />
      <main className="workspace">
        {/* Fixed keys and unconditional mounting keep capture sessions and local state alive. */}
        {DEFAULT_PANEL_ORDER.map((id) => {
          return (
            <section
              key={id}
              id={`page-${id}`}
              className={`workspace-page${id === PanelId.Settings ? " settings-page" : ""}`}
              style={{ display: active === id ? "flex" : "none" }}
              aria-label={t(pages[id].title)}
            >
              <PageContent id={id} />
            </section>
          );
        })}
      </main>
    </div>
  );
}
