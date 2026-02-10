"use client";

import React, { useEffect, useState } from "react";
import { useCanvasStore } from "@/lib/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Copy,
  Check,
  Download,
  RefreshCw,
  FileCode2,
  File,
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// Simple syntax highlighting for Terraform HCL
function highlightHCL(code: string): React.ReactNode[] {
  const lines = code.split("\n");
  return lines.map((line, lineIndex) => {
    const elements: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    // Comments
    if (remaining.trimStart().startsWith("#")) {
      return (
        <div key={lineIndex} className="table-row">
          <span className="table-cell pr-4 text-right select-none text-zinc-400 dark:text-zinc-600 text-xs w-8">
            {lineIndex + 1}
          </span>
          <span className="table-cell text-zinc-400 dark:text-zinc-500 italic">
            {line}
          </span>
        </div>
      );
    }

    // Process the line with regex-based highlighting
    const parts: React.ReactNode[] = [];
    let match;

    // Keywords
    const keywordPattern = /\b(resource|module|variable|output|provider|terraform|data|locals|required_version|required_providers|source|version|type|default|description|depends_on|backend|features)\b/g;
    const stringPattern = /"([^"\\]|\\.)*"/g;
    const boolPattern = /\b(true|false)\b/g;
    const numberPattern = /\b(\d+(\.\d+)?)\b/g;

    // Simple approach: highlight the whole line
    let highlighted = line;
    // We'll use spans with dangerouslySetInnerHTML but build it safely

    parts.push(
      <span key={key++}>
        {line.split(/("(?:[^"\\]|\\.)*")/g).map((segment, si) => {
          if (segment.startsWith('"') && segment.endsWith('"')) {
            return (
              <span key={si} className="text-emerald-600 dark:text-emerald-400">
                {segment}
              </span>
            );
          }
          // Highlight keywords, bools, numbers within non-string segments
          return segment.split(/(\b(?:resource|module|variable|output|provider|terraform|data|locals|required_version|required_providers|source|version|type|default|description|depends_on|backend|features)\b)/g).map((part, pi) => {
            if (/^(resource|module|variable|output|provider|terraform|data|locals|required_version|required_providers|source|version|type|default|description|depends_on|backend|features)$/.test(part)) {
              return (
                <span key={`${si}-${pi}`} className="text-purple-600 dark:text-purple-400 font-medium">
                  {part}
                </span>
              );
            }
            // Bool highlighting
            return part.split(/(\btrue\b|\bfalse\b)/g).map((bPart, bi) => {
              if (bPart === "true" || bPart === "false") {
                return (
                  <span key={`${si}-${pi}-${bi}`} className="text-amber-600 dark:text-amber-400">
                    {bPart}
                  </span>
                );
              }
              // Number highlighting
              return bPart.split(/(\b\d+(?:\.\d+)?\b)/g).map((nPart, ni) => {
                if (/^\d+(?:\.\d+)?$/.test(nPart)) {
                  return (
                    <span key={`${si}-${pi}-${bi}-${ni}`} className="text-blue-600 dark:text-blue-400">
                      {nPart}
                    </span>
                  );
                }
                // Brace/bracket highlighting
                return nPart.split(/([{}[\]()])/g).map((sPart, ssi) => {
                  if (/^[{}[\]()]$/.test(sPart)) {
                    return (
                      <span key={`${si}-${pi}-${bi}-${ni}-${ssi}`} className="text-zinc-500 dark:text-zinc-400 font-medium">
                        {sPart}
                      </span>
                    );
                  }
                  return <span key={`${si}-${pi}-${bi}-${ni}-${ssi}`}>{sPart}</span>;
                });
              });
            });
          });
        })}
      </span>
    );

    return (
      <div key={lineIndex} className="table-row leading-6">
        <span className="table-cell pr-4 text-right select-none text-zinc-400 dark:text-zinc-600 text-xs w-8 font-mono">
          {lineIndex + 1}
        </span>
        <span className="table-cell font-mono text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre">
          {parts}
        </span>
      </div>
    );
  });
}

function CodeBlock({
  code,
  filename,
}: {
  code: string;
  filename: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative h-full">
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 mr-1 text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <ScrollArea className="h-full">
        <div className="p-4">
          <div className="table w-full">{highlightHCL(code)}</div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default function CodePanel() {
  const terraformOutput = useCanvasStore((s) => s.terraformOutput);
  const generateTerraformCode = useCanvasStore((s) => s.generateTerraformCode);
  const nodes = useCanvasStore((s) => s.nodes);

  useEffect(() => {
    generateTerraformCode();
  }, [nodes.length, generateTerraformCode]);

  const handleDownloadZip = async () => {
    if (!terraformOutput) return;

    const zip = new JSZip();
    zip.file("provider.tf", terraformOutput.providerTf);
    zip.file("variables.tf", terraformOutput.variablesTf);
    zip.file("main.tf", terraformOutput.mainTf);
    zip.file("outputs.tf", terraformOutput.outputsTf);

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "infrastructure-terraform.zip");
  };

  const files = [
    { id: "provider", label: "provider.tf", content: terraformOutput?.providerTf || "" },
    { id: "main", label: "main.tf", content: terraformOutput?.mainTf || "" },
    { id: "variables", label: "variables.tf", content: terraformOutput?.variablesTf || "" },
    { id: "outputs", label: "outputs.tf", content: terraformOutput?.outputsTf || "" },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Terraform Code
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={generateTerraformCode}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Regenerate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadZip}
              className="h-7 px-2 text-xs"
              disabled={!terraformOutput || nodes.length === 0}
            >
              <Download className="w-3 h-3 mr-1" />
              Download ZIP
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {nodes.length} resources
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {files.filter((f) => f.content.trim().length > 0).length} files
          </Badge>
        </div>
      </div>

      {/* Code tabs */}
      <Tabs defaultValue="provider" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-2 justify-start w-auto h-8">
          {files.map((file) => (
            <TabsTrigger key={file.id} value={file.id} className="text-xs h-7 px-2.5 gap-1.5">
              <File className="w-3 h-3" />
              {file.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {files.map((file) => (
          <TabsContent
            key={file.id}
            value={file.id}
            className="flex-1 min-h-0 m-0"
          >
            {file.content ? (
              <CodeBlock code={file.content} filename={file.label} />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
                No content generated yet
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
