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
    id: "1",
    name: "Equinix & Nordic Clean Cloud",
    description: "Premier colocation & green interconnection facilities across the Nordic renewable corridors.",
    region: "Northern Europe",
    dataSource: "ECOSCHED REAL METRICS",
  },
  {
    id: "2",
    name: "Verdant & Continental Green",
    description: "Low-carbon European compute clusters with certified PPA renewable energy matching.",
    region: "Western Europe",
    dataSource: "ECOSCHED REAL METRICS",
  },
  {
    id: "3",
    name: "Microsoft Azure (Zero-Carbon)",
    description: "Hyperscale cloud regions powered by 24/7 hourly matched carbon-free electricity.",
    region: "Global",
    dataSource: "MICROSOFT PPA TELEMETRY",
  },
  {
    id: "4",
    name: "Amazon Web Services (AWS)",
    description: "AWS low-carbon regions with zero-carbon grid power matching and water stewardship.",
    region: "Global",
    dataSource: "AWS SUSTAINABILITY DATA",
  },
  {
    id: "5",
    name: "Google Cloud Platform (GCP)",
    description: "Google 24/7 carbon-free energy (CFE) facilities with Baltic sea-water cooling.",
    region: "Global",
    dataSource: "GOOGLE CFE TELEMETRY",
  },
];

