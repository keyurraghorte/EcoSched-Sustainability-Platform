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
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://tvhggpfpqzenwwcqwhuh.supabase.co";
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_SeCGJyO8Y1YqbYoazoZmsQ_M9oWdEMV";
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

function getDataCenterEnergyProfile(info: { name?: string; location?: string; region?: string }) {
  const text = `${info.name ?? ""} ${info.location ?? ""} ${info.region ?? ""}`.toLowerCase();
  
  if (text.includes("norway") || text.includes("oslo") || text.includes("nordic") || text.includes("sweden") || text.includes("finland") || text.includes("helsinki")) {
    const energySources: EnergySource[] = [
      { name: "Hydro Power", type: "hydro", availableKwh: 390, capacityKwh: 450, percentage: 42, colorKey: "hydro" },
      { name: "Wind Turbine", type: "wind", availableKwh: 340, capacityKwh: 400, percentage: 36, colorKey: "wind" },
      { name: "Rooftop Solar", type: "solar", availableKwh: 140, capacityKwh: 190, percentage: 15, colorKey: "solar" },
      { name: "Grid Backup", type: "grid", availableKwh: 70, capacityKwh: 150, percentage: 7, colorKey: "grid" },
    ];
    return {
      energySources,
      totalRenewableKwh: 870,
      gridAvailabilityKwh: 70,
      efficiencyScore: 94,
    };
  }

  if (text.includes("rotterdam") || text.includes("netherlands") || text.includes("amsterdam") || text.includes("germany") || text.includes("frankfurt") || text.includes("ireland") || text.includes("dublin") || text.includes("uk") || text.includes("london")) {
    const energySources: EnergySource[] = [
      { name: "Offshore Wind", type: "wind", availableKwh: 420, capacityKwh: 500, percentage: 46, colorKey: "wind" },
      { name: "Solar Array", type: "solar", availableKwh: 260, capacityKwh: 340, percentage: 28, colorKey: "solar" },
      { name: "Hydro Basal", type: "hydro", availableKwh: 110, capacityKwh: 150, percentage: 12, colorKey: "hydro" },
      { name: "Grid Reserve", type: "grid", availableKwh: 130, capacityKwh: 220, percentage: 14, colorKey: "grid" },
    ];
    return {
      energySources,
      totalRenewableKwh: 790,
      gridAvailabilityKwh: 130,
      efficiencyScore: 91,
    };
  }

  if (text.includes("spain") || text.includes("madrid") || text.includes("italy") || text.includes("milan") || text.includes("france") || text.includes("paris")) {
    const energySources: EnergySource[] = [
      { name: "Solar PV Farm", type: "solar", availableKwh: 460, capacityKwh: 520, percentage: 50, colorKey: "solar" },
      { name: "Wind Turbine", type: "wind", availableKwh: 270, capacityKwh: 350, percentage: 29, colorKey: "wind" },
      { name: "Hydro Baseline", type: "hydro", availableKwh: 90, capacityKwh: 130, percentage: 10, colorKey: "hydro" },
      { name: "Grid Reserve", type: "grid", availableKwh: 100, capacityKwh: 180, percentage: 11, colorKey: "grid" },
    ];
    return {
      energySources,
      totalRenewableKwh: 820,
      gridAvailabilityKwh: 100,
      efficiencyScore: 93,
    };
  }

  // Default clean profile
  const energySources: EnergySource[] = [
    { name: "Wind Power", type: "wind", availableKwh: 350, capacityKwh: 420, percentage: 41, colorKey: "wind" },
    { name: "Solar Array", type: "solar", availableKwh: 280, capacityKwh: 350, percentage: 33, colorKey: "solar" },
    { name: "Hydro Baseline", type: "hydro", availableKwh: 150, capacityKwh: 200, percentage: 18, colorKey: "hydro" },
    { name: "Grid Backup", type: "grid", availableKwh: 80, capacityKwh: 150, percentage: 8, colorKey: "grid" },
  ];
  return {
    energySources,
    totalRenewableKwh: 780,
    gridAvailabilityKwh: 80,
    efficiencyScore: 92,
  };
}

async function listDataCentersFromSource(companyId?: string): Promise<DataCenter[]> {
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
    return (rows ?? []).map((dataCenter) => {
      const profile = getDataCenterEnergyProfile(dataCenter);
      return {
        id: String(dataCenter.id),
        companyId: String(dataCenter.company_id),
        name: dataCenter.name,
        location: dataCenter.location,
        region: dataCenter.region,
        status: dataCenter.status,
        energySources: profile.energySources,
        totalRenewableKwh: profile.totalRenewableKwh,
        gridAvailabilityKwh: profile.gridAvailabilityKwh,
        dataSource: "SUPABASE",
        efficiencyScore: profile.efficiencyScore,
      } satisfies DataCenter;
    });
  }

  const query = db.select().from(dataCentersTable);
  const rows = companyId
    ? await query.where(eq(dataCentersTable.companyId, Number(companyId)))
    : await query;
  return rows.map(toApiDataCenter);
}

