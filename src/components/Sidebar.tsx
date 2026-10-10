import { type DragEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import type { PanelId } from "@/store/navigation";
import { setPanelOrder } from "@/store/settings";
import Icon from "./Icon";

interface DragSession {
  source: PanelId;
  order: PanelId[];
  preview: PanelId[];
  bounds: Map<PanelId, { top: number; height: number }>;
  gap: number;
  grabOffset: number;
  image: HTMLElement;
}

export default function Sidebar({
  active,
  items,
  onSelect,
}: {
  active: PanelId;
  items: readonly { id: PanelId; title: string }[];
  onSelect: (id: PanelId) => void;
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const order = useAppSelector((state) => state.settings.panelOrder);
  const navRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef(new Map<PanelId, HTMLButtonElement>());
  const dragSession = useRef<DragSession | null>(null);
  const wasDragged = useRef(false);
  const [dragging, setDragging] = useState<PanelId | null>(null);
  const [previewOrder, setPreviewOrder] = useState<PanelId[] | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => () => dragSession.current?.image.remove(), []);

  const finishDrag = () => {
    dragSession.current?.image.remove();
    dragSession.current = null;
    setDragging(null);
    setPreviewOrder(null);
  };

  const updatePreview = (event: DragEvent<HTMLElement>) => {
    const session = dragSession.current;
    if (!session || !navRef.current) return;
    const sourceBounds = session.bounds.get(session.source);
    if (!sourceBounds) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    // Use layout positions, not the animated cards' screen positions, to avoid
    // switching back and forth as cards move underneath the pointer.
    const center =
      event.clientY -
      navRef.current.getBoundingClientRect().top -
      session.grabOffset +
      sourceBounds.height / 2;
    let targetIndex = 0;
    let closest = Infinity;
    session.order.forEach((id, index) => {
      const bounds = session.bounds.get(id);
      if (!bounds) return;
      const { top, height } = bounds;
      const distance = Math.abs(center - (top + height / 2));
      if (distance < closest) {
        closest = distance;
        targetIndex = index;
      }
    });
    if (session.preview.indexOf(session.source) === targetIndex) return;
    const next = session.order.filter((id) => id !== session.source);
    next.splice(targetIndex, 0, session.source);
    session.preview = next;
    setPreviewOrder(next);
  };

  const offsets = new Map<PanelId, number>();
  const session = dragSession.current;
  const firstBounds = session?.bounds.get(session.order[0]);
  if (session && previewOrder && firstBounds) {
    let top = firstBounds.top;
    previewOrder.forEach((id) => {
      const bounds = session.bounds.get(id);
      if (!bounds) return;
      offsets.set(id, top - bounds.top);
      top += bounds.height + session.gap;
    });
  }

  return (
    <aside className="sidebar">
      <nav
        ref={navRef}
        className={`sidebar-nav${dragging ? " is-sorting" : ""}`}
        aria-label={t("工作空间")}
        onDragOver={updatePreview}
        onDrop={(event) => {
          if (!dragSession.current) return;
          updatePreview(event);
          const next = dragSession.current.preview;
          if (next.some((id, index) => id !== order[index])) {
            dispatch(setPanelOrder(next));
            setAnnouncement(t("排序已保存"));
          }
          finishDrag();
        }}
      >
        {order.map((id) => (
          <button
            key={id}
            ref={(element) => {
              if (element) cardRefs.current.set(id, element);
              else cardRefs.current.delete(id);
            }}
            type="button"
            className={`sidebar-card ${active === id ? "is-active" : ""} ${dragging === id ? "is-dragging" : ""}`}
            style={{ translate: `0 ${offsets.get(id) ?? 0}px` }}
            aria-current={active === id ? "page" : undefined}
            aria-controls={`page-${id}`}
            draggable
            onPointerDown={() => {
              wasDragged.current = false;
            }}
            onClick={(event) => {
              if (!wasDragged.current || event.detail === 0) onSelect(id);
            }}
            onDragStart={(event) => {
              if (!navRef.current) {
                event.preventDefault();
                return;
              }
              const bounds: DragSession["bounds"] = new Map();
              for (const panel of order) {
                const card = cardRefs.current.get(panel);
                if (!card) {
                  event.preventDefault();
                  return;
                }
                bounds.set(panel, {
                  top: card.offsetTop,
                  height: card.offsetHeight,
                });
              }
              const button = event.currentTarget;
              const rect = button.getBoundingClientRect();
              const image = button.cloneNode(true) as HTMLButtonElement;
              image.classList.add("sidebar-drag-image");
              image.setAttribute("aria-hidden", "true");
              image.tabIndex = -1;
              image.style.width = `${button.offsetWidth}px`;
              image.style.height = `${button.offsetHeight}px`;
              image.style.background = getComputedStyle(button).backgroundColor;
              image.style.setProperty("--sidebar-accent", "#006fee");
              document.body.appendChild(image);
              const grabX =
                ((event.clientX - rect.left) / rect.width) * button.offsetWidth;
              const grabY =
                ((event.clientY - rect.top) / rect.height) *
                button.offsetHeight;
              event.dataTransfer.setData("text/plain", id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setDragImage(image, grabX, grabY);
              dragSession.current = {
                source: id,
                order: [...order],
                preview: [...order],
                bounds,
                gap:
                  Number.parseFloat(getComputedStyle(navRef.current).rowGap) ||
                  0,
                grabOffset: grabY,
                image,
              };
              wasDragged.current = true;
              setDragging(id);
              setPreviewOrder([...order]);
            }}
            onDragEnd={finishDrag}
          >
            <span className="sidebar-icon">
              <Icon name={id} />
            </span>
            <span className="sidebar-label">
              {t(items.find((item) => item.id === id)?.title ?? id)}
            </span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <p>{t("拖动卡片调整顺序")}</p>
      </div>
      <span className="sr-only" role="status">
        {announcement}
      </span>
    </aside>
  );
}
