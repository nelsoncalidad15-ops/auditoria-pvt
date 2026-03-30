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
  ChevronRight, 
  XCircle, 
  Save,
  History,
  Plus,
  ArrowLeft,
  Check,
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
  AlertCircle,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, createClientId } from "./lib/utils";
import { buildAuditSyncPayload, sendAuditToWebhook } from "./services/audit-sync";
import { generateAuditPdfReport } from "./services/audit-report-pdf";
import { 
  LOCATIONS, 
  AUDITORS,
  OR_PARTICIPANTS,
  OR_ROLE_LABELS
} from "./constants";
import { AuditSession, AuditTemplateItem, Location, OrResponsibleRole, Role } from "./types";
import { buildOrderAuditItems, calculateAuditCompliance, calculateRoleScores } from "./services/or-audit";
import { auth, googleProvider, isFirebaseConfigured } from "./firebase";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from "firebase/auth";
import Papa from "papaparse";
import { AuditItemRow } from "./components/audit/AuditItemRow";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { HistoryView } from "./components/history/HistoryView";
import { StructurePanel } from "./components/reports/StructurePanel";
import { ControlKpisPanel } from "./components/reports/ControlKpisPanel";
import { DashboardView } from "./components/views/DashboardView";
import { Button } from "./components/ui/Button";
import { AppModal } from "./components/ui/Modal";
import { useDashboardMetrics } from "./hooks/useDashboardMetrics";
import { useAuditDrafts } from "./hooks/useAuditDrafts";
import { useHashNavigation } from "./hooks/useHashNavigation";
import { useAuditStructure } from "./hooks/useAuditStructure";
import { useAuditSync } from "./hooks/useAuditSync";

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

interface CompletedAuditReport {
  role: Role;
  session: AuditSession;
  auditorName: string;
  templateItems: AuditTemplateItem[];
}

function buildAuditBatchName(
  location: Location,
  dateValue: string | undefined,
  existingBatchNames: Iterable<string>,
  formatMonthLabel: (dateValue?: string) => string,
) {
  const resolvedDate = dateValue || new Date().toISOString().split("T")[0];
  const nextIndex = new Set(Array.from(existingBatchNames).filter(Boolean)).size + 1;
  return `Auditoria de procesos - ${location} - ${formatMonthLabel(resolvedDate)} (${nextIndex})`;
}

