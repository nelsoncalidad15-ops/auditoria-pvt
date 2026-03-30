import { Trash2 } from "lucide-react";
import { OR_ROLE_LABELS, OR_SECTOR_LABELS } from "../../constants";
import { cn } from "../../lib/utils";
import {
  AuditCategory,
  AuditItemPriority,
  AuditStructureScope,
  OrAuditSector,
  OrResponsibleRole,
} from "../../types";

interface StructurePanelProps {
  selectedStructureScope: AuditStructureScope;
  setSelectedStructureScope: (scope: AuditStructureScope) => void;
  structureStorageLabel: "local" | "cloud";
  isLoadingStructureFromCloud: boolean;
  isSavingStructureToCloud: boolean;
  handleLoadStructureFromCloud: () => void;
  handleSaveStructureToCloud: () => void;
  handleResetStructure: () => void;
  auditCategories: AuditCategory[];
  selectedStructureCategory: AuditCategory | null;
  selectedStructureCategoryId: string;
  setSelectedStructureCategoryId: (categoryId: string) => void;
  updateCategory: (categoryId: string, updater: (category: AuditCategory) => AuditCategory) => void;
  handleDeleteCategory: (categoryId: string) => void;
  newCategoryName: string;
  setNewCategoryName: (value: string) => void;
  newCategoryDescription: string;
  setNewCategoryDescription: (value: string) => void;
  newCategoryStaff: string;
  setNewCategoryStaff: (value: string) => void;
  handleAddCategory: () => void;
  newItemText: string;
  setNewItemText: (value: string) => void;
  newItemDescription: string;
  setNewItemDescription: (value: string) => void;
  newItemGuidance: string;
  setNewItemGuidance: (value: string) => void;
  newItemBlock: string;
  setNewItemBlock: (value: string) => void;
  newItemSector: OrAuditSector;
  setNewItemSector: (value: OrAuditSector) => void;
  newItemResponsibleRoles: OrResponsibleRole[];
  setNewItemResponsibleRoles: (updater: OrResponsibleRole[] | ((current: OrResponsibleRole[]) => OrResponsibleRole[])) => void;
  newItemPriority: AuditItemPriority;
  setNewItemPriority: (value: AuditItemPriority) => void;
  newItemWeight: number;
  setNewItemWeight: (value: number) => void;
  newItemRequired: boolean;
  setNewItemRequired: (value: boolean) => void;
  newItemAllowsNa: boolean;
  setNewItemAllowsNa: (value: boolean) => void;
  newItemActive: boolean;
  setNewItemActive: (value: boolean) => void;
  newItemRequiresCommentOnFail: boolean;
  setNewItemRequiresCommentOnFail: (value: boolean) => void;
  handleAddItem: () => void;
}

