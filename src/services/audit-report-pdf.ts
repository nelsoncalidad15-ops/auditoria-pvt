import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { AuditSession, AuditTemplateItem } from "../types";

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function getStatusLabel(status?: "pass" | "fail" | "na") {
  if (status === "pass") return "Cumple";
  if (status === "fail") return "No cumple";
  if (status === "na") return "N/A";
  return "Pendiente";
}

function getSectionMetrics(items: AuditTemplateItem[], session: AuditSession) {
  const answeredItems = items.map((templateItem) => ({
    templateItem,
    answer: session.items.find((sessionItem) => sessionItem.question === templateItem.text),
  }));

  const passCount = answeredItems.filter(({ answer }) => answer?.status === "pass").length;
  const failCount = answeredItems.filter(({ answer }) => answer?.status === "fail").length;
  const naCount = answeredItems.filter(({ answer }) => answer?.status === "na").length;
  const pendingCount = answeredItems.filter(({ answer }) => !answer).length;
  const validCount = passCount + failCount;

  return {
    total: items.length,
    passCount,
    failCount,
    naCount,
    pendingCount,
    score: validCount > 0 ? Math.round((passCount / validCount) * 100) : 0,
  };
}

export function generateAuditPdfReport(params: {
  appTitle: string;
  session: AuditSession;
  auditorName: string;
  templateItems: AuditTemplateItem[];
}) {
  const { appTitle, session, auditorName, templateItems } = params;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const createdAt = new Date();
  const groupedSections = Array.from(
    templateItems.reduce((acc, item) => {
      const blockName = item.block?.trim() || "General";
      const current = acc.get(blockName) ?? [];
      current.push(item);
      acc.set(blockName, current);
      return acc;
    }, new Map<string, AuditTemplateItem[]>())
  );

  pdf.setFillColor(12, 35, 64);
  pdf.rect(0, 0, 210, 34, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(appTitle, 14, 14);
  pdf.setFontSize(11);
  pdf.text("Reporte de auditoría", 14, 21);
  pdf.setFont("helvetica", "normal");
  pdf.text(createdAt.toLocaleString("es-AR"), 14, 27);

  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Resumen general", 14, 44);

  autoTable(pdf, {
    startY: 48,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.8, textColor: [51, 65, 85] },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    body: [
      ["Fecha", session.date],
      ["Sucursal", session.location],
      ["Auditor", auditorName],
      ["Puesto", session.role || "General"],
      ["Personal auditado", session.staffName || "Sin asignar"],
      ["Puntaje total", `${session.totalScore}%`],
      ["Observaciones generales", session.notes || "Sin observaciones generales"],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 46 },
      1: { cellWidth: 136 },
    },
  });

  const summaryStartY = (pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 92;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Puntajes por sección", 14, summaryStartY + 10);

  autoTable(pdf, {
    startY: summaryStartY + 14,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.8, textColor: [51, 65, 85] },
    head: [["Sección", "Total", "Cumple", "No cumple", "N/A", "Pendientes", "Score"]],
    headStyles: { fillColor: [12, 35, 64], textColor: [255, 255, 255] },
    body: groupedSections.map(([sectionName, items]) => {
      const metrics = getSectionMetrics(items, session);
      return [
        sectionName,
        String(metrics.total),
        String(metrics.passCount),
        String(metrics.failCount),
        String(metrics.naCount),
        String(metrics.pendingCount),
        `${metrics.score}%`,
      ];
    }),
  });

  const detailsStartY = (pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 150;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Detalle por ítem", 14, detailsStartY + 10);

  autoTable(pdf, {
    startY: detailsStartY + 14,
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 2.4, textColor: [51, 65, 85], overflow: "linebreak" },
    head: [["Sección", "Ítem", "Estado", "Observación"]],
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    body: groupedSections.flatMap(([sectionName, items]) =>
      items.map((templateItem) => {
        const answer = session.items.find((sessionItem) => sessionItem.question === templateItem.text);
        return [
          sectionName,
          templateItem.text,
          getStatusLabel(answer?.status),
          answer?.comment || "-",
        ];
      })
    ),
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 92 },
      2: { cellWidth: 28 },
      3: { cellWidth: 42 },
    },
    didDrawPage: () => {
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Auditoría ${session.id}`, 14, pageHeight - 6);
      pdf.text(`Página ${pdf.getCurrentPageInfo().pageNumber}`, 180, pageHeight - 6);
    },
  });

  const fileName = sanitizeFileName(`reporte-${session.location}-${session.role || "auditoria"}-${session.date}`) || "reporte-auditoria";
  pdf.save(`${fileName}.pdf`);
}