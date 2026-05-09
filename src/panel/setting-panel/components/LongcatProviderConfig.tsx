import { useTranslation } from "react-i18next";
import { openUrl } from "../../../cross-platform/openUrl";
import { useAppDispatch, useAppSelector } from "../../../store/hook";
import { setLongcatApiAuth } from "../../../store/settings";
import globalStyles from "../../../styles/index.module.css";
import styles from "../index.module.css";

export default function LongcatProviderConfig() {
  const settings = useAppSelector((state) => state.settings);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const handleLongcatApiAuthChange = (auth: string) => {
    dispatch(setLongcatApiAuth(auth));
  };

  return (
    <>
      <label className={globalStyles.labelS}>
        Authorization
        <a
          className={styles.initBtn}
          onClick={() => openUrl("https://longcat.chat/login")}
        >
          {t("去申请")}
        </a>
      </label>
      <input
        className={globalStyles.inputS}
        value={settings.longcat_api_auth}
        onChange={(e) => handleLongcatApiAuthChange(e.target.value)}
      />
    </>
  );
}
