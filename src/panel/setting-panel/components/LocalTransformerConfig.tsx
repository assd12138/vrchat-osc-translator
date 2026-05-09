import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { checkModelCached, loadModel } from "../../../api/localTransformer";
import globalStyles from "../../../styles/index.module.css";
import styles from "../index.module.css";

export default function LocalTransformerConfig() {
  const { t } = useTranslation();
  const [localProgress, setLocalProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isCached, setIsCached] = useState<boolean | null>(null);

  useEffect(() => {
    checkModelCached().then(setIsCached);
  }, []);

  const loadLocalTransformer = () => {
    setLoading(true);
    loadModel({
      onProgress(percentNative) {
        const percent = Math.round((percentNative * 100) / 100);
        setLocalProgress(percent);
        if (percent === 100) {
          setLoading(false);
        } else {
          setLoading(true);
        }
      },
    });
  };

  return (
    <>
      <label className={globalStyles.labelS}>{t("本地模型")}</label>
      <table className={styles.localModelTable}>
        <thead>
          <tr>
            <th className={styles.localModelTh}>{t("缓存情况")}</th>
            <th className={styles.localModelTh}>{t("加载情况")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={styles.localModelTd}>
              {isCached === null
                ? t("检查中")
                : t(isCached ? "已缓存" : "未缓存")}
            </td>
            <td className={styles.localModelTd}>
              {t(localProgress === 100 ? "已加载" : "未加载")}
            </td>
          </tr>
        </tbody>
      </table>
      {loading && (
        <div>
          <progress value={localProgress} max={100}></progress>
          <span style={{ fontSize: "12px", marginLeft: "10px" }}>
            {localProgress}%
          </span>
        </div>
      )}
      <div>
        <button
          disabled={localProgress === 100}
          onClick={loadLocalTransformer}
          className={globalStyles.button}
        >
          {t("加载")}
        </button>
      </div>
    </>
  );
}
