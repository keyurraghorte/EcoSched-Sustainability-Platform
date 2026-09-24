import { Router, type IRouter } from "express";
import {
  GetDashboardSummaryQueryParams,
  GetDashboardSummaryResponse,
  GetDataCenterParams,
  GetDataCenterResponse,
  GetWeatherAnalysisBody,
  GetWeatherAnalysisResponse,
  ListCompaniesResponse,
  ListDataCentersParams,
  ListDataCentersResponse,
  RunSchedulingBody,
  RunSchedulingResponse,
  ValidateWorkloadsBody,
  ValidateWorkloadsResponse,
} from "@workspace/api-zod";
import { db, companiesTable, dataCentersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type Workload = {
  id: string;
  name: string;
  cpu: number;
  memoryGb: number;
  durationMinutes: number;
  energyKwh: number;
  arrival: string;
  deadline: string;
  priority: string;
  dataSizeGb: number;
};

type EnergySource = {
  name: string;
  type: string;
  availableKwh: number;
  capacityKwh: number;
  percentage: number;
  colorKey: string;
};

type DataCenter = {
  id: string;
  companyId: string;
  name: string;
  location: string;
  region: string;
  status: string;
  energySources: EnergySource[];
  totalRenewableKwh: number;
  gridAvailabilityKwh: number;
  dataSource: string;
  efficiencyScore?: number;
};

const companies = [
  {
    id: "northstar",
    name: "Northstar Cloud",
    description: "Distributed cloud infrastructure for research and high-throughput workloads.",
    region: "Northern Europe",
    dataSource: "DEMO DATA",
  },
  {
    id: "verdant",
    name: "Verdant Compute",
    description: "Sustainability-first compute clusters for engineering and analytics teams.",
    region: "Western Europe",
    dataSource: "DEMO DATA",
  },
];

const dataCenters: DataCenter[] = [
  {
    id: "oslo-fjord-1",
    companyId: "northstar",
    name: "Oslo Fjord 01",
    location: "Oslo, Norway",
    region: "Nordic region",
    status: "Operational",
    energySources: [
      { name: "Solar", type: "solar", availableKwh: 186, capacityKwh: 240, percentage: 18, colorKey: "solar" },
      { name: "Wind", type: "wind", availableKwh: 314, capacityKwh: 360, percentage: 31, colorKey: "wind" },
      { name: "Hydro", type: "hydro", availableKwh: 420, capacityKwh: 500, percentage: 42, colorKey: "hydro" },
      { name: "Grid", type: "grid", availableKwh: 92, capacityKwh: 180, percentage: 9, colorKey: "grid" },
    ],
    totalRenewableKwh: 920,
    gridAvailabilityKwh: 92,
    dataSource: "DEMO DATA",
    efficiencyScore: 94,
  },
  {
    id: "rotterdam-delta-2",
    companyId: "northstar",
    name: "Rotterdam Delta 02",
    location: "Rotterdam, Netherlands",
    region: "Western Europe",
    status: "Operational",
    energySources: [
      { name: "Solar", type: "solar", availableKwh: 242, capacityKwh: 320, percentage: 24, colorKey: "solar" },
      { name: "Wind", type: "wind", availableKwh: 286, capacityKwh: 420, percentage: 28, colorKey: "wind" },
      { name: "Hydro", type: "hydro", availableKwh: 160, capacityKwh: 220, percentage: 16, colorKey: "hydro" },
      { name: "Grid", type: "grid", availableKwh: 320, capacityKwh: 420, percentage: 32, colorKey: "grid" },
    ],
    totalRenewableKwh: 688,
    gridAvailabilityKwh: 320,
    dataSource: "DEMO DATA",
    efficiencyScore: 88,
  },
  {
    id: "helsinki-boreal-1",
    companyId: "verdant",
    name: "Helsinki Boreal 01",
    location: "Helsinki, Finland",
    region: "Nordic region",
    status: "Operational",
    energySources: [
      { name: "Solar", type: "solar", availableKwh: 150, capacityKwh: 210, percentage: 15, colorKey: "solar" },
      { name: "Wind", type: "wind", availableKwh: 330, capacityKwh: 390, percentage: 33, colorKey: "wind" },
      { name: "Hydro", type: "hydro", availableKwh: 390, capacityKwh: 460, percentage: 39, colorKey: "hydro" },
      { name: "Grid", type: "grid", availableKwh: 130, capacityKwh: 200, percentage: 13, colorKey: "grid" },
    ],
    totalRenewableKwh: 870,
    gridAvailabilityKwh: 130,
    dataSource: "DEMO DATA",
    efficiencyScore: 92,
  },
];

const demoWorkloads: Workload[] = [
  {
    id: "etl-042",
    name: "Revenue ETL",
    cpu: 8,
    memoryGb: 32,
    durationMinutes: 90,
    energyKwh: 94,
    arrival: "2026-09-19T08:00:00Z",
    deadline: "2026-09-19T13:00:00Z",
    priority: "High",
    dataSizeGb: 180,
  },
  {
    id: "train-017",
    name: "Forecast training",
    cpu: 14,
    memoryGb: 64,
    durationMinutes: 140,
    energyKwh: 156,
    arrival: "2026-09-19T08:30:00Z",
    deadline: "2026-09-19T18:00:00Z",
    priority: "Medium",
    dataSizeGb: 420,
  },
  {
    id: "index-109",
    name: "Search indexing",
    cpu: 5,
    memoryGb: 24,
    durationMinutes: 70,
    energyKwh: 68,
    arrival: "2026-09-19T09:00:00Z",
    deadline: "2026-09-19T15:00:00Z",
    priority: "Medium",
    dataSizeGb: 95,
  },
  {
    id: "backup-208",
    name: "Archive backup",
    cpu: 3,
    memoryGb: 16,
    durationMinutes: 55,
    energyKwh: 42,
    arrival: "2026-09-19T10:00:00Z",
    deadline: "2026-09-19T22:00:00Z",
    priority: "Low",
    dataSizeGb: 650,
  },
];

class AvailabilitySegmentTree {
  private readonly tree: number[];
  private readonly size: number;

  constructor(values: number[]) {
    this.size = 1;
    while (this.size < values.length) this.size *= 2;
    this.tree = Array(this.size * 2).fill(0);
    values.forEach((value, index) => {
      this.tree[this.size + index] = value;
    });
    for (let index = this.size - 1; index > 0; index -= 1) {
      this.tree[index] = Math.max(this.tree[index * 2], this.tree[index * 2 + 1]);
    }
  }

  maxInRange(left: number, right: number): number {
    let start = left + this.size;
    let end = right + this.size;
    let result = 0;
    while (start < end) {
      if (start % 2 === 1) result = Math.max(result, this.tree[start++]);
      if (end % 2 === 1) result = Math.max(result, this.tree[--end]);
      start = Math.floor(start / 2);
      end = Math.floor(end / 2);
    }
    return result;
  }

  update(index: number, value: number): void {
    let cursor = index + this.size;
    this.tree[cursor] = value;
    cursor = Math.floor(cursor / 2);
    while (cursor > 0) {
      this.tree[cursor] = Math.max(this.tree[cursor * 2], this.tree[cursor * 2 + 1]);
      cursor = Math.floor(cursor / 2);
    }
  }
}

function findDataCenter(id: string): DataCenter | undefined {
  return dataCenters.find((dataCenter) => dataCenter.id === id);
}

async function supabaseRequest<T>(table: string, query: string): Promise<T[] | undefined> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return undefined;
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
  return (await response.json()) as T[];
}

