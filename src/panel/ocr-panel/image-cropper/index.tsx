import Cropper from "cropperjs";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import eventBus, { EventBusEvent } from "../../../utils/event-bus";
import styles from "./index.module.css";

interface ImageCropperProps {
  /** object URL or data URL for the full screenshot */
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

export default function ImageCropper({
  imageSrc,
  onConfirm,
  onCancel,
}: ImageCropperProps) {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !imageSrc) return;

    let cropper: Cropper | null = null;
    let cancelled = false;

    const init = () => {
      if (cancelled || !imgRef.current) return;
      cropper?.destroy();
      cropper = new Cropper(imgRef.current);
      cropperRef.current = cropper;
    };

    if (img.complete && img.naturalWidth > 0) {
      init();
    } else {
      img.addEventListener("load", init);
    }

    return () => {
      cancelled = true;
      img.removeEventListener("load", init);
      cropper?.destroy();
      cropper = null;
      cropperRef.current = null;
    };
  }, [imageSrc]);

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const selection = cropperRef.current?.getCropperSelection();
      if (!selection) {
        throw new Error("No selection");
      }
      const canvas = await selection.$toCanvas();
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Empty crop region");
      }
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) {
        throw new Error("PNG encode failed");
      }
      onConfirm(blob);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Crop failed:", e);
      eventBus.emit(EventBusEvent.ADD_LOG, t("裁剪失败") + msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("编辑截图")}</h2>
      </div>
      <div className={styles.stage}>
        <img
          ref={imgRef}
          src={imageSrc}
          alt={t("编辑截图")}
          className={styles.image}
        />
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelButton}
          disabled={busy}
        >
          {t("取消")}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className={styles.confirmButton}
          disabled={busy}
        >
          {t("确认识别")}
        </button>
      </div>
    </div>
  );
}
