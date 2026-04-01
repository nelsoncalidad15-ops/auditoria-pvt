import { AlertCircle, ArrowLeft, ChevronRight, ClipboardList, Clock, FileText, Save, Search, TrendingUp } from "lucide-react";
import { cn } from "../../lib/utils";
import { AuditSession } from "../../types";

type HistoryPanel = "records" | "exports";

interface HistoryViewProps {
  historyPanel: HistoryPanel;
  setHistoryPanel: (panel: HistoryPanel) => void;
  filteredHistory: AuditSession[];
  selectedHistoryAudit: AuditSession | null;
  historyAverageScore: number;
  nonCompliantAudits: number;
  latestHistoryItem: AuditSession | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onBack: () => void;
  onSelectAudit: (audit: AuditSession) => void;
  onExportCsv: () => void;
  onSyncData: () => void;
  isSyncing: boolean;
  isHistorySyncConfigured: boolean;
  isUsingExternalHistory: boolean;
  hasWebhookUrl: boolean;
  hasSheetCsvUrl: boolean;
  totalHistoryCount: number;
}

export function HistoryView({
  historyPanel,
  setHistoryPanel,
  filteredHistory,
  selectedHistoryAudit,
  historyAverageScore,
  nonCompliantAudits,
  latestHistoryItem,
  searchTerm,
  setSearchTerm,
  onBack,
  onSelectAudit,
  onExportCsv,
  onSyncData,
  isSyncing,
  isHistorySyncConfigured,
  isUsingExternalHistory,
  hasWebhookUrl,
  hasSheetCsvUrl,
  totalHistoryCount,
}: HistoryViewProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-900">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold">Historial</h2>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button onClick={() => setHistoryPanel("exports")} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-xl border border-slate-200 font-bold text-xs uppercase tracking-widest hover:border-slate-300 transition-all">
            <FileText className="w-4 h-4" />
            Exportación
          </button>
          <button onClick={onExportCsv} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-100 transition-all">
            <Save className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-[2rem] p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            onClick={() => setHistoryPanel("records")}
            className={cn(
              "rounded-[1.4rem] border px-4 py-4 text-left transition-all",
              historyPanel === "records"
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            )}
          >
            <p className="text-sm font-black">Registros</p>
            <p className={cn("mt-1 text-xs font-bold", historyPanel === "records" ? "text-slate-300" : "text-slate-500")}>Vista operativa con búsqueda y lectura inmediata.</p>
          </button>
          <button
            onClick={() => setHistoryPanel("exports")}
            className={cn(
              "rounded-[1.4rem] border px-4 py-4 text-left transition-all",
              historyPanel === "exports"
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            )}
          >
            <p className="text-sm font-black">Exportación y sync</p>
            <p className={cn("mt-1 text-xs font-bold", historyPanel === "exports" ? "text-slate-300" : "text-slate-500")}>Salida a CSV y control de fuente externa.</p>
          </button>
        </div>
      </div>

      {historyPanel === "records" && (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            {[
              { label: "Resultados", value: filteredHistory.length, detail: "auditorías visibles", icon: ClipboardList, tone: "slate" },
              { label: "Promedio", value: `${historyAverageScore}%`, detail: "cumplimiento sobre la vista", icon: TrendingUp, tone: "emerald" },
              { label: "Desvíos", value: nonCompliantAudits, detail: "registros debajo de 90%", icon: AlertCircle, tone: "amber" },
              { label: "Último cierre", value: latestHistoryItem?.date ?? "-", detail: latestHistoryItem?.location ?? "sin datos", icon: Clock, tone: "blue" },
            ].map((card) => (
              <div key={card.label} className="glass-panel rounded-[1.7rem] p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
                    <p className="mt-3 text-2xl font-black text-slate-950">{card.value}</p>
                    <p className="mt-2 text-sm font-medium text-slate-500">{card.detail}</p>
                  </div>
                  <div className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl",
                    card.tone === "slate" && "bg-slate-950 text-white",
                    card.tone === "emerald" && "bg-emerald-50 text-emerald-600",
                    card.tone === "amber" && "bg-amber-50 text-amber-600",
                    card.tone === "blue" && "bg-blue-50 text-blue-600"
                  )}>
                    <card.icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
            <div className="space-y-4">
              <div className="glass-panel rounded-[2rem] p-4 shadow-sm space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" placeholder="Buscar por asesor, OR o ubicación..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Lectura</p><p className="mt-2 text-sm font-black text-slate-900">Listado maestro</p><p className="mt-2 text-sm font-medium text-slate-500">Seleccioná un registro para abrir el detalle completo.</p></div>
                  <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Filtro</p><p className="mt-2 text-sm font-black text-slate-900">Búsqueda unificada</p><p className="mt-2 text-sm font-medium text-slate-500">Soporta asesor, categoría, ubicación y OR.</p></div>
                  <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Acción</p><p className="mt-2 text-sm font-black text-slate-900">Exportar o sincronizar</p><p className="mt-2 text-sm font-medium text-slate-500">Pasá a la segunda pestaña para salida y verificación externa.</p></div>
                </div>
              </div>

              <div className="space-y-3">
                {filteredHistory.map((item) => (
                  <button key={item.id} onClick={() => onSelectAudit(item)} className={cn("w-full rounded-[2rem] border p-5 text-left shadow-sm transition-all", selectedHistoryAudit?.id === item.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-300")}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0", selectedHistoryAudit?.id === item.id ? "bg-white/10 text-white" : item.totalScore >= 90 ? "bg-green-50 text-green-600" : item.totalScore >= 70 ? "bg-yellow-50 text-yellow-600" : "bg-red-50 text-red-600")}>{item.totalScore}%</div>
                        <div className="min-w-0">
                          <p className={cn("font-black leading-none mb-1 truncate", selectedHistoryAudit?.id === item.id ? "text-white" : "text-gray-900")}>{item.location}</p>
                          <p className={cn("text-[10px] font-black uppercase tracking-widest", selectedHistoryAudit?.id === item.id ? "text-slate-300" : "text-gray-400")}>{item.date}</p>
                          <p className={cn("mt-2 text-xs font-bold truncate", selectedHistoryAudit?.id === item.id ? "text-slate-200" : "text-gray-600")}>{item.staffName || "Sin responsable"}</p>
                        </div>
                      </div>
                      <ChevronRight className={cn("w-5 h-5 shrink-0", selectedHistoryAudit?.id === item.id ? "text-white" : "text-slate-400")} />
                    </div>
                    <div className={cn("mt-4 flex items-center justify-between border-t pt-4", selectedHistoryAudit?.id === item.id ? "border-white/10" : "border-gray-100")}>
                      <div className="flex flex-col">
                        <span className={cn("text-[10px] font-black uppercase tracking-widest leading-none mb-1", selectedHistoryAudit?.id === item.id ? "text-slate-300" : "text-gray-400")}>{item.items[0]?.category || "General"}</span>
                        {item.orderNumber && <span className={cn("text-xs font-black", selectedHistoryAudit?.id === item.id ? "text-cyan-300" : "text-blue-600")}>OR: {item.orderNumber}</span>}
                      </div>
                      <span className={cn("text-[10px] font-bold uppercase tracking-tighter", selectedHistoryAudit?.id === item.id ? "text-slate-300" : "text-gray-400")}>{item.items.length} ítems</span>
                    </div>
                  </button>
                ))}

                {filteredHistory.length === 0 && (
                  <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                    <p className="text-sm font-black text-slate-700">No hay auditorías para ese criterio.</p>
                    <p className="mt-2 text-sm font-medium text-slate-500">Probá con otro nombre, ubicación o categoría.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {selectedHistoryAudit ? (
                <div className="glass-panel rounded-[2rem] p-6 shadow-sm space-y-5 xl:sticky xl:top-28">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Detalle seleccionado</p>
                      <h3 className="mt-2 text-xl font-black text-slate-950">{selectedHistoryAudit.location}</h3>
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">{selectedHistoryAudit.role || selectedHistoryAudit.items[0]?.category} · {selectedHistoryAudit.date}</p>
                    </div>
                    <div className={cn("rounded-2xl px-4 py-3 text-lg font-black", selectedHistoryAudit.totalScore >= 90 ? "bg-green-50 text-green-600" : selectedHistoryAudit.totalScore >= 70 ? "bg-yellow-50 text-yellow-600" : "bg-red-50 text-red-600")}>{selectedHistoryAudit.totalScore}%</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {selectedHistoryAudit.role !== "Pre Entrega" && <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Personal</p><p className="mt-2 text-sm font-black text-slate-900">{selectedHistoryAudit.staffName || "N/A"}</p></div>}
                    <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ubicación</p><p className="mt-2 text-sm font-black text-slate-900">{selectedHistoryAudit.location}</p></div>
                    {selectedHistoryAudit.orderNumber && <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 col-span-2"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Orden</p><p className="mt-2 text-sm font-black text-blue-600">{selectedHistoryAudit.orderNumber}</p></div>}
                    {selectedHistoryAudit.auditedFileNames?.some((name) => name?.trim()) && (
                      <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 col-span-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Legajos auditados</p>
                        <p className="mt-2 text-sm font-black text-slate-900">{selectedHistoryAudit.auditedFileNames.filter((name) => name?.trim()).join(" · ")}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Resultados por ítem</p>
                    {selectedHistoryAudit.items.map((item, idx) => (
                      <div key={idx} className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-xs font-bold leading-snug text-slate-700">{item.question}</p>
                          <span className={cn("shrink-0 rounded-lg px-2 py-1 text-[10px] font-black uppercase", item.status === "pass" ? "bg-green-100 text-green-600" : item.status === "fail" ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-500")}>{item.status === "pass" ? "Cumple" : item.status === "fail" ? "No cumple" : "N/A"}</span>
                        </div>
                        {item.comment && <p className="text-[11px] italic text-slate-500">"{item.comment}"</p>}
                      </div>
                    ))}
                  </div>

                  {selectedHistoryAudit.notes && <div className="rounded-[1.4rem] border border-blue-100 bg-blue-50 px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-400">Notas generales</p><p className="mt-2 text-sm leading-relaxed text-blue-800">{selectedHistoryAudit.notes}</p></div>}
                </div>
              ) : (
                <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                  <p className="text-sm font-black text-slate-700">Seleccioná una auditoría para ver el detalle.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {historyPanel === "exports" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="glass-panel rounded-[2rem] p-6 shadow-sm space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Exportación</p>
              <h3 className="mt-2 text-xl font-black text-slate-950">Salida operativa y respaldo</h3>
              <p className="mt-2 text-sm font-medium text-slate-500">Modelo habitual en sistemas de auditoría: exportar para análisis puntual y sincronizar con una fuente compartida para reporting externo.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">CSV local</p>
                <p className="text-sm font-medium text-slate-500">Descargá el historial para compartirlo, archivarlo o cruzarlo externamente.</p>
                <button onClick={onExportCsv} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 transition-all"><Save className="w-4 h-4" />Exportar ahora</button>
              </div>
              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Fuente externa</p>
                <p className="text-sm font-medium text-slate-500">Leer el CSV publicado permite verificar consistencia y operación fuera de la app.</p>
                <button onClick={onSyncData} disabled={isSyncing || !isHistorySyncConfigured} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 hover:border-slate-300 transition-all disabled:opacity-50"><Clock className="w-4 h-4" />{isSyncing ? "Sincronizando..." : "Leer fuente"}</button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass-panel rounded-[2rem] p-6 shadow-sm space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Buenas prácticas</p>
              <div className="space-y-3 text-sm font-medium text-slate-600">
                <p>Firestore como fuente oficial para trazabilidad y control.</p>
                <p>Sheets o CSV como capa de intercambio y reporting operativo.</p>
                <p>Exportación y sincronización separadas para evitar mezcla de responsabilidades.</p>
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Estado actual</p>
              <div className="rounded-[1.4rem] bg-slate-50 px-4 py-4 border border-slate-200"><p className="text-sm font-black text-slate-900">Fuente de historial</p><p className="mt-2 text-sm font-medium text-slate-500">{isUsingExternalHistory ? "Historial importado desde Google Sheets." : hasWebhookUrl ? "Apps Script listo para importar historial." : hasSheetCsvUrl ? "CSV externo configurado como respaldo." : "Todavía no configurado."}</p></div>
              <div className="rounded-[1.4rem] bg-slate-50 px-4 py-4 border border-slate-200"><p className="text-sm font-black text-slate-900">Total de registros</p><p className="mt-2 text-sm font-medium text-slate-500">{totalHistoryCount} auditorías disponibles para exportar.</p></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}