function AuditApp() {
  const appTitle = import.meta.env.VITE_APP_TITLE?.trim() || "Auditoría OR Postventa VW";
  const contentContainerRef = React.useRef<HTMLDivElement | null>(null);
  const envWebhookUrl = import.meta.env.VITE_APPS_SCRIPT_URL?.trim() || "";
  const envSheetCsvUrl = import.meta.env.VITE_SHEET_CSV_URL?.trim() || "";
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<"dashboard" | "home" | "setup" | "audit" | "history" | "reports">("dashboard");
  const [isSyncing, setIsSyncing] = useState(false);
  const [session, setSession] = useState<Partial<AuditSession>>({
    date: new Date().toISOString().split("T")[0],
    items: []
  });
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAudit, setSelectedAudit] = useState<AuditSession | null>(null);
  const [reportsPanel, setReportsPanel] = useState<"kpis" | "structure" | "integrations">("kpis");
  const [historyPanel, setHistoryPanel] = useState<"records" | "exports">("records");
  const [webhookUrl, setWebhookUrl] = useState<string>(localStorage.getItem("webhookUrl") || envWebhookUrl);
  const [sheetCsvUrl, setSheetCsvUrl] = useState<string>(localStorage.getItem("sheetCsvUrl") || envSheetCsvUrl);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSendingToSheet, setIsSendingToSheet] = useState(false);
  const [isDashboardUnlocked, setIsDashboardUnlocked] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem("dashboardUnlocked") === "1";
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [focusedAuditItemId, setFocusedAuditItemId] = useState<string | null>(null);
  const [completedAuditReports, setCompletedAuditReports] = useState<CompletedAuditReport[]>([]);
  const [showBatchReportModal, setShowBatchReportModal] = useState(false);
  const isFirebaseEnabled = isFirebaseConfigured && Boolean(auth) && Boolean(googleProvider);

  const formatAuditMonthLabel = React.useCallback((dateValue?: string) => {
    const parsedDate = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
    const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long" }).format(parsedDate).trim();
    return monthLabel ? monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) : "Mes";
  }, []);

  const ensureSessionIdentity = React.useCallback((currentSession: Partial<AuditSession>) => {
    if (currentSession.id) {
      return currentSession;
    }

    return {
      ...currentSession,
      id: createClientId(),
      date: currentSession.date || new Date().toISOString().split("T")[0],
    };
  }, []);

  const sessionItems = session.items ?? [];
  const hasWebhookUrl = webhookUrl.trim().length > 0;
  const hasSheetCsvUrl = sheetCsvUrl.trim().length > 0;
  const isSheetSyncConfigured = hasWebhookUrl;
  const isHistorySyncConfigured = hasWebhookUrl || hasSheetCsvUrl;
  const {
    history,
    localAuditHistory,
    isUsingExternalHistory,
    historySyncModeLabel,
    upsertLocalAuditHistory,
    refreshExternalHistory,
    prependExternalAudit,
    saveToFirestore,
  } = useAuditSync({
    isAuthReady,
    user,
    hasWebhookUrl,
    webhookUrl,
    hasSheetCsvUrl,
  });
  const {
    selectedStructureScope,
    setSelectedStructureScope,
    auditCategories,
    selectedAuditCategory,
    selectedStructureCategory,
    selectedStructureCategoryId,
    setSelectedStructureCategoryId,
    isLoadingStructureFromCloud,
    isSavingStructureToCloud,
    structureStorageLabel,
    reportFilter,
    setReportFilter,
    reportCategoryItems,
    allStaffOptions,
    configuredCategoryCount,
    newCategoryName,
    setNewCategoryName,
    newCategoryDescription,
    setNewCategoryDescription,
    newCategoryStaff,
    setNewCategoryStaff,
    newItemText,
    setNewItemText,
    newItemDescription,
    setNewItemDescription,
    newItemBlock,
    setNewItemBlock,
    newItemSector,
    setNewItemSector,
    newItemResponsibleRoles,
    setNewItemResponsibleRoles,
    newItemPriority,
    setNewItemPriority,
    newItemGuidance,
    setNewItemGuidance,
    newItemRequired,
    setNewItemRequired,
    newItemAllowsNa,
    setNewItemAllowsNa,
    newItemWeight,
    setNewItemWeight,
    newItemActive,
    setNewItemActive,
    newItemRequiresCommentOnFail,
    setNewItemRequiresCommentOnFail,
    updateCategory,
    handleAddCategory,
    handleDeleteCategory,
    handleAddItem,
    handleResetStructure,
    handleLoadStructureFromCloud,
    handleSaveStructureToCloud,
  } = useAuditStructure({
    isAuthReady,
    isCloudStructureAvailable: isFirebaseEnabled,
    hasAuthenticatedUser: Boolean(user),
    userEmail: user?.email,
    selectedRole,
    setSelectedRole,
    setSelectedStaff,
    sessionLocation: session.location,
  });
  const getQuestionOrder = (text: string) => {
    const match = text.trim().match(/^(\d+)/);
    return match ? Number.parseInt(match[1], 10) : Number.POSITIVE_INFINITY;
  };
  const selectedAuditItems = [...(selectedAuditCategory?.items ?? [])].sort((left, right) => {
    const leftOrder = left.order ?? getQuestionOrder(left.text);
    const rightOrder = right.order ?? getQuestionOrder(right.text);
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.text.localeCompare(right.text);
  });
  const isOrdersAudit = selectedRole === "Ordenes";
  const sessionOrderItems = isOrdersAudit
    ? buildOrderAuditItems(selectedAuditItems, sessionItems, selectedRole || "Ordenes")
    : sessionItems;
  const selectedAuditStaffOptions = selectedAuditCategory?.staffOptions ?? [];
  const sessionParticipants = session.participants ?? {
    asesorServicio: "",
    tecnico: "",
    controller: "",
    lavador: "",
    repuestos: "",
  };
  const currentOrCompliance = isOrdersAudit
    ? calculateAuditCompliance(sessionOrderItems)
    : {
        compliance: (() => {
          const validItems = sessionItems.filter((item) => item.status !== "na");
          if (validItems.length === 0) {
            return 0;
          }

          const passItems = validItems.filter((item) => item.status === "pass");
          return Math.round((passItems.length / validItems.length) * 100);
        })(),
        obtainedWeight: 0,
        totalApplicableWeight: 0,
        itemsCount: sessionItems.length,
      };
  const currentOrRoleScores = isOrdersAudit ? calculateRoleScores(sessionOrderItems) : [];
  const ORDERS_TARGET_PER_ADVISOR = 10;
  const ORDERS_TARGET_ADVISORS = 2;
  const currentAuditBatchName = session.auditBatchName?.trim() || (session.location
    ? buildAuditBatchName(
        session.location,
        session.date,
        history
          .filter((auditSession) => auditSession.location === session.location && auditSession.date.startsWith((session.date || "").slice(0, 7)) && auditSession.auditBatchName?.trim())
          .map((auditSession) => auditSession.auditBatchName!.trim()),
        formatAuditMonthLabel,
      )
    : "");
  const sampledOrdersHistory = Array.from(
    [...history, ...completedAuditReports.map((report) => report.session)]
      .filter((auditSession) => auditSession.entityType === "or" && auditSession.auditBatchName?.trim() === currentAuditBatchName)
      .reduce((acc, auditSession) => {
        if (!acc.has(auditSession.id)) {
          acc.set(auditSession.id, auditSession);
        }
        return acc;
      }, new Map<string, AuditSession>())
      .values()
  );
  const sampledOrdersByAdvisor = sampledOrdersHistory.reduce((acc, auditSession) => {
    const advisorName = auditSession.participants?.asesorServicio?.trim() || auditSession.staffName?.trim();
    if (!advisorName) {
      return acc;
    }

    acc.set(advisorName, (acc.get(advisorName) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
  const sampledOrdersProgress = Math.round(
    (Array.from(sampledOrdersByAdvisor.values())
      .sort((left, right) => right - left)
      .slice(0, ORDERS_TARGET_ADVISORS)
      .reduce((total, advisorCount) => total + Math.min(advisorCount, ORDERS_TARGET_PER_ADVISOR), 0)
      / (ORDERS_TARGET_PER_ADVISOR * ORDERS_TARGET_ADVISORS || 1))
      * 100
  );
  const {
    rankingPanels,
    recentMonthlyDashboardData,
    recentAudits,
    currentMonthDashboard,
    monthlyCriticalAudits,
    currentMonthRoleData,
    currentMonthStaffData,
    currentMonthRoleDistributionData,
    currentMonthUniqueRoles,
    currentMonthUniqueStaff,
    dashboardDateLabel,
    dashboardAlerts,
  } = useDashboardMetrics(history);
  const selectedAuditorOption = AUDITORS.find((auditor) => auditor.id === session.auditorId) ?? null;
  const auditBatchDisplayName = session.auditBatchName?.trim() || (session.location
    ? buildAuditBatchName(
        session.location,
        session.date,
        history
          .filter((auditSession) => auditSession.location === session.location && auditSession.date.startsWith((session.date || "").slice(0, 7)) && auditSession.auditBatchName?.trim())
          .map((auditSession) => auditSession.auditBatchName!.trim()),
        formatAuditMonthLabel,
      )
    : "");
  const optionalPendingCount = selectedAuditItems.filter(
    (auditItem) => !sessionItems.some((item) => item.question === auditItem.text && item.status)
  ).length;
  const failItemsWithoutCommentCount = selectedAuditItems.filter((auditItem) => {
    if (!auditItem.requiresCommentOnFail) {
      return false;
    }

    const answeredItem = sessionItems.find((item) => item.question === auditItem.text);
    return answeredItem?.status === "fail" && !answeredItem.comment?.trim();
  }).length;
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
  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "home", label: "Nueva Auditoría", icon: Plus },
    { id: "history", label: "Historial", icon: History },
    { id: "reports", label: "Control", icon: BarChart3 },
  ];
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
  const selectedHistoryAudit = view === "history" ? selectedAudit : null;
  const historyAverageScore = Math.round(filteredHistory.reduce((acc, item) => acc + item.totalScore, 0) / (filteredHistory.length || 1));
  const nonCompliantAudits = filteredHistory.filter((item) => item.totalScore < 90).length;
  const latestHistoryItem = filteredHistory[0] ?? null;

  const resumeDraftSession = React.useCallback((draft: {
    id: string;
    date: string;
    auditBatchName?: string;
    auditorId?: string;
    location?: Location;
    staffName?: string;
    role?: Role;
    items: AuditSession["items"];
    orderNumber?: string;
    notes?: string;
    participants?: AuditSession["participants"];
  }) => {
    setSession({
      id: draft.id,
      date: draft.date,
      auditBatchName: draft.auditBatchName,
      auditorId: draft.auditorId,
      location: draft.location,
      orderNumber: draft.orderNumber,
      notes: draft.notes,
      participants: draft.participants,
      items: draft.items ?? [],
    });
    setSelectedRole(draft.role ?? null);
    setSelectedStaff(draft.staffName ?? "");
    setView(draft.role ? "audit" : "setup");
  }, []);

  const {
    sortedDraftAudits,
    removeDraftAudit,
    resumeDraftAudit,
  } = useAuditDrafts({
    selectedRole,
    selectedStaff,
    session,
    sessionItems,
    view,
    onResume: resumeDraftSession,
  });

  const createAuditBatchName = React.useCallback((location: Location, dateValue?: string) => {
    const resolvedDate = dateValue || new Date().toISOString().split("T")[0];
    const monthKey = resolvedDate.slice(0, 7);
    return buildAuditBatchName(
      location,
      resolvedDate,
      [...history, ...sortedDraftAudits]
        .filter((auditSession) => auditSession.location === location && auditSession.date.startsWith(monthKey) && auditSession.auditBatchName?.trim())
        .map((auditSession) => auditSession.auditBatchName!.trim()),
      formatAuditMonthLabel,
    );
  }, [formatAuditMonthLabel, history, sortedDraftAudits]);

  const ensureSessionMetadata = React.useCallback((currentSession: Partial<AuditSession>) => {
    const sessionWithIdentity = ensureSessionIdentity(currentSession);
    if (sessionWithIdentity.auditBatchName || !sessionWithIdentity.location) {
      return sessionWithIdentity;
    }

    return {
      ...sessionWithIdentity,
      auditBatchName: createAuditBatchName(sessionWithIdentity.location, sessionWithIdentity.date),
    };
  }, [createAuditBatchName, ensureSessionIdentity]);

  const clearSelectedRole = React.useCallback(() => {
    setSelectedRole(null);
    setSelectedStaff("");
  }, []);

  const { handleTopbarBack } = useHashNavigation({
    view,
    reportsPanel,
    selectedRole,
    setView,
    setReportsPanel,
    clearSelectedRole,
  });

  const getAuditItemStatusLabel = (status?: "pass" | "fail" | "na") => {
    if (status === "pass") return "Cumple";
    if (status === "fail") return "No cumple";
    if (status === "na") return "N/A";
    return "Pendiente";
  };

  const getSectionScores = (templateItems: AuditTemplateItem[], auditSession: AuditSession) =>
    Array.from(
      templateItems.reduce((acc, item) => {
        const blockName = item.block?.trim() || "General";
        const current = acc.get(blockName) ?? [];
        current.push(item);
        acc.set(blockName, current);
        return acc;
      }, new Map<string, AuditTemplateItem[]>())
    ).map(([sectionName, items]) => {
      const answers = items.map((templateItem) => auditSession.items.find((sessionItem) => sessionItem.question === templateItem.text));
      const passCount = answers.filter((answer) => answer?.status === "pass").length;
      const failCount = answers.filter((answer) => answer?.status === "fail").length;
      const naCount = answers.filter((answer) => answer?.status === "na").length;
      const pendingCount = answers.filter((answer) => !answer).length;
      const validCount = passCount + failCount;

      return {
        sectionName,
        passCount,
        failCount,
        naCount,
        pendingCount,
        score: validCount > 0 ? Math.round((passCount / validCount) * 100) : 0,
      };
    });

  useEffect(() => {
    if (!focusedAuditItemId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const target = document.getElementById(`audit-item-${focusedAuditItemId}`);
      if (!target) {
        return;
      }

      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);

    const clearId = window.setTimeout(() => setFocusedAuditItemId(null), 2600);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(clearId);
    };
  }, [focusedAuditItemId]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [view, reportsPanel]);

  useEffect(() => {
    if ((view === "setup" || view === "audit") && (!session.id || (session.location && !session.auditBatchName))) {
      setSession((current) => ensureSessionMetadata(current));
    }
  }, [ensureSessionMetadata, session.auditBatchName, session.id, session.location, view]);

  useEffect(() => {
    contentContainerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [view, reportsPanel, selectedRole]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem("dashboardUnlocked", isDashboardUnlocked ? "1" : "0");
  }, [isDashboardUnlocked]);

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
    if (!auth || !isFirebaseEnabled) {
      setUser(null);
      setIsAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, [isFirebaseEnabled]);

  const handleLogin = async () => {
    if (!auth || !googleProvider || !isFirebaseEnabled) {
      alert("Firebase está desactivado en este entorno. La app funciona en modo Google Sheets y almacenamiento local.");
      return;
    }

    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        setIsLoggingIn(false);
        return;
      }

      console.error("Login failed:", error);

      if (error.code === 'auth/popup-blocked') {
        alert("El navegador bloqueó la ventana de acceso. Permití popups e intentá de nuevo.");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("Este dominio no está habilitado. Agregalo en Firebase Authentication > Settings > Authorized domains.");
      } else if (error.code === 'auth/operation-not-allowed') {
        alert("Google no está habilitado como método de acceso en Firebase Authentication.");
      } else if (error.code === 'auth/invalid-api-key') {
        alert("La configuración de Firebase es inválida. Revisá la API key del proyecto.");
      } else {
        alert("No se pudo iniciar sesión con Google. Revisá la configuración de Firebase Authentication.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (!auth || !isFirebaseEnabled) {
      setUser(null);
      setView("dashboard");
      return;
    }

    try {
      await signOut(auth);
      setView("dashboard");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const startNewAudit = () => {
    setCompletedAuditReports([]);
    setShowBatchReportModal(false);
    setSelectedAudit(null);
    setSession({
      id: createClientId(),
      date: new Date().toISOString().split("T")[0],
      auditBatchName: undefined,
      participants: {
        asesorServicio: "",
        tecnico: "",
        controller: "",
        lavador: "",
        repuestos: "",
      },
      items: []
    });
    setSelectedRole(null);
    setSelectedStaff("");
    setView("setup");
  };

  const handleSetupSubmit = () => {
    if (session.auditorId && session.location) {
      setSession((current) => ensureSessionMetadata(current));
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

    if (selectedRole === "Ordenes" && !/^\d{6}$/.test(session.orderNumber?.trim() || "")) {
      alert("Ingresá un número de OR válido de 6 dígitos.");
      return;
    }

    if (selectedRole === "Ordenes" && !session.participants?.asesorServicio?.trim()) {
      alert("Completá el asesor de servicio antes de cerrar la OR.");
      return;
    }

    if (failItemsWithoutCommentCount > 0) {
      alert(`Hay ${failItemsWithoutCommentCount} desvíos que requieren observación obligatoria antes del cierre.`);
      return;
    }
    
    if (optionalPendingCount > 0) {
      setShowConfirmModal(true);
      return;
    }
    submitAudit();
  };

  const focusAuditItem = (auditItem: AuditTemplateItem) => {
    setFocusedAuditItemId(auditItem.id);
  };

  const submitAudit = async () => {
    if (sessionItems.length === 0) return;

    setIsSendingToSheet(true);

    const normalizedSession = ensureSessionMetadata(session);

    const finalItems = isOrdersAudit ? sessionOrderItems : sessionItems;
    const complianceMetrics = calculateAuditCompliance(finalItems);
    const roleScores = isOrdersAudit ? calculateRoleScores(finalItems) : [];

    const completeSession: AuditSession = {
      ...normalizedSession as AuditSession,
      staffName: selectedRole === "Ordenes" ? session.participants?.asesorServicio || selectedStaff : selectedStaff,
      role: selectedRole!,
      orderNumber: selectedRole === "Ordenes" ? session.orderNumber?.trim() || undefined : undefined,
      totalScore: complianceMetrics.compliance,
      items: finalItems,
      participants: session.participants,
      roleScores,
      entityType: selectedRole === "Ordenes" ? "or" : "general",
    };

    const auditorName = AUDITORS.find((auditor) => auditor.id === completeSession.auditorId)?.name || "N/A";
    let savedRemotely = false;
    let syncWarning: string | null = null;

    try {
      if (hasWebhookUrl) {
        const payload = buildAuditSyncPayload({
          session: completeSession,
          auditorName,
          submittedByEmail: user?.email,
        });

        await sendAuditToWebhook(webhookUrl, payload);
        prependExternalAudit(completeSession);
        void refreshExternalHistory().catch((refreshError) => {
          console.error("External history refresh after submit failed:", refreshError);
        });
        savedRemotely = true;
      }

      if (user && isFirebaseEnabled) {
        try {
          await saveToFirestore(completeSession);
          savedRemotely = true;
        } catch (error) {
          console.error("Firestore secondary save failed:", error);
          if (!hasWebhookUrl) {
            throw error;
          }
          syncWarning = "La auditoría se envió, pero no quedó guardada en la persistencia secundaria.";
        }
      }

      if (!savedRemotely) {
        upsertLocalAuditHistory(completeSession);
      }

      setCompletedAuditReports((current) => [
        {
          role: completeSession.role || selectedRole!,
          session: completeSession,
          auditorName,
          templateItems: selectedAuditItems,
        },
        ...current.filter((report) => report.role !== (completeSession.role || selectedRole!)),
      ]);

      if (session.id) {
        removeDraftAudit(session.id);
      }

      setShowConfirmModal(false);
      setIsSendingToSheet(false);
      setSelectedRole(null);
      setSelectedStaff("");
      setView("audit");
      setSession({
        id: createClientId(),
        date: completeSession.date,
        auditBatchName: completeSession.auditBatchName,
        auditorId: completeSession.auditorId,
        location: completeSession.location,
        participants: isOrdersAudit ? {
          asesorServicio: "",
          tecnico: "",
          controller: "",
          lavador: "",
          repuestos: "",
        } : undefined,
        items: [],
      });

      if (!savedRemotely) {
        alert("Auditoría guardada en este dispositivo.");
      } else if (syncWarning) {
        alert(syncWarning);
      } else if (hasWebhookUrl) {
        alert("Auditoría guardada correctamente.");
      }
    } catch (error) {
      console.error("Submit audit failed:", error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      upsertLocalAuditHistory(completeSession);

      setCompletedAuditReports((current) => [
        {
          role: completeSession.role || selectedRole!,
          session: completeSession,
          auditorName,
          templateItems: selectedAuditItems,
        },
        ...current.filter((report) => report.role !== (completeSession.role || selectedRole!)),
      ]);

      if (session.id) {
        removeDraftAudit(session.id);
      }

      setShowConfirmModal(false);
      setIsSendingToSheet(false);
      setSelectedRole(null);
      setSelectedStaff("");
      setView("audit");
      setSession({
        id: createClientId(),
        date: completeSession.date,
        auditBatchName: completeSession.auditBatchName,
        auditorId: completeSession.auditorId,
        location: completeSession.location,
        participants: isOrdersAudit ? {
          asesorServicio: "",
          tecnico: "",
          controller: "",
          lavador: "",
          repuestos: "",
        } : undefined,
        items: [],
      });

      if (isFirebaseEnabled && (errorMessage.includes("Missing or insufficient permissions") || errorMessage.includes("insufficient permissions"))) {
        const shouldLogin = window.confirm("Se guardó en este dispositivo. Firebase rechazó el acceso. ¿Querés iniciar sesión con Google ahora?");
        if (shouldLogin) {
          void handleLogin();
        }
        return;
      }

      if (isFirebaseEnabled && errorMessage.includes("authInfo") && errorMessage.includes('"userId":undefined')) {
        const shouldLogin = window.confirm("Se guardó en este dispositivo. No hay una sesión activa. ¿Querés iniciar sesión con Google ahora?");
        if (shouldLogin) {
          void handleLogin();
        }
        return;
      }

      if (hasWebhookUrl) {
        alert(`No se pudo enviar la auditoría a Apps Script. Se guardó en este dispositivo.\n\nDetalle: ${errorMessage}`);
        return;
      }

      alert("La auditoría se guardó en este dispositivo.");
    }
  };

  const toggleItemStatus = (question: string, status: "pass" | "fail" | "na") => {
    const existingIndex = session.items?.findIndex(i => i.question === question) ?? -1;
    const newItems = [...(session.items ?? [])];
    const currentItemIndex = selectedAuditItems.findIndex((auditItem) => auditItem.text === question);
    const templateItem = selectedAuditItems.find((auditItem) => auditItem.text === question);
    
    if (existingIndex >= 0) {
      newItems[existingIndex] = { ...newItems[existingIndex], status };
    } else {
      newItems.push({
        id: templateItem?.id || createClientId(),
        question,
        category: selectedRole!,
        status,
        comment: "",
        description: templateItem?.description,
        responsibleRoles: templateItem?.responsibleRoles,
        sector: templateItem?.sector,
        weight: templateItem?.weight,
        allowsNa: templateItem?.allowsNa,
      });
    }
    
    setSession({ ...session, items: newItems });

    const nextItem = currentItemIndex >= 0 ? selectedAuditItems[currentItemIndex + 1] : null;
    if (nextItem) {
      focusAuditItem(nextItem);
    }
  };

  const updateItemComment = (question: string, comment: string) => {
    const existingIndex = session.items?.findIndex(i => i.question === question) ?? -1;
    const newItems = [...(session.items ?? [])];
    const templateItem = selectedAuditItems.find((auditItem) => auditItem.text === question);
    
    if (existingIndex >= 0) {
      newItems[existingIndex] = { ...newItems[existingIndex], comment };
    } else {
      newItems.push({
        id: templateItem?.id || createClientId(),
        question,
        category: selectedRole!,
        status: "na",
        comment,
        description: templateItem?.description,
        responsibleRoles: templateItem?.responsibleRoles,
        sector: templateItem?.sector,
        weight: templateItem?.weight,
        allowsNa: templateItem?.allowsNa,
      });
    }
    
    setSession({ ...session, items: newItems });
  };

  const updateItemPhoto = (question: string, photoUrl?: string) => {
    const existingIndex = session.items?.findIndex(i => i.question === question) ?? -1;
    const newItems = [...(session.items ?? [])];
    const templateItem = selectedAuditItems.find((auditItem) => auditItem.text === question);

    if (existingIndex >= 0) {
      newItems[existingIndex] = { ...newItems[existingIndex], photoUrl };
    } else {
      newItems.push({
        id: templateItem?.id || createClientId(),
        question,
        category: selectedRole!,
        status: "na",
        comment: "",
        description: templateItem?.description,
        responsibleRoles: templateItem?.responsibleRoles,
        sector: templateItem?.sector,
        weight: templateItem?.weight,
        allowsNa: templateItem?.allowsNa,
        photoUrl,
      });
    }

    setSession({ ...session, items: newItems });
  };

  const syncData = async () => {
    if (!isHistorySyncConfigured) {
      alert("Configurá Apps Script o una URL CSV publicada para sincronizar datos.");
      return;
    }

    setIsSyncing(true);
    try {
      if (hasWebhookUrl) {
        const externalAudits = await refreshExternalHistory();
        alert(
          externalAudits.length > 0
            ? `Historial cargado desde Google Sheets. Se importaron ${externalAudits.length} auditorías.`
            : "La fuente externa respondió correctamente, pero no encontró auditorías para importar."
        );
        setIsSyncing(false);
        return;
      }

      const response = await fetch(sheetCsvUrl);
      if (!response.ok) {
        throw new Error(`No se pudo leer la fuente externa (${response.status}).`);
      }

      const csvText = await response.text();
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = Array.isArray(results.data)
            ? results.data.filter((row) => Object.values((row ?? {}) as Record<string, unknown>).some(Boolean))
            : [];

          if (results.errors.length > 0) {
            console.error("CSV parse failed:", results.errors);
            alert("La fuente CSV respondió, pero tiene un formato inválido o incompleto.");
            setIsSyncing(false);
            return;
          }

          alert(`CSV externo verificado. Se leyeron ${rows.length} registros publicados.`);
          setIsSyncing(false);
        }
      });
    } catch (error) {
      console.error("Sync failed:", error);
      alert("No se pudo leer la fuente CSV publicada. Revisá la URL y el acceso público.");
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
    <div className="app-shell min-h-screen lg:flex">
      <Sidebar
        appTitle={appTitle}
        show={(view === "dashboard" && isDashboardUnlocked) || view === "history" || view === "reports"}
        view={view}
        reportsPanel={reportsPanel}
        isMobileOpen={isMobileNavOpen}
        items={sidebarItems}
        user={user}
        onNavigate={(id) => {
          if (id === "home") {
            startNewAudit();
            return;
          }

          if (id === "reports") {
            setReportsPanel("kpis");
          }

          setView(id as typeof view);
        }}
        onReportsPanelChange={(panel) => {
          setReportsPanel(panel);
          setView("reports");
        }}
        onMobileClose={() => setIsMobileNavOpen(false)}
        onLogout={handleLogout}
      />

        <div ref={contentContainerRef} className="flex-1 flex flex-col h-screen overflow-y-auto">
        <Topbar
          appTitle={appTitle}
          view={view}
          reportsLabel={activeControlPanel.label}
          user={user}
            authenticationEnabled={isFirebaseEnabled}
          showMenuButton={(view === "dashboard" && isDashboardUnlocked) || view === "history" || view === "reports"}
          showBackButton={view !== "dashboard"}
          onOpenMenu={() => setIsMobileNavOpen(true)}
          onBack={handleTopbarBack}
          onLogin={handleLogin}
        />

        <main className={cn(
          "p-4 md:p-8 transition-all duration-500",
          view === "dashboard" ? "max-w-7xl mx-auto w-full" : 
          view === "setup" ? "max-w-5xl mx-auto w-full pb-32" :
          view === "audit" ? "max-w-7xl mx-auto w-full pb-28 pt-2 md:pt-4" :
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
              <DashboardView
                userAuthenticated={Boolean(user)}
                authenticationEnabled={isFirebaseEnabled}
                isDashboardUnlocked={isDashboardUnlocked}
                onUnlockDashboard={() => setIsDashboardUnlocked(true)}
                onBackToCover={() => setIsDashboardUnlocked(false)}
                onLogin={handleLogin}
                onStartNewAudit={startNewAudit}
                onOpenHistory={() => setView("history")}
                onResumeDraft={resumeDraftAudit}
                onRemoveDraft={removeDraftAudit}
                sortedDraftAudits={sortedDraftAudits}
                configuredCategoryCount={configuredCategoryCount}
                sourceLabel={isUsingExternalHistory ? "Sheets" : user && isFirebaseEnabled ? "Firestore" : isSheetSyncConfigured ? "Apps Script" : "Local"}
                dashboardDateLabel={dashboardDateLabel}
                currentMonthDashboard={currentMonthDashboard}
                currentMonthUniqueRoles={currentMonthUniqueRoles}
                currentMonthUniqueStaff={currentMonthUniqueStaff}
                monthlyCriticalAudits={monthlyCriticalAudits}
                dashboardAlerts={dashboardAlerts}
                recentMonthlyDashboardData={recentMonthlyDashboardData}
                currentMonthRoleDistributionData={currentMonthRoleDistributionData}
                currentMonthRoleData={currentMonthRoleData}
                currentMonthStaffData={currentMonthStaffData}
                rankingPanels={rankingPanels}
              />
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
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Historial externo</p>
                      <p className="text-sm font-black text-slate-900">{historySyncModeLabel}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{hasWebhookUrl ? "El historial puede importarse completo desde Apps Script y Google Sheets." : hasSheetCsvUrl ? "Hay una fuente CSV de respaldo configurada para validación externa." : "Definí un Apps Script o una URL CSV publicada para refrescar reportes."}</p>
                </div>
                <div className="rounded-[2rem] border border-white/70 bg-white/80 backdrop-blur p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", user ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500")}>
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Acceso</p>
                      <p className="text-sm font-black text-slate-900">{isFirebaseEnabled ? (user ? "Autenticado" : "Invitado") : "Sheets only"}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{isUsingExternalHistory ? "Se está usando historial importado desde Google Sheets." : user && isFirebaseEnabled ? "Hay acceso a historial y persistencia en Firestore." : localAuditHistory.length > 0 ? "Hay historial guardado en este dispositivo." : isFirebaseEnabled ? "Los datos nuevos se guardarán en este dispositivo hasta iniciar sesión." : "La operación está centrada en Apps Script, Google Sheets y almacenamiento local."}</p>
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
                
                {!user && !isUsingExternalHistory && localAuditHistory.length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 border border-dashed border-gray-300 text-center">
                    <p className="text-gray-400 text-sm italic">Todavía no hay auditorías guardadas.</p>
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
              <div className="mx-auto max-w-4xl">
                <div className="panel-premium rounded-[2.3rem] p-5 md:p-7">
                  <div className="flex items-center justify-between gap-3 pb-5">
                    <h2 className="text-2xl font-black tracking-[-0.03em] text-slate-950 md:text-3xl">Configuración de auditoría</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{session.date}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Auditor</p>
                      <div className="grid grid-cols-1 gap-3">
                        {AUDITORS.map((auditor) => (
                          <button
                            key={auditor.id}
                            onClick={() => setSession({ ...session, auditorId: auditor.id })}
                            className={cn(
                              "flex items-center justify-between rounded-[1.5rem] border px-4 py-4 text-left transition-all",
                              session.auditorId === auditor.id
                                ? "border-slate-950 bg-slate-950 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-xl",
                                session.auditorId === auditor.id ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
                              )}>
                                <User className="w-4.5 h-4.5" />
                              </div>
                              <p className="text-sm font-black">{auditor.name}</p>
                            </div>
                            {session.auditorId === auditor.id && <Check className="w-5 h-5" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sucursal</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        {LOCATIONS.map((loc) => (
                          <button
                            key={loc}
                            onClick={() => setSession({ ...session, location: loc as Location })}
                            className={cn(
                              "flex items-center justify-between rounded-[1.5rem] border px-4 py-4 text-left transition-all",
                              session.location === loc
                                ? "border-slate-950 bg-slate-950 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-xl",
                                session.location === loc ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
                              )}>
                                <MapPin className="w-4.5 h-4.5" />
                              </div>
                              <p className="text-sm font-black">{loc}</p>
                            </div>
                            {session.location === loc && <Check className="w-5 h-5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    {session.location && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left sm:max-w-[60%]">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Nombre de auditoría</p>
                        <p className="mt-1 text-sm font-black text-slate-900">{auditBatchDisplayName}</p>
                      </div>
                    )}
                    <button
                      onClick={() => setView("dashboard")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 transition-all hover:border-slate-300"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Cancelar
                    </button>

                    <button 
                      onClick={handleSetupSubmit}
                      disabled={!session.auditorId || !session.location}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Continuar
                      <ChevronRight className="w-4 h-4" />
                    </button>
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
                          Categorías
                        </span>
                        <div className="space-y-2">
                          <h2 className="text-2xl font-black tracking-tight text-slate-950 lg:text-3xl">Elegí el área.</h2>
                          {auditBatchDisplayName && (
                            <p className="text-sm font-bold text-slate-600">{auditBatchDisplayName}</p>
                          )}
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
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-2.5 xl:grid-cols-6 xl:gap-3">
                    {auditCategories.map((category) => {
                      const completedCategoryReport = completedAuditReports.find((report) => report.role === category.name);
                      const isOrdersCategory = category.name === "Ordenes";
                      const categoryProgress = isOrdersCategory
                        ? sampledOrdersProgress
                        : completedCategoryReport?.session.totalScore;
                      const isCategoryTracked = typeof categoryProgress === "number";

                      return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedRole(category.name)}
                        className={cn(
                          "px-4 py-4 rounded-[1.7rem] border shadow-sm flex flex-col items-center justify-center gap-2.5 group transition-all active:scale-95 lg:items-start lg:text-left lg:min-h-[132px]",
                          isCategoryTracked
                            ? "border-emerald-200 bg-emerald-50/90 hover:border-emerald-300"
                            : "border-gray-100 bg-white hover:border-blue-200 hover:shadow-md"
                        )}
                      >
                        <div className="w-10 h-10 bg-gray-50 rounded-[1rem] flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                          {category.name.includes("Asesor") && <UserCheck className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />}
                          {category.name.includes("Técnico") && <Wrench className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />}
                          {category.name.includes("Jefe") && <ShieldCheck className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />}
                          {category.name.includes("Lavadero") && <Droplets className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />}
                          {category.name.includes("Garantía") && <FileCheck className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />}
                          {category.name.includes("Repuestos") && <Package className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />}
                          {category.name.includes("Pre Entrega") && <Truck className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />}
                          {category.name.includes("Ordenes") && <FileText className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />}
                          {!["Asesor", "Técnico", "Jefe", "Lavadero", "Garantía", "Repuestos", "Pre Entrega", "Ordenes"].some(k => category.name.includes(k)) && (
                            <ClipboardList className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className={cn("font-bold text-[11px] text-center leading-tight lg:text-sm lg:text-left", isCategoryTracked ? "text-emerald-950" : "text-gray-800")}>{category.name}</span>
                          {isCategoryTracked && (
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">{categoryProgress}%</p>
                          )}
                        </div>
                      </button>
                      );
                    })}
                  </div>

                  {completedAuditReports.length > 0 && (
                    <div className="flex justify-end">
                      <Button variant="secondary" size="lg" onClick={() => setShowBatchReportModal(true)} className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50">
                        <FileText className="h-4 w-4" />
                        Generar reporte
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                <div className="lg:hidden rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(135deg,#081222_0%,#12345d_100%)] p-3.5 text-white shadow-[0_14px_34px_rgba(12,35,64,0.18)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Auditoría en campo</p>
                      <h2 className="mt-1.5 text-lg font-black tracking-[-0.03em] text-white">{selectedRole}</h2>
                      <p className="mt-1.5 text-sm font-medium text-slate-300">
                        {isOrdersAudit
                          ? `OR ${session.orderNumber || "sin número"} · ${sessionParticipants.asesorServicio || "Sin asesor"}`
                          : (selectedStaff || "Sin personal asignado")}
                      </p>
                      {isOrdersAudit && (
                        <p className="mt-2 text-xs font-medium leading-relaxed text-slate-300">
                          Técnico: {sessionParticipants.tecnico || "-"} · Controller: {sessionParticipants.controller || "-"} · Lavador: {sessionParticipants.lavador || "-"}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedRole(null)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">{sessionItems.length}/{selectedAuditItems.length} respondidos</span>
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">OR {currentOrCompliance.compliance}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
                  <div className="space-y-3 lg:sticky lg:top-24 h-fit">
                    <div className={cn(
                      "hidden space-y-3 rounded-[1.5rem] lg:block",
                      selectedRole === "Ordenes" ? "bg-[#EEF3F9]/95 backdrop-blur-xl" : "bg-[#F9F9F9] border border-slate-200"
                    )}>
                      <div className={cn(
                        "flex items-center justify-between rounded-[1.4rem] border px-3 py-3 shadow-sm",
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
                            <h2 className="text-base font-bold leading-tight">{selectedRole}</h2>
                            <p className={cn(
                              "text-[10px] uppercase font-black tracking-widest",
                              selectedRole === "Ordenes" ? "text-blue-100/80" : "text-gray-400"
                            )}>
                              {selectedRole === "Ordenes" ? `OR ${session.orderNumber || "sin número"}` : (auditBatchDisplayName || "Auditoría en curso")}
                            </p>
                            {selectedRole === "Ordenes" && (
                              <p className="mt-1.5 max-w-[180px] text-[11px] font-medium leading-relaxed text-slate-300">
                                Asesor {sessionParticipants.asesorServicio || "-"} · Técnico {sessionParticipants.tecnico || "-"}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn(
                            "text-xl font-black leading-none",
                            selectedRole === "Ordenes" ? "text-white" : "text-gray-900"
                          )}>
                            {currentOrCompliance.compliance}%
                          </div>
                          <div className={cn(
                            "text-[10px] font-bold uppercase tracking-tighter",
                            selectedRole === "Ordenes" ? "text-blue-100/80" : "text-gray-400"
                          )}>{selectedRole === "Ordenes" ? "Cumplimiento OR" : "Progreso"}</div>
                          <div className={cn(
                            "text-[10px] font-black uppercase tracking-tighter mt-1",
                            selectedRole === "Ordenes" ? "text-cyan-300" : "text-emerald-600"
                          )}>Score {currentOrCompliance.compliance}%</div>
                        </div>
                      </div>

                      <div className="space-y-2 rounded-[1.2rem] border border-slate-200 bg-white p-3 shadow-sm">
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
                      </div>

                      {isOrdersAudit && (
                        <div className="grid grid-cols-1 gap-2">
                          {(["asesor", "tecnico", "controller", "lavador", "repuestos"] as OrResponsibleRole[]).map((role) => {
                            const roleScore = currentOrRoleScores.find((item) => item.role === role);
                            return (
                              <div key={role} className="rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{OR_ROLE_LABELS[role]}</p>
                                  <p className="text-sm font-black text-slate-950">{roleScore?.compliance ?? 0}%</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                  </div>

                    {!isOrdersAudit && selectedAuditStaffOptions.length > 0 && (
                      <div className="space-y-2 rounded-[1.3rem] border border-slate-200 bg-white p-3.5 shadow-sm">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Personal Auditado</label>
                        <div className="relative">
                          <select 
                            value={selectedStaff}
                            onChange={(e) => setSelectedStaff(e.target.value)}
                            className="w-full p-3.5 bg-slate-50 border border-gray-200 rounded-2xl font-bold text-sm appearance-none focus:outline-none shadow-sm"
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

                    {isOrdersAudit && (
                      <div className="rounded-[1.3rem] border border-slate-200 bg-white px-3.5 py-3.5 shadow-sm space-y-3">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Número de OR</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={session.orderNumber || ""}
                            onChange={(e) => setSession({ ...session, orderNumber: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                            placeholder="Ej. 154238"
                            className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3.5 font-bold text-sm focus:outline-none shadow-sm"
                          />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1d4f91]">Participantes de la OR</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                          {([
                            ["asesorServicio", "Asesor de servicio", OR_PARTICIPANTS.asesorServicio, true],
                            ["tecnico", "Técnico", OR_PARTICIPANTS.tecnico, false],
                            ["controller", "Controller", OR_PARTICIPANTS.controller, false],
                            ["lavador", "Lavador", OR_PARTICIPANTS.lavador, false],
                            ["repuestos", "Repuestos", OR_PARTICIPANTS.repuestos, false],
                          ] as const).map(([participantKey, label, options, required]) => (
                            <div key={participantKey} className="space-y-2">
                              <label className="px-1 text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</label>
                              <div className="relative">
                                <select
                                  value={(sessionParticipants[participantKey] ?? "") as string}
                                  onChange={(e) => setSession({
                                    ...session,
                                    participants: {
                                      ...sessionParticipants,
                                      [participantKey]: e.target.value,
                                    },
                                  })}
                                  className="w-full appearance-none rounded-2xl border border-gray-200 bg-slate-50 p-3.5 text-sm font-bold shadow-sm focus:outline-none"
                                >
                                  <option value="">{required ? `Seleccionar ${label.toLowerCase()}...` : `Sin ${label.toLowerCase()}...`}</option>
                                  {options.map((name) => (
                                    <option key={name} value={name}>{name}</option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                    <div className="space-y-4 pb-40 lg:pb-12 min-w-0">
                      <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm lg:p-4">
                      <div className="mb-4 grid grid-cols-3 gap-2 lg:hidden">
                        <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-3 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Total</p>
                          <p className="mt-2 text-base font-black text-slate-900">{selectedAuditItems.length}</p>
                        </div>
                        <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-3 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">OR</p>
                          <p className="mt-2 text-base font-black text-slate-900">{currentOrCompliance.compliance}%</p>
                        </div>
                        <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-3 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Roles</p>
                          <p className="mt-2 text-base font-black text-slate-900">{isOrdersAudit ? currentOrRoleScores.length : 1}</p>
                        </div>
                      </div>

                      <div className="hidden lg:flex items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Checklist</p>
                          <h3 className="mt-1 text-base font-black text-slate-950">{isOrdersAudit ? "OR Postventa" : "Controles"}</h3>
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{selectedAuditItems.length} puntos</p>
                      </div>

                      <div className="space-y-4">
                        {selectedAuditItems.map((auditItem) => (
                          <AuditItemRow 
                            key={auditItem.id}
                            rowId={`audit-item-${auditItem.id}`}
                            question={auditItem.text}
                            index={selectedAuditItems.findIndex((item) => item.id === auditItem.id)}
                            item={session.items?.find(i => i.question === auditItem.text)}
                            required={false}
                            block={auditItem.block}
                            description={auditItem.description}
                            responsibleRoles={auditItem.responsibleRoles}
                            allowsNa={auditItem.allowsNa}
                            priority={auditItem.priority}
                            guidance={auditItem.guidance}
                            requiresCommentOnFail={auditItem.requiresCommentOnFail}
                            emphasized={focusedAuditItemId === auditItem.id}
                            showStructuredQuestion={isOrdersAudit}
                            onStatusToggle={(status) => toggleItemStatus(auditItem.text, status)}
                            onCommentUpdate={(comment) => updateItemComment(auditItem.text, comment)}
                            onPhotoUpdate={(photoUrl) => updateItemPhoto(auditItem.text, photoUrl)}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Observaciones</label>
                        <textarea 
                          placeholder="Observaciones"
                          value={session.notes || ""}
                          onChange={(e) => setSession({ ...session, notes: e.target.value })}
                          className={cn(
                            "w-full p-6 border rounded-3xl font-medium text-sm focus:outline-none shadow-sm min-h-[160px]",
                            selectedRole === "Ordenes"
                              ? "bg-white border-slate-200 text-slate-700"
                              : "bg-white border-gray-200"
                          )}
                        />

                        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm space-y-4 lg:hidden">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Cierre</p>
                            <p className="mt-2 text-sm font-black text-slate-900">Enviar</p>
                            {failItemsWithoutCommentCount > 0 && (
                              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Faltan {failItemsWithoutCommentCount} observaciones obligatorias en desvíos.</p>
                            )}
                          </div>

                          <button
                            onClick={handleAuditSubmit}
                            disabled={sessionItems.length === 0 || isSendingToSheet || failItemsWithoutCommentCount > 0}
                            className={cn(
                              "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg",
                              sessionItems.length > 0 && !isSendingToSheet && failItemsWithoutCommentCount === 0
                                ? "bg-slate-950 text-white shadow-slate-300 hover:bg-[#0c2340]"
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
                                Enviar
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="hidden rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm space-y-4 lg:sticky lg:top-28 lg:block">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Cierre</p>
                          <p className="mt-2 text-sm font-black text-slate-900">Enviar</p>
                          {failItemsWithoutCommentCount > 0 && (
                            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Faltan {failItemsWithoutCommentCount} observaciones obligatorias en desvíos.</p>
                          )}
                        </div>

                        <button
                          onClick={handleAuditSubmit}
                          disabled={sessionItems.length === 0 || isSendingToSheet || failItemsWithoutCommentCount > 0}
                          className={cn(
                            "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg",
                            sessionItems.length > 0 && !isSendingToSheet && failItemsWithoutCommentCount === 0
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
                              Enviar
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/92 p-3 backdrop-blur-xl lg:hidden">
                  <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-[1.4rem] bg-slate-950 px-4 py-3 text-white shadow-[0_20px_40px_rgba(15,23,42,0.24)]">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Cierre</p>
                      <p className="mt-1 text-sm font-black">{sessionItems.length}/{selectedAuditItems.length} respondidos</p>
                      {failItemsWithoutCommentCount > 0 ? (
                        <p className="mt-1 text-[11px] font-bold text-amber-300">Faltan {failItemsWithoutCommentCount} observaciones obligatorias.</p>
                      ) : (
                        <p className="mt-1 text-[11px] font-bold text-slate-400">Score actual {calculateCurrentScore()}%</p>
                      )}
                    </div>
                    <button
                      onClick={handleAuditSubmit}
                      disabled={sessionItems.length === 0 || isSendingToSheet || failItemsWithoutCommentCount > 0}
                      className={cn(
                        "inline-flex min-w-[156px] items-center justify-center gap-2 rounded-[1.1rem] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-all",
                        sessionItems.length > 0 && !isSendingToSheet && failItemsWithoutCommentCount === 0
                          ? "bg-white text-slate-950"
                          : "cursor-not-allowed bg-white/10 text-slate-400"
                      )}
                    >
                      {isSendingToSheet ? (
                        <>
                          <div className="h-4 w-4 rounded-full border-2 border-slate-400 border-t-slate-900 animate-spin" />
                          Enviando
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Enviar
                        </>
                      )}
                    </button>
                  </div>
                </div>
                </>
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
                        <p className="text-sm font-black">{panel.label}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Activo</p>
                  <p className="mt-2 text-base font-black text-slate-900">{activeControlPanel.label}</p>
                </div>
              </div>

              {reportsPanel === "integrations" && (
              <>
              <div className="bg-white/90 p-6 rounded-3xl shadow-sm border border-white/80 space-y-4 backdrop-blur">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Integraciones</h3>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Endpoint Apps Script</label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/AKfycbxUbxbHYP4UIiyajM_6IVNfsFMgXEpxsvMmwyisqoo4_8lBxNzcMiPyXftxheyh7Q04/exec"
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
                  <button
                    onClick={saveIntegrationSettings}
                    className="sm:ml-auto px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
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
                  <p className="mt-2 text-sm font-medium text-slate-500">Usa Apps Script para importar auditorías completas y deja el CSV como respaldo operativo.</p>
                </div>
                <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Modelo recomendado</p>
                  <p className="mt-2 text-lg font-black text-slate-900">Fuente + espejo</p>
                  <p className="mt-2 text-sm font-medium text-slate-500">Apps Script y Google Sheets como capa operativa compartida, con respaldo local en el dispositivo.</p>
                </div>
              </div>
              </>
              )}

              {reportsPanel === "structure" && (
              <>
              <StructurePanel
                selectedStructureScope={selectedStructureScope}
                setSelectedStructureScope={setSelectedStructureScope}
                structureStorageLabel={structureStorageLabel}
                isLoadingStructureFromCloud={isLoadingStructureFromCloud}
                isSavingStructureToCloud={isSavingStructureToCloud}
                handleLoadStructureFromCloud={handleLoadStructureFromCloud}
                handleSaveStructureToCloud={handleSaveStructureToCloud}
                handleResetStructure={handleResetStructure}
                auditCategories={auditCategories}
                selectedStructureCategory={selectedStructureCategory}
                selectedStructureCategoryId={selectedStructureCategoryId}
                setSelectedStructureCategoryId={setSelectedStructureCategoryId}
                updateCategory={updateCategory}
                handleDeleteCategory={handleDeleteCategory}
                newCategoryName={newCategoryName}
                setNewCategoryName={setNewCategoryName}
                newCategoryDescription={newCategoryDescription}
                setNewCategoryDescription={setNewCategoryDescription}
                newCategoryStaff={newCategoryStaff}
                setNewCategoryStaff={setNewCategoryStaff}
                handleAddCategory={handleAddCategory}
                newItemText={newItemText}
                setNewItemText={setNewItemText}
                newItemDescription={newItemDescription}
                setNewItemDescription={setNewItemDescription}
                newItemGuidance={newItemGuidance}
                setNewItemGuidance={setNewItemGuidance}
                newItemBlock={newItemBlock}
                setNewItemBlock={setNewItemBlock}
                newItemSector={newItemSector}
                setNewItemSector={setNewItemSector}
                newItemResponsibleRoles={newItemResponsibleRoles}
                setNewItemResponsibleRoles={setNewItemResponsibleRoles}
                newItemPriority={newItemPriority}
                setNewItemPriority={setNewItemPriority}
                newItemWeight={newItemWeight}
                setNewItemWeight={setNewItemWeight}
                newItemRequired={newItemRequired}
                setNewItemRequired={setNewItemRequired}
                newItemAllowsNa={newItemAllowsNa}
                setNewItemAllowsNa={setNewItemAllowsNa}
                newItemActive={newItemActive}
                setNewItemActive={setNewItemActive}
                newItemRequiresCommentOnFail={newItemRequiresCommentOnFail}
                setNewItemRequiresCommentOnFail={setNewItemRequiresCommentOnFail}
                handleAddItem={handleAddItem}
              />
              </>
              )}

              {reportsPanel === "kpis" && (
              <>
              <ControlKpisPanel
                reportFilter={reportFilter}
                setReportFilter={setReportFilter}
                auditCategories={auditCategories}
                allStaffOptions={allStaffOptions}
                filteredReportSessions={filteredReportSessions}
                reportCategoryItems={reportCategoryItems}
              />
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
              <HistoryView
                historyPanel={historyPanel}
                setHistoryPanel={setHistoryPanel}
                filteredHistory={filteredHistory}
                selectedHistoryAudit={selectedHistoryAudit}
                historyAverageScore={historyAverageScore}
                nonCompliantAudits={nonCompliantAudits}
                latestHistoryItem={latestHistoryItem}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onBack={() => setView("dashboard")}
                onSelectAudit={setSelectedAudit}
                onExportCsv={exportToCSV}
                onSyncData={syncData}
                isSyncing={isSyncing}
                isHistorySyncConfigured={isHistorySyncConfigured}
                isUsingExternalHistory={isUsingExternalHistory}
                hasWebhookUrl={hasWebhookUrl}
                hasSheetCsvUrl={hasSheetCsvUrl}
                totalHistoryCount={history.length}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {(view === "dashboard" || view === "history" || view === "reports") && (
        <button
          onClick={startNewAudit}
          className="fixed bottom-5 right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl shadow-blue-300/60 transition-all active:scale-95 lg:hidden"
          aria-label="Nueva auditoría"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <AppModal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={submitAudit}
        title="¿Finalizar Auditoría?"
        message={`Quedan ${optionalPendingCount} ítems opcionales sin responder. ¿Deseás finalizar igualmente?`}
      />

      <AnimatePresence>
        {showBatchReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBatchReportModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="panel-premium relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2.3rem]"
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5 md:px-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Reporte</p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">Puntajes detallados</h3>
                </div>
                <button
                  onClick={() => setShowBatchReportModal(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 md:px-8">
                {completedAuditReports.map((report) => {
                  const sectionScores = getSectionScores(report.templateItems, report.session);

                  return (
                    <div key={`${report.role}-${report.session.id}`} className="rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{report.session.location}</p>
                          <h4 className="mt-2 text-xl font-black text-slate-950">{report.role}</h4>
                          <p className="mt-1 text-sm font-bold text-slate-500">{report.session.staffName || report.auditorName} · {report.session.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-emerald-700">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em]">Score</p>
                            <p className="mt-1 text-xl font-black">{report.session.totalScore}%</p>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => generateAuditPdfReport({
                              appTitle,
                              session: report.session,
                              auditorName: report.auditorName,
                              templateItems: report.templateItems,
                            })}
                          >
                            <FileText className="h-4 w-4" />
                            PDF
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
                        {sectionScores.map((section) => (
                          <div key={section.sectionName} className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{section.sectionName}</p>
                            <p className="mt-2 text-lg font-black text-slate-950">{section.score}%</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                              <span>{section.passCount} ok</span>
                              <span>{section.failCount} fail</span>
                              <span>{section.naCount} n/a</span>
                              <span>{section.pendingCount} pend.</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 space-y-2">
                        {report.session.items.map((item) => (
                          <div key={item.id} className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3">
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <p className="text-sm font-bold text-slate-800">{item.question}</p>
                              <span className={cn(
                                "inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                                item.status === "pass"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : item.status === "fail"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-slate-100 text-slate-500"
                              )}>
                                {getAuditItemStatusLabel(item.status)}
                              </span>
                            </div>
                            {item.comment && (
                              <p className="mt-2 text-xs font-medium text-slate-500">{item.comment}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-200 px-6 py-4 md:px-8">
                <Button className="w-full" onClick={() => setShowBatchReportModal(false)}>
                  Cerrar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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


