"use client";

import { create } from "zustand";
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  addEdge,
} from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import {
  InfraNodeData,
  CloudProvider,
  ChatMessage,
  TerraformOutput,
  ValidationMessage,
  ProposedChange,
} from "@/lib/types";
import { componentMap } from "@/lib/components";
import { generateTerraform } from "@/lib/terraform/generator";
import { validateCanvas, getNodeValidationStatus } from "@/lib/validation";

// ============================================================
// Canvas Store Types
// ============================================================

interface CanvasState {
  // Canvas nodes and edges
  nodes: Node<InfraNodeData>[];
  edges: Edge[];

  // Selection
  selectedNodeId: string | null;

  // Provider filter
  activeProvider: CloudProvider | "all";

  // UI panels
  showChat: boolean;
  showCodePanel: boolean;
  showConfigPanel: boolean;

  // Chat
  chatMessages: ChatMessage[];
  isChatLoading: boolean;

  // Terraform output
  terraformOutput: TerraformOutput | null;

  // Validation results
  validationResults: Map<string, ValidationMessage[]>;

  // Actions
  onNodesChange: OnNodesChange<Node<InfraNodeData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;

  addNode: (componentId: string, position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
  selectNode: (nodeId: string | null) => void;

  setActiveProvider: (provider: CloudProvider | "all") => void;
  toggleChat: () => void;
  toggleCodePanel: () => void;
  toggleConfigPanel: () => void;

  addChatMessage: (message: ChatMessage) => void;
  setChatLoading: (loading: boolean) => void;

  generateTerraformCode: () => void;
  runValidation: () => void;

  // Bulk operations for AI — accepts the full ProposedChange[] array
  applyAIChanges: (changes: ProposedChange[]) => void;
}

// ============================================================
// Store Implementation
// ============================================================

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  activeProvider: "all",
  showChat: false,
  showCodePanel: false,
  showConfigPanel: true,
  chatMessages: [],
  isChatLoading: false,
  terraformOutput: null,
  validationResults: new Map(),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as Node<InfraNodeData>[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    const newEdge: Edge = {
      ...connection,
      id: `e-${uuidv4()}`,
      source: connection.source,
      target: connection.target,
      animated: true,
      style: { stroke: "#6366f1", strokeWidth: 2 },
    };
    set({
      edges: addEdge(newEdge, get().edges) as Edge[],
    });
    // Re-validate after connection
    setTimeout(() => get().runValidation(), 100);
  },

  addNode: (componentId, position) => {
    const compDef = componentMap.get(componentId);
    if (!compDef) return;

    const nodeId = `node-${uuidv4()}`;
    const newNode: Node<InfraNodeData> = {
      id: nodeId,
      type: "infraNode",
      position,
      data: {
        componentId,
        label: compDef.name,
        provider: compDef.provider,
        category: compDef.category,
        config: { ...compDef.defaultConfig },
        validationStatus: "valid",
        validationMessages: [],
        icon: compDef.icon,
        color: compDef.color,
      },
    };

    set({ nodes: [...get().nodes, newNode] });
    setTimeout(() => get().runValidation(), 100);
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      selectedNodeId:
        get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    });
    setTimeout(() => get().runValidation(), 100);
  },

  updateNodeConfig: (nodeId, config) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                config: { ...node.data.config, ...config },
              },
            }
          : node
      ),
    });
    setTimeout(() => get().runValidation(), 200);
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId, showConfigPanel: nodeId !== null });
  },

  setActiveProvider: (provider) => {
    set({ activeProvider: provider });
  },

  toggleChat: () => {
    set({ showChat: !get().showChat });
  },

  toggleCodePanel: () => {
    const show = !get().showCodePanel;
    if (show) {
      get().generateTerraformCode();
    }
    set({ showCodePanel: show });
  },

  toggleConfigPanel: () => {
    set({ showConfigPanel: !get().showConfigPanel });
  },

  addChatMessage: (message) => {
    set({ chatMessages: [...get().chatMessages, message] });
  },

  setChatLoading: (loading) => {
    set({ isChatLoading: loading });
  },

  generateTerraformCode: () => {
    const { nodes, edges } = get();
    const output = generateTerraform(nodes, edges);
    set({ terraformOutput: output });
  },

  runValidation: () => {
    const { nodes, edges } = get();
    const results = validateCanvas(nodes, edges);

    // Update node validation status
    const updatedNodes = nodes.map((node) => {
      const messages = results.get(node.id) || [];
      return {
        ...node,
        data: {
          ...node.data,
          validationStatus: getNodeValidationStatus(messages),
          validationMessages: messages,
        },
      };
    });

    set({
      nodes: updatedNodes as Node<InfraNodeData>[],
      validationResults: results,
    });
  },

  applyAIChanges: (changes) => {
    const state = get();
    let newNodes = [...state.nodes];
    let newEdges = [...state.edges];

    // tempId -> real node ID mapping (for resolving connection references)
    const tempIdMap = new Map<string, string>();

    // Process changes in order — add_node MUST come before add_connection
    for (const change of changes) {
      switch (change.type) {
        case "add_node": {
          const compDef = componentMap.get(change.componentId);
          if (!compDef) continue;

          const nodeId = `node-${uuidv4()}`;
          tempIdMap.set(change.tempId, nodeId);

          newNodes.push({
            id: nodeId,
            type: "infraNode",
            position: change.position,
            data: {
              componentId: change.componentId,
              label: compDef.name,
              provider: compDef.provider,
              category: compDef.category,
              config: { ...compDef.defaultConfig, ...change.config },
              validationStatus: "valid",
              validationMessages: [],
              icon: compDef.icon,
              color: compDef.color,
            },
          });
          break;
        }

        case "add_connection": {
          // Resolve tempId references or use existing node IDs
          const sourceId = tempIdMap.get(change.source) || change.source;
          const targetId = tempIdMap.get(change.target) || change.target;
          newEdges.push({
            id: `e-${uuidv4()}`,
            source: sourceId,
            target: targetId,
            animated: true,
            style: { stroke: "#6366f1", strokeWidth: 2 },
          });
          break;
        }

        case "remove_node": {
          newNodes = newNodes.filter((n) => n.id !== change.nodeId);
          newEdges = newEdges.filter(
            (e) => e.source !== change.nodeId && e.target !== change.nodeId
          );
          break;
        }

        case "modify_node": {
          newNodes = newNodes.map((n) =>
            n.id === change.nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    config: { ...n.data.config, ...change.config },
                  },
                }
              : n
          );
          break;
        }

        case "remove_connection": {
          newEdges = newEdges.filter(
            (e) => !(e.source === change.source && e.target === change.target)
          );
          break;
        }
      }
    }

    set({ nodes: newNodes as Node<InfraNodeData>[], edges: newEdges });
    setTimeout(() => get().runValidation(), 100);
  },
}));
