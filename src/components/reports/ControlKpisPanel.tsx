import { cn } from "../../lib/utils";
import { AuditCategory, AuditTemplateItem, AuditSession, Role } from "../../types";

interface ReportFilter {
  role: Role;
  staff: string;
  month: string;
}

interface ControlKpisPanelProps {
  reportFilter: ReportFilter;
  setReportFilter: (filter: ReportFilter) => void;
  auditCategories: AuditCategory[];
  allStaffOptions: string[];
  filteredReportSessions: AuditSession[];
  reportCategoryItems: AuditTemplateItem[];
}

export function ControlKpisPanel({
  reportFilter,
  setReportFilter,
  auditCategories,
  allStaffOptions,
  filteredReportSessions,
  reportCategoryItems,
}: ControlKpisPanelProps) {
  return (
    <>
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Puesto</label>
            <select value={reportFilter.role} onChange={(e) => setReportFilter({ ...reportFilter, role: e.target.value as Role })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold">
              {auditCategories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Personal</label>
            <select value={reportFilter.staff} onChange={(e) => setReportFilter({ ...reportFilter, staff: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold">
              <option value="">Todos</option>
              {allStaffOptions.map((staff) => <option key={staff} value={staff}>{staff}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mes</label>
            <input type="month" value={reportFilter.month} onChange={(e) => setReportFilter({ ...reportFilter, month: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-[#002060] text-white">
                <th className="p-2 border border-white/20 text-left min-w-[200px]">{new Date(reportFilter.month + "-02").toLocaleString("es-ES", { month: "long" }).toUpperCase()}</th>
                {filteredReportSessions.map((session) => <th key={session.id} className="p-2 border border-white/20 text-center min-w-[60px]">{session.orderNumber || "S/N"}</th>)}
                <th className="p-2 border border-white/20 text-center min-w-[60px] bg-blue-900">PROM</th>
              </tr>
            </thead>
            <tbody>
              {reportCategoryItems.map((questionItem, index) => {
                const question = questionItem.text;
                const scores = filteredReportSessions.map((session) => {
                  const item = session.items.find((entry) => entry.question === question);
                  if (!item || item.status === "na") return null;
                  return item.status === "pass" ? 1 : 0;
                });

                const validScores = scores.filter((score) => score !== null) as number[];
                const avg = validScores.length > 0 ? validScores.reduce((acc, score) => acc + score, 0) / validScores.length : 0;

                return (
                  <tr key={questionItem.id || index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="p-2 border border-gray-100 font-bold text-gray-700">{question}</td>
                    {scores.map((score, scoreIndex) => (
                      <td key={scoreIndex} className={cn("p-2 border border-gray-100 text-center font-black", score === 1 ? "bg-green-50 text-green-600" : score === 0 ? "bg-red-50 text-red-600" : "text-gray-300")}>
                        {score === null ? "-" : score}
                      </td>
                    ))}
                    <td className={cn("p-2 border border-gray-100 text-center font-black", avg >= 0.9 ? "text-green-600" : avg >= 0.7 ? "text-yellow-600" : "text-red-600")}>{avg.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}