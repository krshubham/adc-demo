"use client";

import React, { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCanvasStore } from "@/lib/store";
import {
  getComponents,
  categoryInfo,
  providerInfo,
} from "@/lib/components";
import {
  CloudProvider,
  ComponentCategory,
  ComponentDefinition,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Search,
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
  GripVertical,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Server, Zap, Database, HardDrive, Table, Network,
  GitBranch, Globe, ArrowRightLeft, Shield, Lock, Key,
  Container, Flame, Cpu,
};

const providerTabs: { id: CloudProvider | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "aws", label: "AWS" },
  { id: "gcp", label: "GCP" },
  { id: "azure", label: "Azure" },
];

function ComponentCard({ component }: { component: ComponentDefinition }) {
  const Icon = iconMap[component.icon] || Server;
  const provider = providerInfo[component.provider];

  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("application/infraComponent", component.id);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing",
        "border border-zinc-200 dark:border-zinc-700",
        "bg-white dark:bg-zinc-800/50",
        "hover:bg-zinc-50 dark:hover:bg-zinc-800",
        "hover:border-indigo-300 dark:hover:border-indigo-700",
        "hover:shadow-md transition-all duration-150",
        "group select-none"
      )}
    >
      <GripVertical className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 dark:group-hover:text-zinc-500 flex-shrink-0" />
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          provider.bgColor
        )}
      >
        <Icon className={cn("w-4 h-4", provider.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
          {component.name}
        </div>
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
          {component.description}
        </div>
      </div>
    </div>
  );
}

export default function ComponentLibrary() {
  const [search, setSearch] = useState("");
  const activeProvider = useCanvasStore((s) => s.activeProvider);
  const setActiveProvider = useCanvasStore((s) => s.setActiveProvider);

  const filteredComponents = getComponents(
    activeProvider === "all" ? undefined : activeProvider
  ).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  const categories: ComponentCategory[] = [
    "compute",
    "storage",
    "database",
    "networking",
    "security",
  ];

  const groupedByCategory = categories.reduce(
    (acc, cat) => {
      acc[cat] = filteredComponents.filter((c) => c.category === cat);
      return acc;
    },
    {} as Record<ComponentCategory, ComponentDefinition[]>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Components
        </h2>

        {/* Provider filter */}
        <div className="flex gap-1 mb-3">
          {providerTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveProvider(tab.id)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                activeProvider === tab.id
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input
            placeholder="Search components..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Component list */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-2">
          <Accordion type="multiple" defaultValue={categories} className="w-full">
            {categories.map((cat) => {
              const components = groupedByCategory[cat];
              if (components.length === 0) return null;
              const info = categoryInfo[cat];

              return (
                <AccordionItem key={cat} value={cat} className="border-b-0">
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        {info.label}
                      </span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {components.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-1.5 pb-2">
                      {components.map((comp) => (
                        <ComponentCard key={comp.id} component={comp} />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {filteredComponents.length === 0 && (
            <div className="text-center py-8 text-sm text-zinc-400">
              No components found
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer hint */}
      <div className="px-4 py-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
        <p className="text-[11px] text-zinc-400 text-center">
          Drag components onto the canvas to design your infrastructure
        </p>
      </div>
    </div>
  );
}