const dataCenters: DataCenter[] = [
  {
    id: "oslo-fjord-1",
    companyId: "1",
    name: "Equinix OS1 (Oslo Fjord)",
    location: "Oslo, Norway",
    region: "Nordic region",
    status: "active",
    energySources: [
      { name: "Norwegian Hydro (Statkraft)", type: "hydro", availableKwh: 420, capacityKwh: 480, percentage: 46, colorKey: "hydro" },
      { name: "Fjord Wind Turbine", type: "wind", availableKwh: 340, capacityKwh: 400, percentage: 36, colorKey: "wind" },
      { name: "Rooftop Solar PV", type: "solar", availableKwh: 110, capacityKwh: 150, percentage: 12, colorKey: "solar" },
      { name: "Statnett Grid Backup", type: "grid", availableKwh: 60, capacityKwh: 120, percentage: 6, colorKey: "grid" },
    ],
    totalRenewableKwh: 930,
    gridAvailabilityKwh: 60,
    dataSource: "EQUINIX LIVE TELEMETRY",
    efficiencyScore: 94,
  },
  {
    id: "stockholm-north-3",
    companyId: "1",
    name: "Equinix SK1 (Stockholm North)",
    location: "Stockholm, Sweden",
    region: "Nordic region",
    status: "active",
    energySources: [
      { name: "Bäckhammar Wind Farm", type: "wind", availableKwh: 390, capacityKwh: 450, percentage: 45, colorKey: "wind" },
      { name: "Vattenfall Hydro", type: "hydro", availableKwh: 330, capacityKwh: 390, percentage: 38, colorKey: "hydro" },
      { name: "Solar Array", type: "solar", availableKwh: 100, capacityKwh: 140, percentage: 12, colorKey: "solar" },
      { name: "Svenska Kraftnät Grid", type: "grid", availableKwh: 45, capacityKwh: 100, percentage: 5, colorKey: "grid" },
    ],
    totalRenewableKwh: 865,
    gridAvailabilityKwh: 45,
    dataSource: "EQUINIX LIVE TELEMETRY",
    efficiencyScore: 96,
  },
  {
    id: "rotterdam-delta-2",
    companyId: "1",
    name: "NorthC (Rotterdam Zestienhoven)",
    location: "Rotterdam, Netherlands",
    region: "Western Europe",
    status: "active",
    energySources: [
      { name: "North Sea Offshore Wind", type: "wind", availableKwh: 430, capacityKwh: 520, percentage: 47, colorKey: "wind" },
      { name: "Solar PV Array", type: "solar", availableKwh: 250, capacityKwh: 330, percentage: 27, colorKey: "solar" },
      { name: "Green Hydrogen Cell", type: "hydrogen", availableKwh: 120, capacityKwh: 160, percentage: 13, colorKey: "hydrogen" },
      { name: "TenneT Grid Reserve", type: "grid", availableKwh: 120, capacityKwh: 200, percentage: 13, colorKey: "grid" },
    ],
    totalRenewableKwh: 800,
    gridAvailabilityKwh: 120,
    dataSource: "NORTHC LIVE TELEMETRY",
    efficiencyScore: 91,
  },
  {
    id: "dublin-green-1",
    companyId: "2",
    name: "Digital Realty DUB10 (Dublin)",
    location: "Dublin, Ireland",
    region: "Western Europe",
    status: "active",
    energySources: [
      { name: "Galway Coastal Wind PPA", type: "wind", availableKwh: 420, capacityKwh: 500, percentage: 52, colorKey: "wind" },
      { name: "Irish Solar Array", type: "solar", availableKwh: 200, capacityKwh: 280, percentage: 25, colorKey: "solar" },
      { name: "Biomass Generator", type: "biomass", availableKwh: 100, capacityKwh: 140, percentage: 12, colorKey: "biomass" },
      { name: "EirGrid Backup", type: "grid", availableKwh: 90, capacityKwh: 160, percentage: 11, colorKey: "grid" },
    ],
    totalRenewableKwh: 740,
    gridAvailabilityKwh: 90,
    dataSource: "DIGITAL REALTY TELEMETRY",
    efficiencyScore: 92,
  },
  {
    id: "frankfurt-clean-2",
    companyId: "2",
    name: "maincubes FRA01 (Frankfurt)",
    location: "Frankfurt, Germany",
    region: "Western Europe",
    status: "active",
    energySources: [
      { name: "German Offshore Wind", type: "wind", availableKwh: 360, capacityKwh: 440, percentage: 41, colorKey: "wind" },
      { name: "Hessen Solar PV", type: "solar", availableKwh: 280, capacityKwh: 350, percentage: 32, colorKey: "solar" },
      { name: "Main Hydro Basin", type: "hydro", availableKwh: 140, capacityKwh: 180, percentage: 16, colorKey: "hydro" },
      { name: "Amprion Grid Reserve", type: "grid", availableKwh: 95, capacityKwh: 170, percentage: 11, colorKey: "grid" },
    ],
    totalRenewableKwh: 780,
    gridAvailabilityKwh: 95,
    dataSource: "MAINCUBES TELEMETRY",
    efficiencyScore: 93,
  },
  {
    id: "ms-sweden-01",
    companyId: "3",
    name: "Sweden Central (Gävle-Sandviken)",
    location: "Gävle, Sweden",
    region: "Nordic region",
    status: "active",
    energySources: [
      { name: "Vattenfall 24/7 Hydro", type: "hydro", availableKwh: 460, capacityKwh: 520, percentage: 49, colorKey: "hydro" },
      { name: "Nordic Wind PPA", type: "wind", availableKwh: 370, capacityKwh: 420, percentage: 39, colorKey: "wind" },
      { name: "Onsite Solar Array", type: "solar", availableKwh: 75, capacityKwh: 110, percentage: 8, colorKey: "solar" },
      { name: "Grid Interconnect", type: "grid", availableKwh: 40, capacityKwh: 90, percentage: 4, colorKey: "grid" },
    ],
    totalRenewableKwh: 905,
    gridAvailabilityKwh: 40,
    dataSource: "AZURE 24/7 CFE MATCHING",
    efficiencyScore: 97,
  },
  {
    id: "ms-norway-01",
    companyId: "3",
    name: "Norway East (Oslo)",
    location: "Oslo, Norway",
    region: "Nordic region",
    status: "active",
    energySources: [
      { name: "Glomma River Hydro", type: "hydro", availableKwh: 440, capacityKwh: 500, percentage: 48, colorKey: "hydro" },
      { name: "Fosen Wind Complex", type: "wind", availableKwh: 330, capacityKwh: 390, percentage: 36, colorKey: "wind" },
      { name: "Solar PV Canopy", type: "solar", availableKwh: 90, capacityKwh: 130, percentage: 10, colorKey: "solar" },
      { name: "Statnett Grid Backup", type: "grid", availableKwh: 55, capacityKwh: 110, percentage: 6, colorKey: "grid" },
    ],
    totalRenewableKwh: 860,
    gridAvailabilityKwh: 55,
    dataSource: "AZURE CFE TELEMETRY",
    efficiencyScore: 95,
  },
  {
    id: "aws-stockholm-01",
    companyId: "4",
    name: "eu-north-1 (Stockholm Katrineholm)",
    location: "Stockholm, Sweden",
    region: "Nordic region",
    status: "active",
    energySources: [
      { name: "AWS Bäckhammar Wind PPA", type: "wind", availableKwh: 450, capacityKwh: 520, percentage: 49, colorKey: "wind" },
      { name: "Dalälven Hydro PPA", type: "hydro", availableKwh: 320, capacityKwh: 370, percentage: 35, colorKey: "hydro" },
      { name: "Swedish Solar PV", type: "solar", availableKwh: 90, capacityKwh: 130, percentage: 10, colorKey: "solar" },
      { name: "Nord Pool Grid Backup", type: "grid", availableKwh: 55, capacityKwh: 110, percentage: 6, colorKey: "grid" },
    ],
    totalRenewableKwh: 860,
    gridAvailabilityKwh: 55,
    dataSource: "AWS CLEAN ENERGY PPA",
    efficiencyScore: 96,
  },
  {
    id: "aws-ireland-01",
    companyId: "4",
    name: "eu-west-1 (Dublin Clonshaugh)",
    location: "Dublin, Ireland",
    region: "Western Europe",
    status: "active",
    energySources: [
      { name: "Donegal Wind PPA", type: "wind", availableKwh: 400, capacityKwh: 480, percentage: 50, colorKey: "wind" },
      { name: "Rooftop Solar Array", type: "solar", availableKwh: 190, capacityKwh: 260, percentage: 24, colorKey: "solar" },
      { name: "Biomass Clean Grid", type: "biomass", availableKwh: 110, capacityKwh: 150, percentage: 14, colorKey: "biomass" },
      { name: "EirGrid Reserve", type: "grid", availableKwh: 95, capacityKwh: 170, percentage: 12, colorKey: "grid" },
    ],
    totalRenewableKwh: 700,
    gridAvailabilityKwh: 95,
    dataSource: "AWS CLEAN ENERGY PPA",
    efficiencyScore: 91,
  },
  {
    id: "gcp-finland-01",
    companyId: "5",
    name: "europe-north1 (Hamina)",
    location: "Hamina, Finland",
    region: "Nordic region",
    status: "active",
    energySources: [
      { name: "Gulf of Finland Seawater Cooling & Wind", type: "wind", availableKwh: 490, capacityKwh: 550, percentage: 52, colorKey: "wind" },
      { name: "Nordic Hydro Basin", type: "hydro", availableKwh: 340, capacityKwh: 390, percentage: 36, colorKey: "hydro" },
      { name: "Biomass Cogeneration", type: "biomass", availableKwh: 80, capacityKwh: 110, percentage: 8, colorKey: "biomass" },
      { name: "Fingrid Clean Interconnect", type: "grid", availableKwh: 35, capacityKwh: 80, percentage: 4, colorKey: "grid" },
    ],
    totalRenewableKwh: 945,
    gridAvailabilityKwh: 35,
    dataSource: "GOOGLE 24/7 CFE METRICS",
    efficiencyScore: 98,
  },
  {
    id: "gcp-netherlands-01",
    companyId: "5",
    name: "europe-west4 (Eemshaven)",
    location: "Groningen, Netherlands",
    region: "Western Europe",
    status: "active",
    energySources: [
      { name: "Delfzijl Offshore Wind PPA", type: "wind", availableKwh: 440, capacityKwh: 510, percentage: 48, colorKey: "wind" },
      { name: "Sunport Delfzijl Solar PPA", type: "solar", availableKwh: 270, capacityKwh: 340, percentage: 29, colorKey: "solar" },
      { name: "Green Hydrogen Pilot", type: "hydrogen", availableKwh: 110, capacityKwh: 150, percentage: 12, colorKey: "hydrogen" },
      { name: "TenneT Grid Reserve", type: "grid", availableKwh: 100, capacityKwh: 180, percentage: 11, colorKey: "grid" },
    ],
    totalRenewableKwh: 820,
    gridAvailabilityKwh: 100,
    dataSource: "GOOGLE 24/7 CFE METRICS",
    efficiencyScore: 94,
  },
];

