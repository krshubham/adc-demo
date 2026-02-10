"use client";

import React, { useCallback, useRef, useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCanvasStore } from "@/lib/store";
import InfraNode from "./InfraNode";
import { InfraNodeData } from "@/lib/types";

function CanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const addNode = useCanvasStore((s) => s.addNode);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const layoutRequestId = useCanvasStore((s) => s.layoutRequestId);

  // Smoothly fit the viewport whenever auto-layout runs
  useEffect(() => {
    if (layoutRequestId > 0) {
      // Small delay so React Flow processes the position changes first
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [layoutRequestId, fitView]);

  const nodeTypes: NodeTypes = useMemo(
    () => ({ infraNode: InfraNode }),
    []
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: any) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const componentId = event.dataTransfer.getData("application/infraComponent");
      if (!componentId) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(componentId, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        const selectedNodeId = useCanvasStore.getState().selectedNodeId;
        if (selectedNodeId) {
          removeNode(selectedNodeId);
        }
      }
    },
    [removeNode]
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="h-full w-full"
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: "#6366f1", strokeWidth: 2 },
        }}
        connectionLineStyle={{ stroke: "#6366f1", strokeWidth: 2 }}
        className="bg-zinc-50 dark:bg-zinc-950"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="#e4e4e7"
          gap={16}
          size={1}
        />
        <Controls
          className="!bg-white dark:!bg-zinc-800 !border-zinc-200 dark:!border-zinc-700 !rounded-lg !shadow-lg [&>button]:!bg-white dark:[&>button]:!bg-zinc-800 [&>button]:!border-zinc-200 dark:[&>button]:!border-zinc-700 [&>button]:!rounded [&>button]:!text-zinc-600 dark:[&>button]:!text-zinc-300"
          position="bottom-right"
        />
        <MiniMap
          className="!bg-white dark:!bg-zinc-800 !border-zinc-200 dark:!border-zinc-700 !rounded-lg !shadow-lg"
          nodeColor={(node) => {
            const data = node.data as InfraNodeData;
            switch (data?.provider) {
              case "aws":
                return "#f97316";
              case "gcp":
                return "#3b82f6";
              case "azure":
                return "#06b6d4";
              default:
                return "#6366f1";
            }
          }}
          maskColor="rgba(0,0,0,0.08)"
          position="bottom-left"
        />
      </ReactFlow>
    </div>
  );
}

export default function CanvasWorkspace() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
