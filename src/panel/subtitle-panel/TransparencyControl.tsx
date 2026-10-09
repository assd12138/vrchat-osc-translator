import { type CSSProperties, useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import transparencyIcon from "@/images/transparency.svg";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { setSubtitleConfig } from "@/store/settings";
import styles from "./index.module.css";

export default function TransparencyControl({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const opacity = useAppSelector(
    (state) => state.settings.subtitleConfig.backgroundOpacity,
  );
  const transparency = Math.round((1 - opacity) * 100);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const rangeId = `${id}-range`;
  const panelId = `${id}-panel`;
  const label = t("背景透明度");

  useEffect(() => {
    if (!open) return;
    rangeRef.current?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        buttonRef.current?.focus();
      }
    };
    const closeOnBlur = () => onOpenChange(false);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("blur", closeOnBlur);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("blur", closeOnBlur);
    };
  }, [open, onOpenChange]);

  return (
    <div
      className={styles.transparencyControl}
      ref={rootRef}
      style={{ "--transparency-level": `${transparency}%` } as CSSProperties}
    >
      <button
        className={`${styles.controlButton} ${styles.transparencyButton}`}
        ref={buttonRef}
        type="button"
        aria-label={`${label}: ${transparency}%`}
        title={`${label}: ${transparency}%`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => onOpenChange(!open)}
      >
        <img
          className={styles.controlIcon}
          src={transparencyIcon}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      </button>
      {open && (
        <div
          className={styles.transparencyPanel}
          id={panelId}
          role="group"
          aria-label={label}
        >
          <div className={styles.transparencyHeader}>
            <label htmlFor={rangeId}>{label}</label>
            <output htmlFor={rangeId}>{transparency}%</output>
          </div>
          <input
            className={styles.transparencyRange}
            ref={rangeRef}
            id={rangeId}
            type="range"
            min="0"
            max="100"
            step="1"
            value={transparency}
            aria-valuetext={`${transparency}%`}
            onChange={(event) => {
              dispatch(
                setSubtitleConfig({
                  backgroundOpacity:
                    (100 - Number(event.currentTarget.value)) / 100,
                }),
              );
            }}
          />
          <div className={styles.transparencyEndpoints} aria-hidden="true">
            <span>{t("不透明")}</span>
            <span>{t("完全透明")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
