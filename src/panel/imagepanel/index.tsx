import { useTranslation } from "react-i18next";
import globalStyles from "../../styles/index.module.css";
import styles from "./index.module.css";
import { getQiniuToken, uploadImage } from "../../api/imageCDN";

export default function () {
  const { t } = useTranslation();
  const handleImageUpload = async () => {
    const items = await navigator.clipboard.read();
    const tokenRes = await getQiniuToken()
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
        uploadImage({ file, token: tokenRes.token })
      }
    }
    console.log(tokenRes);
  };
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
