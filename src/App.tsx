/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ClipboardCheck, 
  MapPin, 
  User, 
  Calendar as CalendarIcon, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  MinusCircle,
  Camera,
  Save,
  History,
  Plus,
  ArrowLeft,
  Search,
  Check,
  LogOut,
  LogIn,
  UserCheck,
  Wrench,
  ShieldCheck,
  Droplets,
  FileCheck,
  Package,
  Truck,
  ClipboardList,
  ChevronDown,
  FileText,
  BarChart3,
  Settings,
  LayoutDashboard,
  TrendingUp,
  Users,
  Target,
  AlertCircle,
  Clock,
  Trash2
} from "lucide-react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';
import { motion, AnimatePresence } from "motion/react";
import { cn, createClientId } from "./lib/utils";
import { buildAuditSyncPayload, sendAuditToWebhook } from "./services/audit-sync";
import { loadAuditCategoriesFromCloud, saveAuditCategoriesToCloud } from "./services/audit-structure-cloud";
import { getStoredAuditCategories, resetAuditCategories, saveAuditCategories } from "./services/audit-structure";
import { 
  LOCATIONS, 
  AUDITORS
} from "./constants";
import { Role, AuditItem, AuditSession, Location, AuditCategory, AuditStructureScope } from "./types";
import { 
  auth, 
  db, 
  googleProvider, 
  handleFirestoreError, 
  OperationType 
} from "./firebase";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  Timestamp 
} from "firebase/firestore";
import Papa from "papaparse";

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [error, setError] = React.useState<any>(null);

  React.useEffect(() => {
    const handleError = (e: ErrorEvent) => setError(e.error);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    let errorMessage = "Ocurrió un error inesperado.";
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.error && parsed.error.includes("insufficient permissions")) {
        errorMessage = "Error de permisos: No tienes autorización para realizar esta operación.";
      }
    } catch (e) {
      errorMessage = error.message || errorMessage;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-red-50 text-center">
        <div className="space-y-4 max-w-sm">
          <XCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-red-900">Algo salió mal</h1>
          <p className="text-red-700 text-sm">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface AuditItemRowProps {
  question: string;
  index: number;
  item?: AuditItem;
  required?: boolean;
  showStructuredQuestion?: boolean;
  onStatusToggle: (status: "pass" | "fail" | "na") => void;
  onCommentUpdate: (comment: string) => void;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl space-y-6"
          >
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-gray-900 leading-tight">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{message}</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 py-4 rounded-2xl font-black text-white bg-blue-600 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const AuditItemRow: React.FC<AuditItemRowProps> = ({ 
  question, 
  index, 
  item, 
  required = true,
  showStructuredQuestion = false,
  onStatusToggle, 
  onCommentUpdate 
}) => {
  const [showComment, setShowComment] = useState(false);
  const separatorIndex = question.indexOf(":");
  const hasStructuredCopy = showStructuredQuestion && separatorIndex > -1;
  const questionTitle = hasStructuredCopy ? question.slice(0, separatorIndex).trim() : question;
  const questionHint = hasStructuredCopy ? question.slice(separatorIndex + 1).trim() : "";
  const isOrdersStyle = showStructuredQuestion;
  const currentStatusLabel =
    item?.status === "pass" ? "Cumple" :
    item?.status === "fail" ? "No cumple" :
    item?.status === "na" ? "N/A" : "Pendiente";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "border transition-all duration-300 space-y-3",
        isOrdersStyle
          ? "bg-white rounded-[1.5rem] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)] border-slate-200/80"
          : "bg-white rounded-3xl p-6 shadow-sm",
        item?.status
          ? (isOrdersStyle ? "border-slate-300" : "border-gray-200")
          : (isOrdersStyle ? "border-slate-200 ring-1 ring-slate-100" : "border-gray-100 ring-1 ring-gray-50")
      )}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.18em]",
              isOrdersStyle ? "bg-slate-900 text-white" : "text-gray-400 bg-gray-100"
            )}>
              Item {String(index + 1).padStart(2, "0")}
            </span>
            <span className={cn(
              "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.16em] border",
              item?.status === "pass" && "border-emerald-200 bg-emerald-50 text-emerald-700",
              item?.status === "fail" && "border-red-200 bg-red-50 text-red-700",
              item?.status === "na" && "border-slate-200 bg-slate-100 text-slate-600",
              !item?.status && "border-amber-200 bg-amber-50 text-amber-700"
            )}>
              {currentStatusLabel}
            </span>
            <span className={cn(
              "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.16em] border",
              required
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-slate-50 text-slate-500"
            )}>
              {required ? "Obligatorio" : "Opcional"}
            </span>
          </div>
          <div className="space-y-1.5">
            <p className={cn(
              "leading-snug",
              isOrdersStyle ? "font-black text-slate-900 text-[0.95rem] md:text-base tracking-[-0.02em]" : "font-bold text-gray-800 text-sm md:text-base"
            )}>
              {questionTitle}
            </p>
            {questionHint && (
              <p className={cn(
                "text-[11px] leading-snug rounded-xl px-3 py-2 border",
                isOrdersStyle
                  ? "text-slate-600 bg-slate-50 border-slate-200"
                  : "text-gray-500 bg-slate-50 border-slate-100"
              )}>
                {questionHint}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className={cn(
        isOrdersStyle ? "grid grid-cols-3 gap-2.5" : "grid grid-cols-3 gap-2"
      )}>
        <button
          onClick={() => onStatusToggle("pass")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-2xl border-2 transition-all active:scale-95",
            isOrdersStyle ? "py-2.5 px-2 min-h-[46px]" : "flex-col py-3.5",
            item?.status === "pass" 
              ? (isOrdersStyle ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100" : "bg-green-500 border-green-500 text-white shadow-lg shadow-green-100")
              : (isOrdersStyle ? "bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700" : "bg-white border-gray-100 text-gray-400 hover:border-green-200 hover:text-green-500")
          )}
        >
          <CheckCircle2 className={cn("w-4 h-4", item?.status === "pass" ? "text-white" : "")} />
          <span className="text-[10px] font-black uppercase tracking-tight">Cumple</span>
        </button>
        <button
          onClick={() => onStatusToggle("fail")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-2xl border-2 transition-all active:scale-95",
            isOrdersStyle ? "py-2.5 px-2 min-h-[46px]" : "flex-col py-3.5",
            item?.status === "fail" 
              ? (isOrdersStyle ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-100" : "bg-red-500 border-red-500 text-white shadow-lg shadow-red-100")
              : (isOrdersStyle ? "bg-white border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-700" : "bg-white border-gray-100 text-gray-400 hover:border-red-200 hover:text-red-500")
          )}
        >
          <XCircle className={cn("w-4 h-4", item?.status === "fail" ? "text-white" : "")} />
          <span className="text-[10px] font-black uppercase tracking-tight">No Cumple</span>
        </button>
        <button
          onClick={() => onStatusToggle("na")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-2xl border-2 transition-all active:scale-95",
            isOrdersStyle ? "py-2.5 px-2 min-h-[46px]" : "flex-col py-3.5",
            item?.status === "na" 
              ? (isOrdersStyle ? "bg-slate-700 border-slate-700 text-white shadow-lg shadow-slate-200" : "bg-gray-800 border-gray-800 text-white shadow-lg shadow-gray-200")
              : (isOrdersStyle ? "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700" : "bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600")
          )}
        >
          <MinusCircle className={cn("w-4 h-4", item?.status === "na" ? "text-white" : "")} />
          <span className="text-[10px] font-black uppercase tracking-tight">N/A</span>
        </button>
      </div>

      <div className={cn(
        "flex gap-2 pt-1",
        isOrdersStyle && "border-t border-slate-100 pt-3"
      )}>
        <button 
          onClick={() => setShowComment(!showComment)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
            item?.comment || showComment 
              ? (isOrdersStyle ? "bg-slate-900 text-white ring-1 ring-slate-900" : "bg-blue-50 text-blue-600 ring-1 ring-blue-100")
              : (isOrdersStyle ? "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200" : "bg-gray-50 text-gray-400 hover:bg-gray-100")
          )}
        >
          <History className="w-3.5 h-3.5" />
          {item?.comment ? "Ver Observación" : "Agregar Nota"}
        </button>
        <button className={cn(
          "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
          isOrdersStyle
            ? "bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100"
            : "bg-gray-50 text-gray-400 hover:bg-gray-100"
        )}>
          <Camera className="w-3.5 h-3.5" />
          Adjuntar Foto
        </button>
      </div>

      <AnimatePresence>
        {(showComment || item?.comment) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-1">
              <textarea 
                value={item?.comment || ""}
                onChange={(e) => onCommentUpdate(e.target.value)}
                placeholder="Escribe aquí las observaciones para este ítem..."
                className={cn(
                  "w-full bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs focus:ring-0 focus:border-blue-200 resize-none transition-all",
                  isOrdersStyle ? "p-3 h-20" : "p-4 h-24"
                )}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

function AuditApp() {
  const appTitle = import.meta.env.VITE_APP_TITLE?.trim() || "Auditoría OR Postventa VW";
  const envWebhookUrl = import.meta.env.VITE_APPS_SCRIPT_URL?.trim() || "";
  const envSheetCsvUrl = import.meta.env.VITE_SHEET_CSV_URL?.trim() || "";
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<"dashboard" | "home" | "setup" | "audit" | "history" | "reports">("dashboard");
  const [selectedStructureScope, setSelectedStructureScope] = useState<AuditStructureScope>("global");
  const [auditCategoryScopes, setAuditCategoryScopes] = useState<Record<AuditStructureScope, AuditCategory[]>>(() => ({
    global: getStoredAuditCategories("global"),
    Salta: getStoredAuditCategories("Salta"),
    Jujuy: getStoredAuditCategories("Jujuy"),
  }));
  const [isSyncing, setIsSyncing] = useState(false);
  const [session, setSession] = useState<Partial<AuditSession>>({
    date: new Date().toISOString().split("T")[0],
    items: []
  });
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [history, setHistory] = useState<AuditSession[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAudit, setSelectedAudit] = useState<AuditSession | null>(null);
  const [selectedStructureCategoryId, setSelectedStructureCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryStaff, setNewCategoryStaff] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [newItemRequired, setNewItemRequired] = useState(true);
  const [isLoadingStructureFromCloud, setIsLoadingStructureFromCloud] = useState(false);
  const [isSavingStructureToCloud, setIsSavingStructureToCloud] = useState(false);
  const [structureStorageLabel, setStructureStorageLabel] = useState<"local" | "cloud">("local");
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);
  const [reportsPanel, setReportsPanel] = useState<"kpis" | "structure" | "integrations">("kpis");
  const [historyPanel, setHistoryPanel] = useState<"records" | "exports">("records");
  const [reportFilter, setReportFilter] = useState({
    role: getStoredAuditCategories("global")[0]?.name || "Ordenes",
    staff: "",
    month: new Date().toISOString().slice(0, 7) // YYYY-MM
  });
  const [webhookUrl, setWebhookUrl] = useState<string>(localStorage.getItem("webhookUrl") || envWebhookUrl);
  const [sheetCsvUrl, setSheetCsvUrl] = useState<string>(localStorage.getItem("sheetCsvUrl") || envSheetCsvUrl);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSendingToSheet, setIsSendingToSheet] = useState(false);

  const sessionItems = session.items ?? [];
  const ordersTargetPerAdvisor = 10;
  const isSheetSyncConfigured = webhookUrl.trim().length > 0;
  const isHistorySyncConfigured = sheetCsvUrl.trim().length > 0;
  const auditCategories = auditCategoryScopes[selectedStructureScope] ?? auditCategoryScopes.global;
  const activeAuditCategories = (session.location ? auditCategoryScopes[session.location] : null) ?? auditCategoryScopes.global;
  const selectedAuditCategory = selectedRole
    ? activeAuditCategories.find((category) => category.name === selectedRole) ?? null
    : null;
  const selectedAuditItems = selectedAuditCategory?.items ?? [];
  const selectedAuditStaffOptions = selectedAuditCategory?.staffOptions ?? [];
  const selectedAuditorOption = AUDITORS.find((auditor) => auditor.id === session.auditorId) ?? null;
  const selectedStructureCategory = auditCategories.find((category) => category.id === selectedStructureCategoryId) ?? null;
  const reportCategoryItems = Array.from(new Map(
    Object.values(auditCategoryScopes)
      .flatMap((categories) => categories)
      .filter((category) => category.name === reportFilter.role)
      .map((category) => [category.id, category])
  ).values())[0]?.items ?? [];
  const allStaffOptions = Array.from(new Set(Object.values(auditCategoryScopes).flatMap((categories) => categories.flatMap((category) => category.staffOptions))));
  const configuredCategoryCount = Array.from(new Set(Object.values(auditCategoryScopes).flatMap((categories) => categories.map((category) => category.name)))).length;
  const requiredPendingCount = selectedAuditItems.filter(
    (auditItem) => auditItem.required && !sessionItems.some((item) => item.question === auditItem.text && item.status)
  ).length;
  const optionalPendingCount = selectedAuditItems.filter(
    (auditItem) => !auditItem.required && !sessionItems.some((item) => item.question === auditItem.text && item.status)
  ).length;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyAudits = history.filter((audit) => audit.date?.startsWith(currentMonth));
  const averageScore = Math.round(history.reduce((acc, audit) => acc + audit.totalScore, 0) / (history.length || 1));
  const bestAuditScore = history.length > 0 ? Math.max(...history.map((audit) => audit.totalScore)) : 0;
  const activeLocations = Array.from(new Set(history.map((audit) => audit.location).filter(Boolean))).length;
  const recentAverageScore = Math.round(monthlyAudits.reduce((acc, audit) => acc + audit.totalScore, 0) / (monthlyAudits.length || 1));
  const operatingStatus = user ? "Operativo" : "Acceso pendiente";
  const controlPanels: Array<{
    id: "kpis" | "structure" | "integrations";
    label: string;
    description: string;
    icon: typeof BarChart3;
  }> = [
    {
      id: "kpis",
      label: "Indicadores",
      description: "Seguimiento mensual, matriz y tendencias.",
      icon: BarChart3,
    },
    {
      id: "structure",
      label: "Estructura",
      description: "Categorías, personal auditable e ítems.",
      icon: Settings,
    },
    {
      id: "integrations",
      label: "Integraciones",
      description: "Apps Script, Sheets y parámetros externos.",
      icon: ShieldCheck,
    },
  ];
  const activeControlPanel = controlPanels.find((panel) => panel.id === reportsPanel) ?? controlPanels[0];
  const activeViewLabel =
    view === "dashboard"
      ? "Inicio"
      : view === "history"
        ? "Historial"
        : view === "reports"
          ? "Control"
          : view === "setup"
            ? "Configuración"
            : view === "audit"
              ? "Auditoría"
              : "Nueva auditoría";
  const setupCompletionCount = [Boolean(session.auditorId), Boolean(session.location), Boolean(session.date)].filter(Boolean).length;
  const operationalModules = [
    {
      title: "Nueva auditoría",
      description: "Ir directo al alta de una revisión y asignar responsable.",
      icon: Plus,
      tone: "blue",
      action: () => startNewAudit(),
    },
    {
      title: "Historial",
      description: "Consultar auditorías cerradas y revisar el detalle operativo.",
      icon: History,
      tone: "slate",
      action: () => setView("history"),
    },
    {
      title: "Indicadores",
      description: "Entrar al tablero de control y medir cumplimiento.",
      icon: TrendingUp,
      tone: "emerald",
      action: () => {
        setReportsPanel("kpis");
        setView("reports");
      },
    },
    {
      title: "Estructura",
      description: "Editar plantillas, categorías y perfiles por sucursal.",
      icon: Settings,
      tone: "amber",
      action: () => {
        setReportsPanel("structure");
        setView("reports");
      },
    },
    {
      title: "Integraciones",
      description: "Centralizar conectores y sincronización externa.",
      icon: ShieldCheck,
      tone: "violet",
      action: () => {
        setReportsPanel("integrations");
        setView("reports");
      },
    },
  ];

  // Mock data for charts if no history exists
  const chartData = history.length > 0 
    ? history.slice(-7).map(h => ({ name: h.date.split("-")[2], score: h.totalScore }))
    : [
        { name: '01', score: 85 },
        { name: '05', score: 92 },
        { name: '10', score: 78 },
        { name: '15', score: 88 },
        { name: '20', score: 95 },
        { name: '25', score: 90 },
        { name: '30', score: 94 },
      ];

  const categoryData = [
    { name: 'Mecánica', value: 92, color: '#3B82F6' },
    { name: 'Lavadero', value: 88, color: '#10B981' },
    { name: 'Ordenes', value: 95, color: '#F59E0B' },
  ];

  const recentAudits = history.slice(0, 3);
  const filteredHistory = history.filter((item) =>
    item.staffName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.items[0]?.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredReportSessions = history.filter((sessionItem) =>
    sessionItem.role === reportFilter.role &&
    (!reportFilter.staff || sessionItem.staffName === reportFilter.staff) &&
    sessionItem.date.startsWith(reportFilter.month)
  );
  const auditedOrdersForSelectedStaff = selectedRole === "Ordenes" && selectedStaff
    ? history.filter((item) => item.role === "Ordenes" && item.staffName === selectedStaff).length
    : 0;
  const auditedOrdersProgress = Math.min(auditedOrdersForSelectedStaff / ordersTargetPerAdvisor, 1) * 100;
  const auditedOrdersRemaining = Math.max(ordersTargetPerAdvisor - auditedOrdersForSelectedStaff, 0);
  const selectedHistoryAudit = view === "history" ? selectedAudit : null;
  const historyAverageScore = Math.round(filteredHistory.reduce((acc, item) => acc + item.totalScore, 0) / (filteredHistory.length || 1));
  const nonCompliantAudits = filteredHistory.filter((item) => item.totalScore < 90).length;
  const latestHistoryItem = filteredHistory[0] ?? null;
  const nextPendingItemIndex = selectedRole
    ? selectedAuditItems.findIndex(
        (auditItem) => !sessionItems.some((item) => item.question === auditItem.text && item.status)
      )
    : -1;

  useEffect(() => {
    if (auditCategories.length === 0) {
      setSelectedStructureCategoryId("");
      return;
    }

    if (!selectedStructureCategoryId || !auditCategories.some((category) => category.id === selectedStructureCategoryId)) {
      setSelectedStructureCategoryId(auditCategories[0].id);
    }

    const allCategoryNames = Array.from(new Set(Object.values(auditCategoryScopes).flatMap((categories) => categories.map((category) => category.name))));

    if (!allCategoryNames.includes(reportFilter.role)) {
      setReportFilter((current) => ({ ...current, role: allCategoryNames[0] || current.role }));
    }

    if (selectedRole && !activeAuditCategories.some((category) => category.name === selectedRole)) {
      setSelectedRole(null);
      setSelectedStaff("");
    }
  }, [activeAuditCategories, auditCategories, auditCategoryScopes, reportFilter.role, selectedRole, selectedStructureCategoryId]);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setStructureStorageLabel("local");
      return;
    }

    let cancelled = false;

    const loadStructure = async () => {
      setIsLoadingStructureFromCloud(true);
      try {
        const scopeResults = await Promise.all([
          loadAuditCategoriesFromCloud("global"),
          loadAuditCategoriesFromCloud("Salta"),
          loadAuditCategoriesFromCloud("Jujuy"),
        ]);

        if (cancelled) {
          return;
        }

        const nextScopes: Record<AuditStructureScope, AuditCategory[]> = {
          global: scopeResults[0] ?? getStoredAuditCategories("global"),
          Salta: scopeResults[1] ?? getStoredAuditCategories("Salta"),
          Jujuy: scopeResults[2] ?? getStoredAuditCategories("Jujuy"),
        };

        setAuditCategoryScopes(nextScopes);
        saveAuditCategories(nextScopes.global, "global");
        saveAuditCategories(nextScopes.Salta, "Salta");
        saveAuditCategories(nextScopes.Jujuy, "Jujuy");
        if (scopeResults.some(Boolean)) {
          setStructureStorageLabel("cloud");
        }
      } catch (error) {
        console.error("Load structure from cloud failed:", error);
      } finally {
        if (!cancelled) {
          setIsLoadingStructureFromCloud(false);
        }
      }
    };

    loadStructure();

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, user]);

  useEffect(() => {
    if (view !== "history") {
      return;
    }

    if (filteredHistory.length === 0) {
      if (selectedAudit) {
        setSelectedAudit(null);
      }
      return;
    }

    if (!selectedAudit || !filteredHistory.some((item) => item.id === selectedAudit.id)) {
      setSelectedAudit(filteredHistory[0]);
    }
  }, [filteredHistory, selectedAudit, view]);

  const persistAuditCategories = (nextCategories: AuditCategory[]) => {
    setAuditCategoryScopes((current) => ({
      ...current,
      [selectedStructureScope]: nextCategories,
    }));
    saveAuditCategories(nextCategories, selectedStructureScope);
    setStructureStorageLabel("local");
  };

  const updateCategory = (categoryId: string, updater: (category: AuditCategory) => AuditCategory) => {
    const currentCategory = auditCategories.find((category) => category.id === categoryId);
    if (!currentCategory) return;

    const nextCategory = updater(currentCategory);
    const nextCategories = auditCategories.map((category) =>
      category.id === categoryId ? nextCategory : category
    );

    if (selectedRole === currentCategory.name && nextCategory.name !== currentCategory.name) {
      setSelectedRole(nextCategory.name);
    }

    if (reportFilter.role === currentCategory.name && nextCategory.name !== currentCategory.name) {
      setReportFilter((current) => ({ ...current, role: nextCategory.name }));
    }

    persistAuditCategories(nextCategories);
  };

  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;

    if (auditCategories.some((category) => category.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert("Ya existe una categoría con ese nombre.");
      return;
    }

    const newCategory: AuditCategory = {
      id: createClientId(),
      name: trimmedName,
      staffOptions: newCategoryStaff.split(",").map((value) => value.trim()).filter(Boolean),
      items: [],
    };

    const nextCategories = [...auditCategories, newCategory];
    persistAuditCategories(nextCategories);
    setSelectedStructureCategoryId(newCategory.id);
    setNewCategoryName("");
    setNewCategoryStaff("");
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (auditCategories.length === 1) {
      alert("Necesitás al menos una categoría activa.");
      return;
    }

    const categoryToDelete = auditCategories.find((category) => category.id === categoryId);
    if (!categoryToDelete) return;

    const nextCategories = auditCategories.filter((category) => category.id !== categoryId);
    persistAuditCategories(nextCategories);

    if (selectedStructureCategoryId === categoryId) {
      setSelectedStructureCategoryId(nextCategories[0]?.id || "");
    }

    if (selectedRole === categoryToDelete.name) {
      setSelectedRole(null);
      setSelectedStaff("");
    }

    if (reportFilter.role === categoryToDelete.name) {
      setReportFilter((current) => ({ ...current, role: nextCategories[0]?.name || current.role }));
    }
  };

  const handleAddItem = () => {
    if (!selectedStructureCategory) return;

    const trimmedText = newItemText.trim();
    if (!trimmedText) return;

    updateCategory(selectedStructureCategory.id, (category) => ({
      ...category,
      items: [
        ...category.items,
        {
          id: createClientId(),
          text: trimmedText,
          required: newItemRequired,
        },
      ],
    }));

    setNewItemText("");
    setNewItemRequired(true);
  };

  const handleResetStructure = () => {
    const defaults = resetAuditCategories(selectedStructureScope);
    setAuditCategoryScopes((current) => ({
      ...current,
      [selectedStructureScope]: defaults,
    }));
    setSelectedStructureCategoryId(defaults[0]?.id || "");
    setReportFilter((current) => ({ ...current, role: defaults[0]?.name || current.role }));
    setStructureStorageLabel("local");
    alert("Estructura restablecida a la configuración inicial.");
  };

  const handleLoadStructureFromCloud = async () => {
    if (!user) {
      alert("Iniciá sesión para cargar la estructura compartida desde Firestore.");
      return;
    }

    setIsLoadingStructureFromCloud(true);
    try {
      const cloudCategories = await loadAuditCategoriesFromCloud(selectedStructureScope);
      if (!cloudCategories) {
        alert("Todavía no existe una estructura guardada en Firestore.");
        return;
      }

      setAuditCategoryScopes((current) => ({
        ...current,
        [selectedStructureScope]: cloudCategories,
      }));
      saveAuditCategories(cloudCategories, selectedStructureScope);
      setStructureStorageLabel("cloud");
      alert("Estructura cargada desde Firestore.");
    } catch (error) {
      console.error("Manual cloud load failed:", error);
      alert("No se pudo cargar la estructura desde Firestore.");
    } finally {
      setIsLoadingStructureFromCloud(false);
    }
  };

  const handleSaveStructureToCloud = async () => {
    if (!user) {
      alert("Iniciá sesión para guardar la estructura en Firestore.");
      return;
    }

    setIsSavingStructureToCloud(true);
    try {
      await saveAuditCategoriesToCloud(auditCategories, selectedStructureScope, user.email);
      setStructureStorageLabel("cloud");
      alert("Estructura guardada en Firestore.");
    } catch (error) {
      console.error("Save structure to cloud failed:", error);
      alert("No se pudo guardar la estructura en Firestore.");
    } finally {
      setIsSavingStructureToCloud(false);
    }
  };

  const saveIntegrationSettings = () => {
    localStorage.setItem("webhookUrl", webhookUrl.trim());
    localStorage.setItem("sheetCsvUrl", sheetCsvUrl.trim());
    alert("Configuración guardada correctamente.");
  };

  const exportToCSV = () => {
    if (history.length === 0) return;
    
    const data = history.flatMap(session => 
      session.items.map(item => ({
        Fecha: session.date,
        Ubicacion: session.location,
        Auditor: AUDITORS.find(a => a.id === session.auditorId)?.name || "N/A",
        Puesto: session.role || item.category,
        Personal: session.staffName || "N/A",
        OR: session.orderNumber || "N/A",
        Pregunta: item.question,
        Estado: item.status === "pass" ? "Cumple" : item.status === "fail" ? "No Cumple" : "N/A",
        Observacion: item.comment || "",
        PuntajeTotal: session.totalScore + "%",
        NotasGenerales: session.notes || ""
      }))
    );

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `auditorias_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore History Listener
  useEffect(() => {
    if (!user || !isAuthReady) return;

    const q = query(collection(db, "audits"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const audits = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as AuditSession[];
      setHistory(audits);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "audits");
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error("Login failed:", error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView("dashboard");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const saveToFirestore = async (newSession: AuditSession) => {
    try {
      await addDoc(collection(db, "audits"), {
        ...newSession,
        createdAt: Timestamp.now(),
        userEmail: user?.email
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "audits");
    }
  };

  const startNewAudit = () => {
    setSession({
      id: createClientId(),
      date: new Date().toISOString().split("T")[0],
      items: []
    });
    setSetupStep(1);
    setSelectedRole(null);
    setSelectedStaff("");
    setView("setup");
  };

  const handleSetupSubmit = () => {
    if (setupStep === 1) {
      if (session.auditorId) {
        setSetupStep(2);
      }
      return;
    }

    if (setupStep === 2) {
      if (session.location) {
        setSetupStep(3);
      }
      return;
    }

    if (session.auditorId && session.location && session.date) {
      setView("audit");
    }
  };

  const calculateCurrentScore = () => {
    if (!session.items || session.items.length === 0) return 0;
    const validItems = session.items.filter(i => i.status !== "na");
    if (validItems.length === 0) return 0;
    const passItems = validItems.filter(i => i.status === "pass");
    return Math.round((passItems.length / validItems.length) * 100);
  };

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleAuditSubmit = () => {
    if (!selectedRole || !selectedAuditCategory) return;

    if (requiredPendingCount > 0) {
      alert(`Faltan ${requiredPendingCount} ítems obligatorios por responder.`);
      return;
    }
    
    if (optionalPendingCount > 0) {
      setShowConfirmModal(true);
      return;
    }
    submitAudit();
  };

  const resetAuditFlow = () => {
    setIsSendingToSheet(false);
    setView("dashboard");
    setSelectedRole(null);
    setSelectedStaff("");
  };

  const submitAudit = async () => {
    if (sessionItems.length === 0) return;

    setIsSendingToSheet(true);

    const validItems = sessionItems.filter(i => i.status !== "na");
    const totalScore = validItems.length > 0 
      ? (sessionItems.filter(i => i.status === "pass").length / validItems.length) * 100 
      : 0;

    const completeSession: AuditSession = {
      ...session as AuditSession,
      staffName: selectedStaff,
      role: selectedRole!,
      totalScore: Math.round(totalScore)
    };

    const auditorName = AUDITORS.find((auditor) => auditor.id === completeSession.auditorId)?.name || "N/A";

    try {
      await saveToFirestore(completeSession);

      if (isSheetSyncConfigured) {
        const payload = buildAuditSyncPayload({
          session: completeSession,
          auditorName,
          submittedByEmail: user?.email,
        });

        await sendAuditToWebhook(webhookUrl, payload);
        alert("✅ Auditoría guardada en Firestore y enviada a Google Sheets");
      } else {
        alert("✅ Auditoría guardada en Firestore");
      }

      resetAuditFlow();
    } catch (error) {
      console.error("Submit audit failed:", error);

      if (isSheetSyncConfigured) {
        alert("⚠️ La auditoría se intentó guardar, pero falló la sincronización con Google Sheets. Revisá la URL del Apps Script.");
      } else {
        alert("⚠️ No se pudo guardar la auditoría. Verificá tu acceso a Firebase y reintentá.");
      }

      setIsSendingToSheet(false);
    }
  };

  const toggleItemStatus = (question: string, status: "pass" | "fail" | "na") => {
    const existingIndex = session.items?.findIndex(i => i.question === question) ?? -1;
    const newItems = [...(session.items ?? [])];
    
    if (existingIndex >= 0) {
      newItems[existingIndex] = { ...newItems[existingIndex], status };
    } else {
      newItems.push({
        id: createClientId(),
        question,
        category: selectedRole!,
        status,
        comment: ""
      });
    }
    
    setSession({ ...session, items: newItems });
  };

  const updateItemComment = (question: string, comment: string) => {
    const existingIndex = session.items?.findIndex(i => i.question === question) ?? -1;
    const newItems = [...(session.items ?? [])];
    
    if (existingIndex >= 0) {
      newItems[existingIndex] = { ...newItems[existingIndex], comment };
    } else {
      newItems.push({
        id: createClientId(),
        question,
        category: selectedRole!,
        status: "na",
        comment
      });
    }
    
    setSession({ ...session, items: newItems });
  };

  const syncData = async () => {
    if (!isHistorySyncConfigured) {
      alert("Configura la URL pública CSV de Google Sheets para sincronizar datos.");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch(sheetCsvUrl);
      const csvText = await response.text();
      Papa.parse(csvText, {
        complete: (results) => {
          console.log("Parsed CSV:", results.data);
          setTimeout(() => setIsSyncing(false), 1000);
        }
      });
    } catch (error) {
      console.error("Sync failed:", error);
      setIsSyncing(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F7FA] via-[#EEF3F8] to-[#E6EDF6] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#1A1A1A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F7FA] via-[#EEF3F8] to-[#E6EDF6] lg:flex">
      {/* Sidebar - Desktop Only */}
      <aside className={cn(
        "hidden h-[100dvh] w-72 shrink-0 flex-col overflow-hidden bg-slate-900 text-white shadow-2xl transition-all duration-500 lg:sticky lg:top-0 z-50",
        (view === "dashboard" || view === "history" || view === "reports") ? "lg:flex" : "lg:hidden"
      )}>
        <div className="p-8 flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20">
            <ClipboardCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tight leading-none">{appTitle}</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Postventa v2.0</p>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2 sidebar-scroll">
          <div className="px-4 pb-2">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Operación</p>
          </div>
          {[
            { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
            { id: "home", label: "Nueva Auditoría", icon: Plus },
            { id: "history", label: "Historial", icon: History },
            { id: "reports", label: "Control", icon: BarChart3 },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "home") {
                  startNewAudit();
                  return;
                }

                if (item.id === "reports") {
                  setReportsPanel("kpis");
                }

                setView(item.id as any);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all group",
                (item.id === "home" ? (view === "setup" || view === "audit") : view === item.id)
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform group-hover:scale-110",
                (item.id === "home" ? (view === "setup" || view === "audit") : view === item.id) ? "text-white" : "text-slate-500"
              )} />
              {item.label}
              {(item.id === "home" ? (view === "setup" || view === "audit") : view === item.id) && (
                <motion.div 
                  layoutId="activeTab"
                  className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
                />
              )}
            </button>
          ))}
          
          <div className="pt-8 pb-4 px-4">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Suite de control</p>
          </div>

          <button
            onClick={() => {
              setReportsPanel("kpis");
              setView("reports");
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all",
              view === "reports" && reportsPanel === "kpis"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <TrendingUp className={cn("w-5 h-5", view === "reports" && reportsPanel === "kpis" ? "text-white" : "text-slate-500")} />
            Indicadores
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all opacity-50 cursor-not-allowed">
            <Users className="w-5 h-5 text-slate-500" />
            Gestión Personal
          </button>
          <button
            onClick={() => {
              setReportsPanel("structure");
              setView("reports");
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all",
              view === "reports" && reportsPanel === "structure"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <Settings className={cn("w-5 h-5", view === "reports" && reportsPanel === "structure" ? "text-white" : "text-slate-500")} />
            Estructura
          </button>
          <button
            onClick={() => {
              setReportsPanel("integrations");
              setView("reports");
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all",
              view === "reports" && reportsPanel === "integrations"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <ShieldCheck className={cn("w-5 h-5", view === "reports" && reportsPanel === "integrations" ? "text-white" : "text-slate-500")} />
            Integraciones
          </button>
        </nav>

        <div className="p-6 pt-4 border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-sm">
          {user ? (
            <div className="bg-slate-800/50 rounded-3xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-sm shadow-lg shadow-blue-600/20">
                  {user.displayName?.charAt(0) || "U"}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-black text-white truncate">{user.displayName}</p>
                  <p className="text-[10px] font-bold text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-red-500/10 hover:text-red-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-700/50 bg-slate-800/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Acceso</p>
              <p className="mt-2 text-sm font-bold text-slate-300">El ingreso se realiza desde la barra superior.</p>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Header - Mobile & Desktop Top Bar */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
          <div className={cn(
            "mx-auto flex items-center justify-between",
            view === "dashboard" ? "max-w-7xl" : 
            view === "setup" ? "max-w-5xl" :
            view === "audit" ? "max-w-6xl" :
            view === "home" ? "max-w-md" :
            "max-w-md lg:max-w-none"
          )}>
            <div className={cn(
              "flex items-center gap-3",
              (view === "home" || view === "audit" || view === "setup") ? "flex" : "lg:hidden flex"
            )}>
              <div className="bg-blue-600 p-2 rounded-xl">
                <ClipboardCheck className="text-white w-5 h-5" />
              </div>
              <h1 className="font-black text-sm tracking-tight leading-none uppercase">{appTitle}</h1>
            </div>
            
            <div className={cn(
              "hidden min-w-0",
              (view === "dashboard" || view === "history" || view === "reports") ? "lg:block" : "lg:hidden"
            )}>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                <span>{activeViewLabel}</span>
                {view === "reports" && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    <span>{activeControlPanel.label}</span>
                  </>
                )}
              </div>
              <p className="mt-1 text-sm font-bold text-slate-600">
                {view === "dashboard" && "Vista general de operación y seguimiento diario."}
                {view === "history" && "Consulta consolidada del historial y exportaciones."}
                {view === "reports" && activeControlPanel.description}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                    {user.displayName?.charAt(0)}
                  </div>
                  <span className="text-xs font-bold text-slate-600 hidden sm:block">{user.displayName?.split(" ")[0]}</span>
                </div>
              )}
              {!user && (
                <button 
                  onClick={handleLogin}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 transition-all hover:border-slate-300 hover:text-slate-950",
                    (view === "home" || view === "audit" || view === "setup") ? "flex" : "flex"
                  )}
                >
                  <LogIn className="w-4 h-4" />
                  Ingresar
                </button>
              )}
            </div>
          </div>
        </header>

        <main className={cn(
          "p-4 md:p-8 transition-all duration-500",
          view === "dashboard" ? "max-w-7xl mx-auto w-full" : 
          view === "setup" ? "max-w-5xl mx-auto w-full pb-32" :
          view === "audit" ? "max-w-6xl mx-auto w-full pb-32" :
          view === "home" ? "max-w-md mx-auto w-full pb-32" :
          "max-w-md mx-auto w-full lg:max-w-4xl lg:mx-0"
        )}>
          <AnimatePresence mode="wait">
          {view === "dashboard" && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 pt-4"
            >
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_380px]">
                <div className="space-y-6">
                  <div className="hero-shell rounded-[2.4rem] p-7 shadow-sm backdrop-blur space-y-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_300px] lg:items-center">
                      <div className="space-y-5">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                          Inicio operativo
                        </span>
                        <div className="space-y-3">
                          <h2 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-slate-950 md:text-[2.7rem]">Una entrada más clara, más usable y orientada a la acción.</h2>
                          <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-600 md:text-base">El objetivo del inicio no es mostrar todo, sino ayudarte a arrancar rápido. Por eso la apertura prioriza contexto, acceso rápido y lectura operativa antes que el detalle fino.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {[
                            {
                              label: "Operación",
                              title: operatingStatus,
                              detail: user ? "Sesión lista para trabajar." : "Ingresá para habilitar historial y sincronización.",
                              icon: ShieldCheck,
                              tone: "slate",
                            },
                            {
                              label: "Mes actual",
                              title: `${monthlyAudits.length} auditorías`,
                              detail: `${recentAverageScore || 0}% de promedio mensual`,
                              icon: CalendarIcon,
                              tone: "blue",
                            },
                            {
                              label: "Cobertura",
                              title: `${activeLocations || LOCATIONS.length} sedes`,
                              detail: "Actividad registrada en el historial.",
                              icon: MapPin,
                              tone: "amber",
                            },
                          ].map((item) => (
                            <div key={item.label} className="rounded-[1.5rem] border border-white/80 bg-white/80 px-4 py-4 shadow-sm">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                                  <p className="mt-2 text-sm font-black text-slate-950">{item.title}</p>
                                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{item.detail}</p>
                                </div>
                                <div className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-2xl",
                                  item.tone === "slate" && "bg-slate-950 text-white",
                                  item.tone === "blue" && "bg-blue-50 text-blue-600",
                                  item.tone === "amber" && "bg-amber-50 text-amber-600"
                                )}>
                                  <item.icon className="h-4 w-4" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button 
                            onClick={startNewAudit}
                            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95"
                          >
                            <Plus className="w-4 h-4" />
                            Nueva Auditoría
                          </button>
                          <button 
                            onClick={() => setView("history")}
                            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-900 shadow-sm transition-all hover:border-slate-300 active:scale-95"
                          >
                            <History className="w-4 h-4" />
                            Ver Historial
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-[2rem] border border-white/70 bg-white/70 p-3 shadow-inner">
                          <img
                            src="/hero-auditoria.svg"
                            alt="Panel de auditoría y control operativo"
                            className="w-full rounded-[1.5rem] border border-slate-200 bg-white"
                          />
                        </div>
                        <div className="rounded-[1.8rem] bg-slate-950 px-5 py-5 text-white shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Pulso general</p>
                          <div className="mt-3 flex items-end justify-between gap-3">
                            <div>
                              <p className="text-3xl font-black">{bestAuditScore || averageScore}%</p>
                              <p className="text-sm font-medium text-slate-300">mejor resultado histórico</p>
                            </div>
                            <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Promedio</p>
                              <p className="mt-1 text-sm font-black">{averageScore}%</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="glass-panel rounded-[2rem] p-5 shadow-sm lg:col-span-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Accesos rápidos</p>
                          <h3 className="mt-2 text-lg font-black text-slate-950">Módulos principales</h3>
                        </div>
                        <p className="text-xs font-bold text-slate-400">Abrí lo que necesitás sin pasar por menús extra.</p>
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {operationalModules.slice(0, 3).map((module) => (
                          <button
                            key={module.title}
                            onClick={module.action}
                            className="rounded-[1.6rem] border border-slate-200 bg-white px-4 py-4 text-left transition-all hover:border-slate-300 hover:bg-slate-50"
                          >
                            <div className={cn(
                              "mb-4 flex h-11 w-11 items-center justify-center rounded-2xl",
                              module.tone === "blue" && "bg-blue-50 text-blue-600",
                              module.tone === "slate" && "bg-slate-900 text-white",
                              module.tone === "emerald" && "bg-emerald-50 text-emerald-600"
                            )}>
                              <module.icon className="w-5 h-5" />
                            </div>
                            <p className="text-sm font-black text-slate-900">{module.title}</p>
                            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{module.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="glass-panel rounded-[2rem] p-5 shadow-sm space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Estado del sistema</p>
                        <h3 className="mt-2 text-lg font-black text-slate-950">Lectura rápida</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Cuenta</p>
                          <p className="mt-2 text-sm font-black text-slate-900">{user ? "Sesión activa" : "Ingreso disponible"}</p>
                          <p className="mt-2 text-sm font-medium text-slate-500">{user ? user.email : "Acceso desde el botón superior."}</p>
                        </div>
                        <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Estructura</p>
                          <p className="mt-2 text-sm font-black text-slate-900">{configuredCategoryCount} categorías activas</p>
                          <p className="mt-2 text-sm font-medium text-slate-500">General y perfiles por sucursal disponibles.</p>
                        </div>
                        <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Integración</p>
                          <p className="mt-2 text-sm font-black text-slate-900">{isSheetSyncConfigured ? "Apps Script activo" : "Sincronización pendiente"}</p>
                          <p className="mt-2 text-sm font-medium text-slate-500">Preparado para operación distribuida y espejo externo.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-panel rounded-[2.25rem] p-6 shadow-sm backdrop-blur space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actividad reciente</p>
                      <h3 className="text-lg font-black text-slate-900">Últimos movimientos</h3>
                    </div>
                    <button
                      onClick={() => setView("history")}
                      className="text-xs font-black uppercase tracking-widest text-blue-600"
                    >
                      Ver historial
                    </button>
                  </div>

                  <div className="space-y-3">
                    {recentAudits.length > 0 ? recentAudits.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedAudit(item)}
                        className="w-full rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-all hover:border-slate-300"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-900">{item.staffName || item.location}</p>
                            <p className="text-[11px] font-bold text-slate-500 mt-1">{item.role || item.items[0]?.category || "General"} · {item.date}</p>
                          </div>
                          <span className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-black",
                            item.totalScore >= 90 ? "bg-emerald-50 text-emerald-700" :
                            item.totalScore >= 70 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                          )}>
                            {item.totalScore}%
                          </span>
                        </div>
                      </button>
                    )) : (
                      <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                        <p className="text-sm font-bold text-slate-500">Todavía no hay auditorías cargadas.</p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Siguiente acción sugerida</p>
                    <p className="mt-2 text-sm font-black text-slate-900">{history.length > 0 ? "Revisar indicadores y detectar desvíos." : "Crear la primera auditoría operativa."}</p>
                    <p className="mt-2 text-sm font-medium text-slate-500">{history.length > 0 ? "Usá Control para mirar tendencia, estructura o integraciones según necesidad." : "El sistema ya está preparado para alta, ejecución y trazabilidad."}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Auditorías", value: history.length, icon: ClipboardList, color: "blue" },
                  { label: "Promedio General", value: `${Math.round(history.reduce((acc, h) => acc + h.totalScore, 0) / (history.length || 1))}%`, icon: TrendingUp, color: "emerald" },
                  { label: "Categorías", value: configuredCategoryCount, icon: Settings, color: "indigo" },
                  { label: "Meta Operativa", value: "95%", icon: Target, color: "amber" },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                      stat.color === "blue" && "bg-blue-50 text-blue-600 shadow-blue-50",
                      stat.color === "emerald" && "bg-emerald-50 text-emerald-600 shadow-emerald-50",
                      stat.color === "indigo" && "bg-indigo-50 text-indigo-600 shadow-indigo-50",
                      stat.color === "amber" && "bg-amber-50 text-amber-600 shadow-amber-50",
                    )}>
                      <stat.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                      <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900">Tendencia de Calidad</h3>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                      Puntaje %
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }}
                          domain={[0, 100]}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800 }}
                        />
                        <Area type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                  <h3 className="text-xl font-black text-slate-900">Por Categoría</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#1E293B', fontSize: 12, fontWeight: 800 }}
                          width={80}
                        />
                        <Tooltip 
                          cursor={{ fill: '#F8FAFC' }}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800 }}
                        />
                        <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={30}>
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    {categoryData.map((cat, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm font-bold text-slate-600">{cat.name}</span>
                        </div>
                        <span className="text-sm font-black text-slate-900">{cat.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === "home" && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >


              <div className="bg-gradient-to-br from-teal-700 via-teal-600 to-amber-500 rounded-[2.5rem] p-8 shadow-xl shadow-teal-100 text-center space-y-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                  <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                </div>
                
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto ring-1 ring-white/30">
                  <ClipboardCheck className="w-10 h-10 text-white" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white tracking-tight">Cabina de auditoría</h2>
                  <p className="text-teal-50 text-sm font-medium">Preparada para uso móvil, captura operativa y sincronización con tus fuentes externas.</p>
                </div>

                <div className="space-y-3 pt-2">
                  <button 
                    onClick={startNewAudit}
                    disabled={isLoggingIn}
                    className={cn(
                      "w-full bg-white text-blue-700 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-blue-50 transition-all active:scale-95 shadow-lg",
                      isLoggingIn && "opacity-70 cursor-not-allowed"
                    )}
                  >
                    <Plus className="w-5 h-5" />
                    Iniciar Ahora
                  </button>
                  
                  <button 
                    onClick={syncData}
                    disabled={isSyncing}
                    className="w-full bg-black/15 text-white border border-white/15 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black/25 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
                  >
                    <div className={cn("w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin", !isSyncing && "hidden")} />
                    {isSyncing ? "Sincronizando..." : "Sincronizar Datos"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-[2rem] border border-white/70 bg-white/80 backdrop-blur p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", isSheetSyncConfigured ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                      <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Apps Script</p>
                      <p className="text-sm font-black text-slate-900">{isSheetSyncConfigured ? "Activo" : "Pendiente"}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{isSheetSyncConfigured ? "Las auditorías pueden enviarse al endpoint configurado." : "Falta definir la URL de recepción para enviar auditorías."}</p>
                </div>
                <div className="rounded-[2rem] border border-white/70 bg-white/80 backdrop-blur p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", isHistorySyncConfigured ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">CSV público</p>
                      <p className="text-sm font-black text-slate-900">{isHistorySyncConfigured ? "Listo" : "Pendiente"}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{isHistorySyncConfigured ? "El historial puede sincronizarse desde Google Sheets." : "Definí una URL CSV publicada para refrescar reportes."}</p>
                </div>
                <div className="rounded-[2rem] border border-white/70 bg-white/80 backdrop-blur p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", user ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500")}>
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Acceso</p>
                      <p className="text-sm font-black text-slate-900">{user ? "Autenticado" : "Invitado"}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{user ? "Hay acceso a historial y persistencia en Firestore." : "Sin iniciar sesión, la app no puede consultar el historial completo."}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-gray-900">Historial Reciente</h3>
                  <button 
                    onClick={() => setView("history")}
                    className="text-sm text-gray-500 font-medium"
                  >
                    Ver todo
                  </button>
                </div>
                
                {!user ? (
                  <div className="bg-white rounded-2xl p-6 border border-dashed border-gray-300 text-center">
                    <p className="text-gray-400 text-sm italic">Inicia sesión para ver tu historial.</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 border border-dashed border-gray-300 text-center">
                    <p className="text-gray-400 text-sm">No hay auditorías registradas aún.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentAudits.map((item) => (
                      <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg",
                            item.totalScore >= 90 ? "bg-green-50 text-green-600" : 
                            item.totalScore >= 70 ? "bg-yellow-50 text-yellow-600" : "bg-red-50 text-red-600"
                          )}>
                            {item.totalScore}%
                          </div>
                          <div>
                            <p className="font-bold text-sm">{item.location} - {item.date}</p>
                            <p className="text-xs text-gray-500">{item.items.length} ítems auditados</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === "setup" && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
                <div className="space-y-6">
                  <div className="hero-shell rounded-[2.25rem] p-7 shadow-sm space-y-6">
                    <div className="space-y-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                        Alta guiada
                      </span>
                      <div>
                        <h2 className="text-3xl font-black tracking-tight text-slate-950">Configuración de auditoría</h2>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">Las plataformas de auditoría suelen trabajar este momento como un asistente: primero responsable, después sucursal y por último fecha operativa.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {[
                        { step: 1, title: "Auditor", detail: "Quién ejecuta la revisión." },
                        { step: 2, title: "Sucursal", detail: "Dónde corre la auditoría." },
                        { step: 3, title: "Fecha", detail: "Cuándo se registra el operativo." },
                      ].map((item) => {
                        const isActive = setupStep === item.step;
                        const isDone = setupStep > item.step || (item.step === 1 && session.auditorId) || (item.step === 2 && session.location) || (item.step === 3 && session.date);

                        return (
                          <button
                            key={item.step}
                            onClick={() => setSetupStep(item.step as 1 | 2 | 3)}
                            className={cn(
                              "rounded-[1.6rem] border px-4 py-4 text-left transition-all",
                              isActive ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className={cn("text-[10px] font-black uppercase tracking-[0.18em]", isActive ? "text-slate-300" : "text-slate-400")}>Paso {item.step}</p>
                                <p className="mt-2 text-sm font-black">{item.title}</p>
                                <p className={cn("mt-2 text-sm font-medium", isActive ? "text-slate-300" : "text-slate-500")}>{item.detail}</p>
                              </div>
                              <div className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-2xl text-xs font-black",
                                isActive ? "bg-white/10 text-white" : isDone ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                              )}>
                                {isDone ? <Check className="h-4 w-4" /> : `0${item.step}`}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="glass-panel rounded-[2.25rem] p-6 shadow-sm space-y-5">
                    {setupStep === 1 && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Paso 1</p>
                          <h3 className="mt-2 text-xl font-black text-slate-950">Seleccionar auditor</h3>
                          <p className="mt-2 text-sm font-medium text-slate-500">Definí el responsable operativo que va a ejecutar la auditoría.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {AUDITORS.map((auditor) => (
                            <button
                              key={auditor.id}
                              onClick={() => setSession({ ...session, auditorId: auditor.id })}
                              className={cn(
                                "flex items-center justify-between rounded-[1.6rem] border p-5 text-left transition-all",
                                session.auditorId === auditor.id
                                  ? "border-slate-950 bg-slate-950 text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "flex h-11 w-11 items-center justify-center rounded-2xl",
                                  session.auditorId === auditor.id ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
                                )}>
                                  <User className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-black">{auditor.name}</p>
                                  <p className={cn("mt-1 text-xs font-bold", session.auditorId === auditor.id ? "text-slate-300" : "text-slate-500")}>Responsable que firma y ejecuta el relevamiento.</p>
                                </div>
                              </div>
                              {session.auditorId === auditor.id && <Check className="w-5 h-5" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {setupStep === 2 && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Paso 2</p>
                          <h3 className="mt-2 text-xl font-black text-slate-950">Elegir ubicación</h3>
                          <p className="mt-2 text-sm font-medium text-slate-500">La sucursal define qué estructura se usa y a qué operación se asocia el control.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {LOCATIONS.map((loc) => (
                            <button
                              key={loc}
                              onClick={() => setSession({ ...session, location: loc as Location })}
                              className={cn(
                                "rounded-[1.6rem] border p-5 text-left transition-all",
                                session.location === loc
                                  ? "border-slate-950 bg-slate-950 text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                              )}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "flex h-11 w-11 items-center justify-center rounded-2xl",
                                    session.location === loc ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
                                  )}>
                                    <MapPin className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-black">{loc}</p>
                                    <p className={cn("mt-1 text-xs font-bold", session.location === loc ? "text-slate-300" : "text-slate-500")}>Perfil operativo y estructura aplicable.</p>
                                  </div>
                                </div>
                                {session.location === loc && <Check className="w-5 h-5" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {setupStep === 3 && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Paso 3</p>
                          <h3 className="mt-2 text-xl font-black text-slate-950">Confirmar fecha operativa</h3>
                          <p className="mt-2 text-sm font-medium text-slate-500">Definí la fecha que quedará como referencia del registro y del historial consolidado.</p>
                        </div>

                        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fecha</label>
                          <div className="relative">
                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                              type="date" 
                              value={session.date}
                              onChange={(e) => setSession({ ...session, date: e.target.value })}
                              className="w-full rounded-2xl border border-gray-200 bg-slate-50 py-4 pl-12 pr-4 font-semibold focus:outline-none"
                            />
                          </div>
                          <div className="rounded-[1.4rem] bg-slate-50 px-4 py-4 border border-slate-200">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Listo para continuar</p>
                            <p className="mt-2 text-sm font-medium text-slate-600">Con esta confirmación el sistema te deriva a la selección del puesto o categoría a auditar.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        onClick={() => {
                          if (setupStep === 1) {
                            setView("dashboard");
                            return;
                          }
                          setSetupStep((current) => (current - 1) as 1 | 2 | 3);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 hover:border-slate-300 transition-all"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        {setupStep === 1 ? "Cancelar" : "Volver"}
                      </button>

                      <button 
                        onClick={handleSetupSubmit}
                        disabled={(setupStep === 1 && !session.auditorId) || (setupStep === 2 && !session.location) || (setupStep === 3 && !session.date)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-800"
                      >
                        {setupStep === 3 ? "Ir a la auditoría" : "Continuar"}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 xl:sticky xl:top-28 h-fit">
                  <div className="glass-panel rounded-[2.25rem] p-6 shadow-sm space-y-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Estado del alta</p>
                      <h3 className="mt-2 text-xl font-black text-slate-950">Resumen operativo</h3>
                    </div>

                    <div className="rounded-[1.6rem] bg-slate-950 px-5 py-5 text-white">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Progreso</p>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-3xl font-black">{setupCompletionCount}/3</p>
                          <p className="text-sm font-medium text-slate-300">datos principales definidos</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Paso actual</p>
                          <p className="mt-1 text-sm font-black">0{setupStep}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Auditor</p>
                        <p className="mt-2 text-sm font-black text-slate-900">{selectedAuditorOption?.name ?? "Sin seleccionar"}</p>
                      </div>
                      <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Sucursal</p>
                        <p className="mt-2 text-sm font-black text-slate-900">{session.location ?? "Sin seleccionar"}</p>
                      </div>
                      <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Fecha</p>
                        <p className="mt-2 text-sm font-black text-slate-900">{session.date || "Sin definir"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Criterio profesional</p>
                    <p className="text-sm font-medium leading-relaxed text-slate-600">Separar el alta en pasos reduce errores, mejora la legibilidad en celular y deja más claro qué falta antes de empezar a auditar.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === "audit" && (
            <motion.div 
              key="audit"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {!selectedRole ? (
                <div className="space-y-6">
                  <div className="hero-shell rounded-[2.2rem] p-6 shadow-sm lg:p-7">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                      <div className="space-y-4">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                          <div className="h-2 w-2 rounded-full bg-blue-600" />
                          Selección de categoría
                        </span>
                        <div className="space-y-2">
                          <h2 className="text-2xl font-black tracking-tight text-slate-950 lg:text-3xl">Elegí qué área vas a auditar.</h2>
                          <p className="text-sm font-medium leading-relaxed text-slate-500">En celular conviene un flujo corto y táctil. En computadora tiene sentido mostrar más contexto para decidir rápido sin entrar y salir.</p>
                        </div>
                        <div className="hidden lg:grid lg:grid-cols-3 lg:gap-3">
                          <div className="rounded-[1.4rem] border border-white/80 bg-white/80 px-4 py-4 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Auditor</p>
                            <p className="mt-2 text-sm font-black text-slate-900">{selectedAuditorOption?.name ?? "Sin definir"}</p>
                          </div>
                          <div className="rounded-[1.4rem] border border-white/80 bg-white/80 px-4 py-4 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Sucursal</p>
                            <p className="mt-2 text-sm font-black text-slate-900">{session.location ?? "Sin definir"}</p>
                          </div>
                          <div className="rounded-[1.4rem] border border-white/80 bg-white/80 px-4 py-4 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Fecha</p>
                            <p className="mt-2 text-sm font-black text-slate-900">{session.date || "Sin definir"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="hidden lg:block">
                        <div className="rounded-[1.8rem] bg-slate-950 px-5 py-5 text-white shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Sugerencia</p>
                          <p className="mt-3 text-lg font-black">Empezá por la categoría más crítica del día.</p>
                          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">Después vas a poder volver a esta selección sin perder la configuración inicial del operativo.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
                    {auditCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedRole(category.name)}
                        className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 group hover:border-blue-200 hover:shadow-md transition-all active:scale-95 lg:items-start lg:text-left lg:min-h-[180px]"
                      >
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                          {category.name.includes("Asesor") && <UserCheck className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />}
                          {category.name.includes("Técnico") && <Wrench className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />}
                          {category.name.includes("Jefe") && <ShieldCheck className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />}
                          {category.name.includes("Lavadero") && <Droplets className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />}
                          {category.name.includes("Garantía") && <FileCheck className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />}
                          {category.name.includes("Repuestos") && <Package className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />}
                          {category.name.includes("Pre Entrega") && <Truck className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />}
                          {category.name.includes("Ordenes") && <FileText className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />}
                          {!["Asesor", "Técnico", "Jefe", "Lavadero", "Garantía", "Repuestos", "Pre Entrega", "Ordenes"].some(k => category.name.includes(k)) && (
                            <ClipboardList className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                          )}
                        </div>
                        <span className="font-bold text-gray-800 text-xs text-center leading-tight lg:text-sm lg:text-left">{category.name}</span>
                        <span className="hidden lg:block text-xs font-medium text-slate-500 leading-relaxed">{category.items.length} puntos de control disponibles para esta categoría.</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
                  <div className="space-y-4 lg:sticky lg:top-28 h-fit">
                    <div className={cn(
                      "pt-3 pb-2 px-4 space-y-3 rounded-[2rem] shadow-sm",
                      selectedRole === "Ordenes" ? "bg-[#EEF3F9]/95 backdrop-blur-xl" : "bg-[#F9F9F9] border border-slate-200"
                    )}>
                      <div className={cn(
                        "flex items-center justify-between rounded-[1.6rem] border px-4 py-3 shadow-sm",
                        selectedRole === "Ordenes"
                          ? "bg-gradient-to-br from-slate-950 via-[#0c2340] to-[#1d4f91] border-slate-800 text-white shadow-[0_20px_60px_rgba(12,35,64,0.35)]"
                          : "bg-white border-gray-100 text-gray-900"
                      )}>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setSelectedRole(null)}
                            className={cn(
                              "p-2 -ml-2 rounded-full shadow-sm border",
                              selectedRole === "Ordenes"
                                ? "text-slate-200 hover:text-white bg-white/10 border-white/10"
                                : "text-gray-400 hover:text-gray-900 bg-white border-gray-100"
                            )}
                          >
                            <ArrowLeft className="w-5 h-5" />
                          </button>
                          <div>
                            <h2 className="text-lg font-bold leading-tight">{selectedRole}</h2>
                            <p className={cn(
                              "text-[10px] uppercase font-black tracking-widest",
                              selectedRole === "Ordenes" ? "text-blue-100/80" : "text-gray-400"
                            )}>
                              {selectedRole === "Ordenes" ? "Control documental VW" : "Auditoría en curso"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn(
                            "text-xl font-black leading-none",
                            selectedRole === "Ordenes" ? "text-white" : "text-gray-900"
                          )}>
                            {selectedAuditItems.length > 0 ? Math.round((sessionItems.length / selectedAuditItems.length) * 100) : 0}%
                          </div>
                          <div className={cn(
                            "text-[10px] font-bold uppercase tracking-tighter",
                            selectedRole === "Ordenes" ? "text-blue-100/80" : "text-gray-400"
                          )}>Progreso</div>
                          <div className={cn(
                            "text-[10px] font-black uppercase tracking-tighter mt-1",
                            selectedRole === "Ordenes" ? "text-cyan-300" : "text-emerald-600"
                          )}>Score {calculateCurrentScore()}%</div>
                        </div>
                      </div>

                      <div className={cn(
                        "space-y-2 rounded-[1.4rem] border p-3 shadow-sm",
                        selectedRole === "Ordenes" ? "bg-white border-slate-200" : "bg-white border-slate-200"
                      )}>
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedAuditItems.length > 0 ? (sessionItems.length / selectedAuditItems.length) * 100 : 0}%` }}
                          className={cn(
                            "h-full rounded-full",
                            selectedRole === "Ordenes" ? "bg-gradient-to-r from-[#1d4f91] via-[#0066b1] to-[#00a3e0]" : "bg-blue-500"
                          )}
                        />
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <div className="flex gap-3">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-[10px] font-bold text-gray-500">{sessionItems.filter(i => i.status === 'pass').length}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-[10px] font-bold text-gray-500">{sessionItems.filter(i => i.status === 'fail').length}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                            <span className="text-[10px] font-bold text-gray-500">{sessionItems.filter(i => i.status === 'na').length}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          {sessionItems.length} de {selectedAuditItems.length}
                        </span>
                      </div>
                      {selectedRole === "Ordenes" && (
                        <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ritmo</p>
                            <p className="text-base font-black text-slate-900">{sessionItems.length}</p>
                            <p className="text-[11px] text-slate-500">cargados</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Estado</p>
                            <p className="text-base font-black text-slate-900">{sessionItems.filter(i => i.status === 'pass').length}</p>
                            <p className="text-[11px] text-slate-500">cumplen</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Desvíos</p>
                            <p className="text-base font-black text-slate-900">{sessionItems.filter(i => i.status === 'fail').length}</p>
                            <p className="text-[11px] text-slate-500">revisar</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Siguiente</p>
                            <p className="text-base font-black text-slate-900">
                              {nextPendingItemIndex >= 0 ? String(nextPendingItemIndex + 1).padStart(2, "0") : "OK"}
                            </p>
                            <p className="text-[11px] text-slate-500">pendiente</p>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                    {selectedAuditStaffOptions.length > 0 && (
                      <div className="space-y-2 rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Personal Auditado</label>
                        <div className="relative">
                          <select 
                            value={selectedStaff}
                            onChange={(e) => setSelectedStaff(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-gray-200 rounded-2xl font-bold text-sm appearance-none focus:outline-none shadow-sm"
                          >
                            <option value="">Seleccionar nombre...</option>
                            {selectedAuditStaffOptions.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {selectedRole === "Ordenes" && selectedStaff && (
                      <div className="rounded-[1.6rem] border border-slate-200 bg-white px-4 py-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1d4f91]">Meta por asesor</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-black text-slate-900">{selectedStaff}</h3>
                              <span className="text-[11px] font-bold text-slate-500">{auditedOrdersForSelectedStaff} / {ordersTargetPerAdvisor}</span>
                              <span className={cn(
                                "text-[11px] font-black uppercase tracking-wide",
                                auditedOrdersRemaining === 0 ? "text-emerald-700" : "text-amber-600"
                              )}>
                                {auditedOrdersRemaining === 0 ? "Meta alcanzada" : `Faltan ${auditedOrdersRemaining}`}
                              </span>
                            </div>
                          </div>
                          <div className="rounded-xl bg-slate-950 px-3 py-2 border border-slate-900 text-center min-w-[68px]">
                            <div className="text-lg font-black text-white leading-none">{auditedOrdersForSelectedStaff}</div>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${auditedOrdersProgress}%` }}
                            className="h-full bg-gradient-to-r from-[#0c2340] via-[#1d4f91] to-[#00a3e0] rounded-full"
                          />
                        </div>
                      </div>
                    )}

                    <div className="hidden lg:block rounded-[1.6rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Modo escritorio</p>
                      <p className="mt-2 text-sm font-black text-slate-900">Más contexto, menos salto visual</p>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">En computadora dejamos el contexto fijo a la izquierda y el trabajo principal a la derecha. En móvil el flujo sigue siendo vertical y directo.</p>
                    </div>
                  </div>

                  <div className="space-y-4 pb-12 min-w-0">
                    {selectedAuditItems.map((auditItem, idx: number) => (
                      <AuditItemRow 
                        key={auditItem.id}
                        question={auditItem.text}
                        index={idx}
                        item={session.items?.find(i => i.question === auditItem.text)}
                        required={auditItem.required}
                        showStructuredQuestion={selectedRole === "Ordenes"}
                        onStatusToggle={(status) => toggleItemStatus(auditItem.text, status)}
                        onCommentUpdate={(comment) => updateItemComment(auditItem.text, comment)}
                      />
                    ))}
                    
                    <div className="space-y-2 mt-8">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Observaciones Generales</label>
                      <textarea 
                        placeholder="Escribe aquí cualquier nota adicional sobre esta auditoría..."
                        value={session.notes || ""}
                        onChange={(e) => setSession({ ...session, notes: e.target.value })}
                        className={cn(
                          "w-full p-6 border rounded-3xl font-medium text-sm focus:outline-none shadow-sm min-h-[120px]",
                          selectedRole === "Ordenes"
                            ? "bg-white border-slate-200 text-slate-700"
                            : "bg-white border-gray-200"
                        )}
                      />
                    </div>

                    <button
                      onClick={handleAuditSubmit}
                      disabled={sessionItems.length === 0 || isSendingToSheet}
                      className={cn(
                        "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg",
                        sessionItems.length > 0 && !isSendingToSheet
                          ? (selectedRole === "Ordenes" ? "bg-slate-950 text-white shadow-slate-300 hover:bg-[#0c2340]" : "bg-green-600 text-white shadow-green-100 hover:bg-green-700")
                          : "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none"
                      )}
                    >
                      {isSendingToSheet ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Enviando al Sheet...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Enviar auditoría
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === "reports" && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 pb-12"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Control</h2>
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                  <activeControlPanel.icon className="w-4 h-4" />
                  {activeControlPanel.label}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm space-y-3">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  {controlPanels.map((panel) => (
                    <button
                      key={panel.id}
                      onClick={() => setReportsPanel(panel.id)}
                      className={cn(
                        "rounded-[1.5rem] border px-4 py-4 text-left transition-all",
                        reportsPanel === panel.id
                          ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-200"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-2xl",
                          reportsPanel === panel.id ? "bg-white/10 text-white" : "bg-white text-slate-700"
                        )}>
                          <panel.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black">{panel.label}</p>
                          <p className={cn(
                            "mt-1 text-xs font-bold",
                            reportsPanel === panel.id ? "text-slate-300" : "text-slate-500"
                          )}>
                            {panel.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Modo activo</p>
                  <p className="mt-2 text-base font-black text-slate-900">{activeControlPanel.label}</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">{activeControlPanel.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                {[
                  {
                    title: "Supervisión",
                    detail: reportsPanel === "kpis" ? "Lectura de desempeño y comparación mensual." : reportsPanel === "structure" ? "Diseño operativo de formularios y categorías." : "Conectores externos y continuidad de datos.",
                  },
                  {
                    title: "Decisión",
                    detail: reportsPanel === "kpis" ? "Detectar desvíos, priorizar focos y revisar cumplimiento." : reportsPanel === "structure" ? "Ordenar qué se audita, a quién y con qué obligatoriedad." : "Definir qué sale a Sheets y qué queda como fuente oficial.",
                  },
                  {
                    title: "Acción",
                    detail: reportsPanel === "kpis" ? "Usar filtros por puesto, persona y período." : reportsPanel === "structure" ? "Crear, editar y sincronizar plantillas por sucursal." : "Mantener URLs externas centralizadas y trazables.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-[1.6rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{item.title}</p>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </div>

              {reportsPanel === "integrations" && (
              <>
              <div className="bg-white/90 p-6 rounded-3xl shadow-sm border border-white/80 space-y-4 backdrop-blur">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Configuración de integraciones</h3>
                  <p className="text-sm text-slate-500">Centralizá las URLs externas para evitar hardcodes y simplificar el alta del sistema.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Endpoint Apps Script</label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">CSV publicado de Sheets</label>
                    <input
                      type="url"
                      value={sheetCsvUrl}
                      onChange={(e) => setSheetCsvUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">Podés precargar ambos valores desde variables Vite o guardarlos localmente desde esta pantalla.</p>
                  <button
                    onClick={saveIntegrationSettings}
                    className="px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                  >
                    Guardar configuración
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Apps Script</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{isSheetSyncConfigured ? "Conectado" : "Sin definir"}</p>
                  <p className="mt-2 text-sm font-medium text-slate-500">Usado para espejar auditorías y automatizar el envío a Google Sheets.</p>
                </div>
                <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Historial externo</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{isHistorySyncConfigured ? "Disponible" : "Pendiente"}</p>
                  <p className="mt-2 text-sm font-medium text-slate-500">Permite consumir el CSV publicado para respaldo operativo y análisis rápido.</p>
                </div>
                <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Modelo recomendado</p>
                  <p className="mt-2 text-lg font-black text-slate-900">Fuente + espejo</p>
                  <p className="mt-2 text-sm font-medium text-slate-500">Firestore como fuente de verdad y Sheets como capa operativa compartida.</p>
                </div>
              </div>
              </>
              )}

              {reportsPanel === "structure" && (
              <>

              <div className="bg-white/90 p-6 rounded-3xl shadow-sm border border-white/80 space-y-6 backdrop-blur">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Estructura de auditoría</h3>
                    <p className="text-sm text-slate-500">Creá categorías, definí personal auditable y administrá ítems obligatorios u opcionales.</p>
                    <p className="text-[11px] font-bold text-slate-400 mt-2">
                      Perfil activo: {selectedStructureScope === "global" ? "General" : selectedStructureScope} · Fuente actual: {structureStorageLabel === "cloud" ? "Firestore" : "Local"}
                      {isLoadingStructureFromCloud && " · cargando nube..."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleLoadStructureFromCloud}
                      disabled={isLoadingStructureFromCloud}
                      className="px-4 py-3 rounded-2xl bg-white text-slate-700 text-xs font-black uppercase tracking-widest border border-slate-200 hover:border-slate-300 transition-all disabled:opacity-60"
                    >
                      Cargar nube
                    </button>
                    <button
                      onClick={handleSaveStructureToCloud}
                      disabled={isSavingStructureToCloud}
                      className="px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-60"
                    >
                      {isSavingStructureToCloud ? "Guardando..." : "Guardar en nube"}
                    </button>
                    <button
                      onClick={handleResetStructure}
                      className="px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
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
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Ej. Recepción rápida"
                        className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none"
                      />
                      <textarea
                        value={newCategoryStaff}
                        onChange={(e) => setNewCategoryStaff(e.target.value)}
                        placeholder="Personal separado por coma"
                        className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none min-h-[90px] resize-none"
                      />
                      <button
                        onClick={handleAddCategory}
                        className="w-full py-3 rounded-2xl bg-slate-950 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                      >
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
                              <p className={cn(
                                "text-[11px] font-bold mt-1",
                                selectedStructureCategoryId === category.id ? "text-slate-300" : "text-slate-500"
                              )}>
                                {category.items.length} ítems · {category.staffOptions.length} personas
                              </p>
                            </div>
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.16em]",
                              selectedStructureCategoryId === category.id ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500"
                            )}>
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
                          <button
                            onClick={() => handleDeleteCategory(selectedStructureCategory.id)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                            Eliminar categoría
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Nombre visible</label>
                            <input
                              type="text"
                              value={selectedStructureCategory.name}
                              onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({ ...category, name: e.target.value }))}
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Personal auditable</label>
                            <textarea
                              value={selectedStructureCategory.staffOptions.join(", ")}
                              onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({
                                ...category,
                                staffOptions: e.target.value.split(",").map((value) => value.trim()).filter(Boolean),
                              }))}
                              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none min-h-[104px] resize-none"
                            />
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
                          </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-4 space-y-3">
                          <input
                            type="text"
                            value={newItemText}
                            onChange={(e) => setNewItemText(e.target.value)}
                            placeholder="Texto del nuevo ítem"
                            className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none"
                          />
                          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                            <input
                              type="checkbox"
                              checked={newItemRequired}
                              onChange={(e) => setNewItemRequired(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            Marcar como obligatorio
                          </label>
                          <button
                            onClick={handleAddItem}
                            className="w-full py-3 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
                          >
                            Agregar ítem
                          </button>
                        </div>

                        <div className="space-y-3">
                          {selectedStructureCategory.items.map((structureItem, index) => (
                            <div key={structureItem.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.16em] bg-slate-900 text-white">
                                    Item {String(index + 1).padStart(2, "0")}
                                  </span>
                                  <span className={cn(
                                    "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.16em] border",
                                    structureItem.required
                                      ? "border-blue-200 bg-blue-50 text-blue-700"
                                      : "border-slate-200 bg-white text-slate-500"
                                  )}>
                                    {structureItem.required ? "Obligatorio" : "Opcional"}
                                  </span>
                                </div>
                                <button
                                  onClick={() => updateCategory(selectedStructureCategory.id, (category) => ({
                                    ...category,
                                    items: category.items.filter((item) => item.id !== structureItem.id),
                                  }))}
                                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Quitar
                                </button>
                              </div>

                              <textarea
                                value={structureItem.text}
                                onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({
                                  ...category,
                                  items: category.items.map((item) =>
                                    item.id === structureItem.id ? { ...item, text: e.target.value } : item
                                  ),
                                }))}
                                className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none min-h-[96px] resize-none"
                              />

                              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={structureItem.required}
                                  onChange={(e) => updateCategory(selectedStructureCategory.id, (category) => ({
                                    ...category,
                                    items: category.items.map((item) =>
                                      item.id === structureItem.id ? { ...item, required: e.target.checked } : item
                                    ),
                                  }))}
                                  className="h-4 w-4 rounded border-slate-300"
                                />
                                Este ítem debe responderse antes de finalizar la auditoría
                              </label>
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
              </>
              )}

              {reportsPanel === "kpis" && (
              <>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Puesto</label>
                    <select 
                      value={reportFilter.role}
                      onChange={(e) => setReportFilter({ ...reportFilter, role: e.target.value as Role })}
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold"
                    >
                      {auditCategories.map(category => <option key={category.id} value={category.name}>{category.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Personal</label>
                    <select 
                      value={reportFilter.staff}
                      onChange={(e) => setReportFilter({ ...reportFilter, staff: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold"
                    >
                      <option value="">Todos</option>
                      {allStaffOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mes</label>
                    <input 
                      type="month"
                      value={reportFilter.month}
                      onChange={(e) => setReportFilter({ ...reportFilter, month: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-[#002060] text-white">
                        <th className="p-2 border border-white/20 text-left min-w-[200px]">
                          {new Date(reportFilter.month + "-02").toLocaleString('es-ES', { month: 'long' }).toUpperCase()}
                        </th>
                        {filteredReportSessions.map(s => (
                            <th key={s.id} className="p-2 border border-white/20 text-center min-w-[60px]">
                              {s.orderNumber || "S/N"}
                            </th>
                          ))
                        }
                        <th className="p-2 border border-white/20 text-center min-w-[60px] bg-blue-900">PROM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportCategoryItems.map((questionItem, qIdx) => {
                        const question = questionItem.text;
                        const sessions = filteredReportSessions;
                        
                        const scores = sessions.map(s => {
                          const item = s.items.find(i => i.question === question);
                          if (!item || item.status === "na") return null;
                          return item.status === "pass" ? 1 : 0;
                        });

                        const validScores = scores.filter(s => s !== null) as number[];
                        const avg = validScores.length > 0 
                          ? validScores.reduce((a, b) => a + b, 0) / validScores.length 
                          : 0;

                        return (
                          <tr key={qIdx} className={qIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="p-2 border border-gray-100 font-bold text-gray-700">
                              {question}
                            </td>
                            {scores.map((score, sIdx) => (
                              <td 
                                key={sIdx} 
                                className={cn(
                                  "p-2 border border-gray-100 text-center font-black",
                                  score === 1 ? "bg-green-50 text-green-600" : 
                                  score === 0 ? "bg-red-50 text-red-600" : "text-gray-300"
                                )}
                              >
                                {score === null ? "-" : score}
                              </td>
                            ))}
                            <td className={cn(
                              "p-2 border border-gray-100 text-center font-black",
                              avg >= 0.9 ? "text-green-600" : avg >= 0.7 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {avg.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              </>
              )}
            </motion.div>
          )}
          {view === "history" && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setView("dashboard")}
                    className="p-2 -ml-2 text-gray-400 hover:text-gray-900"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <h2 className="text-2xl font-bold">Historial</h2>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <button
                    onClick={() => setHistoryPanel("exports")}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-xl border border-slate-200 font-bold text-xs uppercase tracking-widest hover:border-slate-300 transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    Exportación
                  </button>
                  <button 
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-100 transition-all"
                  >
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
                    <p className={cn("mt-1 text-xs font-bold", historyPanel === "records" ? "text-slate-300" : "text-slate-500")}>
                      Vista operativa con búsqueda y lectura inmediata.
                    </p>
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
                    <p className={cn("mt-1 text-xs font-bold", historyPanel === "exports" ? "text-slate-300" : "text-slate-500")}>
                      Salida a CSV y control de fuente externa.
                    </p>
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
                          <input 
                            type="text" 
                            placeholder="Buscar por asesor, OR o ubicación..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Lectura</p>
                            <p className="mt-2 text-sm font-black text-slate-900">Listado maestro</p>
                            <p className="mt-2 text-sm font-medium text-slate-500">Seleccioná un registro para abrir el detalle completo.</p>
                          </div>
                          <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Filtro</p>
                            <p className="mt-2 text-sm font-black text-slate-900">Búsqueda unificada</p>
                            <p className="mt-2 text-sm font-medium text-slate-500">Soporta asesor, categoría, ubicación y OR.</p>
                          </div>
                          <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Acción</p>
                            <p className="mt-2 text-sm font-black text-slate-900">Exportar o sincronizar</p>
                            <p className="mt-2 text-sm font-medium text-slate-500">Pasá a la segunda pestaña para salida y verificación externa.</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {filteredHistory.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setSelectedAudit(item)}
                            className={cn(
                              "w-full rounded-[2rem] border p-5 text-left shadow-sm transition-all",
                              selectedHistoryAudit?.id === item.id
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn(
                                  "w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0",
                                  selectedHistoryAudit?.id === item.id
                                    ? "bg-white/10 text-white"
                                    : item.totalScore >= 90 ? "bg-green-50 text-green-600" : item.totalScore >= 70 ? "bg-yellow-50 text-yellow-600" : "bg-red-50 text-red-600"
                                )}>
                                  {item.totalScore}%
                                </div>
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
                                <span className={cn("text-[10px] font-black uppercase tracking-widest leading-none mb-1", selectedHistoryAudit?.id === item.id ? "text-slate-300" : "text-gray-400")}>
                                  {item.items[0]?.category || "General"}
                                </span>
                                {item.orderNumber && (
                                  <span className={cn("text-xs font-black", selectedHistoryAudit?.id === item.id ? "text-cyan-300" : "text-blue-600")}>OR: {item.orderNumber}</span>
                                )}
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
                            <div className={cn(
                              "rounded-2xl px-4 py-3 text-lg font-black",
                              selectedHistoryAudit.totalScore >= 90 ? "bg-green-50 text-green-600" : selectedHistoryAudit.totalScore >= 70 ? "bg-yellow-50 text-yellow-600" : "bg-red-50 text-red-600"
                            )}>
                              {selectedHistoryAudit.totalScore}%
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Personal</p>
                              <p className="mt-2 text-sm font-black text-slate-900">{selectedHistoryAudit.staffName || "N/A"}</p>
                            </div>
                            <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ubicación</p>
                              <p className="mt-2 text-sm font-black text-slate-900">{selectedHistoryAudit.location}</p>
                            </div>
                            {selectedHistoryAudit.orderNumber && (
                              <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 col-span-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Orden</p>
                                <p className="mt-2 text-sm font-black text-blue-600">{selectedHistoryAudit.orderNumber}</p>
                              </div>
                            )}
                          </div>

                          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Resultados por ítem</p>
                            {selectedHistoryAudit.items.map((item, idx) => (
                              <div key={idx} className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 space-y-2">
                                <div className="flex items-start justify-between gap-4">
                                  <p className="text-xs font-bold leading-snug text-slate-700">{item.question}</p>
                                  <span className={cn(
                                    "shrink-0 rounded-lg px-2 py-1 text-[10px] font-black uppercase",
                                    item.status === "pass" ? "bg-green-100 text-green-600" : item.status === "fail" ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-500"
                                  )}>
                                    {item.status === "pass" ? "Cumple" : item.status === "fail" ? "No cumple" : "N/A"}
                                  </span>
                                </div>
                                {item.comment && <p className="text-[11px] italic text-slate-500">"{item.comment}"</p>}
                              </div>
                            ))}
                          </div>

                          {selectedHistoryAudit.notes && (
                            <div className="rounded-[1.4rem] border border-blue-100 bg-blue-50 px-4 py-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-400">Notas generales</p>
                              <p className="mt-2 text-sm leading-relaxed text-blue-800">{selectedHistoryAudit.notes}</p>
                            </div>
                          )}
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
                        <button 
                          onClick={exportToCSV}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 transition-all"
                        >
                          <Save className="w-4 h-4" />
                          Exportar ahora
                        </button>
                      </div>
                      <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Fuente externa</p>
                        <p className="text-sm font-medium text-slate-500">Leer el CSV publicado permite verificar consistencia y operación fuera de la app.</p>
                        <button 
                          onClick={syncData}
                          disabled={isSyncing || !isHistorySyncConfigured}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 hover:border-slate-300 transition-all disabled:opacity-50"
                        >
                          <Clock className="w-4 h-4" />
                          {isSyncing ? "Sincronizando..." : "Leer fuente"}
                        </button>
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
                      <div className="rounded-[1.4rem] bg-slate-50 px-4 py-4 border border-slate-200">
                        <p className="text-sm font-black text-slate-900">CSV publicado</p>
                        <p className="mt-2 text-sm font-medium text-slate-500">{isHistorySyncConfigured ? "Configurado para lectura externa." : "Todavía no configurado."}</p>
                      </div>
                      <div className="rounded-[1.4rem] bg-slate-50 px-4 py-4 border border-slate-200">
                        <p className="text-sm font-black text-slate-900">Total de registros</p>
                        <p className="mt-2 text-sm font-medium text-slate-500">{history.length} auditorías disponibles para exportar.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Modal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={submitAudit}
        title="¿Finalizar Auditoría?"
        message={`Quedan ${optionalPendingCount} ítems opcionales sin responder. ¿Deseás finalizar igualmente?`}
      />

      <AnimatePresence>
        {selectedAudit && view !== "history" && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAudit(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-gray-900 leading-tight">Detalles de Auditoría</h3>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                    {selectedAudit.role || selectedAudit.items[0]?.category} - {selectedAudit.date}
                  </p>
                </div>
                <div className={cn(
                  "px-4 py-2 rounded-xl font-black text-lg",
                  selectedAudit.totalScore >= 90 ? "bg-green-50 text-green-600" : 
                  selectedAudit.totalScore >= 70 ? "bg-yellow-50 text-yellow-600" : "bg-red-50 text-red-600"
                )}>
                  {selectedAudit.totalScore}%
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Personal</p>
                    <p className="text-sm font-bold text-gray-700">{selectedAudit.staffName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ubicación</p>
                    <p className="text-sm font-bold text-gray-700">{selectedAudit.location}</p>
                  </div>
                  {selectedAudit.orderNumber && (
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Número de OR</p>
                      <p className="text-sm font-bold text-blue-600">{selectedAudit.orderNumber}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resultados por Ítem</p>
                  {selectedAudit.items.map((item, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-2xl space-y-2">
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-xs font-bold text-gray-700 leading-snug">{item.question}</p>
                        <span className={cn(
                          "text-[10px] font-black uppercase px-2 py-1 rounded-md shrink-0",
                          item.status === "pass" ? "bg-green-100 text-green-600" : 
                          item.status === "fail" ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-500"
                        )}>
                          {item.status === "pass" ? "Cumple" : item.status === "fail" ? "No Cumple" : "N/A"}
                        </span>
                      </div>
                      {item.comment && (
                        <p className="text-[10px] text-gray-500 italic">"{item.comment}"</p>
                      )}
                    </div>
                  ))}
                </div>

                {selectedAudit.notes && (
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Notas Generales</p>
                    <p className="text-xs text-blue-700 leading-relaxed">{selectedAudit.notes}</p>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-gray-100">
                <button 
                  onClick={() => setSelectedAudit(null)}
                  className="w-full py-4 rounded-2xl font-black text-white bg-gray-900 hover:bg-black transition-all"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 px-6 py-4 flex items-center justify-around z-50 lg:hidden",
        (view === "home" || view === "audit" || view === "setup") ? "flex" : "hidden"
      )}>
        <button 
          onClick={() => setView("dashboard")}
          className={cn(
            "flex flex-col items-center gap-1 transition-all active:scale-90",
            view === "dashboard" ? "text-blue-600" : "text-slate-400"
          )}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Panel</span>
        </button>
        <button 
          onClick={startNewAudit}
          className={cn(
            "flex flex-col items-center gap-1 transition-all active:scale-90",
            (view === "setup" || view === "audit") ? "text-blue-600" : "text-slate-400"
          )}
        >
          <Plus className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Nuevo</span>
        </button>
        <button 
          onClick={() => setView("history")}
          className={cn(
            "flex flex-col items-center gap-1 transition-all active:scale-90",
            view === "history" ? "text-blue-600" : "text-slate-400"
          )}
        >
          <History className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Historial</span>
        </button>
        <button 
          onClick={() => {
            setReportsPanel("kpis");
            setView("reports");
          }}
          className={cn(
            "flex flex-col items-center gap-1 transition-all active:scale-90",
            view === "reports" ? "text-blue-600" : "text-slate-400"
          )}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Control</span>
        </button>
      </nav>
    </div>
  </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuditApp />
    </ErrorBoundary>
  );
}


