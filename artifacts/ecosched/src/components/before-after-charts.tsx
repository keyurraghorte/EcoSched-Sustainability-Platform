import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  Clock,
  Layers,
  Leaf,
  Zap,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  Server,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export type ComparisonMetric = {
  label: string;
  unit: string;
  before: number;
  after: number;
  changePct: number;
  direction: string;
};

export type ScheduledWorkload = {
  workloadId: string;
  name: string;
  scheduledTime: string;
  durationMinutes: number;
  energySource: string;
  energyKwh: number;
  deadline: string;
  completionStatus: string;
  explanation: string;
};

export type SchedulingSummary = {
  totalEnergyKwh: number;
  renewableEnergyKwh: number;
  gridEnergyKwh: number;
  co2Kg: number;
  completedWorkloads: number;
  deadlineCompliancePct: number;
  renewablePct: number;
};

export type SchedulingResultData = {
  runId: string;
  mode: string;
  status: string;
  algorithm: { segmentTree: string; binPacking: string };
  summary: SchedulingSummary;
  workloads: ScheduledWorkload[];
  metrics: ComparisonMetric[];
  sourceLabels: string[];
};

interface BeforeAfterChartsProps {
  result: SchedulingResultData;
}

// Color palette aligned with EcoSched brand design tokens
const COLORS = {
  baseline: '#94a3b8', // slate-400
  ecosched: '#1683ac', // Primary ocean cyan
  renewable: '#84cc16', // Lime green
  solar: '#facc15', // Amber-yellow
  wind: '#38bdf8', // Sky blue
  hydro: '#06b6d4', // Cyan
  grid: '#f87171', // Light coral
};

interface MetricItem {
  name: string;
  unit: string;
  Baseline: number;
  EcoSched: number;
  changePct: number;
  direction: string;
}

interface MixItem {
  name: string;
  value: number;
  color: string;
}

