"use client";

import React from "react";
import dynamic from "next/dynamic";
import Header from "@/components/layout/Header";
import ComponentLibrary from "@/components/panels/ComponentLibrary";
import ConfigPanel from "@/components/panels/ConfigPanel";
import ChatPanel from "@/components/panels/ChatPanel";
import CodePanel from "@/components/panels/CodePanel";
import { useCanvasStore } from "@/lib/store";
import { TooltipProvider } from "@/components/ui/tooltip";

// Dynamic import for canvas to avoid SSR issues with React Flow
const CanvasWorkspace = dynamic(
  () => import("@/components/canvas/CanvasWorkspace"),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-zinc-500">Loading canvas...</span>
      </div>
    </div>
  )}
);

export default function Home() {
  const showChat = useCanvasStore((s) => s.showChat);
  const showCodePanel = useCanvasStore((s) => s.showCodePanel);
  const showConfigPanel = useCanvasStore((s) => s.showConfigPanel);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950">
        {/* Header / Toolbar */}
        <Header />

        {/* Main content */}
        <div className="flex-1 flex min-h-0">
          {/* Left sidebar - Component Library */}
          <div className="w-72 flex-shrink-0">
            <ComponentLibrary />
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 min-w-0 relative">
            <CanvasWorkspace />

            {/* Empty state overlay */}
            <EmptyCanvasOverlay />
          </div>

          {/* Right panels */}
          {(selectedNodeId && showConfigPanel) && (
            <div className="w-80 flex-shrink-0">
              <ConfigPanel />
            </div>
          )}

          {showChat && (
            <div className="w-96 flex-shrink-0">
              <ChatPanel />
            </div>
          )}

          {showCodePanel && (
            <div className="w-[480px] flex-shrink-0">
              <CodePanel />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function EmptyCanvasOverlay() {
  const nodes = useCanvasStore((s) => s.nodes);

  if (nodes.length > 0) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
          Design Your Infrastructure
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
          Drag components from the left sidebar onto the canvas to start building.
          Connect them by dragging from one port to another.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-400">
          <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            Drag & drop to add
          </span>
          <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            Click to configure
          </span>
          <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            Connect ports
          </span>
          <span className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            AI Assistant for help
          </span>
        </div>
      </div>
    </div>
  );
}
