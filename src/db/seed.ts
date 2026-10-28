import { client, db } from "./index";
import {
  workloadsTable,
  type WorkloadInsert,
} from "./schema/workloads";

/**
 * Realistic initial sample workloads for the EcoSched carbon-aware scheduling platform.
 * Features a diverse mix of priorities, computational requirements (CPU/RAM),
 * operational durations, energy demands, and realistic arrival/deadline windows.
 */
const now = new Date();
const baseTimeMs = now.getTime();
const hourMs = 60 * 60 * 1000;

export const sampleWorkloads: WorkloadInsert[] = [
  {
    name: "LLM-Batch-Inference-Llama-70B",
    priority: "High",
    cpuCores: 64,
    memoryGb: 256,
    durationMinutes: 180,
    energyKwh: 42.5,
    dataSizeGb: 85.0,
    status: "Pending",
    arrival: new Date(baseTimeMs).toISOString(),
    deadline: new Date(baseTimeMs + 8 * hourMs).toISOString(),
  },
  {
    name: "Genomics-Variant-Calling-Pipeline",
    priority: "High",
    cpuCores: 96,
    memoryGb: 384,
    durationMinutes: 240,
    energyKwh: 68.0,
    dataSizeGb: 150.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 15 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 10 * hourMs).toISOString(),
  },
  {
    name: "GeoSpatial-Satellite-Tile-Rendering",
    priority: "Medium",
    cpuCores: 32,
    memoryGb: 128,
    durationMinutes: 120,
    energyKwh: 24.0,
    dataSizeGb: 40.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 30 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 12 * hourMs).toISOString(),
  },
  {
    name: "Climate-Risk-Monte-Carlo-Sim",
    priority: "Medium",
    cpuCores: 48,
    memoryGb: 192,
    durationMinutes: 90,
    energyKwh: 18.5,
    dataSizeGb: 25.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 45 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 14 * hourMs).toISOString(),
  },
  {
    name: "Financial-Fraud-Detection-Model-Retrain",
    priority: "High",
    cpuCores: 32,
    memoryGb: 96,
    durationMinutes: 75,
    energyKwh: 14.8,
    dataSizeGb: 32.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 60 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 6 * hourMs).toISOString(),
  },
  {
    name: "Video-Transcoding-H265-4K",
    priority: "Low",
    cpuCores: 24,
    memoryGb: 48,
    durationMinutes: 45,
    energyKwh: 6.4,
    dataSizeGb: 65.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 90 * 60 * 1000).toISOString(),
    deadline: new Date(baseTimeMs + 18 * hourMs).toISOString(),
  },
  {
    name: "Nightly-ETL-Warehouse-Sync",
    priority: "Low",
    cpuCores: 16,
    memoryGb: 64,
    durationMinutes: 60,
    energyKwh: 8.2,
    dataSizeGb: 210.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 2 * hourMs).toISOString(),
    deadline: new Date(baseTimeMs + 20 * hourMs).toISOString(),
  },
  {
    name: "Log-Archive-Cold-Storage-Compression",
    priority: "Low",
    cpuCores: 8,
    memoryGb: 32,
    durationMinutes: 30,
    energyKwh: 3.1,
    dataSizeGb: 320.0,
    status: "Pending",
    arrival: new Date(baseTimeMs + 3 * hourMs).toISOString(),
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
    console.log(`📦 Inserting ${sampleWorkloads.length} sample cloud workloads into Supabase...`);

    const inserted = await db
      .insert(workloadsTable)
      .values(sampleWorkloads)
      .returning();

    const elapsed = Date.now() - startTime;
    console.log(`✅ Successfully seeded ${inserted.length} cloud workloads in ${elapsed}ms:`);

    inserted.forEach((item, index) => {
      console.log(
        `   ${index + 1}. [${item.priority}] ${item.name} (${item.cpuCores} cores, ${item.memoryGb} GB, ${item.energyKwh} kWh, ${item.durationMinutes}m) - Status: ${item.status}`
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
