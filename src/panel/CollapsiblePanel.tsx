import type { ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import {
  type PanelExpansionState,
  togglePanelExpansion,
} from "@/store/settings";
import globalStyles from "@/styles/index.module.css";

type PanelKey = keyof PanelExpansionState;

interface CollapsiblePanelProps {
  panel: PanelKey;
  title: string;
  contentId: string;
  icon?: string;
  actions?: ReactNode;
  collapseDisabled?: boolean;
  children: ReactNode;
}

export default function CollapsiblePanel({
  panel,
  title,
  contentId,
  icon,
  actions,
  collapseDisabled = false,
  children,
}: CollapsiblePanelProps) {
  const dispatch = useAppDispatch();
  const isExpanded = useAppSelector(
    (state) => state.settings.panelExpansion[panel],
  );

  return (
    <div className={globalStyles.panel}>
      <div className={globalStyles.title}>
        {icon && <span aria-hidden="true">{icon}</span>}
        {title}
        {actions}
        <button
          type="button"
          className={globalStyles.panelToggle}
          onClick={() => dispatch(togglePanelExpansion(panel))}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${title}`}
          disabled={isExpanded && collapseDisabled}
        >
          <span aria-hidden="true">{isExpanded ? "−" : "+"}</span>
        </button>
      </div>
      <div id={contentId} hidden={!isExpanded}>
        {children}
      </div>
    </div>
  );
}
