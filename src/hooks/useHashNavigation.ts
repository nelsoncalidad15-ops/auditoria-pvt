import { useCallback, useEffect, useRef } from "react";
import { Role } from "../types";

type AuditView = "dashboard" | "home" | "setup" | "audit" | "history" | "reports";
type ReportsPanel = "kpis" | "structure" | "integrations";

interface UseHashNavigationParams {
  view: AuditView;
  reportsPanel: ReportsPanel;
  selectedRole: Role | null;
  setView: (view: AuditView) => void;
  setReportsPanel: (panel: ReportsPanel) => void;
  clearSelectedRole: () => void;
}

export function useHashNavigation({ view, reportsPanel, selectedRole, setView, setReportsPanel, clearSelectedRole }: UseHashNavigationParams) {
  const isApplyingHashRef = useRef(false);
  const initialHashRef = useRef<string | null>(null);

  const applyNavigationFromHash = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rawHash = window.location.hash.replace(/^#\/?/, "").trim();
    const [section, subsection] = rawHash.split("/");

    isApplyingHashRef.current = true;

    if (!section || section === "dashboard" || section === "inicio") {
      setView("dashboard");
      return;
    }

    if (section === "setup" || section === "nueva") {
      setView("setup");
      return;
    }

    if (section === "audit" || section === "auditoria") {
      setView("audit");
      return;
    }

    if (section === "history" || section === "historial") {
      setView("history");
      return;
    }

    if (section === "home") {
      setView("home");
      return;
    }

    if (section === "reports" || section === "control") {
      const nextPanel = subsection === "estructura"
        ? "structure"
        : subsection === "integraciones"
          ? "integrations"
          : "kpis";
      setReportsPanel(nextPanel);
      setView("reports");
      return;
    }

    setView("dashboard");
  }, [setReportsPanel, setView]);

  const buildHashForView = useCallback(() => {
    if (view === "setup") {
      return "#/nueva";
    }

    if (view === "audit") {
      return "#/auditoria";
    }

    if (view === "history") {
      return "#/historial";
    }

    if (view === "home") {
      return "#/home";
    }

    if (view === "reports") {
      const panelSlug = reportsPanel === "structure" ? "estructura" : reportsPanel === "integrations" ? "integraciones" : "indicadores";
      return `#/control/${panelSlug}`;
    }

    return "#/inicio";
  }, [reportsPanel, view]);

  if (initialHashRef.current === null) {
    initialHashRef.current = buildHashForView();
  }

  const handleTopbarBack = useCallback(() => {
    if (view === "audit" && selectedRole) {
      clearSelectedRole();
      return;
    }

    if (view === "audit") {
      setView("setup");
      return;
    }

    if (view === "setup" || view === "history" || view === "reports" || view === "home") {
      setView("dashboard");
    }
  }, [clearSelectedRole, selectedRole, setView, view]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!window.location.hash) {
      window.history.replaceState(null, "", initialHashRef.current || "#/inicio");
    }

    applyNavigationFromHash();
    const handleHashChange = () => applyNavigationFromHash();
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [applyNavigationFromHash]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (isApplyingHashRef.current) {
      isApplyingHashRef.current = false;
      return;
    }

    const nextHash = buildHashForView();
    if (window.location.hash !== nextHash.replace(/^#/, "#")) {
      window.location.hash = nextHash;
    }
  }, [buildHashForView]);

  return {
    handleTopbarBack,
  };
}