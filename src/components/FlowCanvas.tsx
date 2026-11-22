"use client";
import "@xyflow/react/dist/style.css";
import {
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import { memo, useEffect, useMemo, useRef } from "react";
import type { Phase, Tool } from "@/engine";
import { phases, toolById } from "@/lib/catalog";
import { useStack } from "@/store/useStack";
import {
  displayStatus,
  EDGE_COLOR,
  STATUS_BADGE,
  STATUS_ICON,
  STATUS_LABEL,
  STATUS_STYLE,
  type DisplayStatus,
} from "./runStatus";
import { ToolLogo } from "./ToolLogo";

type StepData = { phase: Phase; tool: Tool | undefined; status: DisplayStatus };
type StepNode = Node<StepData, "step">;

const NODE_W = 168;
const GAP = 36;

const StepNodeView = memo(function StepNodeView({ data }: NodeProps<StepNode>) {
  const { phase, tool, status } = data;
  return (
    <div
      className={`relative flex w-[168px] items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 transition-all duration-300 ${STATUS_STYLE[status]}`}
      title={`${phase.name}: ${STATUS_LABEL[status]}`}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" isConnectable={false} />
      <ToolLogo tool={tool} size={30} />
      <div className="min-w-0">
        <div className="truncate text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
          {phase.name}
        </div>
        <div
          className={`truncate text-sm font-medium ${tool ? "text-zinc-100" : "text-zinc-500 italic"}`}
        >
          {tool?.name ?? "None"}
        </div>
      </div>
      <span
        className={`absolute -top-2 -right-2 grid size-5 place-items-center rounded-full text-[11px] font-bold ${STATUS_BADGE[status]}`}
      >
        {STATUS_ICON[status]}
      </span>
      <Handle
        type="source"
        position={Position.Right}
        className="!opacity-0"
        isConnectable={false}
      />
    </div>
  );
});

const nodeTypes = { step: StepNodeView };

/** Shared by the canvas and the mobile list: the display status of every phase. */
function useStepStatuses() {
  const stack = useStack((s) => s.stack);
  const run = useStack((s) => s.run);
  const revealed = useStack((s) => s.revealed);
  const steps = useStack((s) => s.result?.steps);
  return useMemo(
    () =>
      phases.map((phase, i) => ({
        phase,
        tool: toolById(stack[phase.id]),
        status: displayStatus(i, run, revealed, steps),
      })),
    [stack, run, revealed, steps],
  );
}

export function FlowCanvas() {
  const items = useStepStatuses();
  const flow = useRef<ReactFlowInstance<StepNode, Edge> | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const nodes = useMemo<StepNode[]>(
    () =>
      items.map((data, i) => ({
        id: data.phase.id,
        type: "step",
        position: { x: i * (NODE_W + GAP), y: 0 },
        data,
        draggable: false,
        selectable: false,
      })),
    [items],
  );

  const edges = useMemo<Edge[]>(
    () =>
      items.slice(1).map((target, i) => ({
        id: `${items[i]!.phase.id}-${target.phase.id}`,
        source: items[i]!.phase.id,
        target: target.phase.id,
        animated: target.status === "running",
        style: {
          stroke: EDGE_COLOR[target.status],
          strokeWidth: 2,
          strokeDasharray: target.status === "skipped" ? "4 4" : undefined,
        },
      })),
    [items],
  );

  // keep the whole flow in view when the container resizes
  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(() => flow.current?.fitView({ padding: 0.08 }));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} className="hidden h-36 w-full md:block" aria-hidden>
      <ReactFlow<StepNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={(i) => {
          flow.current = i;
          i.fitView({ padding: 0.08 });
        }}
        className="dark"
        fitView
        fitViewOptions={{ padding: 0.08 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        style={{ background: "transparent" }}
      />
    </div>
  );
}

/** Mobile: the same flow as a vertical list. Also the accessible version of the canvas. */
export function FlowList() {
  const items = useStepStatuses();
  return (
    <ol className="flex flex-col gap-2 md:sr-only" aria-label="Deploy steps">
      {items.map(({ phase, tool, status }) => (
        <li
          key={phase.id}
          className={`relative flex items-center gap-3 rounded-xl border-2 px-3 py-2 transition ${STATUS_STYLE[status]}`}
        >
          <ToolLogo tool={tool} size={28} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
              {phase.name}
            </div>
            <div className="truncate text-sm text-zinc-100">{tool?.name ?? "None"}</div>
          </div>
          <span className="sr-only">{STATUS_LABEL[status]}</span>
          <span
            aria-hidden
            className={`grid size-6 place-items-center rounded-full text-xs font-bold ${STATUS_BADGE[status]}`}
          >
            {STATUS_ICON[status]}
          </span>
        </li>
      ))}
    </ol>
  );
}
