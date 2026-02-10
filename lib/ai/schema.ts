import { z } from "zod";

// ============================================================
// Zod schema for AI-generated infrastructure changes
// ============================================================

export const addNodeChangeSchema = z.object({
  type: z.literal("add_node"),
  description: z.string().describe("Brief human-readable description of what is being added"),
  tempId: z.string().describe("Temporary ID for this node (e.g. 'new-0', 'new-1'). Used by add_connection to reference nodes that don't exist yet."),
  componentId: z.string().describe("The component definition ID from the available components list (e.g. 'aws-ec2', 'aws-vpc')"),
  position: z.object({
    x: z.number().describe("X position on the canvas"),
    y: z.number().describe("Y position on the canvas"),
  }),
  config: z.array(
    z.object({
      key: z.string().describe("Configuration key name"),
      value: z.string().describe("Configuration value (as string — numbers/booleans will be coerced)"),
    })
  ).describe("Configuration key-value pairs for this component. Use empty array [] if no config needed."),
});

export const addConnectionChangeSchema = z.object({
  type: z.literal("add_connection"),
  description: z.string().describe("Brief description of the connection being made"),
  source: z.string().describe("The tempId of a newly proposed node (e.g. 'new-0') OR an existing node ID from the canvas state"),
  target: z.string().describe("The tempId of a newly proposed node (e.g. 'new-1') OR an existing node ID from the canvas state"),
});

export const removeNodeChangeSchema = z.object({
  type: z.literal("remove_node"),
  description: z.string().describe("Brief description of why this node is being removed"),
  nodeId: z.string().describe("The existing node ID to remove"),
});

export const modifyNodeChangeSchema = z.object({
  type: z.literal("modify_node"),
  description: z.string().describe("Brief description of what is being changed"),
  nodeId: z.string().describe("The existing node ID to modify"),
  config: z.array(
    z.object({
      key: z.string().describe("Configuration key name"),
      value: z.string().describe("Configuration value (as string — numbers/booleans will be coerced)"),
    })
  ).describe("Configuration key-value pairs to update (merged with existing config)"),
});

export const removeConnectionChangeSchema = z.object({
  type: z.literal("remove_connection"),
  description: z.string().describe("Brief description of why this connection is being removed"),
  source: z.string().describe("Source node ID of the connection to remove"),
  target: z.string().describe("Target node ID of the connection to remove"),
});

export const proposedChangeSchema = z.discriminatedUnion("type", [
  addNodeChangeSchema,
  addConnectionChangeSchema,
  removeNodeChangeSchema,
  modifyNodeChangeSchema,
  removeConnectionChangeSchema,
]);

export const aiResponseSchema = z.object({
  message: z.string().describe("A helpful explanation of what you suggest and why. Use markdown for formatting."),
  proposedChanges: z.array(proposedChangeSchema).describe("Ordered list of changes to apply. Put add_node items BEFORE add_connection items that reference them."),
});

// ============================================================
// Inferred types from Zod schemas
// ============================================================

export type AIResponse = z.infer<typeof aiResponseSchema>;
export type ProposedChangeZ = z.infer<typeof proposedChangeSchema>;
export type AddNodeChange = z.infer<typeof addNodeChangeSchema>;
export type AddConnectionChange = z.infer<typeof addConnectionChangeSchema>;
export type RemoveNodeChange = z.infer<typeof removeNodeChangeSchema>;
export type ModifyNodeChange = z.infer<typeof modifyNodeChangeSchema>;
export type RemoveConnectionChange = z.infer<typeof removeConnectionChangeSchema>;

// ============================================================
// Helpers — convert array config to Record for the client
// ============================================================

/** Coerce string values to appropriate JS types */
function coerceValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== "") return num;
  return value;
}

/** Convert [{key, value}] config arrays → Record<string, unknown> */
function configArrayToRecord(
  config: { key: string; value: string }[]
): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const { key, value } of config) {
    record[key] = coerceValue(value);
  }
  return record;
}

/**
 * Normalize the AI SDK's array-config response into the Record-config
 * shape that the rest of the application (store, types) expects.
 */
export function normalizeAIResponse(raw: AIResponse) {
  return {
    message: raw.message,
    proposedChanges: raw.proposedChanges.map((change) => {
      switch (change.type) {
        case "add_node":
          return {
            ...change,
            config: configArrayToRecord(change.config),
          };
        case "modify_node":
          return {
            ...change,
            config: configArrayToRecord(change.config),
          };
        default:
          return change;
      }
    }),
  };
}
