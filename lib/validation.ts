import { Node, Edge } from "@xyflow/react";
import {
  InfraNodeData,
  ValidationResult,
  ValidationMessage,
} from "@/lib/types";
import { componentMap } from "@/lib/components";

// ============================================================
// Validation Engine
// ============================================================

export function validateCanvas(
  nodes: Node<InfraNodeData>[],
  edges: Edge[]
): Map<string, ValidationMessage[]> {
  const results = new Map<string, ValidationMessage[]>();

  // Initialize empty arrays for all nodes
  for (const node of nodes) {
    results.set(node.id, []);
  }

  // Run all validation rules
  validateRequiredFields(nodes, results);
  validateConnections(nodes, edges, results);
  validateSecurityBestPractices(nodes, edges, results);
  validateNetworkArchitecture(nodes, edges, results);
  validateNamingConventions(nodes, results);

  return results;
}

// ============================================================
// Rule: Required Fields
// ============================================================

function validateRequiredFields(
  nodes: Node<InfraNodeData>[],
  results: Map<string, ValidationMessage[]>
) {
  for (const node of nodes) {
    const compDef = componentMap.get(node.data.componentId);
    if (!compDef) continue;

    for (const field of compDef.configFields) {
      if (field.required) {
        const value = node.data.config[field.key];
        if (value === undefined || value === "" || value === null) {
          results.get(node.id)!.push({
            type: "error",
            message: `Required field "${field.label}" is not configured`,
            field: field.key,
          });
        }
      }

      // Validate patterns
      if (field.validation?.pattern && node.data.config[field.key]) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(String(node.data.config[field.key]))) {
          results.get(node.id)!.push({
            type: "error",
            message: field.validation.message || `Invalid value for "${field.label}"`,
            field: field.key,
          });
        }
      }

      // Validate numeric ranges
      if (field.type === "number" && node.data.config[field.key] !== undefined) {
        const num = Number(node.data.config[field.key]);
        if (field.validation?.min !== undefined && num < field.validation.min) {
          results.get(node.id)!.push({
            type: "error",
            message: `"${field.label}" must be at least ${field.validation.min}`,
            field: field.key,
          });
        }
        if (field.validation?.max !== undefined && num > field.validation.max) {
          results.get(node.id)!.push({
            type: "error",
            message: `"${field.label}" must be at most ${field.validation.max}`,
            field: field.key,
          });
        }
      }
    }
  }
}

// ============================================================
// Rule: Connection Validity
// ============================================================

function validateConnections(
  nodes: Node<InfraNodeData>[],
  edges: Edge[],
  results: Map<string, ValidationMessage[]>
) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    const sourceDef = componentMap.get(sourceNode.data.componentId);
    const targetDef = componentMap.get(targetNode.data.componentId);
    if (!sourceDef || !targetDef) continue;

    // Check if connection is between compatible providers
    if (sourceNode.data.provider !== targetNode.data.provider) {
      results.get(edge.source)!.push({
        type: "warning",
        message: `Cross-provider connection to ${targetDef.name} (${targetNode.data.provider.toUpperCase()}) — may require additional configuration`,
      });
    }

    // Check if target accepts connections from source type
    const targetInputPorts = targetDef.ports.filter((p) => p.type === "input");
    const isValidConnection = targetInputPorts.some((port) =>
      port.allowedTypes.includes(sourceDef.id)
    );
    const sourceOutputPorts = sourceDef.ports.filter((p) => p.type === "output");
    const isValidFromSource = sourceOutputPorts.some((port) =>
      port.allowedTypes.includes(targetDef.id)
    );

    if (!isValidConnection && !isValidFromSource) {
      results.get(edge.target)!.push({
        type: "warning",
        message: `Connection from ${sourceDef.name} may not be typical for ${targetDef.name}`,
      });
    }
  }

  // Check for orphaned resources (no connections)
  for (const node of nodes) {
    const hasEdge = edges.some(
      (e) => e.source === node.id || e.target === node.id
    );
    const compDef = componentMap.get(node.data.componentId);
    if (!hasEdge && compDef) {
      // Some resources are expected to be standalone
      const standaloneTypes = ["aws-vpc", "gcp-vpc", "azure-vnet", "aws-iam", "gcp-iam", "azure-rbac"];
      if (!standaloneTypes.includes(node.data.componentId)) {
        results.get(node.id)!.push({
          type: "warning",
          message: `${compDef.name} is not connected to any other resource`,
        });
      }
    }
  }
}

// ============================================================
// Rule: Security Best Practices
// ============================================================

