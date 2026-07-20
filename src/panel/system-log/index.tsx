import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import { togglePanelExpansion } from "../../store/settings";
import globalStyles from "../../styles/index.module.css";
import eventBus, { EventBusEvent } from "../../utils/event-bus";
import styles from "./index.module.css";

export default function SystemLog() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isExpanded = useAppSelector(
    (state) => state.settings.panelExpansion.systemLog,
  );
  const [logs, setLogs] = useState<
    Array<{ time: Date; content: string; id: string }>
  >([]);
  useEffect(() => {
    const callback = (log: string) => {
      setLogs((logs) =>
        logs.concat({
          time: new Date(),
          content: log,
          id: Math.random().toString(),
        }),
      );
    };
    eventBus.on(EventBusEvent.ADD_LOG, callback);
    return () => {
      eventBus.off(EventBusEvent.ADD_LOG, callback);
    };
  }, []);
  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>
        📋 {t("系统日志")}
        <button
          type="button"
          className={globalStyles.panelToggle}
          onClick={() => dispatch(togglePanelExpansion("systemLog"))}
          aria-expanded={isExpanded}
          aria-controls="system-log-panel-content"
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${t("系统日志")}`}
        >
          <span aria-hidden="true">{isExpanded ? "−" : "+"}</span>
        </button>
      </div>
      <div id="system-log-panel-content" hidden={!isExpanded}>
        <div className={styles.logContainer}>
          {logs.map((log) => (
            <div key={log.id} className={styles.logItem}>
              <div>[{format(log.time, "HH:mm:ss")}]</div>
              <div>{log.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
