import { ClipboardCheck, ShieldCheck, Eye } from "lucide-react";
import { cn } from "../../lib/utils";
import { AuditUserProfile } from "../../types";

const PROFILES: {
  id: AuditUserProfile;
  label: string;
  icon: typeof ShieldCheck;
  accent: string;
  ring: string;
}[] = [
  {
    id: "supervisor",
    label: "Supervisor",
    icon: ShieldCheck,
    accent: "from-blue-700 to-blue-600",
    ring: "ring-blue-200",
  },
  {
    id: "auditor",
    label: "Auditor",
    icon: ClipboardCheck,
    accent: "from-slate-800 to-slate-700",
    ring: "ring-slate-200",
  },
  {
    id: "consulta",
    label: "Consulta",
    icon: Eye,
    accent: "from-slate-500 to-slate-400",
    ring: "ring-slate-100",
  },
];

interface LoginViewProps {
  appTitle: string;
  isLoggingIn: boolean;
  firebaseEnabled: boolean;
  user: { displayName?: string | null; email?: string | null } | null;
  onSelectProfile: (profile: AuditUserProfile) => void;
  onLogin: () => void;
}

export function LoginView({
  appTitle,
  isLoggingIn,
  firebaseEnabled,
  user,
  onSelectProfile,
  onLogin,
}: LoginViewProps) {
  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4 mb-10">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center shadow-[0_16px_40px_rgba(37,99,235,0.30)]">
          <ClipboardCheck className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{appTitle}</h1>
          <p className="text-sm text-slate-400 font-medium mt-1 uppercase tracking-widest">Seleccioná tu perfil</p>
        </div>
      </div>

      {/* Perfil cards */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {PROFILES.map(({ id, label, icon: Icon, accent, ring }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectProfile(id)}
            className={cn(
              "flex items-center gap-4 rounded-2xl bg-white border border-slate-200/80 px-5 py-4",
              "shadow-[0_4px_18px_rgba(15,23,42,0.06)] hover:shadow-[0_6px_24px_rgba(15,23,42,0.10)]",
              "transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] ring-2 ring-transparent hover:ring-2",
              `hover:${ring}`
            )}
          >
            <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", accent)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-base">{label}</span>
          </button>
        ))}
      </div>

      {/* Google sign-in opcional */}
      {firebaseEnabled && (
        <div className="mt-8 w-full max-w-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              {user ? user.displayName || user.email : "Sincronización"}
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {user ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-slate-600 truncate max-w-[200px]">
                {user.displayName || user.email}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.06)] hover:bg-slate-50 transition disabled:opacity-50"
            >
              {/* Google icon */}
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 19.5-7.3 21-17.5.1-.8.2-1.6.2-2.5 0-.6-.1-1.3-.2-2.5z" fill="#4285F4"/>
                <path d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5.1 29.6 3 24 3 16.3 3 9.6 7.9 6.3 14.7z" fill="#EA4335"/>
                <path d="M24 45c5.8 0 10.7-1.9 14.3-5.2l-6.5-5.4C29.9 36.1 27.1 37 24 37c-5.8 0-10.7-3.8-12.4-9.1L4.1 33c3.4 6.8 10.4 12 19.9 12z" fill="#34A853"/>
                <path d="M44.5 20H24v8.5h11.8c-.6 2.6-2 5-4.2 6.9l6.5 5.4C42.3 37.3 45 31.1 45 24c0-.6-.1-1.3-.2-2.5z" fill="#FBBC05"/>
              </svg>
              {isLoggingIn ? "Iniciando sesión…" : "Iniciar sesión con Google"}
            </button>
          )}
        </div>
      )}

      <p className="mt-10 text-xs text-slate-300 font-medium">Autosol · {new Date().getFullYear()}</p>
    </div>
  );
}
