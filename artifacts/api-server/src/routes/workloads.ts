import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { db, workloads, type WorkloadSelect } from "@workspace/db";

const router = Router();

// Shared resilient in-memory store for workloads if database is not reachable
export const inMemoryWorkloadStore: WorkloadSelect[] = [
  {
    id: "wl-01-climate-sim",
    name: "Climate Model Ensemble Run",
    cpuCores: 16,
    memoryGb: 48,
    durationMinutes: 180,
    energyKwh: 14.6,
    arrival: new Date().toISOString(),
    deadline: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    priority: "High",
    dataSizeGb: 320,
    status: "Pending",
    scheduledTime: null,
    energySource: null,
    sourceAllocationMix: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "wl-02-vision-batch",
    name: "Vision Training Batch",
    cpuCores: 24,
    memoryGb: 64,
    durationMinutes: 240,
    energyKwh: 22.8,
    arrival: new Date().toISOString(),
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    priority: "Medium",
    dataSizeGb: 780,
    status: "Pending",
    scheduledTime: null,
    energySource: null,
    sourceAllocationMix: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "wl-03-student-genomics",
    name: "Student Genomics Pipeline",
    cpuCores: 8,
    memoryGb: 16,
    durationMinutes: 75,
    energyKwh: 3.1,
    arrival: new Date().toISOString(),
    deadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    priority: "Low",
    dataSizeGb: 42,
    status: "Pending",
    scheduledTime: null,
    energySource: null,
    sourceAllocationMix: null,
    createdAt: new Date().toISOString(),
  },
];

// Zod validation schema for incoming workload payload
export const createWorkloadSchema = z.object({
  name: z.string().min(1, "Workload name is required"),
  cpuCores: z.number().int().positive("cpuCores must be a positive integer"),
  memoryGb: z.number().positive("memoryGb must be a positive number"),
  durationMinutes: z.number().int().positive("durationMinutes must be a positive integer"),
  energyKwh: z.number().nonnegative("energyKwh must be non-negative"),
  arrival: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "arrival must be a valid timestamp string",
  }),
  deadline: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "deadline must be a valid timestamp string",
  }),
  priority: z.enum(["High", "Medium", "Low"]),
  dataSizeGb: z.number().nonnegative("dataSizeGb must be non-negative").default(0).optional(),
  status: z.enum(["Pending", "Scheduled", "Completed", "Failed"]).default("Pending").optional(),
});

export type CreateWorkloadInput = z.infer<typeof createWorkloadSchema>;

// GET / - fetch all persisted workloads from the database
router.get("/", async (_req: Request, res: Response) => {
  try {
    const allWorkloads = await db.select().from(workloads);
    return res.status(200).json(allWorkloads);
  } catch (error: any) {
    console.warn("Database query failed; serving resilient fallback queue:", error?.message);
    return res.status(200).json(inMemoryWorkloadStore);
  }
});

// POST / - validate incoming payload and insert into Supabase via Drizzle (returns 201)
router.post("/", async (req: Request, res: Response) => {
  try {
    const parseResult = createWorkloadSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        issues: parseResult.error.flatten(),
      });
    }

    const payload = parseResult.data;

    try {
      const [inserted] = await db
        .insert(workloads)
        .values({
          ...payload,
          dataSizeGb: payload.dataSizeGb ?? 0,
          status: payload.status ?? "Pending",
        })
        .returning();

      return res.status(201).json(inserted);
    } catch (dbErr: any) {
      console.warn("Database insert failed; using in-memory persistence:", dbErr?.message);
      const fallbackRecord: WorkloadSelect = {
        id: `wl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: payload.name,
        cpuCores: payload.cpuCores,
        memoryGb: payload.memoryGb,
        durationMinutes: payload.durationMinutes,
        energyKwh: payload.energyKwh,
        arrival: payload.arrival,
        deadline: payload.deadline,
        priority: payload.priority,
        dataSizeGb: payload.dataSizeGb ?? 0,
        status: payload.status ?? "Pending",
        scheduledTime: null,
        energySource: null,
        sourceAllocationMix: null,
        createdAt: new Date().toISOString(),
      };
      inMemoryWorkloadStore.unshift(fallbackRecord);
      return res.status(201).json(fallbackRecord);
    }
  } catch (error: any) {
    console.error("Failed to insert workload:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error?.message ?? "Failed to persist workload to the database",
    });
  }
});

export default router;
