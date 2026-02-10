"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  Check,
  PlayCircle,
  Link2,
} from "lucide-react";
import { ChatMessage, ProposedChange } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

// ============================================================
// Message Bubble — renders a single chat message + proposed changes
// ============================================================

function MessageBubble({ message }: { message: ChatMessage }) {
  const applyAIChanges = useCanvasStore((s) => s.applyAIChanges);
  const [allApplied, setAllApplied] = useState(false);

  const isUser = message.role === "user";
  const changes = message.proposedChanges || [];
  const hasChanges = changes.length > 0;
  const hasConnections = changes.some((c) => c.type === "add_connection");

  // Apply ALL changes as a single batch — this is the recommended approach
  // because connections need the tempId -> realId mapping from nodes that
  // are created in the same batch.
  const handleApplyAll = () => {
    if (allApplied) return;
    applyAIChanges(changes);
    setAllApplied(true);
  };

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
          isUser
            ? "bg-indigo-100 dark:bg-indigo-900/50"
            : "bg-emerald-100 dark:bg-emerald-900/50"
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "flex-1 max-w-[85%]",
          isUser ? "text-right" : "text-left"
        )}
      >
        <div
          className={cn(
            "inline-block rounded-xl px-4 py-2.5 text-sm",
            isUser
              ? "bg-indigo-600 text-white rounded-br-sm"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-sm"
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* Proposed changes list */}
        {hasChanges && (
          <div className="mt-2 space-y-1.5 text-left">
            {/* Apply All button — most important for batched connections */}
            <div className="flex items-center gap-2 mb-2">
              {!allApplied ? (
                <Button
                  size="sm"
                  onClick={handleApplyAll}
                  className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  Apply All ({changes.length} changes)
                </Button>
              ) : (
                <Badge variant="success" className="text-xs h-6 px-2.5 gap-1">
                  <Check className="w-3 h-3" />
                  All {changes.length} changes applied
                </Badge>
              )}
              {hasConnections && !allApplied && (
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  Includes connections between components
                </span>
              )}
            </div>

            {/* Individual change items */}
            {changes.map((change, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
                  "bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700",
                  allApplied && "opacity-60"
                )}
              >
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] h-4 px-1.5 flex-shrink-0",
                    change.type === "add_node" &&
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
                    change.type === "remove_node" &&
                      "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
                    change.type === "modify_node" &&
                      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
                    change.type === "add_connection" &&
                      "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
                    change.type === "remove_connection" &&
                      "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                  )}
                >
                  {change.type === "add_connection" ? (
                    <span className="flex items-center gap-0.5">
                      <Link2 className="w-2.5 h-2.5" />
                      connect
                    </span>
                  ) : (
                    change.type.replace("_", " ")
                  )}
                </Badge>
                <span className="flex-1 text-zinc-600 dark:text-zinc-300">
                  {change.description}
                </span>
                {allApplied && (
                  <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Chat Panel — main chat interface
// ============================================================

export default function ChatPanel() {
  const [input, setInput] = useState("");
  const chatMessages = useCanvasStore((s) => s.chatMessages);
  const addChatMessage = useCanvasStore((s) => s.addChatMessage);
  const setChatLoading = useCanvasStore((s) => s.setChatLoading);
  const isChatLoading = useCanvasStore((s) => s.isChatLoading);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    addChatMessage(userMessage);
    setInput("");
    setChatLoading(true);

    try {
      const canvasContext = {
        nodes: nodes.map((n) => ({
          id: n.id,
          componentId: n.data.componentId,
          label: n.data.label,
          provider: n.data.provider,
          category: n.data.category,
          config: n.data.config,
        })),
        edges: edges.map((e) => ({
          source: e.source,
          target: e.target,
        })),
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input.trim(),
          canvasContext,
          history: chatMessages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content:
          data.message ||
          "I encountered an issue processing your request.",
        timestamp: Date.now(),
        proposedChanges: data.proposedChanges || [],
      };

      addChatMessage(assistantMessage);
    } catch {
      addChatMessage({
        id: uuidv4(),
        role: "assistant",
        content:
          "Sorry, I encountered an error. Please check your API key configuration and try again.",
        timestamp: Date.now(),
      });
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              AI Assistant
            </h3>
            <p className="text-[11px] text-zinc-500">
              Powered by Groq
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-indigo-500" />
            </div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              How can I help?
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
              Describe your infrastructure needs in natural language
            </p>
            <div className="space-y-2 w-full">
              {[
                "Create a 3-tier web application on AWS",
                "Add a PostgreSQL database with high availability",
                "Set up a VPC with public and private subnets",
                "Create a serverless API with Lambda and DynamoDB",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-2">
            {chatMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isChatLoading && (
              <div className="flex gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your infrastructure needs..."
            disabled={isChatLoading}
            className="flex-1 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 disabled:opacity-50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isChatLoading}
            className="h-9 w-9 bg-indigo-600 hover:bg-indigo-700"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
