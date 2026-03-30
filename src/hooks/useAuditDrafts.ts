import { useCallback, useEffect, useMemo, useState } from "react";
import { AuditSession, Location, Role } from "../types";

const AUDIT_DRAFTS_STORAGE_KEY = "auditDrafts";

type AuditView = "dashboard" | "home" | "setup" | "audit" | "history" | "reports";

export interface AuditDraft {
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
  updatedAt: string;
}

interface UseAuditDraftsParams {
  selectedRole: Role | null;
  selectedStaff: string;
  session: Partial<AuditSession>;
  sessionItems: AuditSession["items"];
  view: AuditView;
  onResume: (draft: AuditDraft) => void;
}

export function useAuditDrafts({ selectedRole, selectedStaff, session, sessionItems, view, onResume }: UseAuditDraftsParams) {
  const [draftAudits, setDraftAudits] = useState<AuditDraft[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const rawDrafts = window.localStorage.getItem(AUDIT_DRAFTS_STORAGE_KEY);
      if (!rawDrafts) {
        return [];
      }

      const parsed = JSON.parse(rawDrafts);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const persistDrafts = useCallback((nextDrafts: AuditDraft[]) => {
    setDraftAudits(nextDrafts);

    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(AUDIT_DRAFTS_STORAGE_KEY, JSON.stringify(nextDrafts));
  }, []);

  const removeDraftAudit = useCallback((draftId: string) => {
    persistDrafts(draftAudits.filter((draft) => draft.id !== draftId));
  }, [draftAudits, persistDrafts]);

  const resumeDraftAudit = useCallback((draftId: string) => {
    const draft = draftAudits.find((item) => item.id === draftId);
    if (!draft) {
      return;
    }

    onResume(draft);
  }, [draftAudits, onResume]);

  const sortedDraftAudits = useMemo(
    () => [...draftAudits].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [draftAudits]
  );

  useEffect(() => {
    if (!session.id) {
      return;
    }

    if (view !== "setup" && view !== "audit") {
      return;
    }

    const hasMeaningfulProgress = Boolean(
      session.auditorId ||
      session.location ||
      selectedRole ||
      selectedStaff ||
      session.orderNumber?.trim() ||
      session.notes?.trim() ||
      session.participants?.asesorServicio?.trim() ||
      session.participants?.tecnico?.trim() ||
      session.participants?.controller?.trim() ||
      session.participants?.lavador?.trim() ||
      session.participants?.repuestos?.trim() ||
      sessionItems.length > 0
    );

    if (!hasMeaningfulProgress) {
      return;
    }

    const nextDraft: AuditDraft = {
      id: session.id,
      date: session.date || new Date().toISOString().split("T")[0],
      auditBatchName: session.auditBatchName,
      auditorId: session.auditorId,
      location: session.location,
      staffName: selectedStaff || undefined,
      role: selectedRole || undefined,
      items: sessionItems,
      orderNumber: session.orderNumber?.trim() || undefined,
      notes: session.notes?.trim() || undefined,
      participants: session.participants,
      updatedAt: new Date().toISOString(),
    };

    const currentDraft = draftAudits.find((draft) => draft.id === nextDraft.id);
    if (currentDraft) {
      const currentComparable = JSON.stringify({
        id: currentDraft.id,
        date: currentDraft.date,
        auditBatchName: currentDraft.auditBatchName,
        auditorId: currentDraft.auditorId,
        location: currentDraft.location,
        staffName: currentDraft.staffName,
        role: currentDraft.role,
        items: currentDraft.items,
        orderNumber: currentDraft.orderNumber,
        notes: currentDraft.notes,
        participants: currentDraft.participants,
      });
      const nextComparable = JSON.stringify({
        id: nextDraft.id,
        date: nextDraft.date,
        auditBatchName: nextDraft.auditBatchName,
        auditorId: nextDraft.auditorId,
        location: nextDraft.location,
        staffName: nextDraft.staffName,
        role: nextDraft.role,
        items: nextDraft.items,
        orderNumber: nextDraft.orderNumber,
        notes: nextDraft.notes,
        participants: nextDraft.participants,
      });

      if (currentComparable === nextComparable) {
        return;
      }
    }

    const nextDrafts = [
      nextDraft,
      ...draftAudits.filter((draft) => draft.id !== nextDraft.id),
    ].slice(0, 8);

    persistDrafts(nextDrafts);
  }, [draftAudits, persistDrafts, selectedRole, selectedStaff, session, sessionItems, view]);

  return {
    draftAudits,
    sortedDraftAudits,
    removeDraftAudit,
    resumeDraftAudit,
  };
}