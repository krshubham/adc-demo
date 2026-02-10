import { ComponentDefinition } from "@/lib/types";

export const azureComponents: ComponentDefinition[] = [
  // ====================== COMPUTE ======================
  {
    id: "azure-vm",
    name: "Virtual Machine",
    description: "Azure Virtual Machine",
    category: "compute",
    provider: "azure",
    icon: "Server",
    color: "cyan",
    ports: [
      { id: "vm-in", type: "input", label: "Network", allowedTypes: ["azure-vnet", "azure-nsg", "azure-lb"], position: "top" },
      { id: "vm-out", type: "output", label: "Access", allowedTypes: ["azure-blob", "azure-managed-disk", "azure-cosmos", "azure-sql"], position: "bottom" },
    ],
    configFields: [
      { key: "name", label: "VM Name", type: "text", required: true, placeholder: "my-vm" },
      { key: "vm_size", label: "VM Size", type: "select", defaultValue: "Standard_B1s", options: [
        { label: "Standard_B1s", value: "Standard_B1s" }, { label: "Standard_B2s", value: "Standard_B2s" },
        { label: "Standard_D2s_v5", value: "Standard_D2s_v5" }, { label: "Standard_D4s_v5", value: "Standard_D4s_v5" },
        { label: "Standard_E2s_v5", value: "Standard_E2s_v5" },
      ]},
      { key: "os_type", label: "OS Type", type: "select", defaultValue: "Linux", options: [
        { label: "Linux (Ubuntu 22.04)", value: "Linux" }, { label: "Windows Server 2022", value: "Windows" },
      ]},
      { key: "admin_username", label: "Admin Username", type: "text", defaultValue: "azureuser" },
      { key: "os_disk_size", label: "OS Disk Size (GB)", type: "number", defaultValue: 30 },
    ],
    terraformMapping: {
      resourceType: "azurerm_linux_virtual_machine",
      module: "Azure/compute/azurerm",
      configMapping: {
        name: "name", vm_size: "size", admin_username: "admin_username",
        os_disk_size: "os_disk.disk_size_gb",
      },
      outputs: { vm_id: "id", public_ip: "public_ip_address", private_ip: "private_ip_address" },
      dependencies: ["azurerm_virtual_network", "azurerm_network_security_group"],
    },
    defaultConfig: { vm_size: "Standard_B1s", os_type: "Linux", admin_username: "azureuser", os_disk_size: 30 },
  },
  {
    id: "azure-container-instance",
    name: "Container Instance",
    description: "Azure Container Instances",
    category: "compute",
    provider: "azure",
    icon: "Container",
    color: "cyan",
    ports: [
      { id: "aci-in", type: "input", label: "Network", allowedTypes: ["azure-vnet", "azure-lb"], position: "top" },
      { id: "aci-out", type: "output", label: "Access", allowedTypes: ["azure-blob", "azure-cosmos", "azure-sql"], position: "bottom" },
    ],
    configFields: [
      { key: "name", label: "Container Group Name", type: "text", required: true },
      { key: "image", label: "Container Image", type: "text", required: true, placeholder: "mcr.microsoft.com/azuredocs/aci-helloworld" },
      { key: "cpu", label: "CPU Cores", type: "number", defaultValue: 1, validation: { min: 0.5, max: 4 } },
      { key: "memory", label: "Memory (GB)", type: "number", defaultValue: 1.5, validation: { min: 0.5, max: 16 } },
      { key: "os_type", label: "OS Type", type: "select", defaultValue: "Linux", options: [
        { label: "Linux", value: "Linux" }, { label: "Windows", value: "Windows" },
      ]},
    ],
    terraformMapping: {
      resourceType: "azurerm_container_group",
      configMapping: {
        name: "name", image: "container.image",
        cpu: "container.cpu", memory: "container.memory",
        os_type: "os_type",
      },
      outputs: { id: "id", ip_address: "ip_address", fqdn: "fqdn" },
    },
    defaultConfig: { cpu: 1, memory: 1.5, os_type: "Linux" },
  },
  // ====================== STORAGE ======================
  {
    id: "azure-blob",
    name: "Blob Storage",
    description: "Azure Blob Storage container",
    category: "storage",
    provider: "azure",
    icon: "Database",
    color: "green",
    ports: [
      { id: "blob-in", type: "input", label: "Access", allowedTypes: ["azure-vm", "azure-container-instance", "azure-rbac"], position: "top" },
    ],
    configFields: [
      { key: "storage_account_name", label: "Storage Account Name", type: "text", required: true, validation: { pattern: "^[a-z0-9]{3,24}$", message: "3-24 lowercase alphanumeric chars" } },
      { key: "account_tier", label: "Account Tier", type: "select", defaultValue: "Standard", options: [
        { label: "Standard", value: "Standard" }, { label: "Premium", value: "Premium" },
      ]},
      { key: "replication_type", label: "Replication", type: "select", defaultValue: "LRS", options: [
        { label: "LRS", value: "LRS" }, { label: "GRS", value: "GRS" },
        { label: "ZRS", value: "ZRS" }, { label: "RAGRS", value: "RAGRS" },
      ]},
      { key: "container_name", label: "Container Name", type: "text", placeholder: "my-container" },
      { key: "access_type", label: "Access Type", type: "select", defaultValue: "private", options: [
        { label: "Private", value: "private" }, { label: "Blob", value: "blob" }, { label: "Container", value: "container" },
      ]},
    ],
    terraformMapping: {
      resourceType: "azurerm_storage_account",
      configMapping: {
        storage_account_name: "name", account_tier: "account_tier",
        replication_type: "account_replication_type",
      },
      outputs: { id: "id", primary_blob_endpoint: "primary_blob_endpoint" },
    },
    defaultConfig: { account_tier: "Standard", replication_type: "LRS", access_type: "private" },
  },
  {
    id: "azure-managed-disk",
    name: "Managed Disk",
    description: "Azure Managed Disk",
    category: "storage",
    provider: "azure",
    icon: "HardDrive",
    color: "green",
    ports: [
      { id: "disk-in", type: "input", label: "Attach", allowedTypes: ["azure-vm"], position: "top" },
    ],
    configFields: [
      { key: "name", label: "Disk Name", type: "text", required: true },
      { key: "storage_account_type", label: "Storage Type", type: "select", defaultValue: "Standard_LRS", options: [
        { label: "Standard HDD (LRS)", value: "Standard_LRS" },
        { label: "Standard SSD (LRS)", value: "StandardSSD_LRS" },
        { label: "Premium SSD (LRS)", value: "Premium_LRS" },
      ]},
      { key: "disk_size_gb", label: "Size (GB)", type: "number", defaultValue: 128, validation: { min: 1, max: 32767 } },
    ],
    terraformMapping: {
      resourceType: "azurerm_managed_disk",
      configMapping: {
        name: "name", storage_account_type: "storage_account_type",
        disk_size_gb: "disk_size_gb",
      },
      outputs: { id: "id" },
    },
    defaultConfig: { storage_account_type: "Standard_LRS", disk_size_gb: 128 },
  },
  // ====================== DATABASE ======================
  {
    id: "azure-cosmos",
    name: "Cosmos DB",
    description: "Azure Cosmos DB globally distributed database",
    category: "database",
    provider: "azure",
    icon: "Database",
    color: "blue",
    ports: [
      { id: "cosmos-in", type: "input", label: "Connect", allowedTypes: ["azure-vm", "azure-container-instance", "azure-vnet"], position: "top" },
    ],
    configFields: [
      { key: "name", label: "Account Name", type: "text", required: true },
      { key: "offer_type", label: "Offer Type", type: "select", defaultValue: "Standard", options: [
        { label: "Standard", value: "Standard" },
      ]},
      { key: "kind", label: "API", type: "select", defaultValue: "GlobalDocumentDB", options: [
        { label: "Core (SQL)", value: "GlobalDocumentDB" }, { label: "MongoDB", value: "MongoDB" },
      ]},
      { key: "consistency_level", label: "Consistency Level", type: "select", defaultValue: "Session", options: [
        { label: "Strong", value: "Strong" }, { label: "Bounded Staleness", value: "BoundedStaleness" },
        { label: "Session", value: "Session" }, { label: "Eventual", value: "Eventual" },
      ]},
      { key: "enable_free_tier", label: "Free Tier", type: "boolean", defaultValue: true },
    ],
    terraformMapping: {
      resourceType: "azurerm_cosmosdb_account",
      configMapping: {
        name: "name", offer_type: "offer_type", kind: "kind",
        consistency_level: "consistency_policy.consistency_level",
        enable_free_tier: "enable_free_tier",
      },
      outputs: { id: "id", endpoint: "endpoint", primary_key: "primary_key" },
    },
    defaultConfig: { offer_type: "Standard", kind: "GlobalDocumentDB", consistency_level: "Session", enable_free_tier: true },
  },
  {
    id: "azure-sql",
    name: "SQL Database",
    description: "Azure SQL Database",
    category: "database",
    provider: "azure",
    icon: "Database",
    color: "blue",
    ports: [
      { id: "sql-in", type: "input", label: "Connect", allowedTypes: ["azure-vm", "azure-container-instance", "azure-vnet", "azure-nsg"], position: "top" },
    ],
    configFields: [
      { key: "server_name", label: "Server Name", type: "text", required: true },
      { key: "db_name", label: "Database Name", type: "text", required: true },
      { key: "sku_name", label: "SKU", type: "select", defaultValue: "S0", options: [
        { label: "Basic", value: "Basic" }, { label: "S0 (Standard)", value: "S0" },
        { label: "S1", value: "S1" }, { label: "P1 (Premium)", value: "P1" },
      ]},
      { key: "max_size_gb", label: "Max Size (GB)", type: "number", defaultValue: 2 },
      { key: "admin_login", label: "Admin Login", type: "text", defaultValue: "sqladmin" },
    ],
    terraformMapping: {
      resourceType: "azurerm_mssql_database",
      configMapping: {
        db_name: "name", sku_name: "sku_name", max_size_gb: "max_size_gb",
      },
      outputs: { id: "id" },
      dependencies: ["azurerm_mssql_server"],
    },
    defaultConfig: { sku_name: "S0", max_size_gb: 2, admin_login: "sqladmin" },
  },
  // ====================== NETWORKING ======================
  {
    id: "azure-vnet",
    name: "Virtual Network",
    description: "Azure Virtual Network",
    category: "networking",
    provider: "azure",
    icon: "Network",
    color: "purple",
    ports: [
      { id: "vnet-out", type: "output", label: "Contains", allowedTypes: ["azure-vm", "azure-container-instance", "azure-cosmos", "azure-sql", "azure-lb", "azure-nsg"], position: "bottom" },
    ],
    configFields: [
      { key: "name", label: "VNet Name", type: "text", required: true },
      { key: "address_space", label: "Address Space", type: "text", defaultValue: "10.0.0.0/16" },
      { key: "subnet_name", label: "Subnet Name", type: "text", defaultValue: "default" },
      { key: "subnet_prefix", label: "Subnet Prefix", type: "text", defaultValue: "10.0.1.0/24" },
    ],
    terraformMapping: {
      resourceType: "azurerm_virtual_network",
      module: "Azure/vnet/azurerm",
      configMapping: {
        name: "vnet_name", address_space: "address_space",
        subnet_name: "subnet_names", subnet_prefix: "subnet_prefixes",
      },
      outputs: { vnet_id: "vnet_id", subnet_ids: "vnet_subnets" },
    },
    defaultConfig: { address_space: "10.0.0.0/16", subnet_name: "default", subnet_prefix: "10.0.1.0/24" },
  },
  {
    id: "azure-lb",
    name: "Load Balancer",
    description: "Azure Load Balancer",
    category: "networking",
    provider: "azure",
    icon: "GitBranch",
    color: "purple",
    ports: [
      { id: "lb-in", type: "input", label: "Traffic", allowedTypes: ["azure-vnet", "azure-cdn"], position: "top" },
      { id: "lb-out", type: "output", label: "Backend", allowedTypes: ["azure-vm", "azure-container-instance"], position: "bottom" },
    ],
    configFields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "sku", label: "SKU", type: "select", defaultValue: "Standard", options: [
        { label: "Basic", value: "Basic" }, { label: "Standard", value: "Standard" },
      ]},
    ],
    terraformMapping: {
      resourceType: "azurerm_lb",
      configMapping: { name: "name", sku: "sku" },
      outputs: { id: "id" },
    },
    defaultConfig: { sku: "Standard" },
  },
  {
    id: "azure-api-mgmt",
    name: "API Management",
    description: "Azure API Management Service",
    category: "networking",
    provider: "azure",
    icon: "Globe",
    color: "purple",
    ports: [
      { id: "apim-out", type: "output", label: "Backend", allowedTypes: ["azure-vm", "azure-container-instance", "azure-lb"], position: "bottom" },
    ],
    configFields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "sku_name", label: "SKU", type: "select", defaultValue: "Consumption_0", options: [
        { label: "Consumption", value: "Consumption_0" }, { label: "Developer", value: "Developer_1" },
        { label: "Basic", value: "Basic_1" }, { label: "Standard", value: "Standard_1" },
      ]},
      { key: "publisher_name", label: "Publisher Name", type: "text", required: true },
      { key: "publisher_email", label: "Publisher Email", type: "text", required: true },
    ],
    terraformMapping: {
      resourceType: "azurerm_api_management",
      configMapping: {
        name: "name", sku_name: "sku_name",
        publisher_name: "publisher_name", publisher_email: "publisher_email",
      },
      outputs: { id: "id", gateway_url: "gateway_url" },
    },
    defaultConfig: { sku_name: "Consumption_0" },
  },
  {
    id: "azure-cdn",
    name: "Azure CDN",
    description: "Azure Content Delivery Network",
    category: "networking",
    provider: "azure",
    icon: "Globe",
    color: "purple",
    ports: [
      { id: "cdn-out", type: "output", label: "Origin", allowedTypes: ["azure-blob", "azure-lb", "azure-vm"], position: "bottom" },
    ],
    configFields: [
      { key: "profile_name", label: "Profile Name", type: "text", required: true },
      { key: "sku", label: "SKU", type: "select", defaultValue: "Standard_Microsoft", options: [
        { label: "Standard Microsoft", value: "Standard_Microsoft" },
        { label: "Standard Akamai", value: "Standard_Akamai" },
        { label: "Premium Verizon", value: "Premium_Verizon" },
      ]},
    ],
    terraformMapping: {
      resourceType: "azurerm_cdn_profile",
      configMapping: { profile_name: "name", sku: "sku" },
      outputs: { id: "id" },
    },
    defaultConfig: { sku: "Standard_Microsoft" },
  },
  // ====================== SECURITY ======================
  {
    id: "azure-rbac",
    name: "RBAC Role Assignment",
    description: "Azure Role-Based Access Control",
    category: "security",
    provider: "azure",
    icon: "Shield",
    color: "red",
    ports: [
      { id: "rbac-out", type: "output", label: "Assign", allowedTypes: ["azure-vm", "azure-container-instance", "azure-blob", "azure-cosmos", "azure-sql"], position: "bottom" },
    ],
    configFields: [
      { key: "role_definition_name", label: "Role", type: "select", defaultValue: "Reader", options: [
        { label: "Reader", value: "Reader" }, { label: "Contributor", value: "Contributor" },
        { label: "Owner", value: "Owner" }, { label: "Storage Blob Data Reader", value: "Storage Blob Data Reader" },
      ]},
      { key: "principal_type", label: "Principal Type", type: "select", defaultValue: "ServicePrincipal", options: [
        { label: "Service Principal", value: "ServicePrincipal" }, { label: "User", value: "User" },
        { label: "Group", value: "Group" },
      ]},
    ],
    terraformMapping: {
      resourceType: "azurerm_role_assignment",
      configMapping: { role_definition_name: "role_definition_name" },
      outputs: { id: "id" },
    },
    defaultConfig: { role_definition_name: "Reader", principal_type: "ServicePrincipal" },
  },
  {
    id: "azure-nsg",
    name: "Network Security Group",
    description: "Azure Network Security Group",
    category: "security",
    provider: "azure",
    icon: "Lock",
    color: "red",
    ports: [
      { id: "nsg-in", type: "input", label: "VNet", allowedTypes: ["azure-vnet"], position: "top" },
      { id: "nsg-out", type: "output", label: "Protect", allowedTypes: ["azure-vm", "azure-container-instance", "azure-sql"], position: "bottom" },
    ],
    configFields: [
      { key: "name", label: "NSG Name", type: "text", required: true },
      { key: "inbound_rules", label: "Inbound Ports", type: "text", defaultValue: "80,443", description: "Comma-separated ports" },
      { key: "source_address", label: "Source Address", type: "text", defaultValue: "*" },
    ],
    terraformMapping: {
      resourceType: "azurerm_network_security_group",
      configMapping: { name: "name" },
      outputs: { id: "id" },
      dependencies: ["azurerm_virtual_network"],
    },
    defaultConfig: { inbound_rules: "80,443", source_address: "*" },
  },
  {
    id: "azure-keyvault",
    name: "Key Vault",
    description: "Azure Key Vault for secrets and keys",
    category: "security",
    provider: "azure",
    icon: "Key",
    color: "red",
    ports: [
      { id: "kv-out", type: "output", label: "Secrets", allowedTypes: ["azure-vm", "azure-container-instance", "azure-blob", "azure-sql"], position: "bottom" },
    ],
    configFields: [
      { key: "name", label: "Vault Name", type: "text", required: true },
      { key: "sku_name", label: "SKU", type: "select", defaultValue: "standard", options: [
        { label: "Standard", value: "standard" }, { label: "Premium", value: "premium" },
      ]},
      { key: "purge_protection_enabled", label: "Purge Protection", type: "boolean", defaultValue: true },
      { key: "soft_delete_retention", label: "Soft Delete Retention (days)", type: "number", defaultValue: 90 },
    ],
    terraformMapping: {
      resourceType: "azurerm_key_vault",
      configMapping: {
        name: "name", sku_name: "sku_name",
        purge_protection_enabled: "purge_protection_enabled",
        soft_delete_retention: "soft_delete_retention_days",
      },
      outputs: { id: "id", vault_uri: "vault_uri" },
    },
    defaultConfig: { sku_name: "standard", purge_protection_enabled: true, soft_delete_retention: 90 },
  },
];
