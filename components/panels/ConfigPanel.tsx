"use client";

import React from "react";
import { useCanvasStore } from "@/lib/store";
import { componentMap } from "@/lib/components";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  X,
  Trash2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Settings2,
} from "lucide-react";
import { ConfigField, ValidationMessage } from "@/lib/types";

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (field.type) {
    case "text":
    case "textarea":
      return (
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {field.type === "textarea" ? (
            <textarea
              value={(value as string) || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              className="flex w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-500 resize-none h-20"
            />
          ) : (
            <Input
              value={(value as string) || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              className="h-8 text-xs"
            />
          )}
          {field.description && (
            <p className="text-[11px] text-zinc-400 mt-1">{field.description}</p>
          )}
        </div>
      );

    case "number":
      return (
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <Input
            type="number"
            value={(value as number) ?? field.defaultValue ?? ""}
            onChange={(e) => onChange(Number(e.target.value))}
            min={field.validation?.min}
            max={field.validation?.max}
            className="h-8 text-xs"
          />
          {field.validation && (
            <p className="text-[11px] text-zinc-400 mt-1">
              {field.validation.min !== undefined && `Min: ${field.validation.min}`}
              {field.validation.min !== undefined && field.validation.max !== undefined && " | "}
              {field.validation.max !== undefined && `Max: ${field.validation.max}`}
            </p>
          )}
        </div>
      );

    case "select":
      return (
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <Select
            value={(value as string) || (field.defaultValue as string) || ""}
            onValueChange={onChange}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block">
              {field.label}
            </label>
            {field.description && (
              <p className="text-[11px] text-zinc-400">{field.description}</p>
            )}
          </div>
          <Switch
            checked={(value as boolean) ?? (field.defaultValue as boolean) ?? false}
            onCheckedChange={onChange}
          />
        </div>
      );

    case "tags":
      return (
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">
            {field.label}
          </label>
          <Input
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Comma-separated values"
            className="h-8 text-xs"
          />
          {field.description && (
            <p className="text-[11px] text-zinc-400 mt-1">{field.description}</p>
          )}
        </div>
      );

    default:
      return null;
  }
}

function ValidationMessages({ messages }: { messages: ValidationMessage[] }) {
  if (messages.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={cn(
            "flex items-start gap-2 px-3 py-2 rounded-lg text-xs",
            msg.type === "error" && "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
            msg.type === "warning" && "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
            msg.type === "valid" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
          )}
        >
          {msg.type === "error" && <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
          {msg.type === "warning" && <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
          {msg.type === "valid" && <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
          <span>{msg.message}</span>
        </div>
      ))}
    </div>
  );
}

export default function ConfigPanel() {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const nodes = useCanvasStore((s) => s.nodes);
  const updateNodeConfig = useCanvasStore((s) => s.updateNodeConfig);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const selectNode = useCanvasStore((s) => s.selectNode);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-center h-full px-6">
          <div className="text-center">
            <Settings2 className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              No component selected
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Click a component on the canvas to configure it
            </p>
          </div>
        </div>
      </div>
    );
  }

  const compDef = componentMap.get(selectedNode.data.componentId);
  if (!compDef) return null;

  const providerLabel =
    selectedNode.data.provider === "aws"
      ? "AWS"
      : selectedNode.data.provider === "gcp"
        ? "GCP"
        : "Azure";

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Configuration
            </h3>
            <Badge
              variant={
                selectedNode.data.validationStatus === "valid"
                  ? "success"
                  : selectedNode.data.validationStatus === "warning"
                    ? "warning"
                    : "destructive"
              }
              className="text-[10px] h-4 px-1.5"
            >
              {selectedNode.data.validationStatus}
            </Badge>
          </div>
          <button
            onClick={() => selectNode(null)}
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {compDef.name}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {providerLabel} &middot; {compDef.category}
          </div>
        </div>
      </div>

      {/* Config fields */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-4">
          {/* Validation messages */}
          <ValidationMessages messages={selectedNode.data.validationMessages} />

          {selectedNode.data.validationMessages.length > 0 && (
            <Separator />
          )}

          {/* Dynamic form */}
          {compDef.configFields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={selectedNode.data.config[field.key]}
              onChange={(value) =>
                updateNodeConfig(selectedNode.id, { [field.key]: value })
              }
            />
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => {
            removeNode(selectedNode.id);
            selectNode(null);
          }}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Remove Component
        </Button>
      </div>
    </div>
  );
}
