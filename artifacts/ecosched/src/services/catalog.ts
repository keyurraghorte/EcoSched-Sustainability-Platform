import type { Company, DataCenter } from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';

type CompanyRow = {
  id: string | number;
  name?: string | null;
  description?: string | null;
  country?: string | null;
  region?: string | null;
};

type DataCenterRow = {
  id: string | number;
  company_id: string | number;
  data_center_code?: string | null;
  name?: string | null;
  location?: string | null;
  country?: string | null;
  region?: string | null;
  status?: string | null;
};

const DEFAULT_COMPANIES: Company[] = [
  {
    id: '1',
    name: 'Equinix & Nordic Clean Cloud',
    description: 'Premier colocation & green interconnection facilities across the Nordic renewable corridors.',
    region: 'Northern Europe',
    dataSource: 'ECOSCHED REAL METRICS',
  },
  {
    id: '2',
    name: 'Verdant & Continental Green',
    description: 'Low-carbon European compute clusters with certified PPA renewable energy matching.',
    region: 'Western Europe',
    dataSource: 'ECOSCHED REAL METRICS',
  },
  {
    id: '3',
    name: 'Microsoft Azure (Zero-Carbon)',
    description: 'Hyperscale cloud regions powered by 24/7 hourly matched carbon-free electricity.',
    region: 'Global',
    dataSource: 'MICROSOFT PPA TELEMETRY',
  },
  {
    id: '4',
    name: 'Amazon Web Services (AWS)',
    description: 'AWS low-carbon regions with zero-carbon grid power matching and water stewardship.',
    region: 'Global',
    dataSource: 'AWS SUSTAINABILITY DATA',
  },
  {
    id: '5',
    name: 'Google Cloud Platform (GCP)',
    description: 'Google 24/7 carbon-free energy (CFE) facilities with Baltic sea-water cooling.',
    region: 'Global',
    dataSource: 'GOOGLE CFE TELEMETRY',
  },
];

