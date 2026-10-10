import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionCard } from "@/components/ui";
import eventBus, { EventBusEvent } from "../../utils/event-bus";

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
    <SectionCard title={t("运行记录")}>
      {logs.length === 0 && (
        <div className="empty-state">
          <p className="text-muted">{t("暂无日志")}</p>
        </div>
      )}
      <div className="log-list">
        {logs.map((log) => (
          <div key={log.id} className="log-row">
            <time dateTime={log.time.toISOString()}>
              {format(log.time, "HH:mm:ss")}
            </time>
            <div>{log.content}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