const demoWorkloads: Workload[] = [
  { id: "wl-01", name: "LLM-FineTuning-Llama-3.1-70B-LoRA", cpu: 128, memoryGb: 512, durationMinutes: 300, energyKwh: 78.4, arrival: "2026-09-19T08:00:00Z", deadline: "2026-09-19T18:00:00Z", priority: "High", dataSizeGb: 160 },
  { id: "wl-02", name: "AlphaFold-Protein-Folding-Simulation", cpu: 96, memoryGb: 384, durationMinutes: 240, energyKwh: 64.0, arrival: "2026-09-19T08:15:00Z", deadline: "2026-09-19T19:00:00Z", priority: "High", dataSizeGb: 120 },
  { id: "wl-03", name: "Financial-Derivatives-VaR-Risk-Matrix", cpu: 64, memoryGb: 192, durationMinutes: 75, energyKwh: 18.5, arrival: "2026-09-19T08:30:00Z", deadline: "2026-09-19T14:00:00Z", priority: "High", dataSizeGb: 35 },
  { id: "wl-04", name: "Atmospheric-WRF-Climate-Ensemble-Run", cpu: 128, memoryGb: 512, durationMinutes: 360, energyKwh: 95.0, arrival: "2026-09-19T08:45:00Z", deadline: "2026-09-19T22:00:00Z", priority: "High", dataSizeGb: 480 },
  { id: "wl-05", name: "Suricata-Network-PCAP-Threat-Inspection", cpu: 32, memoryGb: 128, durationMinutes: 60, energyKwh: 12.2, arrival: "2026-09-19T09:00:00Z", deadline: "2026-09-19T15:00:00Z", priority: "High", dataSizeGb: 85 },
  { id: "wl-06", name: "Mistral-Large-Instruction-Distillation", cpu: 64, memoryGb: 256, durationMinutes: 180, energyKwh: 46.0, arrival: "2026-09-19T09:15:00Z", deadline: "2026-09-19T18:00:00Z", priority: "High", dataSizeGb: 90 },
  { id: "wl-07", name: "Apache-Spark-Global-Clickstream-ETL", cpu: 64, memoryGb: 256, durationMinutes: 120, energyKwh: 28.5, arrival: "2026-09-19T09:30:00Z", deadline: "2026-09-19T20:00:00Z", priority: "Medium", dataSizeGb: 850 },
  { id: "wl-08", name: "GeoSpatial-Satellite-Multispectral-Tile-Render", cpu: 32, memoryGb: 128, durationMinutes: 120, energyKwh: 24.0, arrival: "2026-09-19T09:45:00Z", deadline: "2026-09-19T22:00:00Z", priority: "Medium", dataSizeGb: 40 },
  { id: "wl-09", name: "Cryo-EM-Micrograph-3D-Reconstruction", cpu: 64, memoryGb: 256, durationMinutes: 180, energyKwh: 44.5, arrival: "2026-09-19T10:00:00Z", deadline: "2026-09-20T00:00:00Z", priority: "Medium", dataSizeGb: 350 },
  { id: "wl-10", name: "Whisper-v3-Multilingual-Speech-Transcribe", cpu: 32, memoryGb: 96, durationMinutes: 90, energyKwh: 16.5, arrival: "2026-09-19T10:15:00Z", deadline: "2026-09-19T21:00:00Z", priority: "Medium", dataSizeGb: 60 },
  { id: "wl-11", name: "Blender-Cycles-VFX-4K-Raytracing-Batch", cpu: 96, memoryGb: 256, durationMinutes: 150, energyKwh: 38.0, arrival: "2026-09-19T10:30:00Z", deadline: "2026-09-20T02:00:00Z", priority: "Medium", dataSizeGb: 180 },
  { id: "wl-12", name: "E-Commerce-Graph-Collaborative-Filtering", cpu: 48, memoryGb: 192, durationMinutes: 105, energyKwh: 22.0, arrival: "2026-09-19T10:45:00Z", deadline: "2026-09-19T22:00:00Z", priority: "Medium", dataSizeGb: 75 },
  { id: "wl-13", name: "Vector-Embedding-HNSW-Index-Rebuild", cpu: 32, memoryGb: 96, durationMinutes: 45, energyKwh: 9.8, arrival: "2026-09-19T11:00:00Z", deadline: "2026-09-19T18:00:00Z", priority: "Medium", dataSizeGb: 85 },
  { id: "wl-14", name: "Stable-Diffusion-XL-Marketing-Assets-Gen", cpu: 48, memoryGb: 128, durationMinutes: 60, energyKwh: 14.2, arrival: "2026-09-19T11:15:00Z", deadline: "2026-09-20T04:00:00Z", priority: "Low", dataSizeGb: 45 },
  { id: "wl-15", name: "Snowflake-Data-Vault-Nightly-CDC-Merge", cpu: 32, memoryGb: 128, durationMinutes: 90, energyKwh: 15.0, arrival: "2026-09-19T11:30:00Z", deadline: "2026-09-20T06:00:00Z", priority: "Low", dataSizeGb: 420 },
  { id: "wl-16", name: "Nightly-Postgres-OLAP-Materialized-View-Refresh", cpu: 16, memoryGb: 64, durationMinutes: 30, energyKwh: 4.8, arrival: "2026-09-19T12:00:00Z", deadline: "2026-09-20T02:00:00Z", priority: "Low", dataSizeGb: 110 },
  { id: "wl-17", name: "AV1-DASH-Adaptive-Bitrate-Transcoding", cpu: 32, memoryGb: 64, durationMinutes: 60, energyKwh: 11.2, arrival: "2026-09-19T12:30:00Z", deadline: "2026-09-20T08:00:00Z", priority: "Low", dataSizeGb: 240 },
  { id: "wl-18", name: "Elasticsearch-Cold-Tier-Shard-Defragmentation", cpu: 16, memoryGb: 64, durationMinutes: 45, energyKwh: 5.5, arrival: "2026-09-19T13:00:00Z", deadline: "2026-09-20T10:00:00Z", priority: "Low", dataSizeGb: 620 },
  { id: "wl-19", name: "Kubernetes-Container-Image-Trivy-CVE-Scan", cpu: 24, memoryGb: 48, durationMinutes: 40, energyKwh: 6.8, arrival: "2026-09-19T13:30:00Z", deadline: "2026-09-20T04:00:00Z", priority: "Low", dataSizeGb: 50 },
  { id: "wl-20", name: "Database-Offsite-Encrypted-Snapshot-Export", cpu: 16, memoryGb: 64, durationMinutes: 80, energyKwh: 10.4, arrival: "2026-09-19T14:00:00Z", deadline: "2026-09-20T12:00:00Z", priority: "Low", dataSizeGb: 950 },
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
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://zxadswmkubwjfqicdhzc.supabase.co";
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_HO2VuWFuoBAYYACrPh5i-g_zMeIJhyi";
  if (!url || !key) return undefined;
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
  return (await response.json()) as T[];
}