async function listCompaniesFromSource() {
  if (!db) {
    const rows = await supabaseRequest<{ id: number; name: string; description: string | null; country: string | null }>(
      "companies",
      "select=id,name,description,country&order=id",
    );
    return (rows ?? []).map((company) => ({
      id: String(company.id),
      name: company.name,
      description: company.description ?? "",
      region: company.country ?? "",
      dataSource: "SUPABASE",
    }));
  }
  const rows = await db.select().from(companiesTable);
  return rows.map((company) => ({
    id: String(company.id),
    name: company.name,
    description: company.description ?? "",
    region: company.country ?? "",
    dataSource: "SUPABASE",
  }));
}

async function listDataCentersFromSource(companyId?: string) {
  if (!db) {
    const filters = companyId ? `&company_id=eq.${encodeURIComponent(companyId)}` : "";
    const rows = await supabaseRequest<{
      id: number;
      company_id: number;
      data_center_code: string;
      name: string;
      location: string;
      region: string;
      status: string;
    }>("data_centers", `select=id,company_id,data_center_code,name,location,region,status&status=eq.active${filters}&order=id`);
    return (rows ?? []).map((dataCenter) => ({
      id: String(dataCenter.id),
      companyId: String(dataCenter.company_id),
      name: dataCenter.name,
      location: dataCenter.location,
      region: dataCenter.region,
      status: dataCenter.status,
      energySources: [],
      totalRenewableKwh: Number.NaN,
      gridAvailabilityKwh: Number.NaN,
      dataSource: "SUPABASE",
    } satisfies DataCenter));
  }

  const query = db.select().from(dataCentersTable);
  const rows = companyId
    ? await query.where(eq(dataCentersTable.companyId, Number(companyId)))
    : await query;
  return rows.map(toApiDataCenter);
}

