// ============================================================
// Core Types for Infrastructure Design Canvas
// ============================================================

export type CloudProvider = "aws" | "gcp" | "azure";

export type ComponentCategory =
  | "compute"
  | "storage"
  | "database"
  | "networking"
  | "security";

export type ValidationStatus = "valid" | "warning" | "error";

// ============================================================
// Component Definition Types
// ============================================================

export interface ConnectionPort {
  id: string;
  type: "input" | "output";
  label: string;
  allowedTypes: string[]; // component type IDs that can connect
  position: "top" | "bottom" | "left" | "right";
  required?: boolean;
}

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "boolean" | "textarea" | "tags";
  description?: string;
  defaultValue?: string | number | boolean;
  options?: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
  dependsOn?: {
    field: string;
    value: string | boolean | number;
  };
}

export interface TerraformMapping {
  resourceType: string; // e.g., "aws_instance"
  module?: string; // e.g., "terraform-aws-modules/ec2-instance/aws"
  moduleVersion?: string;
  configMapping: Record<string, string>; // configKey -> terraform attribute
  outputs?: Record<string, string>; // output name -> attribute
  dependencies?: string[]; // required resource types
}

export interface ComponentDefinition {
  id: string;
  name: string;
  description: string;
  category: ComponentCategory;
  provider: CloudProvider;
  icon: string; // Lucide icon name
  color: string; // Tailwind color for the component
  ports: ConnectionPort[];
  configFields: ConfigField[];
  terraformMapping: TerraformMapping;
  defaultConfig: Record<string, unknown>;
}

// ============================================================
// Canvas Node Types (for React Flow)
// ============================================================

export type InfraNodeData = Record<string, unknown> & {
  componentId: string; // references ComponentDefinition.id
  label: string;
  provider: CloudProvider;
  category: ComponentCategory;
  config: Record<string, unknown>;
  validationStatus: ValidationStatus;
  validationMessages: ValidationMessage[];
  icon: string;
  color: string;
};

export interface ValidationMessage {
  type: ValidationStatus;
  message: string;
  field?: string;
}

// ============================================================
// Connection Types
// ============================================================

export interface ConnectionData {
  sourcePort: string;
  targetPort: string;
  label?: string;
  isValid: boolean;
}

// ============================================================
// Terraform Generation Types
// ============================================================

export interface TerraformFile {
  filename: string;
  content: string;
}

export interface TerraformOutput {
  mainTf: string;
  variablesTf: string;
  outputsTf: string;
  providerTf: string;
  terraformTfvars?: string;
}

export interface TerraformResource {
  id: string;
  nodeId: string;
  resourceType: string;
  resourceName: string;
  config: Record<string, unknown>;
  dependencies: string[];
  provider: CloudProvider;
  module?: string;
  moduleVersion?: string;
  outputs: Record<string, string>;
}

export interface DependencyGraph {
  nodes: Map<string, TerraformResource>;
  edges: Map<string, Set<string>>; // nodeId -> Set of dependency nodeIds
}

// ============================================================
// AI Chat Types
// ============================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  proposedChanges?: ProposedChange[];
}

// Proposed change uses a discriminated union so each change type
// carries exactly the fields it needs (tempId for add_node,
// source/target for connections, nodeId for modify/remove, etc.)
export type ProposedChange =
  | {
      type: "add_node";
      description: string;
      tempId: string; // e.g. "new-0" — referenced by add_connection
      componentId: string;
      position: { x: number; y: number };
      config?: Record<string, unknown>;
    }
  | {
      type: "add_connection";
      description: string;
      source: string; // tempId or existing node ID
      target: string; // tempId or existing node ID
    }
  | {
      type: "remove_node";
      description: string;
      nodeId: string;
    }
  | {
      type: "modify_node";
      description: string;
      nodeId: string;
      config: Record<string, unknown>;
    }
  | {
      type: "remove_connection";
      description: string;
      source: string;
      target: string;
    };

// ============================================================
// Canvas State Types
// ============================================================

export interface CanvasProject {
  id: string;
  name: string;
  description: string;
  providers: CloudProvider[];
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// Validation Rule Types
// ============================================================

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: "error" | "warning" | "info";
  check: (context: ValidationContext) => ValidationResult[];
}

export interface ValidationContext {
  nodes: InfraNodeData[];
  connections: { source: string; target: string; data: ConnectionData }[];
  componentDefs: Map<string, ComponentDefinition>;
}

export interface ValidationResult {
  ruleId: string;
  severity: "error" | "warning" | "info";
  message: string;
  nodeId?: string;
  field?: string;
}
