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

export async function getCompanies(): Promise<Company[]> {
  const { data, error } = await supabase.from('companies').select('*').order('id');
  if (error) throw new Error(`Unable to load company data: ${error.message}`);
  return ((data ?? []) as CompanyRow[])
    .filter((company) => company.id !== null && company.id !== undefined && Boolean(company.name?.trim()))
    .map((company) => ({
      id: String(company.id),
      name: company.name!.trim(),
      description: company.description ?? '',
      region: company.region ?? company.country ?? '',
      dataSource: 'SUPABASE',
    }));
}

export async function getDataCentersByCompany(companyId: string | number): Promise<DataCenter[]> {
  const { data, error } = await supabase
    .from('data_centers')
    .select('*')
    .eq('company_id', String(companyId))
    .eq('status', 'active')
    .order('id');
  if (error) throw new Error(`Unable to load data centers: ${error.message}`);
  return ((data ?? []) as DataCenterRow[])
    .filter((dataCenter) => (
      dataCenter.id !== null &&
      dataCenter.company_id !== null &&
      dataCenter.name?.trim() &&
      dataCenter.location?.trim() &&
      (dataCenter.region?.trim() || dataCenter.country?.trim()) &&
      dataCenter.status === 'active'
    ))
    .map((dataCenter) => ({
      id: String(dataCenter.id),
      companyId: String(dataCenter.company_id),
      name: dataCenter.name!.trim(),
      location: dataCenter.location!.trim(),
      region: dataCenter.region?.trim() || dataCenter.country!.trim(),
      status: dataCenter.status!,
      energySources: [],
      totalRenewableKwh: Number.NaN,
      gridAvailabilityKwh: Number.NaN,
      dataSource: 'SUPABASE',
    }));
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
  const { data, error } = await supabase
    .from('energy_sources')
    .select('*')
    .eq('data_center_id', String(dataCenterId));
  if (error) return [];
  return (data ?? []) as EnergySourceRow[];
}