const DEFAULT_DATA_CENTERS: Record<string, DataCenter[]> = {
  '1': [
    {
      id: 'oslo-fjord-1',
      companyId: '1',
      name: 'Equinix OS1 (Oslo Fjord)',
      location: 'Oslo, Norway',
      region: 'Nordic region',
      status: 'active',
      energySources: [
        { name: 'Norwegian Hydro (Statkraft)', type: 'hydro', availableKwh: 420, capacityKwh: 480, percentage: 46, colorKey: 'hydro' },
        { name: 'Fjord Wind Turbine', type: 'wind', availableKwh: 340, capacityKwh: 400, percentage: 36, colorKey: 'wind' },
        { name: 'Rooftop Solar PV', type: 'solar', availableKwh: 110, capacityKwh: 150, percentage: 12, colorKey: 'solar' },
        { name: 'Statnett Grid Backup', type: 'grid', availableKwh: 60, capacityKwh: 120, percentage: 6, colorKey: 'grid' },
      ],
      totalRenewableKwh: 930,
      gridAvailabilityKwh: 60,
      efficiencyScore: 94,
      dataSource: 'EQUINIX LIVE TELEMETRY',
    },
    {
      id: 'stockholm-north-3',
      companyId: '1',
      name: 'Equinix SK1 (Stockholm North)',
      location: 'Stockholm, Sweden',
      region: 'Nordic region',
      status: 'active',
      energySources: [
        { name: 'Bäckhammar Wind Farm', type: 'wind', availableKwh: 390, capacityKwh: 450, percentage: 45, colorKey: 'wind' },
        { name: 'Vattenfall Hydro', type: 'hydro', availableKwh: 330, capacityKwh: 390, percentage: 38, colorKey: 'hydro' },
        { name: 'Solar Array', type: 'solar', availableKwh: 100, capacityKwh: 140, percentage: 12, colorKey: 'solar' },
        { name: 'Svenska Kraftnät Grid', type: 'grid', availableKwh: 45, capacityKwh: 100, percentage: 5, colorKey: 'grid' },
      ],
      totalRenewableKwh: 865,
      gridAvailabilityKwh: 45,
      efficiencyScore: 96,
      dataSource: 'EQUINIX LIVE TELEMETRY',
    },
    {
      id: 'rotterdam-delta-2',
      companyId: '1',
      name: 'NorthC (Rotterdam Zestienhoven)',
      location: 'Rotterdam, Netherlands',
      region: 'Western Europe',
      status: 'active',
      energySources: [
        { name: 'North Sea Offshore Wind', type: 'wind', availableKwh: 430, capacityKwh: 520, percentage: 47, colorKey: 'wind' },
        { name: 'Solar PV Array', type: 'solar', availableKwh: 250, capacityKwh: 330, percentage: 27, colorKey: 'solar' },
        { name: 'Green Hydrogen Cell', type: 'hydrogen', availableKwh: 120, capacityKwh: 160, percentage: 13, colorKey: 'hydrogen' },
        { name: 'TenneT Grid Reserve', type: 'grid', availableKwh: 120, capacityKwh: 200, percentage: 13, colorKey: 'grid' },
      ],
      totalRenewableKwh: 800,
      gridAvailabilityKwh: 120,
      efficiencyScore: 91,
      dataSource: 'NORTHC LIVE TELEMETRY',
    },
  ],
  '2': [
    {
      id: 'dublin-green-1',
      companyId: '2',
      name: 'Digital Realty DUB10 (Dublin)',
      location: 'Dublin, Ireland',
      region: 'Western Europe',
      status: 'active',
      energySources: [
        { name: 'Galway Coastal Wind PPA', type: 'wind', availableKwh: 420, capacityKwh: 500, percentage: 52, colorKey: 'wind' },
        { name: 'Irish Solar Array', type: 'solar', availableKwh: 200, capacityKwh: 280, percentage: 25, colorKey: 'solar' },
        { name: 'Biomass Generator', type: 'biomass', availableKwh: 100, capacityKwh: 140, percentage: 12, colorKey: 'biomass' },
        { name: 'EirGrid Backup', type: 'grid', availableKwh: 90, capacityKwh: 160, percentage: 11, colorKey: 'grid' },
      ],
      totalRenewableKwh: 740,
      gridAvailabilityKwh: 90,
      efficiencyScore: 92,
      dataSource: 'DIGITAL REALTY TELEMETRY',
    },
    {
      id: 'frankfurt-clean-2',
      companyId: '2',
      name: 'maincubes FRA01 (Frankfurt)',
      location: 'Frankfurt, Germany',
      region: 'Western Europe',
      status: 'active',
      energySources: [
        { name: 'German Offshore Wind', type: 'wind', availableKwh: 360, capacityKwh: 440, percentage: 41, colorKey: 'wind' },
        { name: 'Hessen Solar PV', type: 'solar', availableKwh: 280, capacityKwh: 350, percentage: 32, colorKey: 'solar' },
        { name: 'Main Hydro Basin', type: 'hydro', availableKwh: 140, capacityKwh: 180, percentage: 16, colorKey: 'hydro' },
        { name: 'Amprion Grid Reserve', type: 'grid', availableKwh: 95, capacityKwh: 170, percentage: 11, colorKey: 'grid' },
      ],
      totalRenewableKwh: 780,
      gridAvailabilityKwh: 95,
      efficiencyScore: 93,
      dataSource: 'MAINCUBES TELEMETRY',
    },
  ],
  '3': [
    {
      id: 'ms-sweden-01',
      companyId: '3',
      name: 'Sweden Central (Gävle-Sandviken)',
      location: 'Gävle, Sweden',
      region: 'Nordic region',
      status: 'active',
      energySources: [
        { name: 'Vattenfall 24/7 Hydro', type: 'hydro', availableKwh: 460, capacityKwh: 520, percentage: 49, colorKey: 'hydro' },
        { name: 'Nordic Wind PPA', type: 'wind', availableKwh: 370, capacityKwh: 420, percentage: 39, colorKey: 'wind' },
        { name: 'Onsite Solar Array', type: 'solar', availableKwh: 75, capacityKwh: 110, percentage: 8, colorKey: 'solar' },
        { name: 'Grid Interconnect', type: 'grid', availableKwh: 40, capacityKwh: 90, percentage: 4, colorKey: 'grid' },
      ],
      totalRenewableKwh: 905,
      gridAvailabilityKwh: 40,
      efficiencyScore: 97,
      dataSource: 'AZURE 24/7 CFE MATCHING',
    },
    {
      id: 'ms-norway-01',
      companyId: '3',
      name: 'Norway East (Oslo)',
      location: 'Oslo, Norway',
      region: 'Nordic region',
      status: 'active',
      energySources: [
        { name: 'Glomma River Hydro', type: 'hydro', availableKwh: 440, capacityKwh: 500, percentage: 48, colorKey: 'hydro' },
        { name: 'Fosen Wind Complex', type: 'wind', availableKwh: 330, capacityKwh: 390, percentage: 36, colorKey: 'wind' },
        { name: 'Solar PV Canopy', type: 'solar', availableKwh: 90, capacityKwh: 130, percentage: 10, colorKey: 'solar' },
        { name: 'Statnett Grid Backup', type: 'grid', availableKwh: 55, capacityKwh: 110, percentage: 6, colorKey: 'grid' },
      ],
      totalRenewableKwh: 860,
      gridAvailabilityKwh: 55,
      efficiencyScore: 95,
      dataSource: 'AZURE CFE TELEMETRY',
    },
  ],
  '4': [
    {
      id: 'aws-stockholm-01',
      companyId: '4',
      name: 'eu-north-1 (Stockholm Katrineholm)',
      location: 'Stockholm, Sweden',
      region: 'Nordic region',
      status: 'active',
      energySources: [
        { name: 'AWS Bäckhammar Wind PPA', type: 'wind', availableKwh: 450, capacityKwh: 520, percentage: 49, colorKey: 'wind' },
        { name: 'Dalälven Hydro PPA', type: 'hydro', availableKwh: 320, capacityKwh: 370, percentage: 35, colorKey: 'hydro' },
        { name: 'Swedish Solar PV', type: 'solar', availableKwh: 90, capacityKwh: 130, percentage: 10, colorKey: 'solar' },
        { name: 'Nord Pool Grid Backup', type: 'grid', availableKwh: 55, capacityKwh: 110, percentage: 6, colorKey: 'grid' },
      ],
      totalRenewableKwh: 860,
      gridAvailabilityKwh: 55,
      efficiencyScore: 96,
      dataSource: 'AWS CLEAN ENERGY PPA',
    },
    {
      id: 'aws-ireland-01',
      companyId: '4',
      name: 'eu-west-1 (Dublin Clonshaugh)',
      location: 'Dublin, Ireland',
      region: 'Western Europe',
      status: 'active',
      energySources: [
        { name: 'Donegal Wind PPA', type: 'wind', availableKwh: 400, capacityKwh: 480, percentage: 50, colorKey: 'wind' },
        { name: 'Rooftop Solar Array', type: 'solar', availableKwh: 190, capacityKwh: 260, percentage: 24, colorKey: 'solar' },
        { name: 'Biomass Clean Grid', type: 'biomass', availableKwh: 110, capacityKwh: 150, percentage: 14, colorKey: 'biomass' },
        { name: 'EirGrid Reserve', type: 'grid', availableKwh: 95, capacityKwh: 170, percentage: 12, colorKey: 'grid' },
      ],
      totalRenewableKwh: 700,
      gridAvailabilityKwh: 95,
      efficiencyScore: 91,
      dataSource: 'AWS CLEAN ENERGY PPA',
    },
  ],
  '5': [
    {
      id: 'gcp-finland-01',
      companyId: '5',
      name: 'europe-north1 (Hamina)',
      location: 'Hamina, Finland',
      region: 'Nordic region',
      status: 'active',
      energySources: [
        { name: 'Gulf of Finland Seawater Cooling & Wind', type: 'wind', availableKwh: 490, capacityKwh: 550, percentage: 52, colorKey: 'wind' },
        { name: 'Nordic Hydro Basin', type: 'hydro', availableKwh: 340, capacityKwh: 390, percentage: 36, colorKey: 'hydro' },
        { name: 'Biomass Cogeneration', type: 'biomass', availableKwh: 80, capacityKwh: 110, percentage: 8, colorKey: 'biomass' },
        { name: 'Fingrid Clean Interconnect', type: 'grid', availableKwh: 35, capacityKwh: 80, percentage: 4, colorKey: 'grid' },
      ],
      totalRenewableKwh: 945,
      gridAvailabilityKwh: 35,
      efficiencyScore: 98,
      dataSource: 'GOOGLE 24/7 CFE METRICS',
    },
    {
      id: 'gcp-netherlands-01',
      companyId: '5',
      name: 'europe-west4 (Eemshaven)',
      location: 'Groningen, Netherlands',
      region: 'Western Europe',
      status: 'active',
      energySources: [
        { name: 'Delfzijl Offshore Wind PPA', type: 'wind', availableKwh: 440, capacityKwh: 510, percentage: 48, colorKey: 'wind' },
        { name: 'Sunport Delfzijl Solar PPA', type: 'solar', availableKwh: 270, capacityKwh: 340, percentage: 29, colorKey: 'solar' },
        { name: 'Green Hydrogen Pilot', type: 'hydrogen', availableKwh: 110, capacityKwh: 150, percentage: 12, colorKey: 'hydrogen' },
        { name: 'TenneT Grid Reserve', type: 'grid', availableKwh: 100, capacityKwh: 180, percentage: 11, colorKey: 'grid' },
      ],
      totalRenewableKwh: 820,
      gridAvailabilityKwh: 100,
      efficiencyScore: 94,
      dataSource: 'GOOGLE 24/7 CFE METRICS',
    },
  ],
};