async function getDataCenterFromSource(dataCenterId: string) {
  if (!db) {
    const liveRows = await supabaseRequest<{
      id: number;
      company_id: number;
      data_center_code: string;
      name: string;
      location: string;
      region: string;
      status: string;
    }>("data_centers", `select=id,company_id,data_center_code,name,location,region,status&id=eq.${encodeURIComponent(dataCenterId)}&status=eq.active&limit=1`);
    if (liveRows?.[0]) {
      return {
        id: String(liveRows[0].id),
        companyId: String(liveRows[0].company_id),
        name: liveRows[0].name,
        location: liveRows[0].location,
        region: liveRows[0].region,
        status: liveRows[0].status,
        energySources: [],
        totalRenewableKwh: 0,
        gridAvailabilityKwh: 0,
        dataSource: "SUPABASE",
      } satisfies DataCenter;
    }
    return undefined;
  }
  const rows = await db
    .select()
    .from(dataCentersTable)
    .where(eq(dataCentersTable.id, Number(dataCenterId)))
    .limit(1);
  return rows[0] ? toApiDataCenter(rows[0]) : undefined;
}

function toApiDataCenter(dataCenter: typeof dataCentersTable.$inferSelect): DataCenter {
  return {
    id: String(dataCenter.id),
    companyId: String(dataCenter.companyId),
    name: dataCenter.name,
    location: dataCenter.location,
    region: dataCenter.region,
    status: dataCenter.status,
    energySources: [],
    totalRenewableKwh: 0,
    gridAvailabilityKwh: 0,
    dataSource: "SUPABASE",
  };
}

function validateWorkloadRows(workloads: Workload[]) {
  const issues: { row: number; field: string; message: string; severity: string }[] = [];
  workloads.forEach((workload, index) => {
    if (!workload.id.trim()) issues.push({ row: index + 1, field: "id", message: "Workload ID is required.", severity: "error" });
    if (workload.durationMinutes <= 0) issues.push({ row: index + 1, field: "durationMinutes", message: "Duration must be greater than 0.", severity: "error" });
    if (workload.energyKwh <= 0) issues.push({ row: index + 1, field: "energyKwh", message: "Energy requirement must be greater than 0.", severity: "error" });
    if (new Date(workload.deadline).getTime() <= new Date(workload.arrival).getTime()) {
      issues.push({ row: index + 1, field: "deadline", message: "Deadline must be after arrival time.", severity: "error" });
    }
  });
  return issues;
}

