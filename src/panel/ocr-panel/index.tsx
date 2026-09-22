import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { transformOCRRouter } from "@/api/commonRouter";
import { languages } from "@/constants/language";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import { setOcrTargetLanguage } from "../../store/settings";
import globalStyles from "../../styles/index.module.css";
import eventBus, { EventBusEvent } from "../../utils/event-bus";
import CollapsiblePanel from "../CollapsiblePanel";
import ImageCropper from "./image-cropper";
import styles from "./index.module.css";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

// Minimal ImageCapture typing (may not be in lib.dom)
type ImageCaptureLike = { grabFrame: () => Promise<ImageBitmap> };
type ImageCaptureCtor = new (track: MediaStreamTrack) => ImageCaptureLike;

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const canvasToPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG encode failed"))),
      "image/png",
    );
  });

const bitmapToPngBlob = async (bitmap: ImageBitmap): Promise<Blob> => {
  try {
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2d context unavailable");
      ctx.drawImage(bitmap, 0, 0);
      return await canvas.convertToBlob({ type: "image/png" });
    }

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    ctx.drawImage(bitmap, 0, 0);
    return canvasToPngBlob(canvas);
  } finally {
    bitmap.close?.();
  }
};

const releaseCapture = (
  streamRef: { current: MediaStream | null },
  imageCaptureRef: { current: ImageCaptureLike | null },
  videoRef: { current: HTMLVideoElement | null },
) => {
  streamRef.current?.getTracks().forEach((track) => {
    track.stop();
  });
  streamRef.current = null;
  imageCaptureRef.current = null;
  if (videoRef.current) {
    videoRef.current.srcObject = null;
    videoRef.current = null;
  }
};