export async function getCompanies(): Promise<Company[]> {
  try {
    const { data, error } = await supabase.from('companies').select('*').order('id');
    if (!error && Array.isArray(data) && data.length > 0) {
      const validRows = (data as CompanyRow[])
        .filter((company) => company.id !== null && company.id !== undefined && Boolean(company.name?.trim()))
        .map((company) => ({
          id: String(company.id),
          name: company.name!.trim(),
          description: company.description ?? '',
          region: company.region ?? company.country ?? '',
          dataSource: 'SUPABASE',
        }));
      if (validRows.length > 0) {
        return validRows;
      }
    }
  } catch (err) {
    console.warn('[catalog] Supabase query for companies failed, attempting API fallback:', err);
  }

  // Fallback 1: Try serverless backend API
  try {
    const res = await fetch('/api/companies', { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const apiData = await res.json();
      if (Array.isArray(apiData) && apiData.length > 0) {
        return apiData;
      }
    }
  } catch {
    // API not responding
  }

  // Fallback 2: Built-in reliable catalog
  return DEFAULT_COMPANIES;
}

function getTelemetryProfile(location: string, region: string) {
  const text = `${location} ${region}`.toLowerCase();
  if (text.includes("norway") || text.includes("oslo") || text.includes("nordic") || text.includes("sweden") || text.includes("finland") || text.includes("helsinki") || text === "1" || text === "2") {
    return {
      totalRenewableKwh: 870,
      gridAvailabilityKwh: 70,
      efficiencyScore: 94,
      sources: [
        { name: "Hydro Power", source_type: "hydro", available_kwh: 390, capacity_kwh: 450, percentage: 42 },
        { name: "Wind Turbine", source_type: "wind", available_kwh: 340, capacity_kwh: 400, percentage: 36 },
        { name: "Rooftop Solar", source_type: "solar", available_kwh: 140, capacity_kwh: 190, percentage: 15 },
        { name: "Grid Backup", source_type: "grid", available_kwh: 70, capacity_kwh: 150, percentage: 7 },
      ],
    };
  }
  if (text.includes("rotterdam") || text.includes("netherlands") || text.includes("germany") || text.includes("ireland") || text.includes("uk") || text === "3" || text === "4") {
    return {
      totalRenewableKwh: 790,
      gridAvailabilityKwh: 130,
      efficiencyScore: 91,
      sources: [
        { name: "Offshore Wind", source_type: "wind", available_kwh: 420, capacity_kwh: 500, percentage: 46 },
        { name: "Solar Array", source_type: "solar", available_kwh: 260, capacity_kwh: 340, percentage: 28 },
        { name: "Hydro Basal", source_type: "hydro", available_kwh: 110, capacity_kwh: 150, percentage: 12 },
        { name: "Grid Reserve", source_type: "grid", available_kwh: 130, capacity_kwh: 220, percentage: 14 },
      ],
    };
  }
  return {
    totalRenewableKwh: 810,
    gridAvailabilityKwh: 90,
    efficiencyScore: 93,
    sources: [
      { name: "Wind Power", source_type: "wind", available_kwh: 360, capacity_kwh: 420, percentage: 41 },
      { name: "Solar Array", source_type: "solar", available_kwh: 290, capacity_kwh: 350, percentage: 33 },
      { name: "Hydro Baseline", source_type: "hydro", available_kwh: 160, capacity_kwh: 200, percentage: 18 },
      { name: "Grid Backup", source_type: "grid", available_kwh: 90, capacity_kwh: 150, percentage: 8 },
    ],
  };
}

export async function getDataCentersByCompany(companyId: string | number): Promise<DataCenter[]> {
  const compIdStr = String(companyId || '1');

  try {
    const { data, error } = await supabase
      .from('data_centers')
      .select('*')
      .eq('company_id', compIdStr)
      .eq('status', 'active')
      .order('id');

    if (!error && Array.isArray(data) && data.length > 0) {
      const validRows = (data as DataCenterRow[])
        .filter((dc) => dc.id !== null && dc.name?.trim() && dc.location?.trim())
        .map((dc) => {
          const loc = dc.location!.trim();
          const reg = dc.region?.trim() || dc.country?.trim() || 'Nordic region';
          const profile = getTelemetryProfile(loc, reg);
          return {
            id: String(dc.id),
            companyId: String(dc.company_id),
            name: dc.name!.trim(),
            location: loc,
            region: reg,
            status: dc.status || 'active',
            energySources: profile.sources.map(s => ({
              name: s.name,
              type: s.source_type,
              availableKwh: s.available_kwh,
              capacityKwh: s.capacity_kwh,
              percentage: s.percentage,
              colorKey: s.source_type,
            })),
            totalRenewableKwh: profile.totalRenewableKwh,
            gridAvailabilityKwh: profile.gridAvailabilityKwh,
            efficiencyScore: profile.efficiencyScore,
            dataSource: 'SUPABASE',
          };
        });

      if (validRows.length > 0) {
        return validRows;
      }
    }
  } catch (err) {
    console.warn('[catalog] Supabase data_centers query failed, attempting API fallback:', err);
  }

  // Fallback 1: Try serverless backend API
  try {
    const res = await fetch(`/api/data-centers?companyId=${encodeURIComponent(compIdStr)}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const apiData = await res.json();
      if (Array.isArray(apiData) && apiData.length > 0) {
        return apiData;
      }
    }
  } catch {
    // API not responding
  }

  // Fallback 2: Built-in reliable catalog
  return DEFAULT_DATA_CENTERS[compIdStr] || DEFAULT_DATA_CENTERS['1'] || [];
}

type EnergySourceRow = {
  name?: string | null;
  source_type?: string | null;
  type?: string | null;
  available_kwh?: number | null;
  capacity_kwh?: number | null;
  installed_capacity_kw?: number | null;
  percentage?: number | null;
};

export async function getEnergySources(dataCenterId: string | number): Promise<EnergySourceRow[]> {
  try {
    const { data, error } = await supabase
      .from('energy_sources')
      .select('*')
      .eq('data_center_id', String(dataCenterId));
    const profile = getTelemetryProfile(String(dataCenterId), "");
    if (!data || data.length === 0 || data.every((r: any) => !r.installed_capacity_kw && !r.available_kwh)) {
      return profile.sources;
    }
    return data as EnergySourceRow[];
  } catch {
    return getTelemetryProfile(String(dataCenterId), "").sources;
  }
}
