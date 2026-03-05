import { useTranslation } from "react-i18next";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";
import { uploadImage } from "../../api/imageCDN";
import { createCompressTask, useWorkerHandler } from "@/utils/imagecompressor/transformer";
import eventBus, { EventBusEvent } from "@/utils/eventBus";
import { useEffect } from "react";
import tauriInvoke from "@/cross-platform/invoke";

// 获取图片尺寸
const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

export default function () {
  const { t } = useTranslation();
  useWorkerHandler()

  const handleImageUpload = async () => {
    const items = await navigator.clipboard.read();
    // const tokenRes = await getQiniuToken()
    console.log(items);

    for (const item of items) {
      if (
        item.types.includes("image/png") ||
        item.types.includes("image/jpeg") ||
        item.types.includes("image/webp")
      ) {
        const blob = await item.getType(
          item.types.find((type) => type.startsWith("image/")) ||
          item.types[0],
        );
        const file = new File([blob], "image.png", {
          type: blob.type,
        });



        // 获取图片尺寸
        const url = URL.createObjectURL(file);
        try {
          const dimensions = await getImageDimensions(url);
          console.log('图片尺寸:', dimensions);

          // 现在你可以使用 dimensions.width 和 dimensions.height
          // uploadImage({ file, token: tokenRes.token })
          createCompressTask({
            blob: file,
            height: dimensions.height,
            width: dimensions.width,
            name: 'aaaa.jpg',
            // src: url,
            key: 1
          }, {
            preview: {
              maxSize: 256
            },
            resize: {
              method: 'setLong',
              long: 2048
            },
            format: {
              transparentFill: '#ffffff'
            },
            jpeg: {
              quality: 0.75
            },
            png: {
              colors: 128,
              dithering: 0.5
            },
            gif: {
              colors: 128,
              dithering: false
            },
            avif: {
              quality: 50,
              speed: 8
            }
          })

        } catch (error) {
          console.error('获取图片尺寸失败:', error);
        } finally {
          URL.revokeObjectURL(url);
        }
        break;
      }
    }
  };

  useEffect(()=>{
    eventBus.on(EventBusEvent.COMPRESS_IAMGE,async (res)=>{
      console.log(res.data.compress.blob)
      const token:string = await tauriInvoke("get_qiniu_token",{
        accessKey:  import.meta.env.VITE_DEFAULT_QINIU_ACCESS_KEY,
        secretKey: import.meta.env.VITE_DEFAULT_QINIU_SECRET_KEY,
        bucket: import.meta.env.VITE_DEFAULT_QINIU_BUCKET
      });
      await uploadImage({
        file: res.data.compress.blob,
        token
      })
    })
  },[])
  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>🏞️ Image</div>
      <div className={styles.btnCon}>
        <button onClick={handleImageUpload} className={globalStyles.button}>
          {t('图片上传')}
        </button>
      </div>
    </div>
  );
}
