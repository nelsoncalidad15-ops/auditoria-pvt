import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  History,
  LayoutDashboard,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AUDITORS } from "../../constants";
import { AuditPersonScore, AuditSession, Location } from "../../types";
import { Button } from "../ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

interface DraftItem {
  id: string;
  date: string;
  auditorId?: string;
  location?: Location;
  staffName?: string;
  role?: string;
  items: AuditSession["items"];
  orderNumber?: string;
}

interface MonthlyDashboardItem {
  monthKey: string;
  label: string;
  totalAudits: number;
  averageScore: number;
  approvedCount: number;
  complianceRate: number;
  Salta: number;
  Jujuy: number;
}

interface RoleDashboardItem {
  role: string;
  averageScore: number;
  evaluations: number;
  fill: string;
}

interface StaffDashboardItem {
  key: string;
  role: string;
  staffName: string;
  count: number;
  location: Location;
  averageScore: number;
}

interface RankingPanel {
  id: string;
  label: string;
  data: AuditPersonScore[];
}

interface DashboardAlert {
  label: string;
  value: string;
  detail: string;
  tone: "success" | "warning" | "danger";
}

interface DashboardViewProps {
  userAuthenticated: boolean;
  authenticationEnabled?: boolean;
  isDashboardUnlocked: boolean;
  onUnlockDashboard: () => void;
  onBackToCover: () => void;
  onLogin: () => void;
  onStartNewAudit: () => void;
  onOpenHistory: () => void;
  onResumeDraft: (draftId: string) => void;
  onRemoveDraft: (draftId: string) => void;
  sortedDraftAudits: DraftItem[];
  configuredCategoryCount: number;
  sourceLabel: string;
  dashboardDateLabel: string;
  currentMonthDashboard: {
    totalAudits: number;
    averageScore: number;
    approvedCount: number;
    Salta: number;
    Jujuy: number;
  };
  currentMonthUniqueRoles: number;
  currentMonthUniqueStaff: number;
  monthlyCriticalAudits: number;
  dashboardAlerts: ReadonlyArray<DashboardAlert>;
  recentMonthlyDashboardData: MonthlyDashboardItem[];
  currentMonthRoleDistributionData: Array<{ name: string; value: number; fill: string }>;
  currentMonthRoleData: RoleDashboardItem[];
  currentMonthStaffData: StaffDashboardItem[];
  rankingPanels: RankingPanel[];
}