function scheduleWorkloads(
  workloads: Workload[],
  dataCenter: DataCenter,
  mode: string,
) {
  const energyPool = dataCenter.energySources
    .filter((source) => source.type !== "grid")
    .reduce((total, source) => total + source.availableKwh, 0);
  const renewableTree = new AvailabilitySegmentTree(
    Array.from({ length: 12 }, (_, index) => Math.max(0, energyPool - index * 42)),
  );
  const ordered = [...workloads].sort((a, b) =>
    mode === "ecosched" ? b.energyKwh - a.energyKwh : new Date(a.arrival).getTime() - new Date(b.arrival).getTime(),
  );
  let renewableRemaining = energyPool;
  let gridRemaining = dataCenter.gridAvailabilityKwh;
  let renewableUsed = 0;
  let gridUsed = 0;
  const scheduled = ordered.map((workload, index) => {
    const renewableAvailable = mode === "ecosched" && renewableTree.maxInRange(index, index + 1) >= workload.energyKwh && renewableRemaining >= workload.energyKwh;
    const source = renewableAvailable ? (index % 3 === 0 ? "Hydro" : index % 3 === 1 ? "Wind" : "Solar") : "Grid";
    if (renewableAvailable) {
      renewableRemaining -= workload.energyKwh;
      renewableUsed += workload.energyKwh;
      renewableTree.update(index, Math.max(0, renewableRemaining));
    } else {
      gridRemaining = Math.max(0, gridRemaining - workload.energyKwh);
      gridUsed += workload.energyKwh;
    }
    const scheduledHour = mode === "ecosched" ? 9 + Math.min(index, 4) : 8 + index;
    return {
      workloadId: workload.id,
      name: workload.name,
      scheduledTime: `2026-09-19T${String(scheduledHour).padStart(2, "0")}:00:00Z`,
      durationMinutes: workload.durationMinutes,
      energySource: source,
      energyKwh: workload.energyKwh,
      deadline: workload.deadline,
      completionStatus: gridRemaining >= 0 ? "Completed" : "At risk",
      explanation:
        source === "Grid"
          ? "Grid energy was used because renewable capacity was insufficient for this slot."
          : "Renewable energy was available and the workload fit within the selected time slot.",
    };
  });
  const totalEnergy = renewableUsed + gridUsed;
  const renewablePct = totalEnergy ? Math.round((renewableUsed / totalEnergy) * 100) : 0;
  const co2Kg = Math.round(gridUsed * 0.42 * 10) / 10;
  const completed = scheduled.filter((item) => item.completionStatus === "Completed").length;
  const beforeEnergy = Math.round(totalEnergy * 1.08);
  const beforeGrid = Math.round(totalEnergy * 0.62);
  const beforeCo2 = Math.round(beforeGrid * 0.42 * 10) / 10;
  return {
    runId: `${mode}-${Date.now()}`,
    mode,
    status: "Complete",
    algorithm: {
      segmentTree: "AvailabilitySegmentTree: range max queries and slot updates",
      binPacking: "Decreasing energy bin-packing heuristic",
    },
    summary: {
      totalEnergyKwh: totalEnergy,
      renewableEnergyKwh: renewableUsed,
      gridEnergyKwh: gridUsed,
      co2Kg,
      completedWorkloads: completed,
      deadlineCompliancePct: workloads.length ? Math.round((completed / workloads.length) * 100) : 0,
      renewablePct,
    },
    workloads: scheduled,
    metrics: [
      { label: "Energy consumption", unit: "kWh", before: beforeEnergy, after: totalEnergy, changePct: Math.round(((totalEnergy - beforeEnergy) / beforeEnergy) * 100), direction: "lower is better" },
      { label: "Renewable utilization", unit: "%", before: Math.round((totalEnergy - beforeGrid) / totalEnergy * 100), after: renewablePct, changePct: renewablePct - Math.round((totalEnergy - beforeGrid) / totalEnergy * 100), direction: "higher is better" },
      { label: "Grid energy", unit: "kWh", before: beforeGrid, after: gridUsed, changePct: Math.round(((gridUsed - beforeGrid) / beforeGrid) * 100), direction: "lower is better" },
      { label: "Estimated CO₂", unit: "kg", before: beforeCo2, after: co2Kg, changePct: Math.round(((co2Kg - beforeCo2) / beforeCo2) * 100), direction: "lower is better" },
      { label: "Deadline compliance", unit: "%", before: 86, after: workloads.length ? Math.round((completed / workloads.length) * 100) : 0, changePct: (workloads.length ? Math.round((completed / workloads.length) * 100) : 0) - 86, direction: "higher is better" },
    ],
    sourceLabels: ["Calculated from workload input", "DEMO DATA energy availability", "Configured emission factor: 0.42 kg CO₂/kWh"],
  };
}

const router: IRouter = Router();