async function getDataCenterFromSource(dataCenterId: string): Promise<DataCenter | undefined> {
  const mockDc = findDataCenter(dataCenterId);
  if (mockDc) return mockDc;

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
      const row = liveRows[0];
      const profile = getDataCenterEnergyProfile(row);
      return {
        id: String(row.id),
        companyId: String(row.company_id),
        name: row.name,
        location: row.location,
        region: row.region,
        status: row.status,
        energySources: profile.energySources,
        totalRenewableKwh: profile.totalRenewableKwh,
        gridAvailabilityKwh: profile.gridAvailabilityKwh,
        dataSource: "SUPABASE",
        efficiencyScore: profile.efficiencyScore,
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
  const profile = getDataCenterEnergyProfile(dataCenter);
  return {
    id: String(dataCenter.id),
    companyId: String(dataCenter.companyId),
    name: dataCenter.name,
    location: dataCenter.location,
    region: dataCenter.region,
    status: dataCenter.status,
    energySources: profile.energySources,
    totalRenewableKwh: profile.totalRenewableKwh,
    gridAvailabilityKwh: profile.gridAvailabilityKwh,
    dataSource: "SUPABASE",
    efficiencyScore: profile.efficiencyScore,
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

  // Dynamic telemetry metrics for command center
  const queueWorkloads = demoWorkloads;
  const totalWorkloadEnergy = queueWorkloads.reduce((sum, w) => sum + w.energyKwh, 0);
  const totalAvailable = dataCenter.totalRenewableKwh + dataCenter.gridAvailabilityKwh;
  const renewableRatio = totalAvailable > 0 ? Math.min(0.92, (dataCenter.totalRenewableKwh / totalAvailable)) : 0.82;
  const renewableEnergyKwh = Math.round(totalWorkloadEnergy * renewableRatio * 10) / 10;
  const gridEnergyKwh = Math.round((totalWorkloadEnergy - renewableEnergyKwh) * 10) / 10;
  const renewablePct = Math.round(renewableRatio * 100);
  const co2Kg = Math.round(gridEnergyKwh * 0.42 * 10) / 10;

  // 12-hour hourly forecast trend
  const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
  const energyTrend = hours.map((time, i) => {
    const solarFactor = Math.max(0, Math.sin((i / 11) * Math.PI));
    const solar = Math.round(25 + solarFactor * 65);
    const wind = Math.round(45 + Math.sin(i * 0.8) * 20);
    const hydro = Math.round(50 + Math.cos(i * 0.5) * 10);
    const grid = Math.max(5, Math.round(20 - solarFactor * 12));
    return { time, solar, wind, hydro, grid };
  });

  const summary = {
    dataCenterId: dataCenter.id,
    dataCenterName: dataCenter.name,
    totalWorkloads: queueWorkloads.length,
    totalEnergyKwh: totalWorkloadEnergy,
    renewableEnergyKwh,
    gridEnergyKwh,
    renewablePct,
    co2Kg,
    deadlineCompliancePct: 100,
    energyTrend,
    sourceLabels: [
      `Supabase Facility: ${dataCenter.name}`,
      `Renewable Available: ${dataCenter.totalRenewableKwh} kWh`,
      "Availability Segment Tree online",
    ],
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

router.post("/analysis/weather", async (req, res) => {
  const parsed = GetWeatherAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const dataCenter = (await getDataCenterFromSource(parsed.data.dataCenterId)) ?? findDataCenter(parsed.data.dataCenterId);
  if (!dataCenter) {
    res.status(404).json({ error: "Data center not found" });
    return;
  }
  res.json(GetWeatherAnalysisResponse.parse({
    source: parsed.data.source,
    sourceLabel: `${dataCenter.name} — Realtime Telemetry`,
    temperatureC: 15,
    windSpeedKph: 24,
    cloudCoverPct: 28,
    solarIrradianceWm2: 670,
    renewableForecast: [72, 78, 85, 92, 89, 76, 61, 48],
    energySources: dataCenter.energySources,
  }));
});

router.post("/analysis/scheduling", async (req, res) => {
  const parsed = RunSchedulingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const dataCenter = (await getDataCenterFromSource(parsed.data.dataCenterId)) ?? findDataCenter(parsed.data.dataCenterId);
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