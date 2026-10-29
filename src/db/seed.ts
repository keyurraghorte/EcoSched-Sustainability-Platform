import { client, db } from "./index";
import {
  workloadsTable,
  type WorkloadInsert,
} from "./schema/workloads";

/**
 * Comprehensive production enterprise workloads for the EcoSched carbon-aware platform.
 * Spans GenAI training, scientific simulations, big data analytics, media rendering,
 * and background cybersecurity/infrastructure tasks with multi-dimensional resource demands.
 */
const now = new Date();
const baseTimeMs = now.getTime();
const hourMs = 60 * 60 * 1000;

export const sampleWorkloads: WorkloadInsert[] = [
  // --- High Priority Workloads (Compute & Latency Sensitive) ---
  {
    name: "LLM-FineTuning-Llama-3.1-70B-LoRA",
    priority: "High",
    cpuCores: 128,
    memoryGb: 512,
    durationMinutes: 300,
    energyKwh: 78.4,
    dataSizeGb: 160.0,
    status: "Pending",
    arrival: new Date(baseTimeMs).toISOString(),
    deadline: new Date(baseTimeMs + 8 * hourMs).toISOString(),
  },
  {
    name: "AlphaFold-Protein-Folding-Simulation",
    priority: "High",
    cpuCores: 96,
    memoryGb: 384,
    durationMinutes: 240,
    energyKwh: 64.0,
    dataSizeGb: 120.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 10 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 9 * hourMs).toISOString(),
  },
  {
    name: "Financial-Derivatives-VaR-Risk-Matrix",
    priority: "High",
    cpuCores: 64,
    memoryGb: 192,
    durationMinutes: 75,
    energyKwh: 18.5,
    dataSizeGb: 35.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 20 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 4 * hourMs).toISOString(),
  },
  {
    name: "Atmospheric-WRF-Climate-Ensemble-Run",
    priority: "High",
    cpuCores: 128,
    memoryGb: 512,
    durationMinutes: 360,
    energyKwh: 95.0,
    dataSizeGb: 480.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 30 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 12 * hourMs).toISOString(),
  },
  {
    name: "Suricata-Network-PCAP-Threat-Inspection",
    priority: "High",
    cpuCores: 32,
    memoryGb: 128,
    durationMinutes: 60,
    energyKwh: 12.2,
    dataSizeGb: 85.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 40 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 5 * hourMs).toISOString(),
  },
  {
    name: "Mistral-Large-Instruction-Distillation",
    priority: "High",
    cpuCores: 64,
    memoryGb: 256,
    durationMinutes: 180,
    energyKwh: 46.0,
    dataSizeGb: 90.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 50 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 8 * hourMs).toISOString(),
  },

  // --- Medium Priority Workloads (Batch Compute & Scientific Analytics) ---
  {
    name: "Apache-Spark-Global-Clickstream-ETL",
    priority: "Medium",
    cpuCores: 64,
    memoryGb: 256,
    durationMinutes: 120,
    energyKwh: 28.5,
    dataSizeGb: 850.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 60 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 10 * hourMs).toISOString(),
  },
  {
    name: "GeoSpatial-Satellite-Multispectral-Tile-Render",
    priority: "Medium",
    cpuCores: 32,
    memoryGb: 128,
    durationMinutes: 120,
    energyKwh: 24.0,
    dataSizeGb: 40.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 70 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 12 * hourMs).toISOString(),
  },
  {
    name: "Cryo-EM-Micrograph-3D-Reconstruction",
    priority: "Medium",
    cpuCores: 64,
    memoryGb: 256,
    durationMinutes: 180,
    energyKwh: 44.5,
    dataSizeGb: 350.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 80 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 14 * hourMs).toISOString(),
  },
  {
    name: "Whisper-v3-Multilingual-Speech-Transcribe",
    priority: "Medium",
    cpuCores: 32,
    memoryGb: 96,
    durationMinutes: 90,
    energyKwh: 16.5,
    dataSizeGb: 60.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 90 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 11 * hourMs).toISOString(),
  },
  {
    name: "Blender-Cycles-VFX-4K-Raytracing-Batch",
    priority: "Medium",
    cpuCores: 96,
    memoryGb: 256,
    durationMinutes: 150,
    energyKwh: 38.0,
    dataSizeGb: 180.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 100 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 14 * hourMs).toISOString(),
  },
  {
    name: "E-Commerce-Graph-Collaborative-Filtering",
    priority: "Medium",
    cpuCores: 48,
    memoryGb: 192,
    durationMinutes: 105,
    energyKwh: 22.0,
    dataSizeGb: 75.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 110 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 12 * hourMs).toISOString(),
  },
  {
    name: "Vector-Embedding-HNSW-Index-Rebuild",
    priority: "Medium",
    cpuCores: 32,
    memoryGb: 96,
    durationMinutes: 45,
    energyKwh: 9.8,
    dataSizeGb: 85.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 120 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 8 * hourMs).toISOString(),
  },

  // --- Low Priority Workloads (Time-Flexible & Heavy Storage/Compression) ---
  {
    name: "Stable-Diffusion-XL-Marketing-Assets-Gen",
    priority: "Low",
    cpuCores: 48,
    memoryGb: 128,
    durationMinutes: 60,
    energyKwh: 14.2,
    dataSizeGb: 45.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 130 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 18 * hourMs).toISOString(),
  },
  {
    name: "Snowflake-Data-Vault-Nightly-CDC-Merge",
    priority: "Low",
    cpuCores: 32,
    memoryGb: 128,
    durationMinutes: 90,
    energyKwh: 15.0,
    dataSizeGb: 420.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 140 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 20 * hourMs).toISOString(),
  },
  {
    name: "Nightly-Postgres-OLAP-Materialized-View-Refresh",
    priority: "Low",
    cpuCores: 16,
    memoryGb: 64,
    durationMinutes: 30,
    energyKwh: 4.8,
    dataSizeGb: 110.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 150 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 16 * hourMs).toISOString(),
  },
  {
    name: "AV1-DASH-Adaptive-Bitrate-Transcoding",
    priority: "Low",
    cpuCores: 32,
    memoryGb: 64,
    durationMinutes: 60,
    energyKwh: 11.2,
    dataSizeGb: 240.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 160 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 22 * hourMs).toISOString(),
  },
  {
    name: "Elasticsearch-Cold-Tier-Shard-Defragmentation",
    priority: "Low",
    cpuCores: 16,
    memoryGb: 64,
    durationMinutes: 45,
    energyKwh: 5.5,
    dataSizeGb: 620.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 170 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 24 * hourMs).toISOString(),
  },
  {
    name: "Kubernetes-Container-Image-Trivy-CVE-Scan",
    priority: "Low",
    cpuCores: 24,
    memoryGb: 48,
    durationMinutes: 40,
    energyKwh: 6.8,
    dataSizeGb: 50.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 180 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 16 * hourMs).toISOString(),
  },
  {
    name: "Database-Offsite-Encrypted-Snapshot-Export",
    priority: "Low",
    cpuCores: 16,
    memoryGb: 64,
    durationMinutes: 80,
    energyKwh: 10.4,
    dataSizeGb: 950.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 200 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 24 * hourMs).toISOString(),
  },
];