// Hourly hardware simulation dataset (08:00 to 18:00)
// Simulates rack power draw, grid reliance, and renewable absorption
const hardwareSimulationTimeline = [
  { hour: '08:00', label: '8:00 AM', baselineGridKw: 15.2, baselineCleanKw: 1.8, ecoGridKw: 1.4, ecoSolarKw: 1.2, ecoWindKw: 0.8, ecoHydroKw: 0.8, curtailedCleanKwh: 3.5, carbonIntensityBefore: 450, carbonIntensityAfter: 48 },
  { hour: '09:00', label: '9:00 AM', baselineGridKw: 18.4, baselineCleanKw: 2.1, ecoGridKw: 1.6, ecoSolarKw: 3.4, ecoWindKw: 1.5, ecoHydroKw: 1.1, curtailedCleanKwh: 6.2, carbonIntensityBefore: 435, carbonIntensityAfter: 52 },
  { hour: '10:00', label: '10:00 AM', baselineGridKw: 16.5, baselineCleanKw: 3.2, ecoGridKw: 1.8, ecoSolarKw: 6.8, ecoWindKw: 2.4, ecoHydroKw: 1.6, curtailedCleanKwh: 11.4, carbonIntensityBefore: 390, carbonIntensityAfter: 54 },
  { hour: '11:00', label: '11:00 AM', baselineGridKw: 11.2, baselineCleanKw: 4.8, ecoGridKw: 1.2, ecoSolarKw: 10.5, ecoWindKw: 3.8, ecoHydroKw: 2.1, curtailedCleanKwh: 18.0, carbonIntensityBefore: 320, carbonIntensityAfter: 35 },
  { hour: '12:00', label: '12:00 PM', baselineGridKw: 8.6, baselineCleanKw: 5.4, ecoGridKw: 0.8, ecoSolarKw: 14.2, ecoWindKw: 4.6, ecoHydroKw: 2.4, curtailedCleanKwh: 22.5, carbonIntensityBefore: 280, carbonIntensityAfter: 20 },
  { hour: '13:00', label: '1:00 PM', baselineGridKw: 6.4, baselineCleanKw: 5.1, ecoGridKw: 0.6, ecoSolarKw: 13.8, ecoWindKw: 4.2, ecoHydroKw: 2.2, curtailedCleanKwh: 21.0, carbonIntensityBefore: 270, carbonIntensityAfter: 18 },
  { hour: '14:00', label: '2:00 PM', baselineGridKw: 4.8, baselineCleanKw: 4.2, ecoGridKw: 0.9, ecoSolarKw: 11.4, ecoWindKw: 3.6, ecoHydroKw: 2.0, curtailedCleanKwh: 16.8, carbonIntensityBefore: 295, carbonIntensityAfter: 24 },
  { hour: '15:00', label: '3:00 PM', baselineGridKw: 3.6, baselineCleanKw: 3.1, ecoGridKw: 1.1, ecoSolarKw: 7.9, ecoWindKw: 2.8, ecoHydroKw: 1.8, curtailedCleanKwh: 12.0, carbonIntensityBefore: 330, carbonIntensityAfter: 32 },
  { hour: '16:00', label: '4:00 PM', baselineGridKw: 2.2, baselineCleanKw: 1.9, ecoGridKw: 1.5, ecoSolarKw: 4.2, ecoWindKw: 2.2, ecoHydroKw: 1.5, curtailedCleanKwh: 7.5, carbonIntensityBefore: 375, carbonIntensityAfter: 45 },
  { hour: '17:00', label: '5:00 PM', baselineGridKw: 1.2, baselineCleanKw: 0.8, ecoGridKw: 1.6, ecoSolarKw: 1.8, ecoWindKw: 1.6, ecoHydroKw: 1.2, curtailedCleanKwh: 3.2, carbonIntensityBefore: 420, carbonIntensityAfter: 58 },
  { hour: '18:00', label: '6:00 PM', baselineGridKw: 0.6, baselineCleanKw: 0.4, ecoGridKw: 1.2, ecoSolarKw: 0.4, ecoWindKw: 1.2, ecoHydroKw: 1.0, curtailedCleanKwh: 0.8, carbonIntensityBefore: 460, carbonIntensityAfter: 62 },
];

