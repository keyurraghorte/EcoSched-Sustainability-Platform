import type { Company, DataCenter } from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';

type CompanyRow = {
  id: string | number;
  name: string;
  description: string | null;
  country: string | null;
  region?: string | null;
};

type DataCenterRow = {
  id: string | number;
  company_id: string | number;
  data_center_code: string;
  name: string;
  location: string;
  country: string;
  region: string;
  status: string;
};

export async function getCompanies(): Promise<Company[]> {
  const { data, error } = await supabase.from('companies').select('id,name,description,country').order('name');
  if (error) throw new Error(`Unable to load company data: ${error.message}`);
  return ((data ?? []) as CompanyRow[])
    .filter((company) => company.id !== null && company.id !== undefined && company.name?.trim())
    .map((company) => ({
      id: String(company.id),
      name: company.name.trim(),
      description: company.description ?? '',
      region: company.region ?? company.country ?? '',
      dataSource: 'SUPABASE',
    }));
}

export async function getDataCentersByCompany(companyId: string | number): Promise<DataCenter[]> {
  const { data, error } = await supabase
    .from('data_centers')
    .select('id,company_id,data_center_code,name,location,country,region,status')
    .eq('company_id', String(companyId))
    .eq('status', 'active')
    .order('name');
  if (error) throw new Error(`Unable to load data centers: ${error.message}`);
  return ((data ?? []) as DataCenterRow[])
    .filter((dataCenter) => (
      dataCenter.id !== null &&
      dataCenter.company_id !== null &&
      dataCenter.data_center_code?.trim() &&
      dataCenter.name?.trim() &&
      dataCenter.location?.trim() &&
      dataCenter.region?.trim() &&
      dataCenter.status === 'active'
    ))
    .map((dataCenter) => ({
      id: dataCenter.data_center_code,
      companyId: String(dataCenter.company_id),
      name: dataCenter.name.trim(),
      location: dataCenter.location.trim(),
      region: dataCenter.region.trim(),
      status: dataCenter.status,
      energySources: [],
      totalRenewableKwh: 0,
      gridAvailabilityKwh: 0,
      dataSource: 'SUPABASE',
    }));
}
