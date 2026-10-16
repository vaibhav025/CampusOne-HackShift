"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useNow } from "@/lib/hooks";
import { cn, formatDate, toDate } from "@/lib/utils";
import type { Club, Task } from "@/lib/types";

const COLUMNS: { id: Task["status"]; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
  { id: "done", label: "Done" },
];

// Each club gets a consistent marker colour on the board.
const OWNER_DOTS = ["bg-[#7c6fd6]", "bg-[#3f9a6b]", "bg-[#c98a2b]", "bg-[#3d7cc0]", "bg-[#c25555]"];

export function Kanban({ tasks, clubs, clubOrder, readOnly }: { tasks: Task[]; clubs: Record<string, Club>; clubOrder: string[]; readOnly?: boolean }) {
  // Optimistic overrides so a dropped card moves instantly, before the listener catches up.
  const [overrides, setOverrides] = useState<Record<string, Task["status"]>>({});
  const [active, setActive] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const view = tasks.map((t) => (overrides[t.id] && overrides[t.id] !== t.status ? { ...t, status: overrides[t.id] } : t));
  const dot = (id: string) => OWNER_DOTS[Math.max(0, clubOrder.indexOf(id)) % OWNER_DOTS.length];

  async function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const task = view.find((t) => t.id === e.active.id);
    const to = e.over?.id as Task["status"] | undefined;
    if (!task || !to || to === task.status) return;
    setOverrides((o) => ({ ...o, [task.id]: to }));
    try {
      await api("/api/workspace/tasks/update", { body: { taskId: task.id, status: to } });
    } catch (err) {
      setOverrides((o) => {
        const next = { ...o };
        delete next[task.id];
        return next;
      });
      toast.error(err instanceof Error ? err.message : "Couldn't move that task");
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setActive(view.find((t) => t.id === e.active.id) ?? null)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="grid gap-3 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <Column key={col.id} col={col} count={view.filter((t) => t.status === col.id).length}>
            {view
              .filter((t) => t.status === col.id)
              .sort((a, b) => (toDate(a.dueDate)?.getTime() ?? 0) - (toDate(b.dueDate)?.getTime() ?? 0))
              .map((t) => (
                <TaskCard key={t.id} task={t} owner={clubs[t.ownerClubId]} dot={dot(t.ownerClubId)} disabled={readOnly} />
              ))}
          </Column>
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
        {active && <TaskBody task={active} owner={clubs[active.ownerClubId]} dot={dot(active.ownerClubId)} lifted />}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ col, count, children }: { col: (typeof COLUMNS)[number]; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div ref={setNodeRef} className={cn("flex min-h-56 flex-col rounded-xl bg-surface-2/70 p-2 transition-colors duration-150", isOver && "bg-surface-2")}>
      <div className="mb-2 flex items-baseline gap-2 px-1.5 pt-1">
        <h3 className="text-[13px] font-medium">{col.label}</h3>
        <span className="text-xs tabular-nums text-muted">{count}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">{children}</div>
    </div>
  );
}

function TaskCard({ task, owner, dot, disabled }: { task: Task; owner?: Club; dot: string; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn("touch-none outline-none", isDragging && "opacity-0")}>
      <TaskBody task={task} owner={owner} dot={dot} draggable={!disabled} />
    </div>
  );
}

function TaskBody({ task, owner, dot, lifted, draggable = true }: { task: Task; owner?: Club; dot: string; lifted?: boolean; draggable?: boolean }) {
  const now = useNow();
  const due = toDate(task.dueDate);
  const overdue = task.status !== "done" && due != null && due.getTime() < now;
  const done = task.status === "done";
  return (
    <div
      className={cn(
        "rounded-md bg-surface px-3 py-2.5 shadow-card",
        draggable && "cursor-grab",
        lifted && "cursor-grabbing shadow-pop [transform:rotate(1.5deg)]",
      )}
    >
      <p className={cn("text-[13px] font-medium leading-snug", done && "text-muted line-through decoration-muted/50")}>{task.title}</p>
      {task.description && !done && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{task.description}</p>}
      <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 text-muted">
          <span className={cn("size-1.5 shrink-0 rounded-full", dot)} />
          <span className="truncate">{owner?.name ?? "Unassigned"}</span>
        </span>
        <span className={cn("shrink-0 tabular-nums", overdue ? "font-medium text-danger" : "text-muted")}>
          {overdue ? "Overdue, " : ""}
          {formatDate(task.dueDate, { day: "numeric", month: "short" })}
        </span>
      </div>
    </div>
  );
}