export default function OcrPanel() {
  const { t } = useTranslation();
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
  const [ocr, setOCR] = useState("");
  const [trans, setTrans] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imageCaptureRef = useRef<ImageCaptureLike | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cropImageSrcRef = useRef<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const cleanupCapture = () => {
    releaseCapture(streamRef, imageCaptureRef, videoRef);
    setIsStreaming(false);
  };

  // Unmount cleanup: refs only (avoid deps on cleanupCapture)
  useEffect(
    () => () => {
      releaseCapture(streamRef, imageCaptureRef, videoRef);
      if (cropImageSrcRef.current) {
        URL.revokeObjectURL(cropImageSrcRef.current);
        cropImageSrcRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    cropImageSrcRef.current = cropImageSrc;
  }, [cropImageSrc]);

  const runOcr = async (file: Blob) => {
    const base64String = await blobToDataUrl(file);
    setOCR("");
    setTrans("");
    const result = await transformOCRRouter({ base64: base64String });
    setOCR(result.original);
    setTrans(result.translation);
  };

  const recognizeClipboardImage = async () => {
    const items = await navigator.clipboard.read();
    try {
      const item = items.find((candidate) =>
        ACCEPTED_IMAGE_TYPES.some((type) => candidate.types.includes(type)),
      );
      if (!item) {
        console.log("剪贴板无图片");
        return;
      }

      const imageType = item.types.find((type) => type.startsWith("image/"));
      await runOcr(await item.getType(imageType || item.types[0]));
    } catch (error) {
      console.error("Error processing items:", error);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      console.warn(`Unsupported image type: ${file.type}`);
      return;
    }
    try {
      await runOcr(file);
    } catch (error) {
      console.error("Error processing file:", error);
    }
  };

  const startDisplayStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
          logicalSurface: true,
          frameRate: { ideal: 5 },
          width: {
            ideal: window.screen.width * (window.devicePixelRatio || 1),
          },
          height: {
            ideal: window.screen.height * (window.devicePixelRatio || 1),
          },
        } as MediaTrackConstraints,
        audio: false,
      } as DisplayMediaStreamOptions);

      const track = stream.getVideoTracks()[0];
      if (!track) throw new Error("No video track");

      streamRef.current = stream;

      track.addEventListener("ended", () => {
        streamRef.current = null;
        imageCaptureRef.current = null;
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current = null;
        }
        setIsStreaming(false);
        eventBus.emit(EventBusEvent.ADD_LOG, t("屏幕共享已结束"));
      });

      const ImageCaptureClass = (
        window as unknown as { ImageCapture?: ImageCaptureCtor }
      ).ImageCapture;
      if (ImageCaptureClass) {
        imageCaptureRef.current = new ImageCaptureClass(track);
      } else {
        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play();
        videoRef.current = video;
      }

      setIsStreaming(true);
    } catch (e) {
      cleanupCapture();
      const msg = e instanceof Error ? e.message : String(e);
      eventBus.emit(EventBusEvent.ADD_LOG, t("抓屏失败") + msg);
    }
  };

  const grabPngBlob = async (): Promise<Blob> => {
    if (imageCaptureRef.current) {
      const bitmap = await imageCaptureRef.current.grabFrame();
      return bitmapToPngBlob(bitmap);
    }

    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      throw new Error("Capture stream not ready");
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    ctx.drawImage(video, 0, 0);
    return canvasToPngBlob(canvas);
  };

  const closeCropDialog = () => {
    dialogRef.current?.close();
    if (cropImageSrcRef.current) {
      URL.revokeObjectURL(cropImageSrcRef.current);
      cropImageSrcRef.current = null;
    }
    setCropImageSrc(null);
  };

  const handleCropConfirm = async (blob: Blob) => {
    closeCropDialog();
    try {
      await runOcr(blob);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      eventBus.emit(EventBusEvent.ADD_LOG, t("截图失败") + msg);
    }
  };

  const handleCropCancel = () => {
    closeCropDialog();
    // do NOT stop stream
  };

  const handleCaptureClick = async () => {
    if (captureBusy) return;
    if (!isStreaming) {
      setCaptureBusy(true);
      try {
        await startDisplayStream();
      } finally {
        setCaptureBusy(false);
      }
      return;
    }
    setCaptureBusy(true);
    try {
      const blob = await grabPngBlob();
      const url = URL.createObjectURL(blob);
      if (cropImageSrcRef.current) {
        URL.revokeObjectURL(cropImageSrcRef.current);
      }
      cropImageSrcRef.current = url;
      setCropImageSrc(url);
      queueMicrotask(() => {
        dialogRef.current?.showModal();
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      eventBus.emit(EventBusEvent.ADD_LOG, t("截图失败") + msg);
    } finally {
      setCaptureBusy(false);
    }
  };

  return (
    <CollapsiblePanel
      panel="ocr"
      title={t("图片翻译")}
      contentId="ocr-panel-content"
    >
      <div className={styles.btnCon}>
        <div className={styles.targetLanguage}>
          <label
            className={styles.targetLanguageLabel}
            htmlFor="ocr-target-language"
          >
            {t("目标语言")}
          </label>
          <select
            id="ocr-target-language"
            className={`${globalStyles.selectS} ${styles.targetLanguageSelect}`}
            value={settings.ocrTargetLanguage}
            onChange={(e) => dispatch(setOcrTargetLanguage(e.target.value))}
          >
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.nativeName}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={recognizeClipboardImage}
            className={globalStyles.button}
          >
            {t("剪贴板")}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={globalStyles.button}
          >
            {t("文件选择")}
          </button>
          <button
            type="button"
            onClick={handleCaptureClick}
            className={globalStyles.button}
            disabled={captureBusy}
          >
            {isStreaming ? t("截图") : t("抓屏")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className={styles.fileInput}
            onChange={handleFileChange}
          />
        </div>
      </div>
      <div className={styles.logContainer}>
        <textarea
          style={{ width: "42%", height: "200px" }}
          value={ocr}
          readOnly
        ></textarea>
        ➡
        <textarea
          style={{ width: "42%", height: "200px" }}
          value={trans}
          readOnly
        ></textarea>
      </div>

      <dialog
        ref={dialogRef}
        className={styles.cropDialog}
        onCancel={(e) => {
          e.preventDefault();
          handleCropCancel();
        }}
      >
        {cropImageSrc ? (
          <ImageCropper
            imageSrc={cropImageSrc}
            onConfirm={handleCropConfirm}
            onCancel={handleCropCancel}
          />
        ) : null}
      </dialog>
    </CollapsiblePanel>
  );
}