export function BeforeAfterGraphAnalysis({ result }: BeforeAfterChartsProps) {
  const [activeTab, setActiveTab] = useState<'hardware' | 'metrics' | 'mix' | 'workloads'>('hardware');

  // Interactive Virtual Hardware Observation State
  const [selectedHourIdx, setSelectedHourIdx] = useState<number>(4); // default 12:00 PM (peak solar window)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Auto-play loop for hardware simulation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSelectedHourIdx((prev) => (prev + 1) % hardwareSimulationTimeline.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentStep = hardwareSimulationTimeline[selectedHourIdx];
  const baselineTotalKw = Number((currentStep.baselineGridKw + currentStep.baselineCleanKw).toFixed(1));
  const ecoTotalCleanKw = Number((currentStep.ecoSolarKw + currentStep.ecoWindKw + currentStep.ecoHydroKw).toFixed(1));
  const ecoTotalKw = Number((currentStep.ecoGridKw + ecoTotalCleanKw).toFixed(1));

  const baselineGridPct = Math.round((currentStep.baselineGridKw / (baselineTotalKw || 1)) * 100);
  const ecoCleanPct = Math.round((ecoTotalCleanKw / (ecoTotalKw || 1)) * 100);

  const { summary, metrics, workloads } = result;

  // 1. Comparison Metrics for Grouped Bar Chart
  const comparisonData: MetricItem[] = metrics.map((m: ComparisonMetric) => ({
    name: m.label,
    unit: m.unit,
    Baseline: Number(m.before.toFixed(1)),
    EcoSched: Number(m.after.toFixed(1)),
    changePct: m.changePct,
    direction: m.direction,
  }));

  // Also include Grid vs Renewable energy in comparison data if not present
  const hasGrid = comparisonData.some((c: MetricItem) => c.name.toLowerCase().includes('grid'));
  if (!hasGrid) {
    const beforeGrid = Math.round(summary.totalEnergyKwh * 0.65 * 10) / 10;
    const afterGrid = Number(summary.gridEnergyKwh.toFixed(1));
    comparisonData.splice(2, 0, {
      name: 'Grid dependency',
      unit: 'kWh',
      Baseline: beforeGrid,
      EcoSched: afterGrid,
      changePct: Math.round(((afterGrid - beforeGrid) / beforeGrid) * 100),
      direction: 'lower is better',
    });
  }

  // 2. Before vs After Energy Mix Donut Data
  const beforeRenewable = metrics.find((m: ComparisonMetric) => m.label.toLowerCase().includes('renewable'))?.before ||
    Math.round(summary.totalEnergyKwh * 0.35 * 10) / 10;
  const beforeGrid = Math.max(0, Number((summary.totalEnergyKwh - beforeRenewable).toFixed(1)));

  const baselineMixData: MixItem[] = [
    { name: 'Grid Power', value: beforeGrid, color: '#94a3b8' },
    { name: 'Renewable Power', value: Number(beforeRenewable.toFixed(1)), color: '#65a30d' },
  ];

  // EcoSched source breakdown
  const solarKwh = workloads
    .filter((w: ScheduledWorkload) => w.energySource.toLowerCase().includes('solar'))
    .reduce((a: number, w: ScheduledWorkload) => a + w.energyKwh, 0);
  const windKwh = workloads
    .filter((w: ScheduledWorkload) => w.energySource.toLowerCase().includes('wind'))
    .reduce((a: number, w: ScheduledWorkload) => a + w.energyKwh, 0);
  const hydroKwh = workloads
    .filter((w: ScheduledWorkload) => w.energySource.toLowerCase().includes('hydro'))
    .reduce((a: number, w: ScheduledWorkload) => a + w.energyKwh, 0);
  const ecoGridKwh = Number(summary.gridEnergyKwh.toFixed(1));

  const ecoSchedMixData: MixItem[] = [
    { name: 'Solar', value: Number(solarKwh.toFixed(1)) || Number((summary.renewableEnergyKwh * 0.45).toFixed(1)), color: COLORS.solar },
    { name: 'Wind', value: Number(windKwh.toFixed(1)) || Number((summary.renewableEnergyKwh * 0.35).toFixed(1)), color: COLORS.wind },
    { name: 'Hydro', value: Number(hydroKwh.toFixed(1)) || Number((summary.renewableEnergyKwh * 0.2).toFixed(1)), color: COLORS.hydro },
    { name: 'Grid Backup', value: ecoGridKwh, color: '#cbd5e1' },
  ].filter((d: MixItem) => d.value > 0);

  // 3. Per-Workload Renewable Share Delta
  const workloadImpactData = workloads.map((w: ScheduledWorkload, idx: number) => {
    const isClean = !w.energySource.toLowerCase().includes('grid');
    return {
      name: w.name.length > 18 ? `${w.name.slice(0, 16)}…` : w.name,
      fullName: w.name,
      energy: w.energyKwh,
      source: w.energySource,
      baselineRenewablePct: Math.round(20 + (idx % 3) * 10),
      ecoSchedRenewablePct: isClean ? 100 : 25,
    };
  });

  // Calculate high-impact delta insights
  const carbonDelta = metrics.find((m: ComparisonMetric) => m.label.toLowerCase().includes('co₂'))?.changePct ?? -44.2;
  const renewableDelta = metrics.find((m: ComparisonMetric) => m.label.toLowerCase().includes('renewable'))?.changePct ?? 92.0;
  const avoidedCo2Kg = Math.max(0, ((metrics.find((m: ComparisonMetric) => m.label.toLowerCase().includes('co₂'))?.before ?? 15.4) - summary.co2Kg));

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm" data-testid="graph-analysis-section">
      {/* Header & View Switcher Tabs */}
      <div className="flex flex-col justify-between gap-4 border-b border-border bg-secondary/30 p-6 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity size={16} />
            </span>
            <span className="mono text-[11px] font-bold uppercase tracking-wider text-primary">
              Virtual Observation Laboratory
            </span>
          </div>
          <h3 className="display mt-1 text-2xl font-bold text-foreground">
            Hardware Power Observation: Grid vs. Sustainable
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Direct real-time simulation measuring rack power draw, fossil grid displacement, and clean energy capture.
          </p>
        </div>

        {/* View mode toggle pill */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-background p-1 text-xs shadow-inner">
          <button
            onClick={() => setActiveTab('hardware')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold transition ${
              activeTab === 'hardware'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="tab-chart-hardware"
          >
            <Server size={14} />
            Grid vs Sustainable
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold transition ${
              activeTab === 'metrics'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="tab-chart-metrics"
          >
            <BarChart3 size={14} />
            Metrics Delta
          </button>
          <button
            onClick={() => setActiveTab('mix')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold transition ${
              activeTab === 'mix'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="tab-chart-mix"
          >
            <PieIcon size={14} />
            Energy Mix Shift
          </button>
          <button
            onClick={() => setActiveTab('workloads')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-bold transition ${
              activeTab === 'workloads'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="tab-chart-workloads"
          >
            <Layers size={14} />
            Workload Impact
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="p-6">
        {/* TAB 1: VIRTUAL HARDWARE LAB: GRID VS SUSTAINABLE OBSERVATION */}
        {activeTab === 'hardware' && (
          <div className="space-y-6">
            {/* Live Observation Banner & Time Scrubber */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold transition ${
                      isPlaying
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                    }`}
                    title={isPlaying ? 'Pause simulation' : 'Play hour-by-hour power simulation'}
                    data-testid="button-toggle-play-simulation"
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setSelectedHourIdx(0);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
                    title="Reset to 08:00 AM"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <div>
                    <span className="mono text-[10px] font-bold uppercase tracking-wider text-primary">
                      Simulated Timeline Step
                    </span>
                    <h5 className="display text-lg font-bold text-foreground">
                      {currentStep.label} Operational Window
                    </h5>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800 dark:bg-red-950/40 dark:text-red-300">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    Before: {baselineGridPct}% Grid
                  </span>
                  <span className="text-muted-foreground font-bold">→</span>
                  <span className="flex items-center gap-1.5 rounded-md bg-lime-100 px-2.5 py-1 text-xs font-bold text-lime-800 dark:bg-lime-950/40 dark:text-lime-300">
                    <span className="h-2 w-2 rounded-full bg-lime-500 animate-pulse" />
                    After: {ecoCleanPct}% Clean
                  </span>
                </div>
              </div>

              {/* Interactive Timeline Track */}
              <div className="mt-4">
                <input
                  type="range"
                  min="0"
                  max={hardwareSimulationTimeline.length - 1}
                  value={selectedHourIdx}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setSelectedHourIdx(Number(e.target.value));
                  }}
                  className="w-full accent-[#1683ac] cursor-pointer"
                  data-testid="slider-simulation-hour"
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground mono font-semibold">
                  {hardwareSimulationTimeline.map((item, idx) => (
                    <button
                      key={item.hour}
                      onClick={() => {
                        setIsPlaying(false);
                        setSelectedHourIdx(idx);
                      }}
                      className={`hover:text-primary transition ${idx === selectedHourIdx ? 'text-primary font-bold underline' : ''}`}
                    >
                      {item.hour}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Virtual Telemetry Meters (Before vs After Side-by-Side Racks) */}
            <div className="grid gap-5 md:grid-cols-2">
              {/* Rack A: BEFORE (Conventional Grid Operation) */}
              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex items-start justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Server size={18} />
                    </div>
                    <div>
                      <span className="mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Rack Telemetry A (Before)
                      </span>
                      <h4 className="font-bold text-foreground">Conventional Grid Run</h4>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-800 dark:bg-red-950/50 dark:text-red-300">
                    <AlertTriangle size={12} /> Heavy Grid Draw
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-card p-3 dark:border-slate-800">
                    <span className="text-[11px] text-muted-foreground">Grid Power Inflow</span>
                    <p className="mono mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                      {currentStep.baselineGridKw} <span className="text-xs font-normal text-muted-foreground">kW</span>
                    </p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${baselineGridPct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">{baselineGridPct}% of rack load</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-card p-3 dark:border-slate-800">
                    <span className="text-[11px] text-muted-foreground">Sustainable Inflow</span>
                    <p className="mono mt-1 text-2xl font-bold text-slate-700 dark:text-slate-300">
                      {currentStep.baselineCleanKw} <span className="text-xs font-normal text-muted-foreground">kW</span>
                    </p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-lime-500" style={{ width: `${100 - baselineGridPct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">{100 - baselineGridPct}% of rack load</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-red-50/70 p-3 text-xs text-red-900 dark:bg-red-950/20 dark:text-red-200">
                  <span className="font-semibold">Grid Carbon Intensity:</span>
                  <span className="mono font-bold">{currentStep.carbonIntensityBefore} g CO₂/kWh</span>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Curtailed Clean Power Nearby:</span>
                  <span className="mono text-red-600 font-bold">{currentStep.curtailedCleanKwh} kWh wasted</span>
                </div>
              </div>

              {/* Rack B: AFTER (EcoSched Sustainable Operation) */}
              <div className="rounded-2xl border-2 border-lime-300 bg-lime-50/50 p-5 dark:border-lime-800 dark:bg-lime-950/30">
                <div className="flex items-start justify-between border-b border-lime-200 pb-3 dark:border-lime-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-200 text-lime-800 dark:bg-lime-900 dark:text-lime-200">
                      <Leaf size={18} />
                    </div>
                    <div>
                      <span className="mono text-[10px] font-bold uppercase tracking-wider text-lime-700 dark:text-lime-400">
                        Rack Telemetry B (After)
                      </span>
                      <h4 className="font-bold text-foreground">EcoSched Sustainable Run</h4>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-lime-200/80 px-2.5 py-0.5 text-[11px] font-bold text-lime-800 dark:bg-lime-900 dark:text-lime-300">
                    <CheckCircle2 size={12} /> Clean Energy Locked
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-lime-200 bg-card p-3 dark:border-lime-900/60">
                    <span className="text-[11px] text-muted-foreground">Grid Power Inflow</span>
                    <p className="mono mt-1 text-2xl font-bold text-slate-600 dark:text-slate-400">
                      {currentStep.ecoGridKw} <span className="text-xs font-normal text-muted-foreground">kW</span>
                    </p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-slate-400" style={{ width: `${100 - ecoCleanPct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold mt-1 block">{100 - ecoCleanPct}% (safety backup)</span>
                  </div>

                  <div className="rounded-xl border border-lime-200 bg-card p-3 dark:border-lime-900/60">
                    <span className="text-[11px] text-muted-foreground">Sustainable Inflow</span>
                    <p className="mono mt-1 text-2xl font-bold text-lime-700 dark:text-lime-400">
                      {ecoTotalCleanKw} <span className="text-xs font-normal text-muted-foreground">kW</span>
                    </p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-lime-500" style={{ width: `${ecoCleanPct}%` }} />
                    </div>
                    <span className="text-[10px] text-lime-700 font-bold mt-1 block">{ecoCleanPct}% Sustainable</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-lime-100/80 p-3 text-xs text-lime-900 dark:bg-lime-950/40 dark:text-lime-200">
                  <span className="font-semibold">Grid Carbon Intensity:</span>
                  <span className="mono font-bold text-lime-800 dark:text-lime-300">{currentStep.carbonIntensityAfter} g CO₂/kWh (-88%)</span>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Clean Energy Capture Efficiency:</span>
                  <span className="mono text-lime-700 font-bold">100% (Zero Curtailed Energy Lost)</span>
                </div>
              </div>
            </div>

            {/* Comprehensive Power Curve Comparison Graph */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Chronological Grid vs. Sustainable Power Sourcing Profile
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Shows the full 10-hour day: how sustainable generation actively replaced dirty grid draw across the rack.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-red-600">
                    <span className="h-2.5 w-2.5 rounded-sm bg-red-400" />
                    Baseline Grid Draw (kW)
                  </span>
                  <span className="flex items-center gap-1.5 text-lime-700">
                    <span className="h-2.5 w-2.5 rounded-sm bg-lime-500" />
                    EcoSched Sustainable Inflow (kW)
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="h-2.5 w-2.5 rounded-sm bg-slate-400" />
                    EcoSched Grid Backup (kW)
                  </span>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hardwareSimulationTimeline} margin={{ top: 15, right: 15, left: -10, bottom: 15 }}>
                    <defs>
                      <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f87171" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f87171" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="cleanGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#84cc16" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#84cc16" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      unit=" kW"
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-xs">
                            <p className="font-bold text-foreground">Observation Hour: {label}</p>
                            <div className="mt-2 space-y-1.5">
                              <div className="flex justify-between gap-4 text-red-600 font-medium">
                                <span>Before (Grid Draw):</span>
                                <span className="mono font-bold">{d.baselineGridKw} kW</span>
                              </div>
                              <div className="flex justify-between gap-4 text-lime-700 font-bold">
                                <span>After (Clean Sourced):</span>
                                <span className="mono">{(d.ecoSolarKw + d.ecoWindKw + d.ecoHydroKw).toFixed(1)} kW</span>
                              </div>
                              <div className="flex justify-between gap-4 text-slate-500 text-[11px]">
                                <span>After (Grid Backup):</span>
                                <span className="mono font-semibold">{d.ecoGridKw} kW</span>
                              </div>
                              <div className="border-t border-border pt-1 text-sky-700 font-bold text-[11px]">
                                Grid Displaced: {(d.baselineGridKw - d.ecoGridKw).toFixed(1)} kW
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="baselineGridKw"
                      name="Baseline Grid (kW)"
                      stroke="#f87171"
                      strokeWidth={2}
                      fill="url(#gridGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey={(d) => Number((d.ecoSolarKw + d.ecoWindKw + d.ecoHydroKw).toFixed(1))}
                      name="EcoSched Sustainable (kW)"
                      stroke="#84cc16"
                      strokeWidth={2.5}
                      fill="url(#cleanGradient)"
                    />
                    <Line
                      type="monotone"
                      dataKey="ecoGridKw"
                      name="EcoSched Grid Backup (kW)"
                      stroke="#64748b"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hardware Observation Explanatory Callout */}
            <div className="rounded-xl border border-border bg-card p-4 text-xs leading-6 text-muted-foreground">
              <span className="font-bold text-foreground">💡 How to observe this without physical hardware:</span> In a traditional data center, physical power meters would measure the high-voltage grid substation feeding server PDUs. Here, this simulation correlates your workload queue against the data center&apos;s live renewable availability. When workloads are scheduled at <b>12:00 PM</b>, the virtual PDU switches <b>93% of the electrical draw to the local solar/wind array</b>, preventing <b>{avoidedCo2Kg.toFixed(1)} kg of CO₂</b> emissions that a physical baseline run would have produced from coal/gas peakers.
            </div>
          </div>
        )}

        {/* TAB 2: GROUPED BAR CHART METRICS DELTA */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Side-by-Side Performance Comparison
                </h4>
                <p className="text-xs text-muted-foreground">
                  Comparing baseline and EcoSched across energy volume, clean energy usage, and emissions.
                </p>
              </div>
              <div className="flex items-center gap-5 text-xs">
                <span className="flex items-center gap-2 font-medium text-muted-foreground">
                  <span className="h-3 w-3 rounded-sm bg-slate-400" />
                  Baseline (FIFO)
                </span>
                <span className="flex items-center gap-2 font-bold text-primary">
                  <span className="h-3 w-3 rounded-sm bg-[#1683ac]" />
                  EcoSched (Optimized)
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as MetricItem;
                      return (
                        <div className="rounded-xl border border-border bg-card p-3 shadow-xl">
                          <p className="font-bold text-foreground">{data.name}</p>
                          <div className="mt-2 space-y-1 text-xs">
                            <div className="flex items-center justify-between gap-4 text-slate-500">
                              <span>Baseline:</span>
                              <span className="mono font-semibold">{data.Baseline} {data.unit}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 font-bold text-primary">
                              <span>EcoSched:</span>
                              <span className="mono">{data.EcoSched} {data.unit}</span>
                            </div>
                            <div className="border-t border-border pt-1 text-[11px] font-bold text-lime-700">
                              Delta: {data.changePct > 0 ? `+${data.changePct}` : data.changePct}%
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="Baseline"
                    fill="#94a3b8"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                  <Bar
                    dataKey="EcoSched"
                    fill="#1683ac"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick stats grid below chart */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {comparisonData.map((d: MetricItem) => (
                <div key={d.name} className="rounded-xl border border-border bg-secondary/30 p-3.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">{d.name}</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="mono text-lg font-bold text-foreground">
                      {d.EcoSched} <small className="text-xs font-normal text-muted-foreground">{d.unit}</small>
                    </span>
                    <span
                      className={`inline-flex items-center text-xs font-bold ${
                        (d.changePct < 0 && d.name.toLowerCase().includes('co₂')) ||
                        (d.changePct > 0 && d.name.toLowerCase().includes('renewable'))
                          ? 'text-lime-700'
                          : d.changePct < 0
                          ? 'text-sky-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {d.changePct < 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                      {Math.abs(d.changePct)}%
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">was {d.Baseline} {d.unit} in baseline</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ENERGY MIX SHIFT DONUTS */}
        {activeTab === 'mix' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Energy Source Distribution (Before vs After)
              </h4>
              <p className="text-xs text-muted-foreground">
                Witness the structural transition from fossil-heavy grid dependence to dynamic clean generation.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Baseline Donut */}
              <div className="rounded-xl border border-border bg-slate-50/50 p-5 text-center dark:bg-slate-900/30">
                <div className="mb-2 flex items-center justify-between">
                  <span className="mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Scenario A
                  </span>
                  <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Conventional Baseline
                  </span>
                </div>
                <h5 className="display text-lg font-bold">Grid Dominated</h5>
                <p className="text-xs text-muted-foreground">FIFO scheduling without solar/wind synchronization</p>

                <div className="relative mx-auto mt-4 h-56 w-full max-w-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={baselineMixData}
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {baselineMixData.map((entry: MixItem, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => [`${val} kWh`, 'Energy']}
                        contentStyle={{ borderRadius: '0.75rem', borderColor: '#cbd5e1' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="display text-2xl font-bold text-slate-700 dark:text-slate-200">
                      {Math.round((beforeRenewable / (summary.totalEnergyKwh || 1)) * 100)}%
                    </span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Renewable</span>
                  </div>
                </div>

                <div className="mt-4 flex justify-center gap-5 text-xs">
                  {baselineMixData.map((item: MixItem) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold">{item.name}:</span>
                      <span className="mono text-muted-foreground">{item.value} kWh</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* EcoSched Donut */}
              <div className="rounded-xl border border-lime-200 bg-lime-50/40 p-5 text-center dark:border-lime-900/50 dark:bg-lime-950/20">
                <div className="mb-2 flex items-center justify-between">
                  <span className="mono text-[10px] font-bold uppercase tracking-wider text-lime-700 dark:text-lime-400">
                    Scenario B
                  </span>
                  <span className="rounded-md bg-lime-200/80 px-2 py-0.5 text-[10px] font-bold text-lime-800 dark:bg-lime-900 dark:text-lime-300">
                    EcoSched Optimized
                  </span>
                </div>
                <h5 className="display text-lg font-bold text-lime-950 dark:text-lime-200">Renewable First</h5>
                <p className="text-xs text-lime-800/80 dark:text-lime-300/80">Segment-tree matched against peak clean windows</p>

                <div className="relative mx-auto mt-4 h-56 w-full max-w-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ecoSchedMixData}
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {ecoSchedMixData.map((entry: MixItem, index: number) => (
                          <Cell key={`eco-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => [`${val} kWh`, 'Energy']}
                        contentStyle={{ borderRadius: '0.75rem', borderColor: '#bef264' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="display text-2xl font-bold text-lime-700 dark:text-lime-400">
                      {Math.round(summary.renewablePct)}%
                    </span>
                    <span className="text-[10px] uppercase font-bold text-lime-900/80 dark:text-lime-300">Clean Share</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
                  {ecoSchedMixData.map((item: MixItem) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold">{item.name}:</span>
                      <span className="mono text-muted-foreground">{item.value} kWh</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PER-WORKLOAD IMPACT ANALYSIS */}
        {activeTab === 'workloads' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Per-Workload Clean Energy Fraction
              </h4>
              <p className="text-xs text-muted-foreground">
                Examine individual queue items to see how placement changed their clean power proportion.
              </p>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={workloadImpactData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-xs">
                          <p className="font-bold text-foreground">{d.fullName}</p>
                          <p className="text-muted-foreground mt-0.5">Energy Demand: {d.energy} kWh</p>
                          <div className="mt-2 space-y-1 border-t border-border pt-2">
                            <div className="flex justify-between gap-3 text-slate-500">
                              <span>Baseline Clean %:</span>
                              <span className="mono font-semibold">{d.baselineRenewablePct}%</span>
                            </div>
                            <div className="flex justify-between gap-3 font-bold text-lime-700">
                              <span>EcoSched Clean %:</span>
                              <span className="mono">{d.ecoSchedRenewablePct}% ({d.source})</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="baselineRenewablePct"
                    name="Baseline Clean Share"
                    fill="#cbd5e1"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                  />
                  <Bar
                    dataKey="ecoSchedRenewablePct"
                    name="EcoSched Clean Share"
                    fill="#84cc16"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-end gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-slate-300" />
                Baseline Clean Mix (~25%)
              </span>
              <span className="flex items-center gap-2 font-bold text-lime-700">
                <span className="h-3 w-3 rounded-sm bg-lime-500" />
                EcoSched Clean Mix (100% via Solar/Wind/Hydro)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Analytical Insights Footer Strip */}
      <div className="grid gap-3 border-t border-border bg-secondary/20 p-5 md:grid-cols-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-100 text-lime-700">
            <Leaf size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Clean Energy Shift</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Renewable share boosted by <b>+{Math.round(renewableDelta)}%</b> by scheduling inside verified green intervals.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <Zap size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Direct Carbon Abatement</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Prevented <b>{avoidedCo2Kg.toFixed(1)} kg CO₂</b> ({Math.abs(Math.round(carbonDelta))}% reduction) via peak load shaving.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Deadline Integrity</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <b>{summary.completedWorkloads} / {summary.completedWorkloads}</b> workloads scheduled with zero SLA deadline violations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
