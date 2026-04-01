import { LucideIcon, LogOut, Settings, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../lib/utils";

interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  appTitle: string;
  show: boolean;
  view: string;
  isMobileOpen: boolean;
  items: SidebarItem[];
  user: { displayName?: string | null; email?: string | null } | null;
  onNavigate: (id: string) => void;
  onMobileClose: () => void;
  onLogout: () => void;
}

export function Sidebar({ appTitle, show, view, isMobileOpen, items, user, onNavigate, onMobileClose, onLogout }: SidebarProps) {
  const navContent = (
    <>
      <div className="px-6 py-7 flex items-center gap-3 border-b border-blue-900/45">
        <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-teal-600 p-3 rounded-2xl shadow-[0_16px_32px_rgba(29,78,216,0.30)]">
          <Settings className="text-white w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h1 className="font-black text-lg tracking-[-0.03em] leading-none text-white">{appTitle}</h1>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/70">Auditoria operativa</p>
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-2 sidebar-scroll">
        <div className="px-3 pb-2">
          <p className="text-[10px] font-black text-blue-200/65 uppercase tracking-[0.2em]">Operación</p>
        </div>

        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onNavigate(item.id);
              onMobileClose();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-[1.35rem] font-bold text-sm transition-all duration-200 group",
              (item.id === "home" ? (view === "setup" || view === "audit") : view === item.id)
                ? "bg-gradient-to-r from-blue-700 to-teal-600 text-white shadow-[0_18px_36px_rgba(29,78,216,0.30)]"
                : "text-slate-200/85 hover:text-white hover:bg-blue-900/35",
            )}
          >
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
              (item.id === "home" ? (view === "setup" || view === "audit") : view === item.id)
                ? "bg-white/14"
                : "bg-blue-900/45"
            )}>
              <item.icon className={cn("w-4.5 h-4.5 transition-transform group-hover:scale-110", (item.id === "home" ? (view === "setup" || view === "audit") : view === item.id) ? "text-white" : "text-blue-200/70")} />
            </div>
            {item.label}
            {(item.id === "home" ? (view === "setup" || view === "audit") : view === item.id) && (
              <motion.div layoutId="activeTab" className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
            )}
          </button>
        ))}

      </nav>

      {user && (
        <div className="p-5 pt-4 border-t border-blue-900/45 bg-slate-950/35 backdrop-blur-sm">
          <div className="rounded-[1.7rem] border border-blue-900/45 bg-blue-950/20 p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-700 via-blue-600 to-teal-600 rounded-xl flex items-center justify-center font-black text-sm shadow-[0_14px_28px_rgba(29,78,216,0.22)]">
                {user.displayName?.charAt(0) || "U"}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black text-white truncate">{user.displayName}</p>
                <p className="text-[10px] font-bold text-blue-200/70 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                onLogout();
                onMobileClose();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-blue-900/45 bg-blue-950/30 py-2.5 text-xs font-black uppercase tracking-[0.18em] transition-all hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden h-[100dvh] w-[288px] shrink-0 flex-col overflow-hidden border-r border-blue-900/35 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.32),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(13,148,136,0.24),transparent_24%),linear-gradient(180deg,#071225_0%,#0a1b35_54%,#0c2545_100%)] text-white transition-all duration-500 lg:sticky lg:top-0 z-50",
          show ? "lg:flex" : "lg:hidden",
        )}
      >
        {navContent}
      </aside>

      <AnimatePresence>
        {isMobileOpen && show && (
          <div className="fixed inset-0 z-[90] lg:hidden">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -320, opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0.8 }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="relative flex h-full w-[88vw] max-w-[320px] flex-col overflow-hidden border-r border-blue-900/35 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.32),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(13,148,136,0.24),transparent_24%),linear-gradient(180deg,#071225_0%,#0a1b35_54%,#0c2545_100%)] text-white"
            >
              <div className="absolute right-4 top-4 z-10">
                <button
                  onClick={onMobileClose}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {navContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}