function validateSecurityBestPractices(
  nodes: Node<InfraNodeData>[],
  edges: Edge[],
  results: Map<string, ValidationMessage[]>
) {
  for (const node of nodes) {
    const compId = node.data.componentId;
    const config = node.data.config;

    // S3: Check public access
    if (compId === "aws-s3" && config.public_access_block === false) {
      results.get(node.id)!.push({
        type: "warning",
        message: "S3 bucket has public access enabled — ensure this is intentional",
      });
    }

    // EC2: Public IP without security group
    if (compId === "aws-ec2" && config.associate_public_ip === true) {
      const hasSG = edges.some((e) => {
        const sourceNode = nodes.find((n) => n.id === e.source);
        return e.target === node.id && sourceNode?.data.componentId === "aws-sg";
      });
      if (!hasSG) {
        results.get(node.id)!.push({
          type: "warning",
          message: "EC2 instance has public IP but no Security Group attached",
        });
      }
    }

    // RDS: Multi-AZ recommended for production
    if (compId === "aws-rds" && config.multi_az === false) {
      results.get(node.id)!.push({
        type: "warning",
        message: "Consider enabling Multi-AZ for production database deployments",
      });
    }

    // Security groups with 0.0.0.0/0
    if (compId === "aws-sg" && config.ingress_cidr === "0.0.0.0/0") {
      results.get(node.id)!.push({
        type: "warning",
        message: "Security group allows traffic from all IPs (0.0.0.0/0) — restrict in production",
      });
    }

    // GCP Firewall with open source ranges
    if (compId === "gcp-firewall" && config.source_ranges === "0.0.0.0/0") {
      results.get(node.id)!.push({
        type: "warning",
        message: "Firewall allows traffic from all IPs — restrict source ranges in production",
      });
    }

    // Azure NSG with open source
    if (compId === "azure-nsg" && config.source_address === "*") {
      results.get(node.id)!.push({
        type: "warning",
        message: "NSG allows traffic from any source — restrict in production",
      });
    }

    // Encryption checks
    if (compId === "aws-ebs" && config.encrypted === false) {
      results.get(node.id)!.push({
        type: "warning",
        message: "EBS volume is not encrypted — recommended to enable encryption",
      });
    }
  }
}

// ============================================================
// Rule: Network Architecture
// ============================================================

function validateNetworkArchitecture(
  nodes: Node<InfraNodeData>[],
  edges: Edge[],
  results: Map<string, ValidationMessage[]>
) {
  // Check that compute resources have VPC/VNet
  const computeNodes = nodes.filter(
    (n) => n.data.category === "compute" && !["aws-lambda", "gcp-cloud-run"].includes(n.data.componentId)
  );
  const networkNodes = nodes.filter((n) => n.data.category === "networking");

  for (const compute of computeNodes) {
    const hasNetwork = edges.some((e) => {
      const sourceNode = nodes.find((n) => n.id === e.source);
      return (
        e.target === compute.id &&
        sourceNode?.data.category === "networking"
      );
    });

    if (!hasNetwork && networkNodes.length === 0) {
      const compDef = componentMap.get(compute.data.componentId);
      results.get(compute.id)!.push({
        type: "warning",
        message: `${compDef?.name || "Compute resource"} should be placed within a VPC/VNet for proper network isolation`,
      });
    }
  }

  // Check database resources have proper network placement
  const dbNodes = nodes.filter((n) => n.data.category === "database");
  for (const db of dbNodes) {
    const hasNetwork = edges.some((e) => {
      const sourceNode = nodes.find((n) => n.id === e.source);
      return (
        e.target === db.id &&
        (sourceNode?.data.category === "networking" ||
          sourceNode?.data.category === "security")
      );
    });

    if (!hasNetwork && networkNodes.length > 0) {
      const compDef = componentMap.get(db.data.componentId);
      results.get(db.id)!.push({
        type: "warning",
        message: `${compDef?.name || "Database"} should be connected to a VPC/VNet and security group`,
      });
    }
  }
}

// ============================================================
// Rule: Naming Conventions
// ============================================================

function validateNamingConventions(
  nodes: Node<InfraNodeData>[],
  results: Map<string, ValidationMessage[]>
) {
  const names = new Map<string, string[]>();

  for (const node of nodes) {
    const config = node.data.config;
    const name =
      (config.name as string) ||
      (config.function_name as string) ||
      (config.bucket_name as string) ||
      (config.table_name as string) ||
      (config.service_name as string);

    if (name) {
      if (!names.has(name)) {
        names.set(name, []);
      }
      names.get(name)!.push(node.id);
    }
  }

  // Check for duplicate names
  for (const [name, nodeIds] of names) {
    if (nodeIds.length > 1) {
      for (const nodeId of nodeIds) {
        results.get(nodeId)?.push({
          type: "error",
          message: `Duplicate resource name "${name}" — names must be unique`,
        });
      }
    }
  }
}

// ============================================================
// Get overall validation status for a node
// ============================================================

export function getNodeValidationStatus(
  messages: ValidationMessage[]
): "valid" | "warning" | "error" {
  if (messages.some((m) => m.type === "error")) return "error";
  if (messages.some((m) => m.type === "warning")) return "warning";
  return "valid";
}
