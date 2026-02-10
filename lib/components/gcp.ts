import { ComponentDefinition } from "@/lib/types";

export const gcpComponents: ComponentDefinition[] = [
  // ====================== COMPUTE ======================
  {
    id: "gcp-cloud-run",
    name: "Cloud Run",
    description: "Fully managed serverless container platform",
    category: "compute",
    provider: "gcp",
    icon: "Container",
    color: "blue",
    ports: [
      { id: "run-in", type: "input", label: "Traffic", allowedTypes: ["gcp-lb", "gcp-api-gw", "gcp-cdn"], position: "top" },
      { id: "run-out", type: "output", label: "Access", allowedTypes: ["gcp-cloud-sql", "gcp-firestore", "gcp-gcs", "gcp-iam"], position: "bottom" },
    ],
    configFields: [
      { key: "service_name", label: "Service Name", type: "text", required: true, placeholder: "my-service" },
      { key: "image", label: "Container Image", type: "text", required: true, placeholder: "gcr.io/project/image:tag" },
      { key: "cpu", label: "CPU", type: "select", defaultValue: "1", options: [
        { label: "1 vCPU", value: "1" }, { label: "2 vCPU", value: "2" }, { label: "4 vCPU", value: "4" },
      ]},
      { key: "memory", label: "Memory", type: "select", defaultValue: "512Mi", options: [
        { label: "256 Mi", value: "256Mi" }, { label: "512 Mi", value: "512Mi" },
        { label: "1 Gi", value: "1Gi" }, { label: "2 Gi", value: "2Gi" },
      ]},
      { key: "max_instances", label: "Max Instances", type: "number", defaultValue: 10, validation: { min: 1, max: 1000 } },
      { key: "allow_unauthenticated", label: "Allow Unauthenticated", type: "boolean", defaultValue: false },
    ],
    terraformMapping: {
      resourceType: "google_cloud_run_v2_service",
      configMapping: {
        service_name: "name", image: "template.containers.image",
        cpu: "template.containers.resources.limits.cpu",
        memory: "template.containers.resources.limits.memory",
        max_instances: "template.scaling.max_instance_count",
      },
      outputs: { service_url: "uri", service_name: "name" },
    },
    defaultConfig: { cpu: "1", memory: "512Mi", max_instances: 10, allow_unauthenticated: false },
  },
  {
    id: "gcp-gce",
    name: "Compute Engine",
    description: "Google Compute Engine virtual machine",
    category: "compute",
    provider: "gcp",
    icon: "Server",
    color: "blue",
    ports: [
      { id: "gce-in", type: "input", label: "Network", allowedTypes: ["gcp-vpc", "gcp-firewall", "gcp-lb"], position: "top" },
      { id: "gce-out", type: "output", label: "Access", allowedTypes: ["gcp-pd", "gcp-gcs", "gcp-cloud-sql"], position: "bottom" },
    ],
    configFields: [
      { key: "name", label: "Instance Name", type: "text", required: true, placeholder: "my-instance" },
      { key: "machine_type", label: "Machine Type", type: "select", defaultValue: "e2-micro", options: [
        { label: "e2-micro", value: "e2-micro" }, { label: "e2-small", value: "e2-small" },
        { label: "e2-medium", value: "e2-medium" }, { label: "n2-standard-2", value: "n2-standard-2" },
        { label: "n2-standard-4", value: "n2-standard-4" },
      ]},
      { key: "zone", label: "Zone", type: "text", defaultValue: "us-central1-a" },
      { key: "image", label: "Boot Image", type: "select", defaultValue: "debian-cloud/debian-12", options: [
        { label: "Debian 12", value: "debian-cloud/debian-12" },
        { label: "Ubuntu 22.04", value: "ubuntu-os-cloud/ubuntu-2204-lts" },
        { label: "CentOS Stream 9", value: "centos-cloud/centos-stream-9" },
      ]},
      { key: "boot_disk_size", label: "Boot Disk Size (GB)", type: "number", defaultValue: 10 },
    ],
    terraformMapping: {
      resourceType: "google_compute_instance",
      module: "terraform-google-modules/vm/google//modules/compute_instance",
      configMapping: {
        name: "name", machine_type: "machine_type", zone: "zone",
        image: "boot_disk.initialize_params.image", boot_disk_size: "boot_disk.initialize_params.size",
      },
      outputs: { instance_id: "instance_id", self_link: "self_link" },
    },
    defaultConfig: { machine_type: "e2-micro", zone: "us-central1-a", image: "debian-cloud/debian-12", boot_disk_size: 10 },
  },
  // ====================== STORAGE ======================
  {
    id: "gcp-gcs",
    name: "Cloud Storage",
    description: "Google Cloud Storage bucket",
    category: "storage",
    provider: "gcp",
    icon: "Database",
    color: "green",
    ports: [
      { id: "gcs-in", type: "input", label: "Access", allowedTypes: ["gcp-cloud-run", "gcp-gce", "gcp-iam"], position: "top" },
    ],
    configFields: [
      { key: "name", label: "Bucket Name", type: "text", required: true, placeholder: "my-bucket" },
      { key: "location", label: "Location", type: "select", defaultValue: "US", options: [
        { label: "US (Multi-region)", value: "US" }, { label: "EU", value: "EU" },
        { label: "us-central1", value: "us-central1" }, { label: "europe-west1", value: "europe-west1" },
      ]},
      { key: "storage_class", label: "Storage Class", type: "select", defaultValue: "STANDARD", options: [
        { label: "Standard", value: "STANDARD" }, { label: "Nearline", value: "NEARLINE" },
        { label: "Coldline", value: "COLDLINE" }, { label: "Archive", value: "ARCHIVE" },
      ]},
      { key: "versioning", label: "Versioning", type: "boolean", defaultValue: true },
      { key: "uniform_bucket_level_access", label: "Uniform Bucket Access", type: "boolean", defaultValue: true },
    ],
    terraformMapping: {
      resourceType: "google_storage_bucket",
      configMapping: {
        name: "name", location: "location", storage_class: "storage_class",
        versioning: "versioning.enabled", uniform_bucket_level_access: "uniform_bucket_level_access",
      },
      outputs: { bucket_url: "url", self_link: "self_link" },
    },
    defaultConfig: { location: "US", storage_class: "STANDARD", versioning: true, uniform_bucket_level_access: true },
  },
  {
    id: "gcp-pd",
    name: "Persistent Disk",
    description: "Google Compute Engine persistent disk",
    category: "storage",
    provider: "gcp",
    icon: "HardDrive",
    color: "green",
    ports: [
      { id: "pd-in", type: "input", label: "Attach", allowedTypes: ["gcp-gce"], position: "top" },
    ],
    configFields: [
      { key: "name", label: "Disk Name", type: "text", required: true },
      { key: "type", label: "Disk Type", type: "select", defaultValue: "pd-standard", options: [
        { label: "Standard", value: "pd-standard" }, { label: "SSD", value: "pd-ssd" },
        { label: "Balanced", value: "pd-balanced" },
      ]},
      { key: "size", label: "Size (GB)", type: "number", defaultValue: 100, validation: { min: 10, max: 65536 } },
    ],
    terraformMapping: {
      resourceType: "google_compute_disk",
      configMapping: { name: "name", type: "type", size: "size" },
      outputs: { disk_id: "id", self_link: "self_link" },
    },
    defaultConfig: { type: "pd-standard", size: 100 },
  },
  // ====================== DATABASE ======================
  {
    id: "gcp-cloud-sql",
    name: "Cloud SQL",
    description: "Google Cloud SQL managed database",
    category: "database",
    provider: "gcp",
    icon: "Database",
    color: "blue",
    ports: [
      { id: "sql-in", type: "input", label: "Connect", allowedTypes: ["gcp-cloud-run", "gcp-gce", "gcp-vpc"], position: "top" },
    ],
    configFields: [
      { key: "name", label: "Instance Name", type: "text", required: true },
      { key: "database_version", label: "Database Version", type: "select", defaultValue: "POSTGRES_16", options: [
        { label: "PostgreSQL 16", value: "POSTGRES_16" }, { label: "PostgreSQL 15", value: "POSTGRES_15" },
        { label: "MySQL 8.0", value: "MYSQL_8_0" }, { label: "SQL Server 2022", value: "SQLSERVER_2022_STANDARD" },
      ]},
      { key: "tier", label: "Machine Tier", type: "select", defaultValue: "db-f1-micro", options: [
        { label: "db-f1-micro", value: "db-f1-micro" }, { label: "db-g1-small", value: "db-g1-small" },
        { label: "db-custom-2-8192", value: "db-custom-2-8192" },
      ]},
      { key: "disk_size", label: "Disk Size (GB)", type: "number", defaultValue: 10 },
      { key: "availability_type", label: "Availability", type: "select", defaultValue: "ZONAL", options: [
        { label: "Zonal", value: "ZONAL" }, { label: "Regional (HA)", value: "REGIONAL" },
      ]},
      { key: "backup_enabled", label: "Automated Backups", type: "boolean", defaultValue: true },
    ],
    terraformMapping: {
      resourceType: "google_sql_database_instance",
      module: "terraform-google-modules/sql-db/google",
      configMapping: {
        name: "name", database_version: "database_version",
        tier: "settings.tier", disk_size: "settings.disk_size",
        availability_type: "settings.availability_type",
      },
      outputs: { connection_name: "connection_name", ip_address: "ip_address.0.ip_address" },
    },
    defaultConfig: { database_version: "POSTGRES_16", tier: "db-f1-micro", disk_size: 10, availability_type: "ZONAL", backup_enabled: true },
  },
  {
    id: "gcp-firestore",
    name: "Firestore",
    description: "Google Cloud Firestore NoSQL database",
    category: "database",
    provider: "gcp",
    icon: "Flame",
    color: "amber",
    ports: [
      { id: "fs-in", type: "input", label: "Access", allowedTypes: ["gcp-cloud-run", "gcp-gce", "gcp-iam"], position: "top" },
    ],
    configFields: [
      { key: "database_type", label: "Database Type", type: "select", defaultValue: "FIRESTORE_NATIVE", options: [
        { label: "Native Mode", value: "FIRESTORE_NATIVE" }, { label: "Datastore Mode", value: "CLOUD_FIRESTORE_COMPAT" },
      ]},
      { key: "location_id", label: "Location", type: "text", defaultValue: "us-central" },
    ],
    terraformMapping: {
      resourceType: "google_firestore_database",
      configMapping: { database_type: "type", location_id: "location_id" },
      outputs: { name: "name" },
    },
    defaultConfig: { database_type: "FIRESTORE_NATIVE", location_id: "us-central" },
  },
  // ====================== NETWORKING ======================
  {
    id: "gcp-vpc",
    name: "VPC Network",
    description: "Google VPC Network",
    category: "networking",
    provider: "gcp",
    icon: "Network",
    color: "purple",
    ports: [
      { id: "vpc-out", type: "output", label: "Contains", allowedTypes: ["gcp-gce", "gcp-cloud-sql", "gcp-lb", "gcp-firewall"], position: "bottom" },
    ],
    configFields: [
      { key: "name", label: "Network Name", type: "text", required: true, placeholder: "my-network" },
      { key: "auto_create_subnetworks", label: "Auto-create Subnets", type: "boolean", defaultValue: false },
      { key: "routing_mode", label: "Routing Mode", type: "select", defaultValue: "REGIONAL", options: [
        { label: "Regional", value: "REGIONAL" }, { label: "Global", value: "GLOBAL" },
      ]},
    ],
    terraformMapping: {
      resourceType: "google_compute_network",
      module: "terraform-google-modules/network/google",
      configMapping: {
        name: "network_name", auto_create_subnetworks: "auto_create_subnetworks",
        routing_mode: "routing_mode",
      },
      outputs: { network_id: "network_id", self_link: "network_self_link" },
    },
    defaultConfig: { auto_create_subnetworks: false, routing_mode: "REGIONAL" },
  },
  {
    id: "gcp-lb",
    name: "Load Balancer",
    description: "Google Cloud Load Balancer",
    category: "networking",
    provider: "gcp",
    icon: "GitBranch",
    color: "purple",
    ports: [
      { id: "lb-in", type: "input", label: "Traffic", allowedTypes: ["gcp-cdn", "gcp-vpc"], position: "top" },
      { id: "lb-out", type: "output", label: "Backend", allowedTypes: ["gcp-cloud-run", "gcp-gce"], position: "bottom" },
    ],
    configFields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "type", label: "LB Type", type: "select", defaultValue: "EXTERNAL", options: [
        { label: "External HTTP(S)", value: "EXTERNAL" }, { label: "Internal HTTP(S)", value: "INTERNAL" },
        { label: "Network (TCP/UDP)", value: "NETWORK" },
      ]},
    ],
    terraformMapping: {
      resourceType: "google_compute_url_map",
      configMapping: { name: "name" },
      outputs: { self_link: "self_link" },
    },
    defaultConfig: { type: "EXTERNAL" },
  },
  {
    id: "gcp-api-gw",
    name: "API Gateway",
    description: "Google Cloud API Gateway",
    category: "networking",
    provider: "gcp",
    icon: "Globe",
    color: "purple",
    ports: [
      { id: "apigw-out", type: "output", label: "Routes", allowedTypes: ["gcp-cloud-run", "gcp-gce"], position: "bottom" },
    ],
    configFields: [
      { key: "api_id", label: "API ID", type: "text", required: true },
      { key: "display_name", label: "Display Name", type: "text" },
    ],
    terraformMapping: {
      resourceType: "google_api_gateway_api",
      configMapping: { api_id: "api_id", display_name: "display_name" },
      outputs: { name: "name" },
    },
    defaultConfig: {},
  },
  {
    id: "gcp-cdn",
    name: "Cloud CDN",
    description: "Google Cloud CDN",
    category: "networking",
    provider: "gcp",
    icon: "Globe",
    color: "purple",
    ports: [
      { id: "cdn-out", type: "output", label: "Origin", allowedTypes: ["gcp-gcs", "gcp-lb"], position: "bottom" },
    ],
    configFields: [
      { key: "cache_mode", label: "Cache Mode", type: "select", defaultValue: "CACHE_ALL_STATIC", options: [
        { label: "Cache All Static", value: "CACHE_ALL_STATIC" },
        { label: "Use Origin Headers", value: "USE_ORIGIN_HEADERS" },
        { label: "Force Cache All", value: "FORCE_CACHE_ALL" },
      ]},
    ],
    terraformMapping: {
      resourceType: "google_compute_backend_bucket",
      configMapping: { cache_mode: "cdn_policy.cache_mode" },
      outputs: { self_link: "self_link" },
    },
    defaultConfig: { cache_mode: "CACHE_ALL_STATIC" },
  },
  // ====================== SECURITY ======================
  {
    id: "gcp-iam",
    name: "IAM Service Account",
    description: "Google Cloud IAM Service Account",
    category: "security",
    provider: "gcp",
    icon: "Shield",
    color: "red",
    ports: [
      { id: "iam-out", type: "output", label: "Bind", allowedTypes: ["gcp-cloud-run", "gcp-gce", "gcp-gcs", "gcp-cloud-sql"], position: "bottom" },
    ],
    configFields: [
      { key: "account_id", label: "Account ID", type: "text", required: true },
      { key: "display_name", label: "Display Name", type: "text" },
      { key: "roles", label: "Roles", type: "tags", description: "IAM roles to bind" },
    ],
    terraformMapping: {
      resourceType: "google_service_account",
      configMapping: { account_id: "account_id", display_name: "display_name" },
      outputs: { email: "email", name: "name" },
    },
    defaultConfig: {},
  },
  {
    id: "gcp-firewall",
    name: "Firewall Rule",
    description: "Google Cloud VPC Firewall Rule",
    category: "security",
    provider: "gcp",
    icon: "Lock",
    color: "red",
    ports: [
      { id: "fw-in", type: "input", label: "Network", allowedTypes: ["gcp-vpc"], position: "top" },
      { id: "fw-out", type: "output", label: "Protect", allowedTypes: ["gcp-gce", "gcp-cloud-run"], position: "bottom" },
    ],
    configFields: [
      { key: "name", label: "Rule Name", type: "text", required: true },
      { key: "direction", label: "Direction", type: "select", defaultValue: "INGRESS", options: [
        { label: "Ingress", value: "INGRESS" }, { label: "Egress", value: "EGRESS" },
      ]},
      { key: "allowed_ports", label: "Allowed Ports", type: "text", defaultValue: "80,443" },
      { key: "source_ranges", label: "Source Ranges", type: "text", defaultValue: "0.0.0.0/0" },
    ],
    terraformMapping: {
      resourceType: "google_compute_firewall",
      configMapping: { name: "name", direction: "direction", source_ranges: "source_ranges" },
      outputs: { self_link: "self_link" },
      dependencies: ["google_compute_network"],
    },
    defaultConfig: { direction: "INGRESS", allowed_ports: "80,443", source_ranges: "0.0.0.0/0" },
  },
  {
    id: "gcp-kms",
    name: "Cloud KMS",
    description: "Google Cloud Key Management Service",
    category: "security",
    provider: "gcp",
    icon: "Key",
    color: "red",
    ports: [
      { id: "kms-out", type: "output", label: "Encrypt", allowedTypes: ["gcp-gcs", "gcp-pd", "gcp-cloud-sql"], position: "bottom" },
    ],
    configFields: [
      { key: "key_ring_name", label: "Key Ring Name", type: "text", required: true },
      { key: "crypto_key_name", label: "Crypto Key Name", type: "text", required: true },
      { key: "rotation_period", label: "Rotation Period", type: "text", defaultValue: "7776000s", description: "In seconds (e.g. 7776000s = 90 days)" },
    ],
    terraformMapping: {
      resourceType: "google_kms_crypto_key",
      configMapping: { crypto_key_name: "name", rotation_period: "rotation_period" },
      outputs: { id: "id" },
    },
    defaultConfig: { rotation_period: "7776000s" },
  },
];
