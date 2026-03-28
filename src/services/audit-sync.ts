import { AuditSession } from "../types";

export interface AuditSheetSummaryRow {
  auditId: string;
  submittedAt: string;
  auditDate: string;
  location: string;
  auditorId: string;
  auditorName: string;
  role: string;
  staffName: string;
  totalScore: number;
  passCount: number;
  failCount: number;
  naCount: number;
  answeredCount: number;
  itemsCount: number;
  notes: string;
  submittedByEmail: string;
}

export interface AuditSheetItemRow {
  auditId: string;
  submittedAt: string;
  auditDate: string;
  location: string;
  auditorName: string;
  role: string;
  staffName: string;
  questionIndex: number;
  question: string;
  status: "pass" | "fail" | "na";
  statusLabel: string;
  comment: string;
}

export interface AuditSyncPayload {
  event: "audit_submitted";
  version: "1.0";
  submittedAt: string;
  audit: AuditSession & {
    auditorName: string;
    submittedByEmail: string;
  };
  metrics: {
    passCount: number;
    failCount: number;
    naCount: number;
    answeredCount: number;
    itemsCount: number;
  };
  sheet: {
    summaryRow: AuditSheetSummaryRow;
    itemRows: AuditSheetItemRow[];
  };
}

const statusLabelMap: Record<AuditSheetItemRow["status"], string> = {
  pass: "Cumple",
  fail: "No Cumple",
  na: "N/A",
};

export function buildAuditSyncPayload(params: {
  session: AuditSession;
  auditorName: string;
  submittedByEmail?: string | null;
}): AuditSyncPayload {
  const { session, auditorName, submittedByEmail } = params;
  const submittedAt = new Date().toISOString();
  const passCount = session.items.filter((item) => item.status === "pass").length;
  const failCount = session.items.filter((item) => item.status === "fail").length;
  const naCount = session.items.filter((item) => item.status === "na").length;
  const answeredCount = passCount + failCount;
  const itemsCount = session.items.length;

  return {
    event: "audit_submitted",
    version: "1.0",
    submittedAt,
    audit: {
      ...session,
      auditorName,
      submittedByEmail: submittedByEmail ?? "",
    },
    metrics: {
      passCount,
      failCount,
      naCount,
      answeredCount,
      itemsCount,
    },
    sheet: {
      summaryRow: {
        auditId: session.id,
        submittedAt,
        auditDate: session.date,
        location: session.location,
        auditorId: session.auditorId,
        auditorName,
        role: session.role ?? "",
        staffName: session.staffName ?? "",
        totalScore: session.totalScore,
        passCount,
        failCount,
        naCount,
        answeredCount,
        itemsCount,
        notes: session.notes ?? "",
        submittedByEmail: submittedByEmail ?? "",
      },
      itemRows: session.items.map((item, index) => ({
        auditId: session.id,
        submittedAt,
        auditDate: session.date,
        location: session.location,
        auditorName,
        role: session.role ?? item.category,
        staffName: session.staffName ?? "",
        questionIndex: index + 1,
        question: item.question,
        status: item.status,
        statusLabel: statusLabelMap[item.status],
        comment: item.comment ?? "",
      })),
    },
  };
}

export async function sendAuditToWebhook(webhookUrl: string, payload: AuditSyncPayload) {
  return fetch(webhookUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}