"use client";

import React from "react";
import { useCanvasStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Code2,
  Sparkles,
  Layers,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  Undo2,
  Redo2,
} from "lucide-react";

export default function Header() {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const showChat = useCanvasStore((s) => s.showChat);
  const showCodePanel = useCanvasStore((s) => s.showCodePanel);
  const toggleChat = useCanvasStore((s) => s.toggleChat);
  const toggleCodePanel = useCanvasStore((s) => s.toggleCodePanel);
  const validationResults = useCanvasStore((s) => s.validationResults);

  // Count validation issues
  let errorCount = 0;
  let warningCount = 0;
  validationResults.forEach((messages) => {
    for (const msg of messages) {
      if (msg.type === "error") errorCount++;
      if (msg.type === "warning") warningCount++;
    }
  });

  return (
    <header className="h-12 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-3 flex-shrink-0 z-50">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2.5 mr-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Layers className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
            InfraCanvas
          </span>
          <span className="text-[10px] text-zinc-400 leading-tight">
            Infrastructure Design Studio
          </span>
        </div>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Canvas stats */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px] h-5 gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          {nodes.length} components
        </Badge>
        <Badge variant="secondary" className="text-[10px] h-5 gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          {edges.length} connections
        </Badge>
      </div>

      {/* Validation status */}
      {(errorCount > 0 || warningCount > 0) && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1.5">
            {errorCount > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                <AlertCircle className="w-3 h-3" />
                {errorCount} {errorCount === 1 ? "error" : "errors"}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="warning" className="text-[10px] h-5 gap-1">
                <AlertTriangle className="w-3 h-3" />
                {warningCount} {warningCount === 1 ? "warning" : "warnings"}
              </Badge>
            )}
            {errorCount === 0 && warningCount === 0 && nodes.length > 0 && (
              <Badge variant="success" className="text-[10px] h-5 gap-1">
                <CheckCircle2 className="w-3 h-3" />
                All valid
              </Badge>
            )}
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-1.5">
        <Button
          variant={showChat ? "default" : "outline"}
          size="sm"
          onClick={toggleChat}
          className={cn(
            "h-8 px-3 text-xs gap-1.5",
            showChat && "bg-indigo-600 hover:bg-indigo-700"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Assistant
        </Button>
        <Button
          variant={showCodePanel ? "default" : "outline"}
          size="sm"
          onClick={toggleCodePanel}
          className={cn(
            "h-8 px-3 text-xs gap-1.5",
            showCodePanel && "bg-indigo-600 hover:bg-indigo-700"
          )}
        >
          <Code2 className="w-3.5 h-3.5" />
          Terraform
        </Button>
      </div>
    </header>
  );
}