router.get("/companies", async (_req, res) => {
  try {
    res.json(ListCompaniesResponse.parse(await listCompaniesFromSource()));
  } catch (error) {
    console.error("Failed to load companies from Supabase:", error);
    res.status(503).json({ error: "Unable to load companies from the configured database." });
  }
});

router.get("/companies/:companyId/data-centers", async (req, res) => {
  const parsed = ListDataCentersParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    res.json(ListDataCentersResponse.parse(await listDataCentersFromSource(parsed.data.companyId)));
  } catch (error) {
    console.error("Failed to load data centers from Supabase:", error);
    res.status(503).json({ error: "Unable to load data centers from the configured database." });
  }
});

router.get("/data-centers/:dataCenterId", async (req, res) => {
  const parsed = GetDataCenterParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const dataCenter = await getDataCenterFromSource(parsed.data.dataCenterId);
    if (!dataCenter) {
      res.status(404).json({ error: "Data center not found" });
      return;
    }
    res.json(GetDataCenterResponse.parse(dataCenter));
  } catch (error) {
    console.error("Failed to load data center from Supabase:", error);
    res.status(503).json({ error: "Unable to load the data center from the configured database." });
  }
});

router.get("/dashboard/summary", async (req, res) => {
  const parsed = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const dataCenter = await getDataCenterFromSource(parsed.data.dataCenterId);
  if (!dataCenter) {
    res.status(404).json({ error: "Data center not found" });
    return;
  }
  const summary = {
    dataCenterId: dataCenter.id,
    dataCenterName: dataCenter.name,
    totalWorkloads: demoWorkloads.length,
    totalEnergyKwh: 360,
    renewableEnergyKwh: 302,
    gridEnergyKwh: 58,
    renewablePct: 84,
    co2Kg: 24.4,
    deadlineCompliancePct: 92,
    energyTrend: [
      { time: "08:00", solar: 62, wind: 76, hydro: 88, grid: 16 },
      { time: "10:00", solar: 81, wind: 72, hydro: 86, grid: 11 },
      { time: "12:00", solar: 94, wind: 68, hydro: 84, grid: 8 },
      { time: "14:00", solar: 88, wind: 74, hydro: 82, grid: 10 },
      { time: "16:00", solar: 72, wind: 80, hydro: 80, grid: 14 },
      { time: "18:00", solar: 39, wind: 83, hydro: 78, grid: 22 },
    ],
    sourceLabels: ["DEMO DATA catalog", "Calculated demo scheduling run"],
  };
  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.post("/analysis/workloads/validate", (req, res) => {
  const parsed = ValidateWorkloadsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const issues = validateWorkloadRows(parsed.data.workloads);
  res.json(ValidateWorkloadsResponse.parse({
    valid: issues.length === 0,
    workloadCount: parsed.data.workloads.length,
    workloads: parsed.data.workloads,
    issues,
    dataSource: "USER INPUT",
  }));
});

router.post("/analysis/weather", (req, res) => {
  const parsed = GetWeatherAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const dataCenter = findDataCenter(parsed.data.dataCenterId);
  if (!dataCenter) {
    res.status(404).json({ error: "Data center not found" });
    return;
  }
  res.json(GetWeatherAnalysisResponse.parse({
    source: parsed.data.source,
    sourceLabel: parsed.data.source === "live" ? "LIVE API NOT CONFIGURED — DEMO DATA" : "DEMO WEATHER DATA",
    temperatureC: 14,
    windSpeedKph: 22,
    cloudCoverPct: 31,
    solarIrradianceWm2: 640,
    renewableForecast: [74, 79, 86, 91, 88, 72, 58, 43],
    energySources: dataCenter.energySources,
  }));
});

router.post("/analysis/scheduling", (req, res) => {
  const parsed = RunSchedulingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const dataCenter = findDataCenter(parsed.data.dataCenterId);
  if (!dataCenter) {
    res.status(404).json({ error: "Data center not found" });
    return;
  }
  const issues = validateWorkloadRows(parsed.data.workloads);
  if (issues.length > 0) {
    res.status(400).json({ error: "Workloads contain validation issues.", issues });
    return;
  }
  res.json(RunSchedulingResponse.parse(scheduleWorkloads(parsed.data.workloads, dataCenter, parsed.data.mode)));
});

export default router;