export function DashboardView({
  userAuthenticated,
  authenticationEnabled = true,
  isDashboardUnlocked,
  onUnlockDashboard,
  onBackToCover,
  onLogin,
  onStartNewAudit,
  onOpenHistory,
  onResumeDraft,
  onRemoveDraft,
  sortedDraftAudits,
  configuredCategoryCount,
  sourceLabel,
  dashboardDateLabel,
  currentMonthDashboard,
  currentMonthUniqueRoles,
  currentMonthUniqueStaff,
  monthlyCriticalAudits,
  dashboardAlerts,
  recentMonthlyDashboardData,
  currentMonthRoleDistributionData,
  currentMonthRoleData,
  currentMonthStaffData,
  rankingPanels,
}: DashboardViewProps) {
  if (!isDashboardUnlocked) {
    return (
      <section className="relative overflow-hidden rounded-[2.8rem] border border-slate-200/60 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.14),_transparent_32%),linear-gradient(135deg,_#06101d_0%,_#0d213b_52%,_#133961_100%)] px-6 py-8 text-white shadow-[0_34px_84px_rgba(12,35,64,0.26)] lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,31,0.88)_0%,rgba(7,17,31,0.58)_36%,rgba(7,17,31,0.76)_100%)]" />
          <img src="/hero-auto-corporativo.svg" alt="" className="absolute right-[-14%] top-1/2 w-[980px] max-w-none -translate-y-1/2 opacity-50 saturate-[1.05]" />
        </div>
        <div className="flex min-h-[58vh] items-center justify-center">
          <div className="relative z-10 w-full max-w-[580px] rounded-[2.4rem] border border-white/12 bg-white/10 px-6 py-8 text-center shadow-[0_28px_70px_rgba(7,17,31,0.24)] backdrop-blur-xl lg:px-8 lg:py-10">
            <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-[1.7rem] bg-white text-slate-950 shadow-[0_16px_36px_rgba(2,6,23,0.22)]">
              <LayoutDashboard className="h-7 w-7" />
            </div>
            <div className="mt-6 space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">
                <CalendarIcon className="h-3.5 w-3.5" />
                {dashboardDateLabel}
              </span>
              <h2 className="text-3xl font-black leading-none tracking-[-0.05em] text-white md:text-[3.6rem]">Auditoría PVT</h2>
              <p className="mx-auto max-w-md text-sm font-medium leading-relaxed text-slate-300 md:text-base">
                Sistema corporativo de auditoría, trazabilidad y control operativo. Ingresá para ver indicadores, actividad y seguimiento.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={onUnlockDashboard} size="lg" className="bg-white text-slate-950 shadow-none hover:bg-slate-100">
                <LayoutDashboard className="h-4 w-4" />
                Ingresar
              </Button>
              {!userAuthenticated && authenticationEnabled && (
                <Button variant="ghost" size="lg" onClick={onLogin} className="border border-white/15 text-slate-200 hover:bg-white/10 hover:text-white">
                  <User className="h-4 w-4" />
                  Iniciar sesión
                </Button>
              )}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-left">
              <div className="rounded-[1.3rem] border border-white/10 bg-black/10 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Estado</p><p className="mt-2 text-sm font-black text-white">{authenticationEnabled ? (userAuthenticated ? "Sesión activa" : "Acceso seguro") : "Modo operativo"}</p></div>
              <div className="rounded-[1.3rem] border border-white/10 bg-black/10 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Cobertura</p><p className="mt-2 text-sm font-black text-white">{configuredCategoryCount} áreas</p></div>
              <div className="rounded-[1.3rem] border border-white/10 bg-black/10 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Fuente</p><p className="mt-2 text-sm font-black text-white">{sourceLabel}</p></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-[2.8rem] border border-slate-200/60 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.16),_transparent_34%),linear-gradient(135deg,_#07111f_0%,_#0d213b_56%,_#12345d_100%)] px-6 py-6 text-white shadow-[0_32px_86px_rgba(12,35,64,0.22)] lg:px-8 lg:py-8">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-200 backdrop-blur"><div className="h-2 w-2 rounded-full bg-emerald-400" />Panel</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300"><CalendarIcon className="h-3.5 w-3.5" />{dashboardDateLabel}</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300"><Clock className="h-3.5 w-3.5" />Fuente {sourceLabel}</span>
          </div>
          <div className="space-y-3">
            <h2 className="max-w-4xl text-3xl font-black leading-[1.02] tracking-[-0.04em] text-white md:text-[3.1rem]">Dashboard mensual</h2>
            <p className="max-w-2xl text-sm font-medium text-slate-300 md:text-base">Seguimiento de auditorías por mes, por sede y por cumplimiento.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Evaluaciones</p><p className="mt-2 text-3xl font-black text-white">{currentMonthDashboard.totalAudits}</p></div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Áreas</p><p className="mt-2 text-3xl font-black text-white">{currentMonthUniqueRoles}</p></div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Colaboradores</p><p className="mt-2 text-3xl font-black text-white">{currentMonthUniqueStaff}</p></div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Promedio</p><p className="mt-2 text-lg font-black text-white">{currentMonthDashboard.totalAudits > 0 ? `${currentMonthDashboard.averageScore}%` : "Sin datos"}</p></div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" size="lg" onClick={onBackToCover} className="text-slate-200 hover:bg-white/10 hover:text-white"><ArrowLeft className="h-4 w-4" />Volver a portada</Button>
            <Button onClick={onStartNewAudit} size="lg" className="bg-white text-slate-950 shadow-none hover:bg-slate-100"><Plus className="h-4 w-4" />Iniciar auditoría</Button>
            <Button variant="secondary" size="lg" onClick={() => sortedDraftAudits[0] ? onResumeDraft(sortedDraftAudits[0].id) : onStartNewAudit()} className="border-white/15 bg-white/10 text-white hover:border-white/25 hover:bg-white/15"><History className="h-4 w-4" />Continuar auditoría</Button>
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h3 className="text-lg font-black text-slate-950">Continuar auditoría</h3><Button variant="ghost" size="sm" onClick={onOpenHistory}>Historial</Button></div>
        {sortedDraftAudits.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{sortedDraftAudits.map((draft) => { const draftAuditor = AUDITORS.find((auditor) => auditor.id === draft.auditorId)?.name || "Sin auditor"; const answeredCount = draft.items.filter((item) => item.status && item.status !== "na").length; return (<div key={draft.id} className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{draft.role || "Configuración"}</p><p className="mt-2 truncate text-sm font-black text-slate-950">{draft.staffName || draftAuditor}</p><p className="mt-1 text-xs font-bold text-slate-500">{draft.location || "Sin sucursal"} · {draft.date}</p></div><button onClick={() => onRemoveDraft(draft.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900"><Trash2 className="h-4 w-4" /></button></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-3 py-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Respondidos</p><p className="mt-1 text-sm font-black text-slate-950">{answeredCount}</p></div><div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-3 py-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Orden</p><p className="mt-1 truncate text-sm font-black text-slate-950">{draft.orderNumber || "-"}</p></div></div><div className="mt-4 flex gap-2"><Button onClick={() => onResumeDraft(draft.id)} size="sm" className="flex-1">Continuar</Button></div></div>); })}</div>
        ) : (
          <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white px-4 py-8 text-center"><p className="text-sm font-bold text-slate-500">No hay auditorías a medias.</p></div>
        )}
      </section>
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-4"><div className="kpi-card rounded-[2rem] px-5 py-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Salta</p><p className="mt-3 text-3xl font-black text-slate-950">{currentMonthDashboard.Salta}</p></div><div className="kpi-card rounded-[2rem] px-5 py-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Jujuy</p><p className="mt-3 text-3xl font-black text-slate-950">{currentMonthDashboard.Jujuy}</p></div><div className="kpi-card rounded-[2rem] px-5 py-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Aprobadas</p><p className="mt-3 text-3xl font-black text-slate-950">{currentMonthDashboard.approvedCount}</p></div><div className="kpi-card rounded-[2rem] px-5 py-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Críticas</p><p className="mt-3 text-3xl font-black text-slate-950">{monthlyCriticalAudits}</p></div></div>
        <Card className="rounded-[2.2rem]"><CardHeader className="pb-4"><CardTitle>Foco operativo</CardTitle><CardDescription>Resumen del mes por sede, área y colaborador.</CardDescription></CardHeader><CardContent className="space-y-3">{dashboardAlerts.map((alert) => (<div key={alert.label} className="rounded-[1.4rem] border border-slate-200 bg-slate-50/85 px-4 py-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{alert.label}</p><p className="mt-2 text-sm font-black text-slate-900">{alert.value}</p><p className="mt-2 text-sm font-medium text-slate-500">{alert.detail}</p></div><StatusBadge tone={alert.tone}>{alert.tone === "danger" ? "alto" : alert.tone === "warning" ? "medio" : "estable"}</StatusBadge></div></div>))}</CardContent></Card>
      </section>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_400px]">
        <Card className="rounded-[2.3rem]"><CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><CardTitle>Auditorías por mes y sede</CardTitle><CardDescription>Meta esperada: una auditoría en Salta y una en Jujuy cada mes.</CardDescription></div></CardHeader><CardContent>{recentMonthlyDashboardData.length > 0 ? (<div className="h-[320px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={recentMonthlyDashboardData} barGap={10}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12, fontWeight: 700 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12, fontWeight: 700 }} /><Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontWeight: 800 }} /><Legend /><Bar dataKey="Salta" name="Salta" radius={[10, 10, 0, 0]} fill="#14b8a6" /><Bar dataKey="Jujuy" name="Jujuy" radius={[10, 10, 0, 0]} fill="#2563eb" /></BarChart></ResponsiveContainer></div>) : (<div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center"><p className="text-sm font-bold text-slate-500">Todavía no hay auditorías suficientes para armar la vista mensual.</p></div>)}</CardContent></Card>
        <div className="space-y-6"><Card className="rounded-[2.3rem]"><CardHeader><CardTitle>Evolución mensual del cumplimiento</CardTitle><CardDescription>Promedio y tasa de aprobadas mes a mes.</CardDescription></CardHeader><CardContent>{recentMonthlyDashboardData.length > 0 ? (<div className="h-[320px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={recentMonthlyDashboardData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12, fontWeight: 700 }} /><YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 12, fontWeight: 700 }} /><Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontWeight: 800 }} /><Legend /><Line type="monotone" dataKey="averageScore" name="Promedio %" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} /><Line type="monotone" dataKey="complianceRate" name="Aprobadas %" stroke="#0f172a" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div>) : (<div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center"><p className="text-sm font-bold text-slate-500">El promedio mensual aparecerá cuando haya meses con auditorías cerradas.</p></div>)}</CardContent></Card><Card className="rounded-[2.3rem]"><CardHeader><CardTitle>Distribución por área</CardTitle><CardDescription>Cuántas evaluaciones se hicieron por área en el mes actual.</CardDescription></CardHeader><CardContent>{currentMonthRoleDistributionData.length > 0 ? (<div className="space-y-5"><div className="h-[240px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={currentMonthRoleDistributionData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={86} paddingAngle={4}>{currentMonthRoleDistributionData.map((entry) => (<Cell key={entry.name} fill={entry.fill} />))}</Pie><Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontWeight: 800 }} /><Legend /></PieChart></ResponsiveContainer></div><div className="space-y-3">{currentMonthRoleData.slice(0, 4).map((item) => (<div key={item.role} className="flex items-center justify-between rounded-[1.2rem] border border-slate-200 bg-slate-50 px-3 py-3"><div className="flex items-center gap-2 min-w-0"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} /><p className="truncate text-sm font-black text-slate-900">{item.role}</p></div><p className="text-sm font-black text-slate-900">{item.evaluations}</p></div>))}</div></div>) : (<div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center"><p className="text-sm font-bold text-slate-500">La distribución por área aparecerá cuando existan evaluaciones en el mes actual.</p></div>)}</CardContent></Card></div>
      </section>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6"><div className="flex items-center justify-between"><div><h3 className="text-xl font-black text-slate-900">Cumplimiento por área</h3><p className="mt-1 text-sm font-medium text-slate-500">Promedio del mes actual para cada área auditada.</p></div><Button variant="ghost" size="sm" onClick={onOpenHistory}>Abrir historial completo</Button></div><div className="h-[360px] w-full">{currentMonthRoleData.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><BarChart data={currentMonthRoleData} layout="vertical" margin={{ left: 24, right: 16 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" /><XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12, fontWeight: 700 }} /><YAxis dataKey="role" type="category" axisLine={false} tickLine={false} tick={{ fill: "#334155", fontSize: 12, fontWeight: 800 }} width={110} /><Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontWeight: 800 }} /><Bar dataKey="averageScore" name="Promedio %" radius={[0, 10, 10, 0]}>{currentMonthRoleData.map((entry) => (<Cell key={entry.role} fill={entry.fill} />))}</Bar></BarChart></ResponsiveContainer>) : (<div className="flex h-full items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center"><p className="max-w-xs text-sm font-medium text-slate-500">Todavía no hay áreas evaluadas en el mes actual.</p></div>)}</div></div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6"><div><h3 className="text-xl font-black text-slate-900">Colaboradores evaluados</h3><p className="mt-1 text-sm font-medium text-slate-500">Ordenados desde el puntaje más bajo del mes actual.</p></div><div className="space-y-4">{currentMonthStaffData.slice(0, 6).map((item) => (<div key={item.key} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-950">{item.staffName}</p><p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{item.role}</p><p className="mt-2 text-xs font-medium text-slate-500">{item.location} · {item.count} evaluación(es)</p></div><StatusBadge tone={item.averageScore >= 90 ? "success" : item.averageScore >= 70 ? "warning" : "danger"}>{item.averageScore}%</StatusBadge></div></div>))}{currentMonthStaffData.length === 0 && (<div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center"><p className="text-sm font-medium text-slate-500">Los colaboradores aparecerán cuando existan evaluaciones en el mes actual.</p></div>)}</div></div>
      </section>
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">{rankingPanels.map((panel) => (<Card key={panel.id} className="rounded-[2rem]"><CardHeader className="pb-3"><CardTitle>{panel.label}</CardTitle><CardDescription>Promedio acumulado por persona.</CardDescription></CardHeader><CardContent className="space-y-3">{panel.data.slice(0, 3).map((person, index) => (<div key={`${panel.id}-${person.personName}`} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-3 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">#{index + 1}</p><p className="mt-1 truncate text-sm font-black text-slate-900">{person.personName}</p><p className="mt-1 text-xs font-medium text-slate-500">{person.evaluations} muestra(s)</p></div><StatusBadge tone={person.compliance >= 90 ? "success" : person.compliance >= 70 ? "warning" : "danger"}>{person.compliance}%</StatusBadge></div></div>))}{panel.data.length === 0 && (<div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center"><p className="text-sm font-medium text-slate-500">Sin datos todavía.</p></div>)}</CardContent></Card>))}</section>
    </>
  );
}