/**
 * Seeds sample cloud workloads into the Supabase PostgreSQL database.
 */
export async function seed(): Promise<void> {
  console.log("🌱 Starting EcoSched database seeding...");
  console.log(`📡 Target database host: ${process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL.replace('postgresql://', 'http://')).host : 'Supabase (direct)'}`);

  const startTime = Date.now();

  try {
    console.log(`📦 Inserting ${sampleWorkloads.length} realistic enterprise workloads into Supabase...`);

    const inserted = await db
      .insert(workloadsTable)
      .values(sampleWorkloads)
      .returning();

    const elapsed = Date.now() - startTime;
    console.log(`✅ Successfully seeded ${inserted.length} cloud workloads in ${elapsed}ms:`);

    inserted.forEach((item, index) => {
      console.log(
        `   ${index + 1}. [${item.priority}] ${item.name} (${item.cpuCores} cores, ${item.memoryGb} GB RAM, ${item.energyKwh} kWh, ${item.durationMinutes}m, ${item.dataSizeGb} GB data) - Status: ${item.status}`
      );
    });

    // Close the postgres connection pool cleanly
    await client.end({ timeout: 5 });
    console.log("✨ Seeding completed successfully. Exiting.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to seed database workloads into Supabase:", error);
    try {
      await client.end({ timeout: 2 });
    } catch {
      // Ignore cleanup error on failure
    }
    process.exit(1);
  }
}

// Execute seed function if run directly
seed();
