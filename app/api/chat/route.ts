import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { allComponents } from "@/lib/components";
import { aiResponseSchema, normalizeAIResponse } from "@/lib/ai/schema";
import type { ProposedChange } from "@/lib/types";

/** Shape of the response sent to the client (uses Record config, not array config) */
interface ClientResponse {
  message: string;
  proposedChanges: ProposedChange[];
}

// ============================================================
// Groq provider setup via Vercel AI SDK
// ============================================================

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

// ============================================================
// Build component list for the system prompt
// ============================================================

const componentList = allComponents.map((c) => ({
  id: c.id,
  name: c.name,
  provider: c.provider,
  category: c.category,
  configFields: c.configFields.map((f) => ({
    key: f.key,
    label: f.label,
    type: f.type,
  })),
}));

// ============================================================
// System prompt — teaches tempId referencing for connections
// ============================================================

const SYSTEM_PROMPT = `You are an expert cloud infrastructure architect assistant for an Infrastructure Design Canvas application. You help users design cloud infrastructure visually.

## Your Capabilities
- Recommend infrastructure components and architectures
- Suggest configurations based on best practices
- Help users modify their existing infrastructure designs
- Connect related components together (e.g. VPC -> EC2, ALB -> EC2)
- Provide security, cost, and reliability recommendations

## Available Components
${JSON.stringify(componentList, null, 2)}

## How tempId Referencing Works
When you propose adding multiple nodes AND connections between them, you MUST:
1. Assign each new node a unique "tempId" like "new-0", "new-1", "new-2", etc.
2. In "add_connection" entries, reference these tempIds as "source" or "target"
3. For connections to EXISTING canvas nodes, use their actual node ID from the canvas state
4. ALWAYS put add_node items BEFORE add_connection items that reference them

## Connection Guidelines
- VPC/VNet should connect to resources it contains (VPC -> ALB, VPC -> EC2, VPC -> RDS)
- Security Groups connect to resources they protect (SG -> EC2, SG -> RDS)
- Load Balancers connect to backend targets (ALB -> EC2, ALB -> Lambda)
- API Gateways connect to backend services (API GW -> Lambda, API GW -> ALB)
- Compute connects to databases it accesses (EC2 -> RDS, Lambda -> DynamoDB)
- CDN connects to origins (CloudFront -> S3, CloudFront -> ALB)
- IAM roles connect to resources they grant access to
- The source is the provider/parent, the target is the consumer/child (VPC is source, EC2 is target)

## Config Format
Configuration values are passed as an array of key-value objects:
  config: [{ "key": "instance_type", "value": "t3.medium" }, { "key": "name", "value": "web-server" }]
All values must be strings. Numbers and booleans should be string-encoded (e.g. "true", "30", "false").

## Important Rules
1. Always explain WHY you're recommending changes
2. Position new nodes with spacing (increment x by 250, y by 200 for each tier)
3. Include proper configuration values, not placeholder text
4. Follow cloud provider best practices (security groups, encryption, etc.)
5. ALWAYS include connections between related resources — never leave nodes orphaned
6. Keep responses concise but informative`;

// ============================================================
// POST handler
// ============================================================

export async function POST(request: Request) {
  try {
    const { message, canvasContext, history } = await request.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(generateMockResponse(message, canvasContext));
    }

    const historyMessages = (history || []).map(
      (h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })
    );

    const { object } = await generateObject({
      model: groq("moonshotai/kimi-k2-instruct-0905"),
      schema: aiResponseSchema,
      system: SYSTEM_PROMPT,
      messages: [
        ...historyMessages,
        {
          role: "user" as const,
          content: `Current canvas state: ${JSON.stringify(canvasContext)}

User request: ${message}`,
        },
      ],
      temperature: 0.3,
      maxOutputTokens: 4096,
    });

    // Normalize array-based config from AI into Record-based config
    const normalized = normalizeAIResponse(object);
    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        message:
          "An error occurred while processing your request. Please check your GROQ_API_KEY and try again.",
        proposedChanges: [],
      },
      { status: 500 }
    );
  }
}

