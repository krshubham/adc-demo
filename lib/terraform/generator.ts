import {
  CloudProvider,
  TerraformOutput,
  TerraformResource,
  InfraNodeData,
  ConnectionData,
} from "@/lib/types";
import { componentMap } from "@/lib/components";
import { Node, Edge } from "@xyflow/react";

// ============================================================
// Topological Sort for Dependency Ordering
// ============================================================

function topologicalSort(resources: TerraformResource[], edges: Edge[]): TerraformResource[] {
  const graph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  const resourceMap = new Map<string, TerraformResource>();

  // Initialize
  for (const r of resources) {
    graph.set(r.nodeId, new Set());
    inDegree.set(r.nodeId, 0);
    resourceMap.set(r.nodeId, r);
  }

  // Build adjacency list from edges (source depends on target or vice versa)
  // In React Flow, source -> target means source connects to target
  // For Terraform: if VPC -> EC2, EC2 depends on VPC
  for (const edge of edges) {
    if (graph.has(edge.source) && graph.has(edge.target)) {
      // target depends on source (source provides to target)
      graph.get(edge.source)!.add(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) queue.push(nodeId);
  }

  const sorted: TerraformResource[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const resource = resourceMap.get(current);
    if (resource) sorted.push(resource);

    for (const neighbor of graph.get(current) || []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Handle cycle: add remaining resources
  for (const r of resources) {
    if (!sorted.find((s) => s.nodeId === r.nodeId)) {
      sorted.push(r);
    }
  }

  return sorted;
}

// ============================================================
// Resource Name Sanitization
// ============================================================

function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// ============================================================
// HCL Value Formatting
// ============================================================

function formatHCLValue(value: unknown, indent: number = 2): string {
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number") return `${value}`;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((v) => formatHCLValue(v, indent + 2));
    return `[${items.join(", ")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const pad = " ".repeat(indent);
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${pad}${k} = ${formatHCLValue(v, indent + 2)}`)
      .join("\n");
    return `{\n${entries}\n${" ".repeat(indent - 2)}}`;
  }
  return `"${value}"`;
}

// ============================================================
// Build Resources from Canvas Nodes
// ============================================================

function buildResources(
  nodes: Node<InfraNodeData>[],
  edges: Edge[]
): TerraformResource[] {
  const resources: TerraformResource[] = [];

  for (const node of nodes) {
    const data = node.data;
    const compDef = componentMap.get(data.componentId);
    if (!compDef) continue;

    const name = sanitizeName(
      (data.config.name as string) ||
        (data.config.function_name as string) ||
        (data.config.bucket_name as string) ||
        (data.config.table_name as string) ||
        (data.config.service_name as string) ||
        data.label ||
        `${compDef.id}-${node.id.slice(0, 6)}`
    );

    // Find dependencies from edges
    const deps: string[] = [];
    for (const edge of edges) {
      if (edge.target === node.id) {
        deps.push(edge.source);
      }
    }

    resources.push({
      id: `${compDef.terraformMapping.resourceType}.${name}`,
      nodeId: node.id,
      resourceType: compDef.terraformMapping.resourceType,
      resourceName: name,
      config: data.config,
      dependencies: deps,
      provider: data.provider,
      module: compDef.terraformMapping.module,
      moduleVersion: compDef.terraformMapping.moduleVersion,
      outputs: compDef.terraformMapping.outputs || {},
    });
  }

  return resources;
}

// ============================================================
// Generate Provider Configuration
// ============================================================

function generateProviderTf(providers: Set<CloudProvider>, config: Record<string, string>): string {
  const lines: string[] = [
    `# ============================================================`,
    `# Provider Configuration`,
    `# Generated by Infrastructure Design Canvas`,
    `# ============================================================`,
    ``,
    `terraform {`,
    `  required_version = ">= 1.5.0"`,
    ``,
    `  required_providers {`,
  ];

  if (providers.has("aws")) {
    lines.push(
      `    aws = {`,
      `      source  = "hashicorp/aws"`,
      `      version = "~> 5.0"`,
      `    }`
    );
  }
  if (providers.has("gcp")) {
    lines.push(
      `    google = {`,
      `      source  = "hashicorp/google"`,
      `      version = "~> 5.0"`,
      `    }`
    );
  }
  if (providers.has("azure")) {
    lines.push(
      `    azurerm = {`,
      `      source  = "hashicorp/azurerm"`,
      `      version = "~> 3.0"`,
      `    }`
    );
  }

  lines.push(`  }`, ``);

  // Remote state (optional)
  lines.push(
    `  # Configure backend for remote state`,
    `  # backend "s3" {`,
    `  #   bucket = "terraform-state-bucket"`,
    `  #   key    = "infrastructure/terraform.tfstate"`,
    `  #   region = "us-east-1"`,
    `  # }`,
    `}`,
    ``
  );

  if (providers.has("aws")) {
    lines.push(
      `provider "aws" {`,
      `  region = var.aws_region`,
      ``,
      `  default_tags {`,
      `    tags = var.common_tags`,
      `  }`,
      `}`,
      ``
    );
  }
  if (providers.has("gcp")) {
    lines.push(
      `provider "google" {`,
      `  project = var.gcp_project_id`,
      `  region  = var.gcp_region`,
      `}`,
      ``
    );
  }
  if (providers.has("azure")) {
    lines.push(
      `provider "azurerm" {`,
      `  features {}`,
      ``,
      `  subscription_id = var.azure_subscription_id`,
      `}`,
      ``
    );
    // Azure requires a resource group
    lines.push(
      `# Azure Resource Group`,
      `resource "azurerm_resource_group" "main" {`,
      `  name     = var.azure_resource_group_name`,
      `  location = var.azure_location`,
      `  tags     = var.common_tags`,
      `}`,
      ``
    );
  }

  return lines.join("\n");
}

// ============================================================
// Generate Variables Configuration
// ============================================================

function generateVariablesTf(
  providers: Set<CloudProvider>,
  resources: TerraformResource[]
): string {
  const lines: string[] = [
    `# ============================================================`,
    `# Variables`,
    `# Generated by Infrastructure Design Canvas`,
    `# ============================================================`,
    ``,
    `variable "environment" {`,
    `  description = "Environment name (e.g., dev, staging, prod)"`,
    `  type        = string`,
    `  default     = "dev"`,
    `}`,
    ``,
    `variable "common_tags" {`,
    `  description = "Common tags to apply to all resources"`,
    `  type        = map(string)`,
    `  default = {`,
    `    ManagedBy   = "terraform"`,
    `    Environment = "dev"`,
    `    Project     = "infrastructure-canvas"`,
    `  }`,
    `}`,
    ``,
  ];

  if (providers.has("aws")) {
    lines.push(
      `variable "aws_region" {`,
      `  description = "AWS region"`,
      `  type        = string`,
      `  default     = "us-east-1"`,
      `}`,
      ``
    );
  }
  if (providers.has("gcp")) {
    lines.push(
      `variable "gcp_project_id" {`,
      `  description = "GCP project ID"`,
      `  type        = string`,
      `}`,
      ``,
      `variable "gcp_region" {`,
      `  description = "GCP region"`,
      `  type        = string`,
      `  default     = "us-central1"`,
      `}`,
      ``
    );
  }
  if (providers.has("azure")) {
    lines.push(
      `variable "azure_subscription_id" {`,
      `  description = "Azure subscription ID"`,
      `  type        = string`,
      `}`,
      ``,
      `variable "azure_resource_group_name" {`,
      `  description = "Azure resource group name"`,
      `  type        = string`,
      `  default     = "rg-infrastructure"`,
      `}`,
      ``,
      `variable "azure_location" {`,
      `  description = "Azure region/location"`,
      `  type        = string`,
      `  default     = "eastus"`,
      `}`,
      ``
    );
  }

  // Extract variables from resource configs
  const seenVars = new Set<string>();
  for (const resource of resources) {
    const compDef = [...componentMap.values()].find(
      (c) => c.terraformMapping.resourceType === resource.resourceType
    );
    if (!compDef) continue;

    for (const field of compDef.configFields) {
      if (field.required && !seenVars.has(field.key)) {
        seenVars.add(field.key);
        const varName = `${sanitizeName(resource.resourceName)}_${field.key}`;
        const configValue = resource.config[field.key];
        lines.push(
          `variable "${varName}" {`,
          `  description = "${field.description || field.label}"`,
          `  type        = ${field.type === "number" ? "number" : field.type === "boolean" ? "bool" : "string"}`,
        );
        if (configValue !== undefined && configValue !== "") {
          lines.push(`  default     = ${formatHCLValue(configValue)}`);
        }
        lines.push(`}`, ``);
      }
    }
  }

  return lines.join("\n");
}

// ============================================================
// Generate Main Configuration (Resources)
// ============================================================

function generateMainTf(
  sortedResources: TerraformResource[],
  edges: Edge[]
): string {
  const lines: string[] = [
    `# ============================================================`,
    `# Main Infrastructure Resources`,
    `# Generated by Infrastructure Design Canvas`,
    `# Resources ordered by dependency (topological sort)`,
    `# ============================================================`,
    ``,
  ];

  for (const resource of sortedResources) {
    const compDef = [...componentMap.values()].find(
      (c) => c.terraformMapping.resourceType === resource.resourceType
    );

    if (!compDef) continue;

    // Generate comment header for the resource
    lines.push(
      `# -----------------------------------------------`,
      `# ${compDef.name} - ${resource.resourceName}`,
      `# -----------------------------------------------`
    );

    if (resource.module) {
      // Module-based resource
      lines.push(
        `module "${resource.resourceName}" {`,
        `  source  = "${resource.module}"`,
        `  version = "${resource.moduleVersion || "latest"}"`,
        ``
      );
    } else {
      // Direct resource
      lines.push(
        `resource "${resource.resourceType}" "${resource.resourceName}" {`
      );
    }

    // Generate config attributes
    for (const [key, tfAttr] of Object.entries(
      compDef.terraformMapping.configMapping
    )) {
      const value = resource.config[key];
      if (value === undefined || value === "") continue;

      // Handle nested attributes (e.g., "root_block_device.volume_size")
      if (tfAttr.includes(".")) {
        const parts = tfAttr.split(".");
        if (parts.length === 2) {
          // Simple nested block
          lines.push(`  ${parts[0]} {`);
          lines.push(`    ${parts[1]} = ${formatHCLValue(value)}`);
          lines.push(`  }`);
        } else {
          // Deep nested - flatten to comment
          lines.push(`  # ${tfAttr} = ${formatHCLValue(value)}`);
        }
      } else {
        // Handle comma-separated values as lists
        if (typeof value === "string" && value.includes(",") && (key.includes("subnets") || key.includes("ports"))) {
          const items = value.split(",").map((v: string) => `"${v.trim()}"`);
          lines.push(`  ${tfAttr} = [${items.join(", ")}]`);
        } else {
          lines.push(`  ${tfAttr} = ${formatHCLValue(value)}`);
        }
      }
    }

    // Add dependency references
    const deps = resource.dependencies;
    if (deps.length > 0) {
      lines.push(``);
      const depRefs = deps
        .map((depNodeId) => {
          const depResource = sortedResources.find(
            (r) => r.nodeId === depNodeId
          );
          if (depResource) {
            if (depResource.module) {
              return `module.${depResource.resourceName}`;
            }
            return `${depResource.resourceType}.${depResource.resourceName}`;
          }
          return null;
        })
        .filter(Boolean);

      if (depRefs.length > 0) {
        lines.push(`  depends_on = [`);
        for (const ref of depRefs) {
          lines.push(`    ${ref},`);
        }
        lines.push(`  ]`);
      }
    }

    // Add tags for taggable resources
    if (resource.provider === "aws") {
      lines.push(``);
      lines.push(`  tags = merge(var.common_tags, {`);
      lines.push(`    Name = "${resource.resourceName}"`);
      lines.push(`  })`);
    }

    lines.push(`}`, ``);
  }

  return lines.join("\n");
}

// ============================================================
// Generate Outputs Configuration
// ============================================================

function generateOutputsTf(resources: TerraformResource[]): string {
  const lines: string[] = [
    `# ============================================================`,
    `# Outputs`,
    `# Generated by Infrastructure Design Canvas`,
    `# ============================================================`,
    ``,
  ];

  for (const resource of resources) {
    const compDef = [...componentMap.values()].find(
      (c) => c.terraformMapping.resourceType === resource.resourceType
    );
    if (!compDef) continue;

    for (const [outputName, attr] of Object.entries(resource.outputs)) {
      const fullOutputName = `${resource.resourceName}_${outputName}`;
      if (resource.module) {
        lines.push(
          `output "${fullOutputName}" {`,
          `  description = "${compDef.name} ${outputName}"`,
          `  value       = module.${resource.resourceName}.${attr}`,
          `}`,
          ``
        );
      } else {
        lines.push(
          `output "${fullOutputName}" {`,
          `  description = "${compDef.name} ${outputName}"`,
          `  value       = ${resource.resourceType}.${resource.resourceName}.${attr}`,
          `}`,
          ``
        );
      }
    }
  }

  return lines.join("\n");
}

// ============================================================
// Main Generator Entry Point
// ============================================================

export function generateTerraform(
  nodes: Node<InfraNodeData>[],
  edges: Edge[]
): TerraformOutput {
  if (nodes.length === 0) {
    return {
      providerTf: "# No resources configured. Add components to the canvas to generate Terraform code.",
      mainTf: "",
      variablesTf: "",
      outputsTf: "",
    };
  }

  // 1. Build resource list
  const resources = buildResources(nodes, edges);

  // 2. Topologically sort by dependencies
  const sorted = topologicalSort(resources, edges);

  // 3. Identify which providers are used
  const providers = new Set<CloudProvider>();
  for (const r of sorted) {
    providers.add(r.provider);
  }

  // 4. Generate each file
  const providerTf = generateProviderTf(providers, {});
  const variablesTf = generateVariablesTf(providers, sorted);
  const mainTf = generateMainTf(sorted, edges);
  const outputsTf = generateOutputsTf(sorted);

  return { providerTf, variablesTf, mainTf, outputsTf };
}
