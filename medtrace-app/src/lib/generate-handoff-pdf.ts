"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PatientDetail {
  name: string; age: unknown; sex: unknown; bloodGroup: string;
  room: string; roomType: string; diagnosis: string; reason: string;
  admissionDate: string; doctor: string; specialization: string;
  allergies: string[]; vitals: string; meds: string[];
  pendingTasks: string[]; abnormalLabs: string[]; heldMeds: string[];
}

interface HandoffPdfData {
  report: string;
  patients: PatientDetail[];
  aiModel: string;
  generatedBy: string;
  generatedAt: string;
}

const BRAND = { primary: [27, 107, 58] as [number, number, number], dark: [12, 15, 14] as [number, number, number] };
const TEXT = { heading: [20, 20, 25] as [number, number, number], body: [55, 65, 81] as [number, number, number], muted: [120, 120, 130] as [number, number, number] };

const stripEmoji = (text: string) => text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1FAFF}]/gu, "").trim();

export function generateHandoffPdf(data: HandoffPdfData) {
  const { patients, aiModel, generatedBy, generatedAt } = data;
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  let y = 0;

  // ── HEADER ──
  function addHeader() {
    doc.setFillColor(...BRAND.dark);
    doc.rect(0, 0, pw, 35, "F");
    doc.setFillColor(...BRAND.primary);
    doc.rect(0, 35, pw, 1.5, "F");

    // Logo
    const lx = 14, ly = 8;
    doc.setFillColor(...BRAND.primary);
    doc.roundedRect(lx, ly, 18, 18, 3, 3, "F");
    const sx = lx + 9, sy = ly + 3;
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.6);
    doc.line(sx - 5, sy, sx + 5, sy);
    doc.line(sx + 5, sy, sx + 5, sy + 7);
    doc.line(sx + 5, sy + 7, sx, sy + 12);
    doc.line(sx, sy + 12, sx - 5, sy + 7);
    doc.line(sx - 5, sy + 7, sx - 5, sy);
    doc.setDrawColor(20, 80, 40);
    doc.setLineWidth(0.5);
    const ey = sy + 6.5;
    doc.line(sx - 4, ey, sx - 2, ey);
    doc.line(sx - 2, ey, sx - 0.5, ey - 3);
    doc.line(sx - 0.5, ey - 3, sx + 1, ey + 2);
    doc.line(sx + 1, ey + 2, sx + 2.5, ey);
    doc.line(sx + 2.5, ey, sx + 4, ey);
    doc.setFillColor(239, 68, 68);
    doc.rect(sx - 1.2, sy + 2.1, 2.4, 0.8, "F");
    doc.rect(sx - 0.4, sy + 1.3, 0.8, 2.4, "F");

    // Title
    doc.setTextColor(240, 253, 244);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("MedTrace", 38, 18);
    doc.setTextColor(161, 161, 170);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Shift Handoff Report", 38, 25);

    // Right side
    doc.setTextColor(161, 161, 170);
    doc.setFontSize(7.5);
    doc.text(`Generated: ${generatedAt}`, pw - 14, 14, { align: "right" });
    doc.text(`By: ${generatedBy}`, pw - 14, 19, { align: "right" });
    doc.text(`AI: ${aiModel}`, pw - 14, 24, { align: "right" });
    doc.text(`Patients: ${patients.length}`, pw - 14, 29, { align: "right" });
  }

  function addFooter() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageCount = (doc as any).getNumberOfPages() as number;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(...BRAND.dark);
      doc.rect(0, ph - 14, pw, 14, "F");
      doc.setFillColor(...BRAND.primary);
      doc.rect(0, ph - 14, pw, 0.5, "F");
      doc.setTextColor(...TEXT.muted);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.text("CONFIDENTIAL — MedTrace Shift Handoff Report", 14, ph - 6);
      doc.text(`Page ${i} of ${pageCount}`, pw / 2, ph - 6, { align: "center" });
      doc.text("Verify with licensed provider", pw - 14, ph - 6, { align: "right" });
    }
  }

  function newPage() { doc.addPage(); addHeader(); y = 42; }
  function checkBreak(needed = 30) { if (y + needed > ph - 20) newPage(); }

  // ── PAGE 1 ──
  addHeader();
  y = 42;

  // Title banner
  doc.setFillColor(...BRAND.primary);
  doc.roundedRect(14, y, pw - 28, 14, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("SBAR Shift Handoff Report", 20, y + 9);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`${patients.length} patients | ${new Date().toLocaleDateString()}`, pw - 20, y + 9, { align: "right" });
  y += 20;

  // ── PATIENT SUMMARY TABLE ──
  if (patients.length > 0) {
    doc.setTextColor(...TEXT.heading);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Patient Census", 14, y + 2);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Room", "Patient", "Age/Sex", "Diagnosis", "Doctor", "Meds", "Alerts", "Tasks"]],
      body: patients.map((p) => [
        `${p.room ?? "—"}\n${(p.roomType ?? "").toUpperCase()}`,
        String(p.name),
        `${p.age}y ${p.sex}`,
        String(p.diagnosis ?? "—").slice(0, 40),
        `${p.doctor ?? "—"}\n${p.specialization ?? ""}`,
        String(p.meds?.length ?? 0),
        String(p.abnormalLabs?.length ?? 0),
        String(p.pendingTasks?.length ?? 0),
      ]),
      styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: BRAND.primary, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 16 }, 3: { cellWidth: 40 } },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ── INDIVIDUAL PATIENT SECTIONS ──
  for (const p of patients) {
    checkBreak(60);

    // Patient header bar
    const isICU = p.roomType === "icu";
    doc.setFillColor(isICU ? 254 : 248, isICU ? 242 : 250, isICU ? 242 : 252);
    doc.setDrawColor(isICU ? 239 : 200, isICU ? 68 : 230, isICU ? 68 : 210);
    doc.roundedRect(14, y, pw - 28, 10, 2, 2, "FD");
    doc.setTextColor(isICU ? 185 : 22, isICU ? 28 : 101, isICU ? 28 : 52);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${p.name} — Room ${p.room ?? "—"} ${isICU ? "(ICU)" : ""}`, 18, y + 7);
    doc.setTextColor(...TEXT.muted);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`${p.age}y ${p.sex} | ${p.bloodGroup} | Dr. ${p.doctor ?? "Unassigned"}`, pw - 20, y + 7, { align: "right" });
    y += 14;

    // Info table
    checkBreak(30);
    autoTable(doc, {
      startY: y,
      theme: "plain",
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: "bold", textColor: TEXT.muted, cellWidth: 30 }, 1: { cellWidth: 65 }, 2: { fontStyle: "bold", textColor: TEXT.muted, cellWidth: 30 }, 3: { cellWidth: 65 } },
      body: [
        ["Diagnosis", String(p.diagnosis ?? "—"), "Admitted", String(p.admissionDate ?? "—")],
        ["Allergies", p.allergies?.length > 0 ? p.allergies.join(", ") : "NKDA", "Vitals", String(p.vitals ?? "—").slice(0, 60)],
      ],
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;

    // Medications
    if (p.meds && p.meds.length > 0) {
      const medText = p.meds.join(" | ");
      const medLines = doc.splitTextToSize(medText, pw - 32) as string[];
      const medsHeight = medLines.length * 4 + 6;
      checkBreak(medsHeight);
      doc.setTextColor(...TEXT.heading);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`Medications (${p.meds.length}):`, 16, y + 2);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT.body);
      doc.setFontSize(7.5);
      medLines.forEach((l: string, i: number) => doc.text(l, 18, y + i * 4));
      y += medLines.length * 4 + 3;
    }

    // Held meds
    if (p.heldMeds && p.heldMeds.length > 0) {
      const heldHeight = p.heldMeds.length * 4 + 6;
      checkBreak(heldHeight);
      doc.setTextColor(217, 119, 6);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("HELD:", 16, y + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      p.heldMeds.forEach((m, i) => { doc.text(`- ${m}`, 28, y + 2 + i * 4); });
      y += p.heldMeds.length * 4 + 5;
    }

    // Abnormal labs
    if (p.abnormalLabs && p.abnormalLabs.length > 0) {
      const labsHeight = p.abnormalLabs.length * 4 + 6;
      checkBreak(labsHeight);
      doc.setTextColor(124, 58, 237);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Abnormal Labs:", 16, y + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...TEXT.body);
      p.abnormalLabs.forEach((l, i) => { doc.text(`- ${l}`, 28, y + 2 + i * 4); });
      y += p.abnormalLabs.length * 4 + 5;
    }

    // Pending tasks
    if (p.pendingTasks && p.pendingTasks.length > 0) {
      const tasksHeight = p.pendingTasks.length * 4 + 6;
      checkBreak(tasksHeight);
      doc.setTextColor(239, 68, 68);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Pending Tasks:", 16, y + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...TEXT.body);
      p.pendingTasks.forEach((t, i) => { doc.text(`- ${t}`, 28, y + 2 + i * 4); });
      y += p.pendingTasks.length * 4 + 5;
    }

    // Separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, y, pw - 14, y);
    y += 8;
  }

  // ── AI REPORT (full text) ──
  if (data.report) {
    newPage();

    doc.setFillColor(...BRAND.primary);
    doc.roundedRect(14, y, pw - 28, 12, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("AI-Generated Clinical Handoff Narrative", 20, y + 8);
    y += 18;

    const LH = 4.5;
    const M = 14;
    const TW = pw - 28;

    for (const line of data.report.split("\n")) {
      const cl = stripEmoji(line);

      if (cl.startsWith("## ")) {
        checkBreak(16);
        y += 4;
        doc.setDrawColor(...BRAND.primary);
        doc.setLineWidth(0.5);
        doc.line(M, y + 5, pw - M, y + 5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND.primary);
        doc.setFontSize(10);
        doc.text(cl.slice(3), M, y + 2);
        y += 11;
        doc.setFontSize(8.5);
        doc.setTextColor(...TEXT.body);
        doc.setFont("helvetica", "normal");
      } else if (cl.startsWith("### ")) {
        checkBreak(12);
        y += 3;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...TEXT.heading);
        doc.setFontSize(9);
        doc.text(cl.slice(4), M + 2, y);
        y += 6;
        doc.setFontSize(8.5);
        doc.setTextColor(...TEXT.body);
        doc.setFont("helvetica", "normal");
      } else if (cl.startsWith("# ")) {
        checkBreak(16);
        y += 5;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...TEXT.heading);
        doc.setFontSize(12);
        doc.text(cl.slice(2), M, y);
        y += 9;
        doc.setFontSize(8.5);
        doc.setTextColor(...TEXT.body);
        doc.setFont("helvetica", "normal");
      } else if (cl.startsWith("- ") || cl.startsWith("* ")) {
        const txt = cl.slice(2).replace(/\*\*/g, "");
        const lines = doc.splitTextToSize(txt, TW - 10) as string[];
        const blockHeight = lines.length * LH + 3;
        checkBreak(blockHeight);
        doc.setFillColor(...BRAND.primary);
        doc.circle(M + 4, y - 0.5, 0.7, "F");
        doc.setTextColor(...TEXT.body);
        lines.forEach((l: string, i: number) => doc.text(l, M + 8, y + i * LH));
        y += lines.length * LH + 3;
      } else if (/^\d+\.\s/.test(cl)) {
        const m = cl.match(/^(\d+)\.\s(.*)$/);
        if (m) {
          const txt = m[2].replace(/\*\*/g, "");
          const lines = doc.splitTextToSize(txt, TW - 10) as string[];
          const blockHeight = lines.length * LH + 3;
          checkBreak(blockHeight);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...BRAND.primary);
          doc.text(`${m[1]}.`, M + 2, y);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...TEXT.body);
          lines.forEach((l: string, i: number) => doc.text(l, M + 8, y + i * LH));
          y += lines.length * LH + 3;
        }
      } else if (cl.startsWith("**") && cl.endsWith("**")) {
        checkBreak(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...TEXT.heading);
        doc.text(cl.replace(/\*\*/g, ""), M, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT.body);
        y += 6;
      } else if (cl.trim() === "" || cl.startsWith("---") || cl.startsWith("*Generated")) {
        y += 3;
      } else if (cl.trim()) {
        const lines = doc.splitTextToSize(cl.replace(/\*\*/g, ""), TW) as string[];
        const blockHeight = lines.length * LH + 3;
        checkBreak(blockHeight);
        doc.setTextColor(...TEXT.body);
        lines.forEach((l: string, i: number) => doc.text(l, M, y + i * LH));
        y += lines.length * LH + 2;
      }
    }
  }

  // ── FINALIZE ──
  addFooter();
  doc.save(`MedTrace_Shift_Handoff_${new Date().toISOString().slice(0, 10)}.pdf`);
}
