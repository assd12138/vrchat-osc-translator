import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import eventBus, { EventBusEvent } from "../../utils/event-bus";
import CollapsiblePanel from "../CollapsiblePanel";
import styles from "./index.module.css";

export default function SystemLog() {
  const { t } = useTranslation();
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
    <CollapsiblePanel
      panel="systemLog"
      title={t("系统日志")}
      icon="📋"
      contentId="system-log-panel-content"
    >
      <div className={styles.logContainer}>
        {logs.map((log) => (
          <div key={log.id} className={styles.logItem}>
            <div>[{format(log.time, "HH:mm:ss")}]</div>
            <div>{log.content}</div>
          </div>
        ))}
      </div>
    </CollapsiblePanel>
  );
}
