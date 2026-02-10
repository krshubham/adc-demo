import { ComponentDefinition, CloudProvider, ComponentCategory } from "@/lib/types";
import { awsComponents } from "./aws";
import { gcpComponents } from "./gcp";
import { azureComponents } from "./azure";

// All component definitions combined
export const allComponents: ComponentDefinition[] = [
  ...awsComponents,
  ...gcpComponents,
  ...azureComponents,
];

// Component map for quick lookup by ID
export const componentMap = new Map<string, ComponentDefinition>(
  allComponents.map((c) => [c.id, c])
);

// Get components filtered by provider
export function getComponentsByProvider(
  provider: CloudProvider
): ComponentDefinition[] {
  return allComponents.filter((c) => c.provider === provider);
}

// Get components filtered by category
export function getComponentsByCategory(
  category: ComponentCategory
): ComponentDefinition[] {
  return allComponents.filter((c) => c.category === category);
}

// Get components filtered by provider and category
export function getComponents(
  provider?: CloudProvider,
  category?: ComponentCategory
): ComponentDefinition[] {
  return allComponents.filter(
    (c) =>
      (!provider || c.provider === provider) &&
      (!category || c.category === category)
  );
}

// Category display info
export const categoryInfo: Record<
  ComponentCategory,
  { label: string; icon: string; color: string }
> = {
  compute: { label: "Compute", icon: "Cpu", color: "orange" },
  storage: { label: "Storage", icon: "HardDrive", color: "green" },
  database: { label: "Database", icon: "Database", color: "blue" },
  networking: { label: "Networking", icon: "Network", color: "purple" },
  security: { label: "Security", icon: "Shield", color: "red" },
};

// Provider display info
export const providerInfo: Record<
  CloudProvider,
  { label: string; color: string; bgColor: string }
> = {
  aws: { label: "AWS", color: "text-orange-600", bgColor: "bg-orange-50" },
  gcp: { label: "Google Cloud", color: "text-blue-600", bgColor: "bg-blue-50" },
  azure: { label: "Azure", color: "text-cyan-600", bgColor: "bg-cyan-50" },
};
