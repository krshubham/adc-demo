"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { InfraNodeData } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Server,
  Zap,
  Database,
  HardDrive,
  Table,
  Network,
  GitBranch,
  Globe,
  ArrowRightLeft,
  Shield,
  Lock,
  Key,
  Container,
  Flame,
  Cpu,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Server, Zap, Database, HardDrive, Table, Network,
  GitBranch, Globe, ArrowRightLeft, Shield, Lock, Key,
  Container, Flame, Cpu,
};

const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    text: "text-orange-700 dark:text-orange-300",
    iconBg: "bg-orange-100 dark:bg-orange-900/50",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
  },
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-700 dark:text-purple-300",
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-300",
    iconBg: "bg-red-100 dark:bg-red-900/50",
  },
  cyan: {
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    border: "border-cyan-200 dark:border-cyan-800",
    text: "text-cyan-700 dark:text-cyan-300",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/50",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
  },
};

const validationColors: Record<string, string> = {
  valid: "ring-emerald-400",
  warning: "ring-amber-400",
  error: "ring-red-400",
};

const validationDot: Record<string, string> = {
  valid: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InfraNodeComponent(props: any) {
  const { data, selected } = props;
  const nodeData = data as InfraNodeData;
  const IconComp = iconMap[nodeData.icon] || Server;
  const colors = colorMap[nodeData.color] || colorMap.blue;
  const providerLabel =
    nodeData.provider === "aws"
      ? "AWS"
      : nodeData.provider === "gcp"
        ? "GCP"
        : "Azure";

  const configName = (nodeData.config.name ||
    nodeData.config.function_name ||
    nodeData.config.bucket_name ||
    nodeData.config.service_name ||
    nodeData.config.table_name) as string | undefined;

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 shadow-lg transition-all duration-200 min-w-[180px]",
        colors.bg,
        colors.border,
        selected && `ring-2 ${validationColors[nodeData.validationStatus]} shadow-xl scale-105`,
        !selected && "hover:shadow-xl hover:scale-[1.02]"
      )}
    >
      {/* Top handle (input) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white dark:!border-zinc-900 !rounded-full !-top-1.5 transition-all hover:!scale-125 hover:!bg-indigo-400"
      />

      {/* Validation indicator */}
      <div className="absolute -top-1.5 -right-1.5 z-10">
        <div
          className={cn(
            "w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900",
            validationDot[nodeData.validationStatus]
          )}
        />
      </div>

      {/* Node content */}
      <div className="px-4 py-3">
        {/* Provider badge */}
        <div className="flex items-center justify-between mb-2">
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
              colors.text,
              colors.iconBg
            )}
          >
            {providerLabel}
          </span>
          <span className="text-[10px] text-zinc-400 capitalize">
            {nodeData.category}
          </span>
        </div>

        {/* Icon + Name */}
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center",
              colors.text,
              colors.iconBg
            )}
          >
            <IconComp className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {nodeData.label}
            </div>
            {configName && (
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {configName}
              </div>
            )}
          </div>
        </div>

        {/* Validation messages preview */}
        {nodeData.validationMessages.length > 0 && (
          <div className="mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
            <div
              className={cn(
                "text-[10px] truncate",
                nodeData.validationStatus === "error"
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400"
              )}
            >
              {nodeData.validationMessages[0].message}
            </div>
            {nodeData.validationMessages.length > 1 && (
              <div className="text-[10px] text-zinc-400 mt-0.5">
                +{nodeData.validationMessages.length - 1} more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom handle (output) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white dark:!border-zinc-900 !rounded-full !-bottom-1.5 transition-all hover:!scale-125 hover:!bg-indigo-400"
      />
    </div>
  );
}

export default memo(InfraNodeComponent);