// ============================================================
// Mock response generator — includes connections!
// ============================================================

function generateMockResponse(
  message: string,
  canvasContext: { nodes: { id: string; componentId: string }[] }
): ClientResponse {
  const lowerMessage = message.toLowerCase();
  const nodeCount = canvasContext?.nodes?.length || 0;

  // ----- 3-TIER WEB APP -----
  if (
    lowerMessage.includes("3-tier") ||
    lowerMessage.includes("web app") ||
    lowerMessage.includes("three tier")
  ) {
    return {
      message:
        'I\'ll set up a classic 3-tier web application on AWS with proper connections between all layers.\n\n1. **VPC** — network isolation for all resources\n2. **Security Group** — controls inbound traffic (ports 80, 443)\n3. **Application Load Balancer** — distributes traffic to app tier\n4. **EC2 Instance** — application server\n5. **RDS PostgreSQL** — managed database\n\nAll components are connected: VPC contains the ALB, EC2, and RDS; the Security Group protects EC2 and RDS; and the ALB forwards to EC2 which connects to RDS.\n\nClick **"Apply All"** to add everything with connections in one step.',
      proposedChanges: [
        {
          type: "add_node",
          tempId: "new-0",
          description: "Add VPC for network isolation",
          componentId: "aws-vpc",
          position: { x: 400, y: 50 },
          config: {
            cidr_block: "10.0.0.0/16",
            name: "main-vpc",
            enable_dns_hostnames: true,
            public_subnets: "10.0.1.0/24,10.0.2.0/24",
            private_subnets: "10.0.10.0/24,10.0.20.0/24",
          },
        },
        {
          type: "add_node",
          tempId: "new-1",
          description: "Add Security Group for access control",
          componentId: "aws-sg",
          position: { x: 700, y: 50 },
          config: {
            name: "web-sg",
            description: "Security group for web tier",
            ingress_ports: "80,443",
          },
        },
        {
          type: "add_node",
          tempId: "new-2",
          description: "Add Application Load Balancer",
          componentId: "aws-elb",
          position: { x: 400, y: 250 },
          config: { name: "web-alb", lb_type: "application", internal: false },
        },
        {
          type: "add_node",
          tempId: "new-3",
          description: "Add EC2 instance for application tier",
          componentId: "aws-ec2",
          position: { x: 400, y: 450 },
          config: {
            instance_type: "t3.medium",
            tags_name: "web-server",
            root_volume_size: 30,
          },
        },
        {
          type: "add_node",
          tempId: "new-4",
          description: "Add RDS PostgreSQL database",
          componentId: "aws-rds",
          position: { x: 400, y: 650 },
          config: {
            engine: "postgres",
            instance_class: "db.t3.small",
            allocated_storage: 50,
            db_name: "appdb",
            multi_az: true,
            backup_retention: 7,
          },
        },
        // Connections: VPC contains ALB, EC2, RDS
        {
          type: "add_connection",
          description: "VPC contains the Load Balancer",
          source: "new-0",
          target: "new-2",
        },
        {
          type: "add_connection",
          description: "VPC contains the EC2 instance",
          source: "new-0",
          target: "new-3",
        },
        {
          type: "add_connection",
          description: "VPC contains the RDS database",
          source: "new-0",
          target: "new-4",
        },
        // Security Group protects EC2 and RDS
        {
          type: "add_connection",
          description: "Security Group protects the EC2 instance",
          source: "new-1",
          target: "new-3",
        },
        {
          type: "add_connection",
          description: "Security Group protects the RDS database",
          source: "new-1",
          target: "new-4",
        },
        // ALB forwards to EC2, EC2 connects to RDS
        {
          type: "add_connection",
          description: "Load Balancer forwards traffic to EC2",
          source: "new-2",
          target: "new-3",
        },
        {
          type: "add_connection",
          description: "EC2 connects to RDS database",
          source: "new-3",
          target: "new-4",
        },
      ],
    };
  }

  // ----- DATABASE -----
  if (
    lowerMessage.includes("database") ||
    lowerMessage.includes("postgresql") ||
    lowerMessage.includes("rds")
  ) {
    const existingVpc = canvasContext?.nodes?.find(
      (n) => n.componentId === "aws-vpc"
    );
    const existingSg = canvasContext?.nodes?.find(
      (n) => n.componentId === "aws-sg"
    );

    const changes: ClientResponse["proposedChanges"] = [
      {
        type: "add_node",
        tempId: "new-0",
        description: "Add RDS PostgreSQL with high availability",
        componentId: "aws-rds",
        position: { x: 300 + nodeCount * 50, y: 400 },
        config: {
          engine: "postgres",
          engine_version: "16.3",
          instance_class: "db.r5.large",
          allocated_storage: 100,
          db_name: "production_db",
          multi_az: true,
          backup_retention: 14,
        },
      },
    ];

    // Auto-connect to existing VPC and SG if present
    if (existingVpc) {
      changes.push({
        type: "add_connection",
        description: "Place RDS inside existing VPC",
        source: existingVpc.id,
        target: "new-0",
      });
    }
    if (existingSg) {
      changes.push({
        type: "add_connection",
        description: "Protect RDS with existing Security Group",
        source: existingSg.id,
        target: "new-0",
      });
    }

    return {
      message:
        "I'll add a PostgreSQL RDS database with production-ready settings including Multi-AZ for high availability and automated backups." +
        (existingVpc
          ? " I'll connect it to your existing VPC."
          : "") +
        (existingSg
          ? " I'll also attach it to your existing Security Group."
          : ""),
      proposedChanges: changes,
    };
  }

  // ----- VPC / NETWORK -----
  if (
    lowerMessage.includes("vpc") ||
    lowerMessage.includes("network") ||
    lowerMessage.includes("subnet")
  ) {
    return {
      message:
        "I'll set up a VPC with public and private subnets, a NAT Gateway for private subnet internet access, and a Security Group. All components are connected.",
      proposedChanges: [
        {
          type: "add_node",
          tempId: "new-0",
          description: "Add VPC with subnets",
          componentId: "aws-vpc",
          position: { x: 400, y: 100 },
          config: {
            cidr_block: "10.0.0.0/16",
            name: "main-vpc",
            enable_dns_hostnames: true,
            public_subnets: "10.0.1.0/24,10.0.2.0/24",
            private_subnets: "10.0.10.0/24,10.0.20.0/24",
          },
        },
        {
          type: "add_node",
          tempId: "new-1",
          description: "Add NAT Gateway for private subnet access",
          componentId: "aws-nat-gw",
          position: { x: 400, y: 350 },
          config: { connectivity_type: "public" },
        },
        {
          type: "add_node",
          tempId: "new-2",
          description: "Add Security Group",
          componentId: "aws-sg",
          position: { x: 700, y: 100 },
          config: {
            name: "default-sg",
            description: "Default security group",
            ingress_ports: "80,443,22",
          },
        },
        {
          type: "add_connection",
          description: "VPC contains the NAT Gateway",
          source: "new-0",
          target: "new-1",
        },
        {
          type: "add_connection",
          description: "Security Group belongs to the VPC",
          source: "new-0",
          target: "new-2",
        },
      ],
    };
  }

  // ----- CDN -----
  if (
    lowerMessage.includes("cdn") ||
    lowerMessage.includes("cloudfront")
  ) {
    const existingAlb = canvasContext?.nodes?.find(
      (n) => n.componentId === "aws-elb"
    );
    const existingS3 = canvasContext?.nodes?.find(
      (n) => n.componentId === "aws-s3"
    );

    const changes: ClientResponse["proposedChanges"] = [
      {
        type: "add_node",
        tempId: "new-0",
        description: "Add CloudFront CDN",
        componentId: "aws-cdn",
        position: { x: 400, y: 50 },
        config: { price_class: "PriceClass_100", default_ttl: 86400 },
      },
    ];

    if (existingAlb) {
      changes.push({
        type: "add_connection",
        description: "CDN uses Load Balancer as origin",
        source: "new-0",
        target: existingAlb.id,
      });
    }
    if (existingS3) {
      changes.push({
        type: "add_connection",
        description: "CDN uses S3 bucket as origin",
        source: "new-0",
        target: existingS3.id,
      });
    }

    return {
      message:
        "I'll add a CloudFront CDN distribution to cache and deliver your content globally with low latency." +
        (existingAlb ? " Connected to your existing Load Balancer as origin." : "") +
        (existingS3 ? " Connected to your existing S3 bucket as origin." : ""),
      proposedChanges: changes,
    };
  }

  // ----- SERVERLESS -----
  if (
    lowerMessage.includes("serverless") ||
    lowerMessage.includes("lambda")
  ) {
    return {
      message:
        "I'll set up a serverless architecture with API Gateway, Lambda, and DynamoDB — all connected in a pipeline.",
      proposedChanges: [
        {
          type: "add_node",
          tempId: "new-0",
          description: "Add API Gateway",
          componentId: "aws-api-gw",
          position: { x: 400, y: 100 },
          config: {
            name: "serverless-api",
            protocol_type: "HTTP",
            stage_name: "prod",
          },
        },
        {
          type: "add_node",
          tempId: "new-1",
          description: "Add Lambda Function",
          componentId: "aws-lambda",
          position: { x: 400, y: 350 },
          config: {
            function_name: "api-handler",
            runtime: "nodejs20.x",
            memory_size: 256,
            timeout: 30,
          },
        },
        {
          type: "add_node",
          tempId: "new-2",
          description: "Add DynamoDB Table",
          componentId: "aws-dynamodb",
          position: { x: 400, y: 600 },
          config: {
            table_name: "app-data",
            billing_mode: "PAY_PER_REQUEST",
            hash_key: "id",
          },
        },
        {
          type: "add_connection",
          description: "API Gateway routes to Lambda",
          source: "new-0",
          target: "new-1",
        },
        {
          type: "add_connection",
          description: "Lambda reads/writes DynamoDB",
          source: "new-1",
          target: "new-2",
        },
      ],
    };
  }

  // ----- GCP -----
  if (
    lowerMessage.includes("gcp") ||
    lowerMessage.includes("google cloud")
  ) {
    return {
      message:
        "I'll set up a GCP architecture with Cloud Run, Cloud SQL, and Cloud Storage — all connected.",
      proposedChanges: [
        {
          type: "add_node",
          tempId: "new-0",
          description: "Add Load Balancer",
          componentId: "gcp-lb",
          position: { x: 400, y: 100 },
          config: { name: "web-lb", type: "EXTERNAL" },
        },
        {
          type: "add_node",
          tempId: "new-1",
          description: "Add Cloud Run service",
          componentId: "gcp-cloud-run",
          position: { x: 400, y: 350 },
          config: {
            service_name: "web-service",
            cpu: "2",
            memory: "1Gi",
            max_instances: 10,
          },
        },
        {
          type: "add_node",
          tempId: "new-2",
          description: "Add Cloud SQL PostgreSQL",
          componentId: "gcp-cloud-sql",
          position: { x: 400, y: 600 },
          config: {
            name: "app-db",
            database_version: "POSTGRES_16",
            tier: "db-g1-small",
          },
        },
        {
          type: "add_node",
          tempId: "new-3",
          description: "Add Cloud Storage bucket",
          componentId: "gcp-gcs",
          position: { x: 700, y: 350 },
          config: {
            name: "app-assets",
            location: "US",
            storage_class: "STANDARD",
            versioning: true,
          },
        },
        {
          type: "add_connection",
          description: "Load Balancer routes to Cloud Run",
          source: "new-0",
          target: "new-1",
        },
        {
          type: "add_connection",
          description: "Cloud Run connects to Cloud SQL",
          source: "new-1",
          target: "new-2",
        },
        {
          type: "add_connection",
          description: "Cloud Run accesses Cloud Storage",
          source: "new-1",
          target: "new-3",
        },
      ],
    };
  }

  // ----- AZURE -----
  if (lowerMessage.includes("azure")) {
    return {
      message:
        "I'll create an Azure infrastructure with Virtual Network, VM, NSG, and SQL Database — all connected.",
      proposedChanges: [
        {
          type: "add_node",
          tempId: "new-0",
          description: "Add Azure Virtual Network",
          componentId: "azure-vnet",
          position: { x: 400, y: 100 },
          config: { name: "main-vnet", address_space: "10.0.0.0/16" },
        },
        {
          type: "add_node",
          tempId: "new-1",
          description: "Add Network Security Group",
          componentId: "azure-nsg",
          position: { x: 700, y: 100 },
          config: {
            name: "web-nsg",
            inbound_rules: "80,443",
          },
        },
        {
          type: "add_node",
          tempId: "new-2",
          description: "Add Azure Virtual Machine",
          componentId: "azure-vm",
          position: { x: 400, y: 350 },
          config: {
            name: "web-server",
            vm_size: "Standard_D2s_v5",
            os_type: "Linux",
          },
        },
        {
          type: "add_node",
          tempId: "new-3",
          description: "Add Azure SQL Database",
          componentId: "azure-sql",
          position: { x: 400, y: 600 },
          config: {
            server_name: "app-sql-server",
            db_name: "appdb",
            sku_name: "S0",
          },
        },
        {
          type: "add_connection",
          description: "VNet contains the VM",
          source: "new-0",
          target: "new-2",
        },
        {
          type: "add_connection",
          description: "VNet contains SQL Database",
          source: "new-0",
          target: "new-3",
        },
        {
          type: "add_connection",
          description: "NSG belongs to VNet",
          source: "new-0",
          target: "new-1",
        },
        {
          type: "add_connection",
          description: "NSG protects VM",
          source: "new-1",
          target: "new-2",
        },
        {
          type: "add_connection",
          description: "VM connects to SQL Database",
          source: "new-2",
          target: "new-3",
        },
      ],
    };
  }

  // ----- CONNECT EXISTING -----
  if (
    lowerMessage.includes("connect") &&
    canvasContext?.nodes?.length >= 2
  ) {
    const nodes = canvasContext.nodes;
    const connections: ClientResponse["proposedChanges"] = [];
    // Simple heuristic: find VPC/VNet and connect to everything else
    const networkNode = nodes.find(
      (n) =>
        n.componentId === "aws-vpc" ||
        n.componentId === "gcp-vpc" ||
        n.componentId === "azure-vnet"
    );
    if (networkNode) {
      for (const node of nodes) {
        if (
          node.id !== networkNode.id &&
          node.componentId !== "aws-sg" &&
          node.componentId !== "gcp-firewall" &&
          node.componentId !== "azure-nsg"
        ) {
          connections.push({
            type: "add_connection",
            description: `Connect ${networkNode.componentId} to ${node.componentId}`,
            source: networkNode.id,
            target: node.id,
          });
        }
      }
    }

    if (connections.length > 0) {
      return {
        message: `I'll connect your existing resources. Found ${connections.length} connections to create based on your infrastructure layout.`,
        proposedChanges: connections,
      };
    }
  }

  // ----- GENERIC -----
  return {
    message: `I can help you design your infrastructure! Here are some things I can do:

- **Create architectures**: "Create a 3-tier web app on AWS"
- **Add databases**: "Add a PostgreSQL database with high availability"
- **Set up networking**: "Set up a VPC with public and private subnets"
- **Serverless**: "Create a serverless API with Lambda and DynamoDB"
- **Multi-cloud**: "Set up a GCP Cloud Run architecture" or "Create an Azure infrastructure"
- **CDN**: "Add a CDN in front of my application"
- **Connect resources**: "Connect my existing resources"

What would you like to build?`,
    proposedChanges: [],
  };
}