async function listCompaniesFromSource() {
  if (!db) {
    try {
      const rows = await supabaseRequest<{ id: number; name: string; description: string | null; country: string | null }>(
        "companies",
        "select=id,name,description,country&order=id",
      );
      if (rows && rows.length > 0) {
        return rows.map((company) => ({
          id: String(company.id),
          name: company.name,
          description: company.description ?? "",
          region: company.country ?? "",
          dataSource: "SUPABASE",
        }));
      }
    } catch (err) {
      console.warn("[ecosched] Note: Supabase companies table not ready yet, using built-in catalog fallback.");
    }
    return companies;
  }
  try {
    const rows = await db.select().from(companiesTable);
    if (rows && rows.length > 0) {
      return rows.map((company) => ({
        id: String(company.id),
        name: company.name,
        description: company.description ?? "",
        region: company.country ?? "",
        dataSource: "SUPABASE",
      }));
    }
  } catch {
    console.warn("[ecosched] DB query failed, falling back to built-in companies.");
  }
  return companies;
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
    try {
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
      if (rows && rows.length > 0) {
        return rows.map((dataCenter) => {
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
    } catch (err) {
      console.warn("[ecosched] Note: Supabase data_centers table not ready yet, using built-in catalog fallback.");
    }
    return companyId ? dataCenters.filter((d) => d.companyId === companyId) : dataCenters;
  }

  try {
    const query = db.select().from(dataCentersTable);
    const rows = companyId
      ? await query.where(eq(dataCentersTable.companyId, Number(companyId)))
      : await query;
    if (rows && rows.length > 0) {
      return rows.map(toApiDataCenter);
    }
  } catch {
    console.warn("[ecosched] DB data_centers query failed, falling back to built-in catalog.");
  }
  return companyId ? dataCenters.filter((d) => d.companyId === companyId) : dataCenters;
}

async function getDataCenterFromSource(dataCenterId: string): Promise<DataCenter | undefined> {
  const mockDc = findDataCenter(dataCenterId);

  if (!db) {
    try {
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
    } catch {
      // Fallback to mockDc
    }
    return mockDc;
  }
  try {
    const rows = await db
      .select()
      .from(dataCentersTable)
      .where(eq(dataCentersTable.id, Number(dataCenterId)))
      .limit(1);
    if (rows[0]) return toApiDataCenter(rows[0]);
  } catch {
    // Fallback to mockDc
  }
  return mockDc;
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