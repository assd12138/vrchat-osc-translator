import { useTranslation } from "react-i18next";
import boldIcon from "@/images/bold.svg";
import paletteIcon from "@/images/palette.svg";
import textDecreaseIcon from "@/images/text_decrease.svg";
import textIncreaseIcon from "@/images/text_increase.svg";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { setSubtitleConfig } from "@/store/settings";
import {
  SUBTITLE_MAX_FONT_SIZE,
  SUBTITLE_MIN_FONT_SIZE,
  type SubtitleFontWeight,
} from "@/store/subtitle-config";
import styles from "./index.module.css";

function ControlIcon({ src }: { src: string }) {
  return (
    <img
      className={styles.controlIcon}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

export default function StyleControls({
  target,
}: {
  target: "original" | "translated";
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const config = useAppSelector((state) => state.settings.subtitleConfig);
  const original = target === "original";
  const groupLabel = t(original ? "原文" : "译文");
  const fontSize = original
    ? config.originalFontSize
    : config.translatedFontSize;
  const weight = original
    ? config.originalFontWeight
    : config.translatedFontWeight;
  const color = original ? config.originalColor : config.translatedColor;
  const increaseLabel = `${groupLabel} · ${t("增大字幕字号")} (${fontSize}px)`;
  const decreaseLabel = `${groupLabel} · ${t("减小字幕字号")} (${fontSize}px)`;
  const colorLabel = `${groupLabel} · ${t("字幕颜色")}`;
  const boldLabel = `${groupLabel} · ${t(weight === "bold" ? "取消字幕加粗" : "字幕加粗")}`;

  const changeFontSize = (step: number) => {
    const size = Math.min(
      SUBTITLE_MAX_FONT_SIZE,
      Math.max(SUBTITLE_MIN_FONT_SIZE, fontSize + step),
    );
    dispatch(
      setSubtitleConfig(
        original ? { originalFontSize: size } : { translatedFontSize: size },
      ),
    );
  };

  const toggleBold = () => {
    const nextWeight: SubtitleFontWeight =
      weight === "bold" ? "normal" : "bold";
    dispatch(
      setSubtitleConfig(
        original
          ? { originalFontWeight: nextWeight }
          : { translatedFontWeight: nextWeight },
      ),
    );
  };

  return (
    <div className={styles.controlGroup} role="group" aria-label={groupLabel}>
      <span className={styles.groupLabel} data-target={target}>
        {groupLabel}
      </span>
      <button
        className={styles.controlButton}
        type="button"
        aria-label={increaseLabel}
        title={increaseLabel}
        disabled={fontSize >= SUBTITLE_MAX_FONT_SIZE}
        onClick={() => changeFontSize(1)}
      >
        <ControlIcon src={textIncreaseIcon} />
      </button>
      <button
        className={styles.controlButton}
        type="button"
        aria-label={decreaseLabel}
        title={decreaseLabel}
        disabled={fontSize <= SUBTITLE_MIN_FONT_SIZE}
        onClick={() => changeFontSize(-1)}
      >
        <ControlIcon src={textDecreaseIcon} />
      </button>
      <label
        className={`${styles.controlButton} ${styles.colorControl}`}
        title={colorLabel}
      >
        <ControlIcon src={paletteIcon} />
        <input
          className={styles.colorInput}
          type="color"
          aria-label={colorLabel}
          value={color}
          onChange={(event) => {
            const nextColor = event.currentTarget.value;
            dispatch(
              setSubtitleConfig(
                original
                  ? { originalColor: nextColor }
                  : { translatedColor: nextColor },
              ),
            );
          }}
        />
      </label>
      <button
        className={styles.controlButton}
        type="button"
        aria-label={boldLabel}
        title={boldLabel}
        aria-pressed={weight === "bold"}
        onClick={toggleBold}
      >
        <ControlIcon src={boldIcon} />
      </button>
    </div>
  );
}
