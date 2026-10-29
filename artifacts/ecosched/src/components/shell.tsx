import { Link, useLocation } from 'wouter';
import { useMemo, useState, createContext, useContext } from 'react';
import { Activity, BarChart3, CloudSun, Database, FileSearch, LayoutDashboard, Menu, Play, Server, SlidersHorizontal, X, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCompanies, getDataCentersByCompany } from '@/services/catalog';
import type { Company, DataCenter, Workload, SchedulingResult } from '@workspace/api-client-react';
import logo from '@assets/ecosched-logo.png';

export const demoWorkloads: Workload[] = [
  { id: 'wl-01', name: 'LLM-FineTuning-Llama-3.1-70B-LoRA', cpu: 128, memoryGb: 512, durationMinutes: 300, energyKwh: 78.4, arrival: '2025-06-08T08:00', deadline: '2025-06-08T18:00', priority: 'high', dataSizeGb: 160 },
  { id: 'wl-02', name: 'AlphaFold-Protein-Folding-Simulation', cpu: 96, memoryGb: 384, durationMinutes: 240, energyKwh: 64.0, arrival: '2025-06-08T08:15', deadline: '2025-06-08T19:00', priority: 'high', dataSizeGb: 120 },
  { id: 'wl-03', name: 'Financial-Derivatives-VaR-Risk-Matrix', cpu: 64, memoryGb: 192, durationMinutes: 75, energyKwh: 18.5, arrival: '2025-06-08T08:30', deadline: '2025-06-08T14:00', priority: 'high', dataSizeGb: 35 },
  { id: 'wl-04', name: 'Atmospheric-WRF-Climate-Ensemble-Run', cpu: 128, memoryGb: 512, durationMinutes: 360, energyKwh: 95.0, arrival: '2025-06-08T08:45', deadline: '2025-06-08T22:00', priority: 'high', dataSizeGb: 480 },
  { id: 'wl-05', name: 'Suricata-Network-PCAP-Threat-Inspection', cpu: 32, memoryGb: 128, durationMinutes: 60, energyKwh: 12.2, arrival: '2025-06-08T09:00', deadline: '2025-06-08T15:00', priority: 'high', dataSizeGb: 85 },
  { id: 'wl-06', name: 'Mistral-Large-Instruction-Distillation', cpu: 64, memoryGb: 256, durationMinutes: 180, energyKwh: 46.0, arrival: '2025-06-08T09:15', deadline: '2025-06-08T18:00', priority: 'high', dataSizeGb: 90 },
  { id: 'wl-07', name: 'Apache-Spark-Global-Clickstream-ETL', cpu: 64, memoryGb: 256, durationMinutes: 120, energyKwh: 28.5, arrival: '2025-06-08T09:30', deadline: '2025-06-08T20:00', priority: 'normal', dataSizeGb: 850 },
  { id: 'wl-08', name: 'GeoSpatial-Satellite-Multispectral-Tile-Render', cpu: 32, memoryGb: 128, durationMinutes: 120, energyKwh: 24.0, arrival: '2025-06-08T09:45', deadline: '2025-06-08T22:00', priority: 'normal', dataSizeGb: 40 },
  { id: 'wl-09', name: 'Cryo-EM-Micrograph-3D-Reconstruction', cpu: 64, memoryGb: 256, durationMinutes: 180, energyKwh: 44.5, arrival: '2025-06-08T10:00', deadline: '2025-06-09T00:00', priority: 'normal', dataSizeGb: 350 },
  { id: 'wl-10', name: 'Whisper-v3-Multilingual-Speech-Transcribe', cpu: 32, memoryGb: 96, durationMinutes: 90, energyKwh: 16.5, arrival: '2025-06-08T10:15', deadline: '2025-06-08T21:00', priority: 'normal', dataSizeGb: 60 },
  { id: 'wl-11', name: 'Blender-Cycles-VFX-4K-Raytracing-Batch', cpu: 96, memoryGb: 256, durationMinutes: 150, energyKwh: 38.0, arrival: '2025-06-08T10:30', deadline: '2025-06-09T02:00', priority: 'normal', dataSizeGb: 180 },
  { id: 'wl-12', name: 'E-Commerce-Graph-Collaborative-Filtering', cpu: 48, memoryGb: 192, durationMinutes: 105, energyKwh: 22.0, arrival: '2025-06-08T10:45', deadline: '2025-06-08T22:00', priority: 'normal', dataSizeGb: 75 },
  { id: 'wl-13', name: 'Vector-Embedding-HNSW-Index-Rebuild', cpu: 32, memoryGb: 96, durationMinutes: 45, energyKwh: 9.8, arrival: '2025-06-08T11:00', deadline: '2025-06-08T18:00', priority: 'normal', dataSizeGb: 85 },
  { id: 'wl-14', name: 'Stable-Diffusion-XL-Marketing-Assets-Gen', cpu: 48, memoryGb: 128, durationMinutes: 60, energyKwh: 14.2, arrival: '2025-06-08T11:15', deadline: '2025-06-09T04:00', priority: 'low', dataSizeGb: 45 },
  { id: 'wl-15', name: 'Snowflake-Data-Vault-Nightly-CDC-Merge', cpu: 32, memoryGb: 128, durationMinutes: 90, energyKwh: 15.0, arrival: '2025-06-08T11:30', deadline: '2025-06-09T06:00', priority: 'low', dataSizeGb: 420 },
  { id: 'wl-16', name: 'Nightly-Postgres-OLAP-Materialized-View-Refresh', cpu: 16, memoryGb: 64, durationMinutes: 30, energyKwh: 4.8, arrival: '2025-06-08T12:00', deadline: '2025-06-09T02:00', priority: 'low', dataSizeGb: 110 },
  { id: 'wl-17', name: 'AV1-DASH-Adaptive-Bitrate-Transcoding', cpu: 32, memoryGb: 64, durationMinutes: 60, energyKwh: 11.2, arrival: '2025-06-08T12:30', deadline: '2025-06-09T08:00', priority: 'low', dataSizeGb: 240 },
  { id: 'wl-18', name: 'Elasticsearch-Cold-Tier-Shard-Defragmentation', cpu: 16, memoryGb: 64, durationMinutes: 45, energyKwh: 5.5, arrival: '2025-06-08T13:00', deadline: '2025-06-09T10:00', priority: 'low', dataSizeGb: 620 },
  { id: 'wl-19', name: 'Kubernetes-Container-Image-Trivy-CVE-Scan', cpu: 24, memoryGb: 48, durationMinutes: 40, energyKwh: 6.8, arrival: '2025-06-08T13:30', deadline: '2025-06-09T04:00', priority: 'low', dataSizeGb: 50 },
  { id: 'wl-20', name: 'Database-Offsite-Encrypted-Snapshot-Export', cpu: 16, memoryGb: 64, durationMinutes: 80, energyKwh: 10.4, arrival: '2025-06-08T14:00', deadline: '2025-06-09T12:00', priority: 'low', dataSizeGb: 950 },
];

