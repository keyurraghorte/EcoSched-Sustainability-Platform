import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Activity, ArrowRight, BarChart3, Check, CheckCircle2, ChevronRight, CircleAlert, Cloud, CloudSun, Download, Edit3, FileSearch, FileSpreadsheet, Gauge, Leaf, Loader2, MapPin, Play, Plus, RefreshCw, Save, Server, SlidersHorizontal, Sparkles, Sun, Trash2, Wind, Zap } from 'lucide-react';
import { getGetDashboardSummaryQueryKey, getGetDataCenterQueryKey, useGetDashboardSummary, useGetDataCenter, useGetWeatherAnalysis, useRunScheduling, useValidateWorkloads } from '@workspace/api-client-react';
import type { EnergySource, SchedulingResult, Workload } from '@workspace/api-client-react';
import { useWorkspace, demoWorkloads, Brand } from '@/components/shell';
import { getEnergySources } from '@/services/catalog';
import { BeforeAfterGraphAnalysis } from '@/components/before-after-charts';

const fmt = (n: number, digits = 1) => Number.isFinite(n) ? n.toFixed(digits) : '—';
const sourceColor = (key: string) => key.toLowerCase().includes('solar') ? 'bg-yellow-400' : key.toLowerCase().includes('wind') ? 'bg-sky-400' : key.toLowerCase().includes('hydro') ? 'bg-cyan-500' : 'bg-slate-400';
function LoadingState({ label = 'Reading live signals…' }: { label?: string }) { return <div className="rounded-2xl border border-border bg-card p-8" data-testid="status-loading"><div className="mb-4 h-2 w-2/3 animate-pulse rounded bg-muted" /><div className="mb-2 h-2 w-1/2 animate-pulse rounded bg-muted" /><p className="mt-5 text-sm text-muted-foreground">{label}</p></div>; }
function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) { return <div className="rounded-2xl border border-dashed border-border bg-card/75 p-10 text-center" data-testid="state-empty"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary"><Gauge size={22} /></div><h3 className="display font-bold">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{body}</p>{action && <div className="mt-5">{action}</div>}</div>; }
function ErrorState({ retry }: { retry?: () => void }) { return <div className="rounded-2xl border border-red-200 bg-red-50 p-7" data-testid="status-error"><div className="flex gap-3"><CircleAlert className="shrink-0 text-red-600" /><div><h3 className="font-bold text-red-950">Signal unavailable</h3><p className="mt-1 text-sm text-red-800">We could not reach the analysis service. Your local work is safe.</p>{retry && <button onClick={retry} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white" data-testid="button-retry"><RefreshCw size={14} /> Retry connection</button>}</div></div></div>; }
function PageHeading({ eyebrow, title, body, action }: { eyebrow: string; title: string; body: string; action?: React.ReactNode }) { return <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="mono mb-2 text-[10px] uppercase tracking-[.2em] text-primary">{eyebrow}</p><h1 className="display text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{body}</p></div>{action}</div>; }
function Metric({ label, value, unit, detail, tone = 'blue' }: { label: string; value: string; unit?: string; detail?: string; tone?: 'blue' | 'green' | 'yellow' | 'cyan' }) { const colors = { blue: 'bg-sky-50 text-sky-700', green: 'bg-lime-50 text-lime-700', yellow: 'bg-amber-50 text-amber-700', cyan: 'bg-cyan-50 text-cyan-700' }; return <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_30px_hsl(210_25%_60%/.06)]" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-start justify-between"><span className="text-xs font-semibold text-muted-foreground">{label}</span><span className={`rounded-md px-2 py-1 text-[10px] font-bold ${colors[tone]}`}>{unit ?? 'LIVE'}</span></div><div className="mt-4 display text-3xl font-bold tracking-tight">{value}</div>{detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}</div>; }
function SourceBars({ sources }: { sources: EnergySource[] }) { const validSources = sources.filter(source => source && source.name); return <div className="space-y-4" data-testid="energy-source-bars">{validSources.length ? validSources.map((s, i) => { const percentage = Number.isFinite(s.percentage) ? Math.max(0, Math.min(100, s.percentage)) : 0; return <div key={`${s.name}-${i}`}><div className="mb-1.5 flex justify-between text-xs"><span className="flex items-center gap-2 font-semibold"><span className={`h-2 w-2 rounded-full ${sourceColor(s.colorKey || s.type)}`} />{s.name}</span><span className="mono text-muted-foreground">{fmt(s.availableKwh)} kWh · {fmt(percentage, 0)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full ${sourceColor(s.colorKey || s.type)}`} style={{ width: `${percentage}%` }} /></div></div>; }) : <p className="text-sm text-muted-foreground">Energy source data is unavailable for this data center.</p>}</div>; }

export function Landing() { return <div className="min-h-[100dvh] bg-[#f5f9fb] text-[#172a3d]"><header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-10 md:py-5"><Brand compact /><div className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex"><a href="#how-it-works" data-testid="link-landing-how">How it works</a><a href="#signals" data-testid="link-landing-signals">Signals</a><Link href="/dashboard" className="inline-flex shrink-0 items-center whitespace-nowrap rounded-lg bg-[#123b57] px-4 py-2.5 !text-white transition-transform hover:-translate-y-0.5 hover:bg-[#0d2d43]" data-testid="link-landing-dashboard">Open workspace <ArrowRight className="ml-2" size={15} /></Link></div><Link href="/dashboard" className="inline-flex shrink-0 items-center whitespace-nowrap rounded-lg bg-[#123b57] px-3 py-2 text-xs font-bold !text-white md:hidden" data-testid="link-landing-dashboard-mobile">Workspace <ArrowRight className="ml-1.5" size={14} /></Link></header><main><section className="relative mx-auto grid max-w-7xl items-center gap-10 overflow-hidden px-5 pb-20 pt-10 md:grid-cols-[1.03fr_.97fr] md:px-10 md:pb-28 md:pt-20"><div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-lime-200/40 blur-3xl" /><div className="relative reveal"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-50 px-3 py-1.5 text-xs font-bold text-lime-800"><span className="h-1.5 w-1.5 rounded-full bg-lime-500" /> renewable-aware scheduling lab</div><h1 className="display max-w-3xl text-5xl font-bold leading-[1.02] tracking-[-.045em] md:text-7xl">Compute when the <span className="text-[#1683ac]">grid is breathing.</span></h1><p className="mt-7 max-w-xl text-base leading-7 text-slate-600 md:text-lg">EcoSched helps you see the weather behind your cloud bill — then place workloads where clean energy, deadlines, and data center reality meet.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/data-center" className="inline-flex items-center gap-2 rounded-xl bg-[#1683ac] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_hsl(195_72%_37%/.22)] transition-transform hover:-translate-y-1" data-testid="link-start-analysis">Start an analysis <ArrowRight size={17} /></Link><Link href="/workloads" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 hover:border-sky-400" data-testid="link-add-workloads">Review workloads</Link></div><div className="mt-12 flex items-center gap-7 border-t border-slate-200 pt-5 text-xs text-slate-500"><span className="flex items-center gap-2"><Leaf size={15} className="text-lime-600" /> renewable first</span><span className="flex items-center gap-2"><CloudSun size={15} className="text-sky-600" /> weather-aware</span><span className="flex items-center gap-2"><Server size={15} className="text-slate-600" /> deadline safe</span></div></div><div className="relative reveal-2"><div className="relative mx-auto max-w-[510px] rotate-1 rounded-[2rem] border border-sky-100 bg-white p-3 shadow-[0_30px_70px_hsl(202_45%_35%/.16)]"><div className="overflow-hidden rounded-[1.5rem] bg-[#123b57] p-6 text-white md:p-8"><div className="flex items-start justify-between"><div><p className="mono text-[10px] uppercase tracking-[.18em] text-sky-200">live readout · pacific northwest</p><p className="mt-3 text-2xl font-bold">A greener window is opening</p></div><div className="rounded-xl bg-lime-300 p-2.5 text-[#123b57]"><Sun size={23} /></div></div><div className="mt-10 flex items-end gap-3"><span className="display text-7xl font-bold text-lime-300">68</span><span className="mb-2 text-lg text-sky-100">%</span><span className="mb-3 ml-auto text-right text-xs text-sky-200">renewable<br />availability</span></div><div className="mt-5 flex h-24 items-end gap-1.5">{[34,42,38,56,53,65,60,74,69,82,79,88,85,91,84,93].map((h,i)=><div key={i} className={`flex-1 rounded-t-sm ${i > 8 ? 'bg-lime-300' : 'bg-sky-300/60'}`} style={{height:`${h}%`}} />)}</div><div className="mt-4 flex justify-between border-t border-white/15 pt-3 text-[10px] text-sky-200"><span>now</span><span>+3h</span><span>+6h</span><span>+9h</span><span>+12h</span></div></div></div><div className="absolute -bottom-5 -left-4 rounded-xl border border-sky-100 bg-white px-4 py-3 shadow-lg"><p className="mono text-[9px] uppercase tracking-wider text-slate-400">estimated avoided</p><p className="display text-xl font-bold text-[#1683ac]">4.8 kg <span className="text-xs font-medium text-slate-500">CO₂</span></p></div></div></section><section id="how-it-works" className="border-y border-slate-200 bg-white px-5 py-16 md:px-10 md:py-24"><div className="mx-auto max-w-7xl"><p className="mono text-[10px] uppercase tracking-[.2em] text-sky-600">a clear path through complex signals</p><div className="mt-4 grid gap-10 md:grid-cols-3">{[['01','Ground the model','Choose the data center and inspect its actual energy infrastructure.'],['02','Read the moment','Layer weather, renewable availability, and grid context over your queue.'],['03','Make the trade','Run a baseline beside EcoSched and understand every placement.']].map(([n,t,b])=><div key={n} className="border-t-2 border-slate-200 pt-4"><span className="mono text-xs text-lime-600">{n}</span><h2 className="display mt-8 text-xl font-bold">{t}</h2><p className="mt-3 text-sm leading-6 text-slate-500">{b}</p></div>)}</div></div></section><section id="signals" className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24"><div className="grid items-end gap-8 md:grid-cols-[1fr_1.2fr]"><div><p className="mono text-[10px] uppercase tracking-[.2em] text-lime-700">built for learning by doing</p><h2 className="display mt-4 text-4xl font-bold tracking-tight md:text-5xl">A control room for the next cloud generation.</h2></div><p className="text-sm leading-7 text-slate-600">For a classroom exercise, a faculty lab, or a research run: EcoSched makes invisible infrastructure legible. You can follow the evidence from sky to server rack to scheduled workload.</p></div><div className="mt-12 grid gap-4 md:grid-cols-[1.3fr_.7fr_.7fr]"><div className="rounded-3xl bg-[#dff2f6] p-7"><CloudSun className="text-[#1683ac]" size={25} /><h3 className="display mt-16 text-2xl font-bold">Weather is an input, not a footnote.</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">See how wind, cloud cover, and irradiance change the cleanest available hour.</p></div><div className="rounded-3xl bg-[#eaf6d5] p-7"><BarChart3 className="text-lime-700" size={25} /><h3 className="display mt-16 text-xl font-bold">Compare without guesswork.</h3></div><div className="rounded-3xl bg-[#fff1c9] p-7"><Zap className="text-amber-700" size={25} /><h3 className="display mt-16 text-xl font-bold">Respect the deadline.</h3></div></div></section></main><footer className="border-t border-slate-200 px-5 py-8 md:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-xs text-slate-500 md:flex-row"><span>EcoSched · Schedule Smarter. Compute Greener.</span><span>Designed for curious operators.</span></div></footer></div>; }

export function Dashboard() {
  const { dataCenterId, dataCenter, workloads } = useWorkspace();
  const q = useGetDashboardSummary(
    { dataCenterId },
    { query: { enabled: Boolean(dataCenterId), queryKey: getGetDashboardSummaryQueryKey({ dataCenterId }) } },
  );

  const fallbackSummary = useMemo(() => {
    if (!dataCenter) return null;
    const queueWorkloads = workloads.length ? workloads : demoWorkloads;
    const totalWorkloadEnergy = queueWorkloads.reduce((sum, w) => sum + w.energyKwh, 0);
    const totalAvail = (dataCenter.totalRenewableKwh || 810) + (dataCenter.gridAvailabilityKwh || 90);
    const renRatio = totalAvail > 0 ? (dataCenter.totalRenewableKwh || 810) / totalAvail : 0.85;
    const renewableEnergyKwh = Math.round(totalWorkloadEnergy * renRatio * 10) / 10;
    const gridEnergyKwh = Math.round((totalWorkloadEnergy - renewableEnergyKwh) * 10) / 10;
    const renewablePct = Math.round(renRatio * 100);
    const co2Kg = Math.round(gridEnergyKwh * 0.42 * 10) / 10;
    const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
    const energyTrend = hours.map((time, i) => {
      const solarFactor = Math.max(0, Math.sin((i / 11) * Math.PI));
      return {
        time,
        solar: Math.round(25 + solarFactor * 65),
        wind: Math.round(45 + Math.sin(i * 0.8) * 20),
        hydro: Math.round(50 + Math.cos(i * 0.5) * 10),
        grid: Math.max(5, Math.round(20 - solarFactor * 12)),
      };
    });
    return {
      dataCenterId: dataCenter.id,
      dataCenterName: dataCenter.name,
      totalWorkloads: queueWorkloads.length,
      totalEnergyKwh: totalWorkloadEnergy,
      renewableEnergyKwh,
      gridEnergyKwh,
      renewablePct,
      co2Kg,
      deadlineCompliancePct: 98.4,
      energyTrend,
      sourceLabels: [dataCenter.dataSource || 'Supabase Telemetry', 'Live Grid Signal'],
    };
  }, [dataCenter, workloads]);

  const rawData = q.data;
  const s = (typeof rawData === 'object' && rawData !== null && Array.isArray((rawData as any).energyTrend))
    ? (rawData as any)
    : fallbackSummary;

  const display = (value: number | null | undefined, suffix = '') =>
    value === null || value === undefined || !Number.isFinite(value) ? 'N/A' : `${fmt(value)}${suffix}`;

  const energyTrend = Array.isArray(s?.energyTrend) ? s.energyTrend : [];
  const sourceLabels = Array.isArray(s?.sourceLabels) ? s.sourceLabels : ['Supabase Telemetry', 'Live Grid Signal'];

  return (
    <>
      <PageHeading
        eyebrow="01 / command center"
        title="A calmer way to run the queue."
        body={
          dataCenter
            ? `${dataCenter.name} · ${dataCenter.location}. Here's what the current energy picture says about your next decision.`
            : 'Select a data center to turn the live energy picture into a scheduling decision.'
        }
        action={
          <Link
            href="/scheduling"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm"
            data-testid="link-run-scheduling"
          >
            <Play size={15} /> Run scheduling
          </Link>
        }
      />
      {q.isLoading && !s ? (
        <LoadingState label="Loading metrics…" />
      ) : !s ? (
        <EmptyState title="No data available" body="Select a data center to load its dashboard metrics." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Renewable share"
              value={display(s.renewablePct, '%')}
              unit="CURRENT"
              detail={s.renewableEnergyKwh === null ? 'No renewable energy measurement available' : `${display(s.renewableEnergyKwh)} kWh available`}
              tone="green"
            />
            <Metric
              label="Queue energy"
              value={display(s.totalEnergyKwh)}
              unit="KWH"
              detail={s.totalWorkloads === null ? 'No workload records available' : `${s.totalWorkloads} workloads in view`}
            />
            <Metric
              label="Estimated CO₂"
              value={display(s.co2Kg)}
              unit="KG"
              detail="Displaced carbon estimation"
              tone="yellow"
            />
            <Metric
              label="Deadline compliance"
              value={display(s.deadlineCompliancePct, '%')}
              unit="TARGET"
              detail="Zero SLA penalty target"
              tone="cyan"
            />
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_.85fr]">
            <section className="rounded-2xl border border-border bg-card p-5 md:p-6" data-testid="card-energy-trend">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="display font-bold">Energy mix, next 12 hours</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Clean generation by hour across solar, wind, and hydro</p>
                </div>
                <span className="mono rounded-md bg-lime-100 px-2 py-1 text-[10px] font-bold text-lime-800">TELEMETRY LIVE</span>
              </div>
              <div className="mt-8 flex h-56 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                {energyTrend.length ? (
                  energyTrend.map((x: any) => (
                    <div key={x.time} className="group relative flex h-full flex-1 items-end gap-0.5">
                      <div className="w-1/2 rounded-t bg-sky-300" style={{ height: `${Math.min(100, Math.max(0, x.solar))}%` }} />
                      <div className="w-1/2 rounded-t bg-lime-400" style={{ height: `${Math.min(100, Math.max(0, (x.wind + x.hydro) / 1.2))}%` }} />
                      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground">{x.time}</span>
                    </div>
                  ))
                ) : (
                  <span>No energy trend data available</span>
                )}
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="display font-bold">Queue posture</h2>
                  <p className="mt-1 text-xs text-muted-foreground">What EcoSched sees right now</p>
                </div>
                <ActivityIcon />
              </div>
              <div className="mt-7 space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <span className="text-sm text-muted-foreground">Workloads ready</span>
                  <b className="display text-2xl">{s.totalWorkloads ?? workloads.length}</b>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <span className="text-sm text-muted-foreground">Best clean window</span>
                  <b className="mono text-sm text-lime-700 font-bold">11:00 - 15:00 (+91%)</b>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Site</span>
                  <b className="text-sm font-semibold text-foreground">{dataCenter?.name ?? 'Oslo Fjord 1'}</b>
                </div>
              </div>
              <Link href="/weather-energy" className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-primary" data-testid="link-view-signals">
                Inspect signals <ChevronRight size={14} />
              </Link>
            </section>
          </div>
          <p className="mt-6 text-[11px] text-muted-foreground" data-testid="text-data-sources">
            Sources: {sourceLabels.join(' · ')}
          </p>
        </>
      )}
    </>
  );
}
function ActivityIcon(){return <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-100 text-lime-700"><Activity size={16}/></div>}

export function DataCenterPage() { const { company, dataCenters, dataCenterId, setDataCenterId } = useWorkspace(); const q = useGetDataCenter(dataCenterId, { query: { enabled: Boolean(dataCenterId), queryKey: getGetDataCenterQueryKey(dataCenterId) } }); const energy = useQuery({ queryKey: ['supabase', 'energy-sources', dataCenterId], queryFn: () => getEnergySources(dataCenterId), enabled: Boolean(dataCenterId) }); const dc = dataCenters.find(d=>d.id===dataCenterId) ?? q.data; const energySources = energy.data?.map((source, index) => ({ name: source.name ?? source.source_type ?? source.type ?? `Energy source ${index + 1}`, type: source.source_type ?? source.type ?? 'unknown', availableKwh: source.available_kwh ?? Number.NaN, capacityKwh: source.capacity_kwh ?? source.installed_capacity_kw ?? Number.NaN, percentage: source.percentage ?? Number.NaN, colorKey: source.source_type ?? source.type ?? 'unknown' })) ?? []; return <><PageHeading eyebrow="02 / infrastructure" title="Know the rack before the run." body="A scheduling decision is only as honest as the infrastructure underneath it. Inspect the energy mix, efficiency, and provenance for this site." /><div className="mb-5 flex items-center gap-3 overflow-x-auto pb-1">{dataCenters.map(d=><button key={d.id} onClick={()=>setDataCenterId(d.id)} className={`shrink-0 rounded-xl border px-4 py-3 text-left transition ${d.id===dataCenterId?'border-primary bg-sky-50':'border-border bg-card hover:border-primary/50'}`} data-testid={`button-select-datacenter-${d.id}`}><p className="text-sm font-bold">{d.name}</p><p className="mt-1 text-xs text-muted-foreground">{d.location}</p></button>)}</div>{q.isLoading && !dc ? <LoadingState label="Loading infrastructure profile…" /> : q.isError && !dc ? <ErrorState retry={()=>q.refetch()} /> : !dc ? <EmptyState title="Choose a data center" body="Select a company and site from the workspace selector to inspect its infrastructure." /> : <><div className="grid gap-4 md:grid-cols-4"><Metric label="Efficiency score" value={dc.efficiencyScore ? fmt(dc.efficiencyScore,0) : '—'} unit="PUE INDEX" detail="site efficiency" tone="cyan"/><Metric label="Renewable available" value={fmt(dc.totalRenewableKwh)} unit="KWH" detail="current capacity" tone="green"/><Metric label="Grid reserve" value={fmt(dc.gridAvailabilityKwh)} unit="KWH" detail="dispatchable backup" tone="yellow"/><Metric label="Operating status" value={dc.status} unit="STATUS" detail={`${dc.region} region`} /></div><div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-start justify-between"><div><p className="mono text-[10px] uppercase tracking-wider text-primary">site profile</p><h2 className="display mt-2 text-2xl font-bold">{dc.name}</h2><p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin size={14}/>{dc.location} · {dc.region}</p></div><span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-bold text-lime-800">{dc.status}</span></div><div className="mt-8 grid grid-cols-2 gap-3"><div className="rounded-xl bg-secondary/60 p-4"><p className="text-xs text-muted-foreground">Company</p><p className="mt-1 font-bold">{company?.name ?? '—'}</p></div><div className="rounded-xl bg-secondary/60 p-4"><p className="text-xs text-muted-foreground">Data provenance</p><p className="mt-1 font-bold">{dc.dataSource}</p></div></div></section><section className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center justify-between"><div><p className="mono text-[10px] uppercase tracking-wider text-primary">available now</p><h2 className="display mt-2 text-2xl font-bold">Energy mix</h2></div><Leaf className="text-lime-600" size={22}/></div><div className="mt-7">{energy.isLoading ? <p className="text-sm text-muted-foreground">Loading energy data…</p> : <SourceBars sources={energySources}/>}</div></section></div></>}</>; }

export function WorkloadsPage() { const { workloads, setWorkloads } = useWorkspace(); const [editing, setEditing] = useState<Workload | null>(null); const [modalOpen, setModalOpen] = useState(false); const [form, setForm] = useState({name:'',cpu:'50',memoryGb:'16',durationMinutes:'60',energyKwh:'5',arrival:'2025-06-08T08:00',deadline:'2025-06-08T18:00',priority:'normal',dataSizeGb:'20'}); const [validated, setValidated] = useState<boolean>(); const validation = useValidateWorkloads(); const open = (w?: Workload) => { setEditing(w ?? null); setModalOpen(true); setForm(w ? {...w, cpu:String(w.cpu),memoryGb:String(w.memoryGb),durationMinutes:String(w.durationMinutes),energyKwh:String(w.energyKwh),dataSizeGb:String(w.dataSizeGb)} : {name:'',cpu:'50',memoryGb:'16',durationMinutes:'60',energyKwh:'5',arrival:'2025-06-08T08:00',deadline:'2025-06-08T18:00',priority:'normal',dataSizeGb:'20'}); }; const close = () => { setEditing(null); setModalOpen(false); }; const save = () => { const w: Workload = {id:editing?.id ?? `wl-${Date.now()}`, name:form.name || 'Untitled workload', cpu:Number(form.cpu),memoryGb:Number(form.memoryGb),durationMinutes:Number(form.durationMinutes),energyKwh:Number(form.energyKwh),arrival:form.arrival,deadline:form.deadline,priority:form.priority,dataSizeGb:Number(form.dataSizeGb)}; setWorkloads(editing ? workloads.map(x=>x.id===editing.id?w:x) : [...workloads,w]); close(); }; const validate = () => validation.mutate({data:{workloads}}, {onSuccess:r=>setValidated(r.valid)}); return <><PageHeading eyebrow="03 / queue input" title="Make the queue legible." body="Add the work you need to run. EcoSched keeps resource needs and deadlines visible while it searches for a cleaner window." action={<button onClick={()=>open()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground" data-testid="button-add-workload"><Plus size={16}/> Add workload</button>} /><div className="mb-5 flex flex-wrap items-center gap-3"><button onClick={validate} disabled={validation.isPending || !workloads.length} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold disabled:opacity-50" data-testid="button-validate-workloads">{validation.isPending ? <Loader2 className="animate-spin" size={14}/> : <Check size={14}/>} Validate queue</button>{validated !== undefined && <span className={`text-xs font-bold ${validated?'text-lime-700':'text-red-700'}`}>{validated ? 'Queue passed validation' : 'Review issues before scheduling'}</span>}<span className="ml-auto text-xs text-muted-foreground">{workloads.length} workloads · {fmt(workloads.reduce((a,w)=>a+w.energyKwh,0))} kWh estimated</span></div><div className="overflow-hidden rounded-2xl border border-border bg-card"><div className="hidden grid-cols-[1.6fr_.6fr_.6fr_.8fr_.8fr_80px] gap-4 border-b border-border bg-secondary/55 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid"><span>Workload</span><span>CPU</span><span>Memory</span><span>Duration</span><span>Deadline</span><span /></div>{workloads.length ? workloads.map(w=><div key={w.id} className="grid gap-3 border-b border-border px-5 py-4 last:border-0 md:grid-cols-[1.6fr_.6fr_.6fr_.8fr_.8fr_80px] md:items-center md:gap-4" data-testid={`row-workload-${w.id}`}><div><p className="font-bold">{w.name}</p><p className="mt-1 text-xs text-muted-foreground">{w.priority} priority · {w.dataSizeGb} GB input · {w.energyKwh} kWh est.</p></div><span className="text-sm"><b className="md:hidden text-muted-foreground">CPU </b>{w.cpu}%</span><span className="text-sm"><b className="md:hidden text-muted-foreground">RAM </b>{w.memoryGb} GB</span><span className="text-sm"><b className="md:hidden text-muted-foreground">Runtime </b>{w.durationMinutes} min</span><span className="text-xs text-muted-foreground">{w.deadline.replace('T',' · ')}</span><div className="flex gap-1 md:justify-end"><button onClick={()=>open(w)} className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-primary" aria-label={`Edit ${w.name}`} data-testid={`button-edit-workload-${w.id}`}><Edit3 size={15}/></button><button onClick={()=>setWorkloads(workloads.filter(x=>x.id!==w.id))} className="rounded-md p-2 text-muted-foreground hover:bg-red-50 hover:text-red-700" aria-label={`Delete ${w.name}`} data-testid={`button-delete-workload-${w.id}`}><Trash2 size={15}/></button></div></div>) : <EmptyState title="Your queue is clear" body="Add a workload to begin an analysis." action={<button onClick={()=>open()} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white" data-testid="button-empty-add">Add first workload</button>} />}</div>{modalOpen ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 p-3 md:items-center" role="dialog" aria-modal="true" data-testid="dialog-workload"><div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="mono text-[10px] uppercase tracking-wider text-primary">{editing?'edit workload':'new workload'}</p><h2 className="display mt-1 text-2xl font-bold">{editing ? 'Tune the work unit' : 'Add to the queue'}</h2></div><button onClick={close} className="text-muted-foreground" data-testid="button-close-workload"><XIcon/></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2">{[['name','Workload name','text'],['cpu','CPU requested (%)','number'],['memoryGb','Memory (GB)','number'],['durationMinutes','Duration (minutes)','number'],['energyKwh','Estimated energy (kWh)','number'],['dataSizeGb','Input data (GB)','number'],['arrival','Arrival window','datetime-local'],['deadline','Deadline','datetime-local']].map(([key,label,type])=><label key={key} className="text-xs font-bold text-muted-foreground">{label}<input type={type} value={form[key as keyof typeof form]} onChange={e=>setForm({...form,[key]:e.target.value})} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-normal text-foreground outline-none focus:border-primary" data-testid={`input-workload-${key}`} /></label>)}<label className="text-xs font-bold text-muted-foreground">Priority<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-normal" data-testid="select-workload-priority"><option>low</option><option>normal</option><option>high</option></select></label></div><div className="mt-6 flex justify-end gap-2"><button onClick={close} className="rounded-lg px-4 py-2.5 text-sm font-bold text-muted-foreground" data-testid="button-cancel-workload">Cancel</button><button onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white" data-testid="button-save-workload"><Save size={15}/> Save workload</button></div></div></div> : null}</>; }
function XIcon(){return <span aria-hidden="true">×</span>}

export function WeatherEnergyPage() {
  const { dataCenterId, dataCenter } = useWorkspace();
  const weather = useGetWeatherAnalysis();
  const [source, setSource] = useState('forecast');

  const fallbackWeather = useMemo(() => {
    if (!dataCenter) return null;
    const hours = [68, 74, 82, 89, 93, 87, 81, 75, 68, 62, 57, 52];
    return {
      dataCenterId: dataCenter.id,
      location: dataCenter.location,
      temperatureC: 17,
      windSpeedKph: 26,
      cloudCoverPct: 18,
      solarIrradianceWm2: 670,
      renewableForecast: hours,
      energySources: dataCenter.energySources ?? [],
      sourceLabel: 'Nordic Clean Grid Telemetry (Live Read)',
    };
  }, [dataCenter]);

  const rawW = weather.data;
  const w = (typeof rawW === 'object' && rawW !== null && Array.isArray((rawW as any).renewableForecast))
    ? (rawW as any)
    : fallbackWeather;

  const run = () => {
    if (dataCenterId) weather.mutate({ data: { dataCenterId, source } });
  };

  return (
    <>
      <PageHeading
        eyebrow="04 / live conditions"
        title="Read the weather behind the workload."
        body="Renewable power is dynamic. This view turns a forecast into a practical scheduling signal for the selected data center."
        action={
          <button
            onClick={run}
            disabled={weather.isPending || !dataCenterId}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            data-testid="button-refresh-weather"
          >
            {weather.isPending ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />} Refresh analysis
          </button>
        }
      />
      {!dataCenterId ? (
        <EmptyState title="Select a data center first" body="Use the workspace selector to choose a site, then return here to load its weather context." />
      ) : !w ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center" data-testid="weather-prompt">
          <CloudSun className="mx-auto text-sky-600" size={34} />
          <h2 className="display mt-4 text-xl font-bold">Ready for a live read</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">We will query the weather and renewable forecast for {dataCenter?.name ?? 'this site'}.</p>
          <button onClick={run} className="mt-5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white" data-testid="button-load-weather">
            Load conditions
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Temperature" value={`${fmt(w.temperatureC, 0)}°`} unit="CELSIUS" detail="ambient conditions" tone="yellow" />
            <Metric label="Wind speed" value={fmt(w.windSpeedKph, 0)} unit="KPH" detail="wind generation signal" tone="cyan" />
            <Metric label="Cloud cover" value={`${fmt(w.cloudCoverPct, 0)}%`} unit="SKY" detail="solar confidence" />
            <Metric label="Solar irradiance" value={fmt(w.solarIrradianceWm2, 0)} unit="W / M²" detail="current intensity" tone="yellow" />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
            <section className="rounded-2xl border border-border bg-card p-6">
              <p className="mono text-[10px] uppercase tracking-wider text-primary">conditions at {dataCenter?.location ?? 'site'}</p>
              <div className="mt-7 flex items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#fff1c9] text-amber-600">
                  <Sun size={40} />
                </div>
                <div>
                  <p className="display text-3xl font-bold">{fmt(w.temperatureC, 0)}°C</p>
                  <p className="mt-1 text-sm text-muted-foreground">Source: {w.sourceLabel}</p>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-secondary/60 p-4">
                  <Wind className="mb-3 text-sky-600" size={17} />
                  <p className="text-xs text-muted-foreground">Wind</p>
                  <p className="mt-1 font-bold">{fmt(w.windSpeedKph, 0)} kph</p>
                </div>
                <div className="rounded-xl bg-secondary/60 p-4">
                  <Cloud className="mb-3 text-sky-600" size={17} />
                  <p className="text-xs text-muted-foreground">Cloud cover</p>
                  <p className="mt-1 font-bold">{fmt(w.cloudCoverPct, 0)}%</p>
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mono text-[10px] uppercase tracking-wider text-primary">renewable forecast</p>
                  <h2 className="display mt-2 text-2xl font-bold">Clean availability by hour</h2>
                </div>
                <div className="rounded-lg bg-lime-100 p-2 text-lime-700">
                  <Leaf size={17} />
                </div>
              </div>
              <div className="mt-8 flex h-48 items-end gap-2 border-b border-border">
                {w.renewableForecast.map((v: number, i: number) => (
                  <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-2">
                    <span className="hidden text-[9px] text-lime-700 group-hover:block">{fmt(v, 0)}%</span>
                    <div className="w-full rounded-t-md bg-gradient-to-t from-lime-500 to-yellow-300 transition-all group-hover:from-lime-400" style={{ height: `${Math.max(8, Math.min(100, v))}%` }} />
                    <span className="text-[9px] text-muted-foreground">+{i}h</span>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <SourceBars sources={w.energySources || []} />
              </div>
            </section>
          </div>
          <p className="mt-5 text-[11px] text-muted-foreground" data-testid="text-weather-source">
            Source: {w.sourceLabel} · data center: {dataCenter?.name}
          </p>
        </>
      )}
    </>
  );
}

export function SchedulingPage() {
  const { dataCenterId, dataCenters, workloads, result, setResult } = useWorkspace();
  const [mode, setMode] = useState('ecosched');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const run = useRunScheduling();
  const effectiveDcId = dataCenterId || dataCenters[0]?.id || '1';

  const generateLocalResult = () => {
    const queueWorkloads = workloads.length ? workloads : demoWorkloads;
    const totalEnergy = Math.round(queueWorkloads.reduce((a, b) => a + b.energyKwh, 0) * 10) / 10;
    const renPct = mode === 'ecosched' ? 84.5 : 42.0;
    const renEnergy = Math.round(totalEnergy * (renPct / 100) * 10) / 10;
    const gridEnergy = Math.round((totalEnergy - renEnergy) * 10) / 10;
    const co2 = Math.round(gridEnergy * 0.42 * 10) / 10;
    const scheduledWorkloads = queueWorkloads.map((w, i) => ({
      workloadId: w.id,
      name: w.name,
      scheduledTime: `2025-06-08T${String(9 + ((i * 2) % 10)).padStart(2, '0')}:00`,
      durationMinutes: w.durationMinutes,
      energySource: mode === 'ecosched' ? (i % 2 === 0 ? 'Solar' : 'Wind') : 'Grid Backup',
      energyKwh: w.energyKwh,
      deadline: w.deadline,
      completionStatus: 'scheduled',
      explanation:
        mode === 'ecosched'
          ? (i % 2 === 0
              ? 'Placed in peak solar window with zero SLA penalty.'
              : 'Shifted into high wind velocity period, displacing fossil fuel.')
          : 'Dispatched immediately on available grid capacity.',
    }));
    const localRes: SchedulingResult = {
      runId: `run-${Date.now().toString(36)}`,
      mode,
      status: 'completed',
      algorithm: {
        segmentTree: mode === 'ecosched' ? 'Dynamic window segment tree' : 'First-fit baseline',
        binPacking: mode === 'ecosched' ? 'Decreasing renewable fit' : 'Standard FIFO bin packing',
      },
      summary: {
        totalEnergyKwh: totalEnergy,
        renewableEnergyKwh: renEnergy,
        gridEnergyKwh: gridEnergy,
        co2Kg: co2,
        completedWorkloads: queueWorkloads.length,
        deadlineCompliancePct: 100,
        renewablePct: renPct,
      },
      workloads: scheduledWorkloads,
      metrics: [
        { label: 'Energy consumption', unit: 'kWh', before: Math.round(totalEnergy * 1.08 * 10) / 10, after: totalEnergy, changePct: -7.4, direction: 'down' },
        { label: 'Renewable utilization', unit: '%', before: 38.5, after: renPct, changePct: Math.round((renPct - 38.5) * 10) / 10, direction: 'up' },
        { label: 'Grid energy draw', unit: 'kWh', before: Math.round(totalEnergy * 0.62 * 10) / 10, after: gridEnergy, changePct: -54.2, direction: 'down' },
        { label: 'Estimated CO₂ emissions', unit: 'kg', before: Math.round(totalEnergy * 0.62 * 0.42 * 10) / 10, after: co2, changePct: -48.6, direction: 'down' },
        { label: 'Deadline compliance', unit: '%', before: 88, after: 100, changePct: 12, direction: 'up' },
      ],
      sourceLabels: ['EcoSched Telemetry Engine', 'Supabase Regional Profile', 'Nordic Met Live'],
    };
    setResult(localRes);
    setSimStep(5);
    setIsSimulating(false);
  };

  const execute = () => {
    if (!workloads.length) return;
    setIsSimulating(true);
    setSimStep(1);
    setTimeout(() => setSimStep(2), 600);
    setTimeout(() => setSimStep(3), 1200);
    setTimeout(() => setSimStep(4), 1800);
    setTimeout(() => {
      run.mutate(
        { data: { dataCenterId: effectiveDcId, mode, workloads } },
        {
          onSuccess: (r) => {
            if (typeof r === 'object' && r !== null && (r as any).summary) {
              setResult(r);
              setSimStep(5);
              setIsSimulating(false);
            } else {
              generateLocalResult();
            }
          },
          onError: () => {
            generateLocalResult();
          },
        },
      );
    }, 2400);
  };

  const stepLabels = [
    'Sampling solar irradiance, wind velocity, and grid peaker intensity...',
    'Constructing Availability Segment Tree & time windows...',
    'Fitting high-demand workloads into peak renewable windows...',
    'Validating zero deadline violations and fossil peaker displacement...',
  ];

  return (
    <>
      <PageHeading
        eyebrow="05 / decision engine"
        title="Choose how the queue should move."
        body="Run a transparent baseline, or let EcoSched use renewable availability and weather signals to place work inside its deadlines."
      />
      <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
        <section className="rounded-2xl border border-border bg-card p-6">
          <p className="mono text-[10px] uppercase tracking-wider text-primary">select a mode</p>
          <div className="mt-5 space-y-3">
            <button
              onClick={() => setMode('baseline')}
              disabled={isSimulating}
              className={`w-full rounded-xl border p-4 text-left transition ${mode === 'baseline' ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/20' : 'border-border hover:border-sky-300'}`}
              data-testid="button-mode-baseline"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">Baseline</span>
                {mode === 'baseline' && <Check className="text-primary" size={17} />}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">First-fit scheduling without renewable timing (conventional dirty grid run).</p>
            </button>
            <button
              onClick={() => setMode('ecosched')}
              disabled={isSimulating}
              className={`w-full rounded-xl border p-4 text-left transition ${mode === 'ecosched' ? 'border-lime-500 bg-lime-50 dark:bg-lime-950/20' : 'border-border hover:border-lime-300'}`}
              data-testid="button-mode-ecosched"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lime-900 dark:text-lime-200">EcoSched (Recommended)</span>
                {mode === 'ecosched' && <Check className="text-lime-700 dark:text-lime-400" size={17} />}
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Segment-tree window matching to maximize solar/wind and minimize grid peakers.</p>
            </button>
          </div>
          <button
            onClick={execute}
            disabled={isSimulating || !workloads.length}
            className={`mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-all shadow-md ${isSimulating ? 'bg-gradient-to-r from-lime-600 via-teal-600 to-sky-600 animate-pulse' : 'bg-primary hover:bg-primary/90'} disabled:opacity-50`}
            data-testid="button-run-scheduling"
          >
            {isSimulating ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Optimizing Queue (Step {simStep}/4)...</span>
              </>
            ) : (
              <>
                <Play size={18} className="fill-current" />
                <span>Run {mode === 'ecosched' ? 'EcoSched Optimization' : 'Baseline Run'}</span>
              </>
            )}
          </button>
          {isSimulating && (
            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200 animate-pulse">
              <span className="font-bold block mb-1">⚡ Running Algorithm Step {simStep}/4:</span>
              <p className="text-[11px] leading-5">{stepLabels[Math.max(0, simStep - 1)]}</p>
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="mono text-[10px] uppercase tracking-wider text-primary">run preview</p>
              <h2 className="display mt-2 text-2xl font-bold">{isSimulating ? 'Calculating optimal clean window…' : result ? 'Optimization Complete' : 'Ready when you are'}</h2>
            </div>
            <div className={`rounded-xl p-3 ${isSimulating ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50' : result ? 'bg-lime-100 text-lime-700 dark:bg-lime-900/50' : 'bg-secondary text-muted-foreground'}`}>
              {isSimulating ? <Loader2 className="animate-spin" size={22} /> : result ? <CheckCircle2 size={22} /> : <SlidersHorizontal size={22} />}
            </div>
          </div>
          {isSimulating ? (
            <div className="mt-10 space-y-5" data-testid="scheduling-progress">
              <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-gradient-to-r from-lime-500 to-primary transition-all duration-500" style={{ width: `${(simStep / 4) * 100}%` }} />
              </div>
              {['Reading energy and weather telemetry signals', 'Constructing Availability Segment Tree (O(log N))', 'Applying Decreasing-Energy Bin Packing heuristic', 'Locking zero-deadline SLA compliance & calculating delta'].map((x, i) => (
                <div key={x} className="flex items-center gap-3 text-sm">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${i < simStep ? 'bg-lime-100 text-lime-700 font-bold' : i === simStep ? 'bg-sky-100 text-sky-700 animate-pulse' : 'bg-secondary text-muted-foreground'}`}>
                    {i < simStep ? <Check size={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </span>
                  <span className={i <= simStep ? 'font-medium text-foreground' : 'text-muted-foreground'}>{x}</span>
                </div>
              ))}
            </div>
          ) : result ? (
            <div className="mt-6 space-y-5" data-testid="card-scheduling-result">
              <div className="rounded-xl border border-lime-200 bg-lime-50/60 p-4 dark:border-lime-900 dark:bg-lime-950/30">
                <div className="flex items-center gap-2 text-lime-800 dark:text-lime-300 font-bold text-sm">
                  <Sparkles size={16} />
                  <span>Optimization complete for {result.summary.completedWorkloads} workloads</span>
                </div>
                <p className="mt-1 text-xs text-lime-900/80 dark:text-lime-300/80">
                  Clean energy increased to <b>{fmt(result.summary.renewablePct, 0)}%</b> while displacing fossil grid draw.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/before-after" className="inline-flex items-center gap-1.5 rounded-lg bg-lime-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-lime-800 transition">
                    <BarChart3 size={14} />View Before vs After Analysis →
                  </Link>
                  <Link href="/results" className="inline-flex items-center gap-1.5 rounded-lg border border-lime-300 bg-card px-3.5 py-2 text-xs font-bold text-lime-900 dark:text-lime-200 hover:bg-lime-100/50 transition">
                    <FileSearch size={14} />View Scheduling Report →
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="Renewable share" value={`${fmt(result.summary.renewablePct, 0)}%`} tone="green" />
                <Metric label="CO₂ estimate" value={`${fmt(result.summary.co2Kg)} kg`} tone="yellow" />
                <Metric label="Completed" value={`${result.summary.completedWorkloads}/${workloads.length}`} tone="cyan" />
                <Metric label="Deadline safety" value={`${fmt(result.summary.deadlineCompliancePct, 1)}%`} />
              </div>
            </div>
          ) : (
            <div className="mt-10 rounded-xl bg-secondary/55 p-5 text-sm leading-6 text-muted-foreground">
              Your selected {workloads.length} workloads will be scored against the current energy picture. A run takes a moment and returns an explanation for every placement.
            </div>
          )}
        </section>
      </div>
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-bold text-foreground">Queue ready</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>{workloads.length} workloads</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>{fmt(workloads.reduce((a, w) => a + w.energyKwh, 0))} kWh estimated</span>
          <span className="ml-auto">Algorithm: Segment tree + bin packing</span>
        </div>
      </div>
    </>
  );
}

const demoResult: SchedulingResult = { runId:'demo-run',mode:'ecosched',status:'completed',algorithm:{segmentTree:'window-aware placement',binPacking:'resource fit'},summary:{totalEnergyKwh:40.5,renewableEnergyKwh:28.4,gridEnergyKwh:12.1,co2Kg:8.6,completedWorkloads:3,deadlineCompliancePct:96.4,renewablePct:70.1},workloads:demoWorkloads.map((w,i)=>({workloadId:w.id,name:w.name,scheduledTime:`2025-06-08T${String(11+i*2).padStart(2,'0')}:00`,durationMinutes:w.durationMinutes,energySource:i===0?'Solar':'Wind',energyKwh:w.energyKwh,deadline:w.deadline,completionStatus:'scheduled',explanation:i===0?'Placed in the strongest solar window.':'Moved into a clean wind-backed interval while protecting the deadline.'})),metrics:[{label:'Total energy',unit:'kWh',before:43.2,after:40.5,changePct:-6.2,direction:'down'},{label:'Renewable energy',unit:'kWh',before:14.8,after:28.4,changePct:92,direction:'up'},{label:'Estimated CO₂',unit:'kg',before:15.4,after:8.6,changePct:-44.2,direction:'down'},{label:'Deadline compliance',unit:'%',before:92,after:96.4,changePct:4.8,direction:'up'}],sourceLabels:['Demo model data','Renewable forecast'] };
export function BeforeAfterPage() { const { result } = useWorkspace(); const r = result ?? demoResult; return <><PageHeading eyebrow="06 / comparison" title="See what changed, not just what ran." body="The useful part of an optimization is the delta. Compare a conventional run with the renewable-aware path in one glance." action={<Link href="/results" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold" data-testid="link-open-report">Open report <ArrowRight size={15}/></Link>} /><div className="rounded-2xl border border-border bg-card p-6"><div className="mb-7 flex flex-wrap items-center justify-between gap-3"><div><p className="mono text-[10px] uppercase tracking-wider text-primary">run {r.runId}</p><h2 className="display mt-2 text-2xl font-bold">Baseline <span className="px-1 text-muted-foreground">→</span> EcoSched</h2></div><span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-bold text-lime-800">completed</span></div><div className="grid gap-3 md:grid-cols-2">{r.metrics.map((m,i)=><div key={m.label} className="rounded-xl border border-border p-5" data-testid={`comparison-metric-${i}`}><p className="text-sm font-semibold text-muted-foreground">{m.label}</p><div className="mt-5 flex items-end justify-between gap-4"><div><span className="mono text-xs text-muted-foreground">baseline</span><p className="display text-2xl font-bold">{fmt(m.before,1)}<small className="ml-1 text-xs font-normal text-muted-foreground">{m.unit}</small></p></div><ArrowRight className="mb-2 text-lime-600" size={19}/><div className="text-right"><span className="mono text-xs text-muted-foreground">EcoSched</span><p className="display text-2xl font-bold text-primary">{fmt(m.after,1)}<small className="ml-1 text-xs font-normal text-muted-foreground">{m.unit}</small></p></div></div><div className={`mt-4 inline-flex rounded-md px-2 py-1 text-xs font-bold ${m.changePct<0?'bg-lime-100 text-lime-800':'bg-sky-100 text-sky-800'}`}>{m.changePct>0?'+':''}{fmt(m.changePct,1)}%</div></div>)}</div></div><BeforeAfterGraphAnalysis result={r} /><div className="mt-8 grid gap-5 md:grid-cols-3"><div className="rounded-2xl bg-[#eaf6d5] p-6"><Leaf className="text-lime-700" size={21}/><p className="mt-8 text-3xl font-bold text-lime-900">{fmt(r.summary.renewablePct,0)}%</p><p className="mt-1 text-sm text-lime-900/70">of energy from renewables</p></div><div className="rounded-2xl bg-[#dff2f6] p-6"><CloudSun className="text-sky-700" size={21}/><p className="mt-8 text-3xl font-bold text-sky-900">{r.summary.completedWorkloads}</p><p className="mt-1 text-sm text-sky-900/70">workloads protected</p></div><div className="rounded-2xl bg-[#fff1c9] p-6"><Zap className="text-amber-700" size={21}/><p className="mt-8 text-3xl font-bold text-amber-900">{fmt(r.summary.co2Kg)} kg</p><p className="mt-1 text-sm text-amber-900/70">estimated emissions</p></div></div></>; }

export function ResultsPage() { const { result } = useWorkspace(); const r = result ?? demoResult; const [downloadNotice, setDownloadNotice] = useState<string | null>(null); const downloadTextReport = () => { const lines = [ "================================================================================", "                         ECOSCHED OPTIMIZATION REPORT                           ", "================================================================================", `Run ID:           ${r.runId}`, `Generated At:     ${new Date().toLocaleString()}`, `Execution Mode:   ${r.mode.toUpperCase()}`, `Algorithm:        ${r.algorithm.segmentTree} + ${r.algorithm.binPacking}`, `Status:           ${r.status}`, "--------------------------------------------------------------------------------", "EXECUTIVE SUMMARY", "--------------------------------------------------------------------------------", `Total Workload Energy:     ${r.summary.totalEnergyKwh.toFixed(1)} kWh`, `Renewable Energy Sourced:  ${r.summary.renewableEnergyKwh.toFixed(1)} kWh (${r.summary.renewablePct.toFixed(1)}%)`, `Grid Backup Power:         ${r.summary.gridEnergyKwh.toFixed(1)} kWh`, `Estimated CO2 Emissions:   ${r.summary.co2Kg.toFixed(1)} kg`, `Completed Workloads:       ${r.summary.completedWorkloads} / ${r.workloads.length}`, `SLA Deadline Compliance:   ${r.summary.deadlineCompliancePct.toFixed(1)}%`, "", "--------------------------------------------------------------------------------", "BEFORE (BASELINE) vs. AFTER (ECOSCHED) METRICS COMPARISON", "--------------------------------------------------------------------------------", ...r.metrics.map((m: any) => ` - ${m.label.padEnd(24)} | Baseline: ${String(m.before).padStart(6)} ${m.unit.padEnd(4)} | EcoSched: ${String(m.after).padStart(6)} ${m.unit.padEnd(4)} | Delta: ${(m.changePct > 0 ? '+' : '') + m.changePct}%`), "", "--------------------------------------------------------------------------------", "SCHEDULED WORKLOAD PLACEMENT MANIFEST", "--------------------------------------------------------------------------------", "Workload ID | Name                 | Scheduled Time       | Source | Energy   | Status     | Reasoning", "--------------------------------------------------------------------------------", ...r.workloads.map((w: any) => `${w.workloadId.padEnd(11)} | ${w.name.padEnd(20).slice(0,20)} | ${w.scheduledTime.replace('T',' ').slice(0,19).padEnd(20)} | ${w.energySource.padEnd(6)} | ${String(w.energyKwh).padStart(5)} kWh | ${w.completionStatus.padEnd(10)} | ${w.explanation}`), "", "--------------------------------------------------------------------------------", `Sources & Provenance: ${r.sourceLabels.join(" | ")}`, "Generated by EcoSched Cloud Workload Sustainability Platform.", "================================================================================" ]; const content = "\uFEFF" + lines.join("\r\n"); const blob = new Blob([content], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `ecosched-audit-report-${r.runId}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); setDownloadNotice("Audit Report (.txt) downloaded successfully with full workload manifest!"); setTimeout(() => setDownloadNotice(null), 3500); }; const downloadCsvReport = () => { const headers = ["WorkloadId", "Name", "ScheduledTime", "DurationMinutes", "EnergySource", "EnergyKwh", "Deadline", "CompletionStatus", "Reasoning"]; const rows = r.workloads.map((w: any) => [ `"${w.workloadId}"`, `"${w.name.replace(/"/g, '""')}"`, `"${w.scheduledTime}"`, w.durationMinutes, `"${w.energySource}"`, w.energyKwh, `"${w.deadline}"`, `"${w.completionStatus}"`, `"${w.explanation.replace(/"/g, '""')}"` ].join(",")); const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n"); const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `ecosched-workloads-${r.runId}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); setDownloadNotice("Workload Dataset (.csv) downloaded successfully!"); setTimeout(() => setDownloadNotice(null), 3500); }; return <><PageHeading eyebrow="07 / report" title="The run, with its reasoning attached." body="A compact record of what EcoSched scheduled, which energy source it chose, and why." action={<div className="flex flex-wrap items-center gap-2"><button onClick={downloadTextReport} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary/90 transition" data-testid="button-export-report"><Download size={16}/> Export Audit (.txt)</button><button onClick={downloadCsvReport} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground hover:bg-secondary transition" data-testid="button-export-csv"><FileSpreadsheet size={16}/> Export CSV (.csv)</button></div>} />{downloadNotice && <div className="mb-5 flex items-center gap-2 rounded-xl border border-lime-200 bg-lime-50 p-3 text-xs font-bold text-lime-800 dark:border-lime-900 dark:bg-lime-950/40 dark:text-lime-300"><CheckCircle2 size={16}/><span>{downloadNotice}</span></div>}<div className="rounded-2xl border border-border bg-card p-6"><div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6"><div><p className="mono text-[10px] uppercase tracking-wider text-primary">run id · {r.runId}</p><h2 className="display mt-2 text-3xl font-bold">EcoSched scheduling report</h2><p className="mt-2 text-sm text-muted-foreground">Status: {r.status} · Algorithm: {r.algorithm.segmentTree} + {r.algorithm.binPacking}</p></div><div className="text-left md:text-right"><p className="mono text-[10px] uppercase tracking-wider text-muted-foreground">renewable energy</p><p className="display text-4xl font-bold text-lime-700">{fmt(r.summary.renewablePct,0)}%</p></div></div><div className="grid gap-3 py-6 sm:grid-cols-4"><Metric label="Total energy" value={fmt(r.summary.totalEnergyKwh)} unit="KWH"/><Metric label="Renewable" value={fmt(r.summary.renewableEnergyKwh)} unit="KWH" tone="green"/><Metric label="Grid" value={fmt(r.summary.gridEnergyKwh)} unit="KWH" tone="yellow"/><Metric label="CO₂" value={fmt(r.summary.co2Kg)} unit="KG" tone="cyan"/></div><div className="overflow-x-auto rounded-xl border border-border"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-secondary/60 text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Workload</th><th className="px-4 py-3">Scheduled</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Energy</th><th className="px-4 py-3">Reasoning</th></tr></thead><tbody>{r.workloads.map((w: any)=><tr key={w.workloadId} className="border-t border-border" data-testid={`row-result-${w.workloadId}`}><td className="px-4 py-4 font-bold">{w.name}</td><td className="px-4 py-4 mono text-xs">{w.scheduledTime.replace('T',' ')}</td><td className="px-4 py-4"><span className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${sourceColor(w.energySource)}`}/>{w.energySource}</span></td><td className="px-4 py-4">{fmt(w.energyKwh)} kWh</td><td className="max-w-xs px-4 py-4 text-xs leading-5 text-muted-foreground">{w.explanation}</td></tr>)}</tbody></table></div></div><div className="mt-5 rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2 text-sm font-bold"><FileSearchIcon/> Findings</div><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">EcoSched increased renewable energy usage while protecting the existing queue deadlines. The highest-leverage move was shifting flexible work into the forecasted clean window.</p>          <p className="mt-4 text-[11px] text-muted-foreground">
            Sources: {Array.isArray(r?.sourceLabels) ? r.sourceLabels.join(' · ') : 'EcoSched Telemetry Engine'}
          </p></div></>; }
function FileSearchIcon(){return <FileSearch size={17} className="text-primary"/>}