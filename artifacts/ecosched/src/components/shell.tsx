import { Link, useLocation } from 'wouter';
import { useMemo, useState, createContext, useContext } from 'react';
import { Activity, BarChart3, CloudSun, Database, FileSearch, LayoutDashboard, Menu, Play, Server, SlidersHorizontal, X, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCompanies, getDataCentersByCompany } from '@/services/catalog';
import type { Company, DataCenter, Workload, SchedulingResult } from '@workspace/api-client-react';
import logo from '@assets/ecosched-logo.png';

export const demoWorkloads: Workload[] = [
  { id: 'wl-01', name: 'Climate model ensemble', cpu: 72, memoryGb: 48, durationMinutes: 180, energyKwh: 14.6, arrival: '2025-06-08T08:00', deadline: '2025-06-08T18:00', priority: 'high', dataSizeGb: 320 },
  { id: 'wl-02', name: 'Vision training batch', cpu: 88, memoryGb: 64, durationMinutes: 240, energyKwh: 22.8, arrival: '2025-06-08T09:00', deadline: '2025-06-09T06:00', priority: 'normal', dataSizeGb: 780 },
  { id: 'wl-03', name: 'Student notebooks', cpu: 34, memoryGb: 16, durationMinutes: 75, energyKwh: 3.1, arrival: '2025-06-08T10:30', deadline: '2025-06-08T16:00', priority: 'low', dataSizeGb: 42 },
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
  const setCompanyId = (id: string) => { setCompanyIdState(id); localStorage.setItem('ecosched-company', id); setDataCenterIdState(''); };
  const setDataCenterId = (id: string) => { setDataCenterIdState(id); localStorage.setItem('ecosched-dc', id); };
  const updateWorkloads = (w: Workload[]) => { setWorkloads(w); localStorage.setItem('ecosched-workloads', JSON.stringify(w)); };
  const value = useMemo(() => ({ companies, dataCenters, company, dataCenter, companyId: actualCompanyId, dataCenterId: actualDataCenterId, setCompanyId, setDataCenterId, workloads, setWorkloads: updateWorkloads, result, setResult }), [companies, dataCenters, company, dataCenter, actualCompanyId, actualDataCenterId, workloads, result]);
  return <WorkspaceContext.Provider value={value}>
    <div className="app-shell flex">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col bg-[hsl(var(--sidebar))] px-4 py-5 text-sidebar-foreground transition-transform md:sticky md:top-0 md:h-[100dvh] md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`} data-testid="sidebar-navigation">
        <div className="flex items-center justify-between px-2 pb-7"><Brand /><button className="mobile-only text-white/70" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-close-navigation"><X size={19} /></button></div>
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-[hsl(var(--background)/.86)] px-4 backdrop-blur-xl md:px-8"><button className="mobile-only rounded-lg border border-border bg-card p-2" onClick={() => setMobileOpen(true)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu size={18} /></button><div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"><Activity size={15} className="text-lime-600" /><span>Analysis workspace</span><span className="text-border">/</span><span className="font-medium text-foreground">{dataCenter?.name ?? 'Select a data center'}</span></div><div className="flex items-center gap-3"><span className="mono hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:block">Live model</span><span className="flex items-center gap-1.5 text-xs font-semibold text-primary"><span className="h-2 w-2 animate-pulse rounded-full bg-lime-500" /> connected</span></div></header>
        <main className="content-grid min-h-[calc(100dvh-4rem)] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  </WorkspaceContext.Provider>;
}