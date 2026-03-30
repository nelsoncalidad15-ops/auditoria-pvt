import { ArrowLeft, Bell, ChevronRight, ClipboardCheck, LogIn, Menu, Search, ShieldCheck } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";

interface TopbarProps {
  appTitle: string;
  view: string;
  reportsLabel: string;
  user: { displayName?: string | null } | null;
  authenticationEnabled?: boolean;
  showMenuButton?: boolean;
  showBackButton?: boolean;
  onOpenMenu?: () => void;
  onBack?: () => void;
  onLogin: () => void;
}

export function Topbar({ appTitle, view, reportsLabel, user, authenticationEnabled = true, showMenuButton = false, showBackButton = false, onOpenMenu, onBack, onLogin }: TopbarProps) {
  const isAuditView = view === "audit";
  const viewLabel =
    view === "dashboard"
      ? "Dashboard"
      : view === "history"
        ? "Historial"
        : view === "reports"
          ? "Control"
          : view === "setup"
            ? "Configuración"
            : view === "audit"
              ? "Auditoría"
              : "Nueva auditoría";

  return (
    <header className={cn("sticky top-0 z-40 border-b border-slate-200/80 bg-white/70 px-4 backdrop-blur-xl md:px-6", isAuditView ? "py-3" : "py-4")}>
      <div
        className={cn(
          "mx-auto flex items-center justify-between gap-4",
          view === "dashboard" ? "max-w-7xl" : view === "setup" ? "max-w-5xl" : view === "audit" ? "max-w-6xl" : view === "home" ? "max-w-md" : "max-w-md lg:max-w-none",
        )}
      >
        <div className={cn("flex items-center gap-3", (view === "home" || view === "audit" || view === "setup") ? "flex" : "lg:hidden flex")}>
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-[0_10px_26px_rgba(15,23,42,0.05)]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          {showMenuButton && (
            <button
              onClick={onOpenMenu}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-[0_10px_26px_rgba(15,23,42,0.05)] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 p-2.5 shadow-[0_12px_28px_rgba(37,99,235,0.28)]">
            <ClipboardCheck className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tight leading-none uppercase text-slate-950">{appTitle}</h1>
            <p className="mt-1 hidden text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 sm:block">{viewLabel}{view === "reports" ? ` / ${reportsLabel}` : ""}</p>
          </div>
        </div>

        <div className={cn("hidden min-w-0 lg:block", (view === "dashboard" || view === "history" || view === "reports") ? "lg:block" : "lg:hidden")}>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            <span>{viewLabel}</span>
            {view === "reports" && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                <span>{reportsLabel}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {!isAuditView && (
            <>
              <div className="hidden items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-white/90 px-4 py-3 shadow-[0_10px_26px_rgba(15,23,42,0.04)] lg:flex lg:min-w-[280px]">
                <Search className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-400">Buscar auditorías, sedes o reportes</span>
              </div>
              <button className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-500 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
              </button>
            </>
          )}
          {user ? (
            <div className={cn("flex items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-white/90 px-3 py-2 shadow-[0_10px_26px_rgba(15,23,42,0.04)]", isAuditView && "gap-2 px-2.5 py-1.5")}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-[11px] font-black text-blue-700">
                {user.displayName?.charAt(0)}
              </div>
              <div className={cn("hidden sm:block", isAuditView && "sm:hidden") }>
                <p className="text-xs font-black text-slate-800">{user.displayName?.split(" ")[0]}</p>
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                  <ShieldCheck className="h-3 w-3" />
                  Auditor
                </div>
              </div>
            </div>
          ) : authenticationEnabled ? (
            <Button variant="secondary" size="md" onClick={onLogin}>
              <LogIn className="w-4 h-4" />
              Ingresar
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}