export function StructurePanel({
  selectedStructureScope,
  setSelectedStructureScope,
  structureStorageLabel,
  isLoadingStructureFromCloud,
  isSavingStructureToCloud,
  handleLoadStructureFromCloud,
  handleSaveStructureToCloud,
  handleResetStructure,
  auditCategories,
  selectedStructureCategory,
  selectedStructureCategoryId,
  setSelectedStructureCategoryId,
  updateCategory,
  handleDeleteCategory,
  newCategoryName,
  setNewCategoryName,
  newCategoryDescription,
  setNewCategoryDescription,
  newCategoryStaff,
  setNewCategoryStaff,
  handleAddCategory,
  newItemText,
  setNewItemText,
  newItemDescription,
  setNewItemDescription,
  newItemGuidance,
  setNewItemGuidance,
  newItemBlock,
  setNewItemBlock,
  newItemSector,
  setNewItemSector,
  newItemResponsibleRoles,
  setNewItemResponsibleRoles,
  newItemPriority,
  setNewItemPriority,
  newItemWeight,
  setNewItemWeight,
  newItemRequired,
  setNewItemRequired,
  newItemAllowsNa,
  setNewItemAllowsNa,
  newItemActive,
  setNewItemActive,
  newItemRequiresCommentOnFail,
  setNewItemRequiresCommentOnFail,
  handleAddItem,
}: StructurePanelProps) {
  return (
    <div className="bg-white/90 p-6 rounded-3xl shadow-sm border border-white/80 space-y-6 backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">Estructura de auditoría</h3>
          <p className="text-[11px] font-bold text-slate-400 mt-2">
            Perfil activo: {selectedStructureScope === "global" ? "General" : selectedStructureScope} · Fuente actual: {structureStorageLabel === "cloud" ? "Firestore" : "Local"}
            {isLoadingStructureFromCloud && " · cargando nube..."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleLoadStructureFromCloud} disabled={isLoadingStructureFromCloud} className="px-4 py-3 rounded-2xl bg-white text-slate-700 text-xs font-black uppercase tracking-widest border border-slate-200 hover:border-slate-300 transition-all disabled:opacity-60">
            Cargar nube
          </button>
          <button onClick={handleSaveStructureToCloud} disabled={isSavingStructureToCloud} className="px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-60">
            {isSavingStructureToCloud ? "Guardando..." : "Guardar en nube"}
          </button>
          <button onClick={handleResetStructure} className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
            Restablecer base
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {([
          { id: "global", label: "General" },
          { id: "Salta", label: "Salta" },
          { id: "Jujuy", label: "Jujuy" },
        ] as Array<{ id: AuditStructureScope; label: string }>).map((scopeOption) => (
          <button
            key={scopeOption.id}
            onClick={() => setSelectedStructureScope(scopeOption.id)}
            className={cn(
              "rounded-2xl border px-4 py-3 text-left transition-all",
              selectedStructureScope === scopeOption.id
                ? "bg-slate-950 text-white border-slate-950 shadow-lg shadow-slate-200"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
            )}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em]">Perfil</p>
            <p className="text-sm font-black mt-1">{scopeOption.label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-4 space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Nueva categoría</label>
            <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Ej. Recepción rápida" className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none" />
            <textarea value={newCategoryDescription} onChange={(e) => setNewCategoryDescription(e.target.value)} placeholder="Objetivo operativo de la categoría y criterio general para el auditor" className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none min-h-[90px] resize-none" />
            <textarea value={newCategoryStaff} onChange={(e) => setNewCategoryStaff(e.target.value)} placeholder="Personal separado por coma" className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none min-h-[90px] resize-none" />
            <button onClick={handleAddCategory} className="w-full py-3 rounded-2xl bg-slate-950 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
              Crear categoría
            </button>
          </div>

          <div className="space-y-2">
            {auditCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedStructureCategoryId(category.id)}
                className={cn(
                  "w-full text-left rounded-[1.6rem] border p-4 transition-all",
                  selectedStructureCategoryId === category.id
                    ? "bg-slate-950 text-white border-slate-950 shadow-lg shadow-slate-200"
                    : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black leading-tight">{category.name}</p>
                    <p className={cn("text-[11px] font-bold mt-1", selectedStructureCategoryId === category.id ? "text-slate-300" : "text-slate-500")}>
                      {category.description?.trim() || `${category.items.length} ítems · ${category.staffOptions.length} personas`}
                    </p>
                  </div>
                  <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.16em]", selectedStructureCategoryId === category.id ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500")}>
                    {category.items.filter((item) => item.required).length} oblig.
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedStructureCategory && (
          <div className="space-y-4">
            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Categoría activa</p>
                  <h4 className="text-lg font-black text-slate-900">{selectedStructureCategory.name}</h4>
                </div>
                <button onClick={() => handleDeleteCategory(selectedStructureCategory.id)} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all">
                  <Trash2 className="w-4 h-4" />
                  Eliminar categoría
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Nombre visible</label>
                  <input type="text" value={selectedStructureCategory.name} onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, name: e.target.value }))} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Descripción operativa</label>
                  <textarea value={selectedStructureCategory.description || ""} onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, description: e.target.value }))} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none min-h-[104px] resize-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Personal auditable</label>
                  <textarea value={selectedStructureCategory.staffOptions.join(", ")} onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, staffOptions: e.target.value.split(",").map((value) => value.trim()).filter(Boolean) }))} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none min-h-[104px] resize-none" />
                </div>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h4 className="text-lg font-black text-slate-900">Ítems de auditoría</h4>
                  <p className="text-sm text-slate-500">Cada cambio impacta en el formulario dinámico y en las validaciones de cierre.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Resumen</p>
                  <p className="text-sm font-black text-slate-900">{selectedStructureCategory.items.length} ítems</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">{selectedStructureCategory.items.filter((item) => item.requiresCommentOnFail).length} con evidencia obligatoria</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">{selectedStructureCategory.items.filter((item) => (item.priority ?? "medium") === "high").length} críticos · {Array.from(new Set(selectedStructureCategory.items.map((item) => item.block || "General"))).length} bloques</p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-4 space-y-3">
                <input type="text" value={newItemText} onChange={(e) => setNewItemText(e.target.value)} placeholder="Texto del nuevo ítem" className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none" />
                <textarea value={newItemDescription} onChange={(e) => setNewItemDescription(e.target.value)} placeholder="Descripción o criterio de auditoría" className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none min-h-[88px] resize-none" />
                <textarea value={newItemGuidance} onChange={(e) => setNewItemGuidance(e.target.value)} placeholder="Guía breve para el auditor: qué revisar, dónde mirar o qué evidencia dejar" className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none min-h-[88px] resize-none" />
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <input type="text" value={newItemBlock} onChange={(e) => setNewItemBlock(e.target.value)} placeholder="Bloque operativo. Ej. Recepción" className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none" />
                  <select value={newItemSector} onChange={(e) => setNewItemSector(e.target.value as OrAuditSector)} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none">
                    {Object.entries(OR_SECTOR_LABELS).map(([sectorId, label]) => (
                      <option key={sectorId} value={sectorId}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Roles responsables</p>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    {(Object.keys(OR_ROLE_LABELS) as OrResponsibleRole[]).map((role) => (
                      <label key={role} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
                        <input type="checkbox" checked={newItemResponsibleRoles.includes(role)} onChange={(e) => setNewItemResponsibleRoles((current) => e.target.checked ? [...current, role] : current.filter((item) => item !== role))} className="h-4 w-4 rounded border-slate-300" />
                        {OR_ROLE_LABELS[role]}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <select value={newItemPriority} onChange={(e) => setNewItemPriority(e.target.value as AuditItemPriority)} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none">
                    <option value="high">Criticidad alta</option>
                    <option value="medium">Criticidad media</option>
                    <option value="low">Criticidad baja</option>
                  </select>
                  <input type="number" min={1} step={1} value={newItemWeight} onChange={(e) => setNewItemWeight(Math.max(1, Number(e.target.value) || 1))} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none" placeholder="Ponderación" />
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={newItemRequired} onChange={(e) => setNewItemRequired(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />Marcar como obligatorio</label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={newItemAllowsNa} onChange={(e) => setNewItemAllowsNa(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />Permitir N/A en este ítem</label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={newItemActive} onChange={(e) => setNewItemActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />Ítem activo en formularios</label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={newItemRequiresCommentOnFail} onChange={(e) => setNewItemRequiresCommentOnFail(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />Exigir observación si el auditor marca desvío</label>
                <button onClick={handleAddItem} className="w-full py-3 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all">
                  Agregar ítem
                </button>
              </div>

              <div className="space-y-3">
                {selectedStructureCategory.items.map((structureItem, index) => (
                  <div key={structureItem.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.16em] bg-slate-900 text-white">Item {String(index + 1).padStart(2, "0")}</span>
                        <span className={cn("text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.16em] border", structureItem.required ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500")}>
                          {structureItem.required ? "Obligatorio" : "Opcional"}
                        </span>
                      </div>
                      <button onClick={() => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, items: category.items.filter((item) => item.id !== structureItem.id) }))} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                        Quitar
                      </button>
                    </div>

                    <textarea value={structureItem.text} onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, items: category.items.map((item) => item.id === structureItem.id ? { ...item, text: e.target.value } : item) }))} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none min-h-[96px] resize-none" />
                    <textarea value={structureItem.guidance || ""} onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, items: category.items.map((item) => item.id === structureItem.id ? { ...item, guidance: e.target.value } : item) }))} placeholder="Guía breve para el auditor" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none min-h-[84px] resize-none" />
                    <textarea value={structureItem.description || ""} onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, items: category.items.map((item) => item.id === structureItem.id ? { ...item, description: e.target.value } : item) }))} placeholder="Descripción o criterio de auditoría" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none min-h-[84px] resize-none" />

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <input type="text" value={structureItem.block || "General"} onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, items: category.items.map((item) => item.id === structureItem.id ? { ...item, block: e.target.value } : item) }))} placeholder="Bloque operativo" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none" />
                      <select value={structureItem.sector || "recepcion"} onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, items: category.items.map((item) => item.id === structureItem.id ? { ...item, sector: e.target.value as OrAuditSector } : item) }))} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none">
                        {Object.entries(OR_SECTOR_LABELS).map(([sectorId, label]) => (
                          <option key={sectorId} value={sectorId}>{label}</option>
                        ))}
                      </select>
                      <select value={structureItem.priority || "medium"} onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, items: category.items.map((item) => item.id === structureItem.id ? { ...item, priority: e.target.value as AuditItemPriority } : item) }))} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none">
                        <option value="high">Criticidad alta</option>
                        <option value="medium">Criticidad media</option>
                        <option value="low">Criticidad baja</option>
                      </select>
                      <input type="number" min={1} step={1} value={structureItem.weight || 1} onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, items: category.items.map((item) => item.id === structureItem.id ? { ...item, weight: Math.max(1, Number(e.target.value) || 1) } : item) }))} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none" />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Roles responsables</p>
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                        {(Object.keys(OR_ROLE_LABELS) as OrResponsibleRole[]).map((role) => (
                          <label key={`${structureItem.id}-${role}`} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
                            <input type="checkbox" checked={(structureItem.responsibleRoles || []).includes(role)} onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, items: category.items.map((item) => item.id === structureItem.id ? { ...item, responsibleRoles: e.target.checked ? [...(item.responsibleRoles || []), role] : (item.responsibleRoles || []).filter((entry) => entry !== role) } : item) }))} className="h-4 w-4 rounded border-slate-300" />
                            {OR_ROLE_LABELS[role]}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={structureItem.required} onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, items: category.items.map((item) => item.id === structureItem.id ? { ...item, required: e.target.checked } : item) }))} className="h-4 w-4 rounded border-slate-300" />Este ítem debe responderse antes de finalizar la auditoría</label>
                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={structureItem.allowsNa !== false} onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, items: category.items.map((item) => item.id === structureItem.id ? { ...item, allowsNa: e.target.checked } : item) }))} className="h-4 w-4 rounded border-slate-300" />Permitir N/A</label>
                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={structureItem.active !== false} onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, items: category.items.map((item) => item.id === structureItem.id ? { ...item, active: e.target.checked } : item) }))} className="h-4 w-4 rounded border-slate-300" />Ítem activo</label>
                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={structureItem.requiresCommentOnFail || false} onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, items: category.items.map((item) => item.id === structureItem.id ? { ...item, requiresCommentOnFail: e.target.checked } : item) }))} className="h-4 w-4 rounded border-slate-300" />Exigir observación cuando se marque desvío</label>
                    </div>
                  </div>
                ))}

                {selectedStructureCategory.items.length === 0 && (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                    <p className="text-sm font-bold text-slate-500">Esta categoría todavía no tiene ítems.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}