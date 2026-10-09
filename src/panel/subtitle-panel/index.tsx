import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import type { SubtitleResizeEdge } from "@/electron/ipc";
import lockIcon from "@/images/lock.svg";
import unlockIcon from "@/images/unlock.svg";
import { useAppSelector } from "@/store/hook";
import styles from "./index.module.css";
import StyleControls from "./StyleControls";
import TransparencyControl from "./TransparencyControl";

const RESIZE_EDGES: SubtitleResizeEdge[] = [
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
  "nw",
];
const RESIZE_CURSORS: Record<SubtitleResizeEdge, string> = {
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
  nw: "nwse-resize",
};

export default function SubtitlePanel() {
  const { t } = useTranslation();
  const config = useAppSelector((state) => state.settings.subtitleConfig);
  const [hovered, setHovered] = useState(false);
  const [locked, setLocked] = useState(false);
  const [transparencyOpen, setTransparencyOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<SubtitleResizeEdge | null>(null);
  const originalRegionRef = useRef<HTMLDivElement>(null);
  const translatedRegionRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.subtitleWindow;
    root.dataset.subtitleWindow = "true";
    return () => {
      if (previous === undefined) delete root.dataset.subtitleWindow;
      else root.dataset.subtitleWindow = previous;
    };
  }, []);

  useLayoutEffect(() => {
    const original = originalRegionRef.current;
    const translated = translatedRegionRef.current;
    if (!original || !translated) return;

    const regions = [original, translated];
    const scrollToLatest = () => {
      for (const region of regions) {
        region.scrollTop = region.scrollHeight;
      }
    };
    // 区域缩放、字号变化或文字更新后，两块区域各自保持显示内容末尾。
    const resizeObserver = new ResizeObserver(scrollToLatest);
    const mutationObserver = new MutationObserver(scrollToLatest);
    for (const region of regions) {
      resizeObserver.observe(region);
      if (region.firstElementChild) {
        resizeObserver.observe(region.firstElementChild);
      }
      mutationObserver.observe(region, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    scrollToLatest();
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  useEffect(() => window.electronAPI?.onSubtitleHover(setHovered), []);

  useEffect(() => {
    const stop = () => {
      setDragging(false);
      setResizing(null);
      window.electronAPI?.stopSubtitleInteraction();
    };
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("blur", stop);
      window.electronAPI?.stopSubtitleInteraction();
    };
  }, []);

  const stopInteraction = () => {
    setDragging(false);
    setResizing(null);
    window.electronAPI?.stopSubtitleInteraction();
  };

  const alpha = Math.round(
    (hovered && !transparencyOpen ? 0.7 : config.backgroundOpacity) * 255,
  )
    .toString(16)
    .padStart(2, "0");
  const style = {
    "--subtitle-background": `${config.backgroundColor}${alpha}`,
    "--subtitle-original-color": config.originalColor,
    "--subtitle-original-font-size": `${config.originalFontSize}px`,
    "--subtitle-original-font-weight": config.originalFontWeight,
    "--subtitle-translated-color": config.translatedColor,
    "--subtitle-translated-font-size": `${config.translatedFontSize}px`,
    "--subtitle-translated-font-weight": config.translatedFontWeight,
    "--subtitle-cursor": resizing ? RESIZE_CURSORS[resizing] : "grab",
  } as CSSProperties;

  return (
    <main
      className={styles.subtitle}
      style={style}
      data-hovered={hovered}
      data-locked={locked}
      data-dragging={dragging}
      aria-label={t("字幕弹窗")}
      onPointerDown={(event) => {
        if (
          event.button !== 0 ||
          !event.isPrimary ||
          (event.target as Element).closest(
            "button, input, label, [data-subtitle-controls]",
          ) ||
          !window.electronAPI
        ) {
          return;
        }
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const edge = (event.target as Element)
          .closest("[data-resize-edge]")
          ?.getAttribute("data-resize-edge") as SubtitleResizeEdge | undefined;
        if (edge && RESIZE_EDGES.includes(edge)) {
          window.electronAPI.startSubtitleResize(edge);
          setDragging(false);
          setResizing(edge);
        } else {
          window.electronAPI.startSubtitleDrag();
          setResizing(null);
          setDragging(true);
        }
      }}
      onPointerUp={(event) => {
        stopInteraction();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={stopInteraction}
      onLostPointerCapture={stopInteraction}
    >
      <div className={styles.textRegion} ref={originalRegionRef}>
        <p className={styles.original}>
          This is a preview of the original subtitle.
        </p>
      </div>
      <div className={styles.textRegion} ref={translatedRegionRef}>
        <p className={styles.translated}>
          这是字幕译文的预览，按住黑色区域可以拖动窗口。
        </p>
      </div>
      <div
        className={styles.controls}
        role="group"
        aria-label={t("字幕操作")}
        data-subtitle-controls=""
      >
        {!locked && (
          <>
            <StyleControls target="original" />
            <StyleControls target="translated" />
            <TransparencyControl
              open={transparencyOpen}
              onOpenChange={setTransparencyOpen}
            />
          </>
        )}
        <button
          className={styles.controlButton}
          type="button"
          aria-label={t(locked ? "解锁字幕" : "锁定字幕")}
          title={t(locked ? "解锁字幕" : "锁定字幕")}
          onClick={() => {
            setTransparencyOpen(false);
            setLocked((previous) => !previous);
          }}
        >
          <img
            className={styles.controlIcon}
            src={locked ? unlockIcon : lockIcon}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        </button>
      </div>
      {!locked && (
        <button
          className={`${styles.controlButton} ${styles.close}`}
          type="button"
          aria-label={t("关闭")}
          title={t("关闭")}
          onClick={() => window.close()}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
      {RESIZE_EDGES.map((edge) => (
        <div
          key={edge}
          className={styles.resizeHandle}
          data-resize-edge={edge}
          aria-hidden="true"
        />
      ))}
    </main>
  );
}