type WorkspaceValue = { companies: Company[]; dataCenters: DataCenter[]; company?: Company; dataCenter?: DataCenter; companyId: string; dataCenterId: string; setCompanyId: (id: string) => void; setDataCenterId: (id: string) => void; workloads: Workload[]; setWorkloads: (w: Workload[]) => void; result?: SchedulingResult; setResult: (r?: SchedulingResult) => void; };
const WorkspaceContext = createContext<WorkspaceValue | null>(null);
export const useWorkspace = () => { const value = useContext(WorkspaceContext); if (!value) throw new Error('Workspace must be inside AppShell'); return value; };

const nav = [
  { href: '/dashboard', label: 'Command center', icon: LayoutDashboard },
  { href: '/data-center', label: 'Data center', icon: Server },
  { href: '/workloads', label: 'Workloads', icon: Database },
  { href: '/weather-energy', label: 'Weather & energy', icon: CloudSun },
  { href: '/scheduling', label: 'Scheduling run', icon: Play },
  { href: '/before-after', label: 'Before / after', icon: BarChart3 },
  { href: '/results', label: 'Results report', icon: FileSearch },
];

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className={compact ? 'flex shrink-0 items-center gap-2.5' : 'flex items-center gap-3'} data-testid="link-brand">
    <span className={compact ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-white p-1 shadow-sm' : undefined}>
      <img src={logo} alt="EcoSched" className={compact ? 'h-full w-full object-contain' : 'h-12 w-12 object-contain'} />
    </span>
    {compact && <span className="display text-base font-bold tracking-tight text-[#123b57]">Eco<span className="text-[#1683ac]">Sched</span></span>}
    {!compact && <span className="display text-lg font-bold tracking-tight text-white">Eco<span className="text-lime-300">Sched</span></span>}
  </Link>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const companiesQuery = useQuery({ queryKey: ['supabase', 'companies'], queryFn: getCompanies });
  const companies = companiesQuery.data ?? [];
  const [companyId, setCompanyIdState] = useState(() => localStorage.getItem('ecosched-company') ?? '');
  const company = companies.find(c => c.id === companyId) ?? companies[0];
  const actualCompanyId = company?.id ?? companyId;
  const dcQuery = useQuery({
    queryKey: ['supabase', 'data-centers', actualCompanyId],
    queryFn: () => getDataCentersByCompany(actualCompanyId),
    enabled: Boolean(actualCompanyId),
  });
  const dataCenters = dcQuery.data ?? [];
  const [dataCenterId, setDataCenterIdState] = useState(() => localStorage.getItem('ecosched-dc') ?? '');
  const dataCenter = dataCenters.find(dc => dc.id === dataCenterId) ?? dataCenters[0];
  const actualDataCenterId = dataCenter?.id ?? dataCenterId;
  const [workloads, setWorkloads] = useState<Workload[]>(() => { try { return JSON.parse(localStorage.getItem('ecosched-workloads') ?? 'null') ?? demoWorkloads; } catch { return demoWorkloads; } });
  const [result, setResult] = useState<SchedulingResult>();
  const setCompanyId = (id: string) => { setCompanyIdState(id); localStorage.setItem('ecosched-company', id); setDataCenterIdState(''); localStorage.removeItem('ecosched-dc'); };
  const setDataCenterId = (id: string) => { setDataCenterIdState(id); localStorage.setItem('ecosched-dc', id); };
  const updateWorkloads = (w: Workload[]) => { setWorkloads(w); localStorage.setItem('ecosched-workloads', JSON.stringify(w)); };
  const value = useMemo(() => ({ companies, dataCenters, company, dataCenter, companyId: actualCompanyId, dataCenterId: actualDataCenterId, setCompanyId, setDataCenterId, workloads, setWorkloads: updateWorkloads, result, setResult }), [companies, dataCenters, company, dataCenter, actualCompanyId, actualDataCenterId, workloads, result]);
  return <WorkspaceContext.Provider value={value}>
    <div className="app-shell flex">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[hsl(var(--sidebar))] px-4 py-5 text-sidebar-foreground transition-transform duration-300 md:sticky md:top-0 md:h-[100dvh] md:translate-x-0 ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`} data-testid="sidebar-navigation">
        <div className="flex items-center justify-between px-2 pb-7"><Brand /><button className="md:hidden text-white/70 hover:text-white" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-close-navigation"><X size={19} /></button></div>
        <div className="mb-5 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <p className="mono mb-2 text-[10px] uppercase tracking-[.16em] text-white/45">Active workspace</p>
          <select value={company?.id ?? ''} onChange={e => setCompanyId(e.target.value)} className="mb-2 w-full bg-transparent text-sm font-semibold text-white outline-none" data-testid="select-company"><option className="text-slate-900" value="">{companiesQuery.isLoading ? 'Loading companies...' : companiesQuery.isError ? 'Unable to load companies' : companies.length ? 'Choose company' : 'No companies configured'}</option>{companies.map(c => <option className="text-slate-900" key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={dataCenter?.id ?? ''} onChange={e => setDataCenterId(e.target.value)} className="w-full bg-transparent text-xs text-white/65 outline-none" data-testid="select-data-center" disabled={!actualCompanyId || dcQuery.isLoading}><option className="text-slate-900" value="">{dcQuery.isLoading ? 'Loading data centers...' : dcQuery.isError ? 'Unable to load data centers' : dataCenters.length ? 'Choose data center' : 'No data centers configured'}</option>{dataCenters.map(dc => <option className="text-slate-900" key={dc.id} value={dc.id}>{dc.name}</option>)}</select>
          {companiesQuery.isError && <button type="button" onClick={() => void companiesQuery.refetch()} className="mt-2 text-[10px] font-semibold text-lime-300 hover:text-white" data-testid="button-retry-companies">Retry company loading</button>}
          {dcQuery.isError && <button type="button" onClick={() => void dcQuery.refetch()} className="mt-2 text-[10px] font-semibold text-lime-300 hover:text-white" data-testid="button-retry-data-centers">Retry data-center loading</button>}
        </div>
        <nav className="space-y-1" aria-label="Main navigation">{nav.map(item => { const Icon = item.icon; const active = location === item.href; return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${active ? 'bg-lime-300 font-bold text-[hsl(var(--sidebar))]' : 'text-white/65 hover:bg-white/8 hover:text-white'}`} data-testid={`link-nav-${item.href.slice(1)}`}><Icon size={17} strokeWidth={active ? 2.5 : 1.8} /><span>{item.label}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar))]" />}</Link>; })}</nav>
        <div className="mt-auto rounded-xl border border-white/10 bg-[linear-gradient(140deg,hsl(201_55%_31%),hsl(211_45%_20%))] p-4"><div className="mb-3 flex items-center gap-2 text-lime-300"><Zap size={16} /><span className="mono text-[10px] uppercase tracking-wider">Signal online</span></div><p className="text-xs leading-5 text-white/65">Weather and grid signals are ready for the next scheduling decision.</p></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-[hsl(var(--background)/.86)] px-4 backdrop-blur-xl md:px-8"><button className="md:hidden rounded-lg border border-border bg-card p-2 text-foreground hover:bg-muted" onClick={() => setMobileOpen(true)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu size={18} /></button><div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"><Activity size={15} className="text-lime-600" /><span>Analysis workspace</span><span className="text-border">/</span><span className="font-medium text-foreground">{dataCenter?.name ?? 'Select a data center'}</span></div><div className="flex items-center gap-3"><span className="mono hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:block">Live model</span><span className="flex items-center gap-1.5 text-xs font-semibold text-primary"><span className="h-2 w-2 animate-pulse rounded-full bg-lime-500" /> connected</span></div></header>
        <main className="content-grid min-h-[calc(100dvh-4rem)] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  </WorkspaceContext.Provider>;
}