"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Row = Record<string, unknown>;

interface PatientPdfData {
  patient: Row;
  allergies: Row[];
  labs: Row[];
  notes: Row[];
  instructions: Row[];
  medAdmin: Row[];
  carePlan?: string;
}

// Brand colors
const BRAND = { primary: [27, 107, 58] as [number, number, number], light: [240, 253, 244] as [number, number, number], dark: [12, 15, 14] as [number, number, number] };
const TEXT = { heading: [20, 20, 25] as [number, number, number], body: [55, 65, 81] as [number, number, number], muted: [120, 120, 130] as [number, number, number] };

const stripEmoji = (text: string) => text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1FAFF}]/gu, "").trim();

export function generatePatientPdf(data: PatientPdfData) {
  const { patient, allergies, labs, notes, instructions, medAdmin } = data;
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  let y = 0;

  const admission = patient.admission as Row | undefined;
  const room = patient.room as Row | undefined;
  const doctor = patient.assigned_doctor as Row | undefined;
  const ec = patient.emergency_contact as Row | undefined;

  // ──────────────────────────────────────────────
  // HELPER: Add branded header + footer to every page
  // ──────────────────────────────────────────────
  function addPageChrome() {
    // Top bar
    doc.setFillColor(...BRAND.dark);
    doc.rect(0, 0, pw, 32, "F");
    // Green accent line
    doc.setFillColor(...BRAND.primary);
    doc.rect(0, 32, pw, 1.5, "F");

    // Logo: green rounded rect with shield, EKG line, and red cross
    const lx = 14, ly = 7, lw = 18, lh = 18;
    doc.setFillColor(...BRAND.primary);
    doc.roundedRect(lx, ly, lw, lh, 3, 3, "F");

    // Shield outline (pointed-bottom pentagon) — white stroke
    const sx = lx + lw / 2; // center x = 23
    const sy = ly + 3;      // top of shield
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.6);
    doc.line(sx - 5, sy, sx + 5, sy);            // top edge
    doc.line(sx + 5, sy, sx + 5, sy + 7);        // right edge
    doc.line(sx + 5, sy + 7, sx, sy + 12);       // right-bottom to point
    doc.line(sx, sy + 12, sx - 5, sy + 7);       // point to left-bottom
    doc.line(sx - 5, sy + 7, sx - 5, sy);        // left edge

    // EKG heartbeat zigzag line inside shield — green on white area
    doc.setDrawColor(20, 80, 40);
    doc.setLineWidth(0.5);
    const ey = sy + 6.5; // vertical center of shield
    doc.line(sx - 4, ey, sx - 2, ey);            // flat lead-in
    doc.line(sx - 2, ey, sx - 0.5, ey - 3);      // spike up
    doc.line(sx - 0.5, ey - 3, sx + 1, ey + 2);  // spike down
    doc.line(sx + 1, ey + 2, sx + 2.5, ey);      // return
    doc.line(sx + 2.5, ey, sx + 4, ey);          // flat lead-out

    // Small red cross at top of shield
    doc.setFillColor(239, 68, 68);
    const cx = sx, cy = sy + 2.5;
    doc.rect(cx - 1.2, cy - 0.4, 2.4, 0.8, "F"); // horizontal bar
    doc.rect(cx - 0.4, cy - 1.2, 0.8, 2.4, "F"); // vertical bar

    // Title
    doc.setTextColor(240, 253, 244);
    doc.setFontSize(16);
    doc.text("MedTrace", 38, 16);
    doc.setTextColor(161, 161, 170);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("AI-Powered Clinical Platform", 38, 22);

    // Right side info
    doc.setTextColor(161, 161, 170);
    doc.setFontSize(7.5);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pw - 14, 14, { align: "right" });
    doc.text(`Report ID: RPT-${Date.now().toString(36).toUpperCase()}`, pw - 14, 19, { align: "right" });
    doc.text(`Room: ${room?.room_number ?? "—"}`, pw - 14, 24, { align: "right" });
  }

  function addFooter() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageCount = (doc as any).getNumberOfPages() as number;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      // Bottom bar
      doc.setFillColor(...BRAND.dark);
      doc.rect(0, ph - 14, pw, 14, "F");
      doc.setFillColor(...BRAND.primary);
      doc.rect(0, ph - 14, pw, 0.5, "F");

      doc.setTextColor(120, 120, 130);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.text("CONFIDENTIAL - MedTrace Patient Record", 14, ph - 6);
      doc.text(`Page ${i} of ${pageCount}`, pw / 2, ph - 6, { align: "center" });
      doc.text("Verify with licensed provider", pw - 14, ph - 6, { align: "right" });
    }
  }

  function newPage() {
    doc.addPage();
    addPageChrome();
    y = 40;
  }

  function checkBreak(needed = 40) {
    if (y > ph - needed) { newPage(); }
  }

  function sectionTitle(title: string, color: [number, number, number] = BRAND.primary) {
    checkBreak(25);
    y += 4;
    doc.setFillColor(...color);
    doc.roundedRect(14, y - 1, 3, 8, 1, 1, "F");
    doc.setTextColor(...TEXT.heading);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title, 20, y + 5);
    y += 12;
  }

  // ──────────────────────────────────────────────
  // PAGE 1 HEADER
  // ──────────────────────────────────────────────
  addPageChrome();
  y = 40;

  // ──────────────────────────────────────────────
  // PATIENT BANNER
  // ──────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pw - 28, 22, 3, 3, "FD");

  doc.setTextColor(...TEXT.heading);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(String(patient.name ?? "Unknown Patient"), 20, y + 9);

  doc.setTextColor(...TEXT.muted);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${patient.age}y ${patient.sex}  |  Blood: ${patient.blood_group ?? "—"}  |  DOB: ${patient.date_of_birth ?? "—"}`, 20, y + 16);

  // Attending doctor badge on right
  if (doctor?.name) {
    doc.setTextColor(...BRAND.primary);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`Dr. ${String(doctor.name).replace(/^Dr\.?\s*/i, "")}`, pw - 20, y + 9, { align: "right" });
    doc.setTextColor(...TEXT.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(String(doctor.specialization ?? ""), pw - 20, y + 14, { align: "right" });
  }
  y += 28;

  // ──────────────────────────────────────────────
  // KEY INFO TABLE
  // ──────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.3 },
    headStyles: { fillColor: BRAND.light, textColor: BRAND.primary, fontStyle: "bold", lineColor: [200, 230, 210] },
    head: [["Admission", "Diagnosis", "Emergency Contact", "Phone"]],
    body: [[
      `${admission?.admission_date ? new Date(String(admission.admission_date)).toLocaleDateString() : "—"}\n${String(admission?.reason ?? "—")}`,
      String(admission?.diagnosis ?? "—"),
      ec ? `${ec.name} (${ec.relationship})` : "—",
      String(ec?.phone ?? "—"),
    ]],
    columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 60 } },
  });
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  // ──────────────────────────────────────────────
  // ALLERGIES
  // ──────────────────────────────────────────────
  if (allergies.length > 0) {
    checkBreak(20);
    const allergyHeight = 8 + allergies.length * 5;
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(248, 113, 113);
    doc.roundedRect(14, y, pw - 28, allergyHeight, 2, 2, "FD");

    doc.setFillColor(239, 68, 68);
    doc.roundedRect(16, y + 2, 24, 5, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("ALLERGIES", 18, y + 5.5);

    doc.setTextColor(153, 27, 27);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    allergies.forEach((a, i) => {
      doc.text(`${a.allergen} — ${a.reaction} (${a.severity})`, 44, y + 6 + i * 5);
    });
    y += allergyHeight + 4;
  }

  // ──────────────────────────────────────────────
  // MEDICATIONS
  // ──────────────────────────────────────────────
  const meds = (patient.medications ?? []) as Row[];
  if (meds.length > 0) {
    sectionTitle(`Active Medications (${meds.length})`);
    autoTable(doc, {
      startY: y,
      head: [["Drug", "Dose", "Frequency", "Route", "Status", "Instructions"]],
      body: meds.map((m) => [
        String((m.drug as Row)?.name ?? "—"),
        String(m.dose ?? ""),
        String(m.frequency ?? ""),
        String(m.route ?? ""),
        String(m.status ?? ""),
        String(m.instructions ?? "—"),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: BRAND.primary, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 5: { cellWidth: 45 } },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ──────────────────────────────────────────────
  // VITALS
  // ──────────────────────────────────────────────
  const vitals = patient.latest_vitals as Row | undefined;
  if (vitals) {
    sectionTitle("Latest Vital Signs");
    autoTable(doc, {
      startY: y,
      head: [["Heart Rate", "Blood Pressure", "SpO2", "Blood Sugar", "Temp", "Resp Rate", "Pain"]],
      body: [[
        `${vitals.heart_rate ?? "—"} bpm`,
        `${vitals.blood_pressure_sys ?? "—"}/${vitals.blood_pressure_dia ?? "—"}`,
        `${vitals.spo2 ?? "—"}%`,
        `${vitals.blood_sugar ?? "—"} mg/dL`,
        `${vitals.temperature ?? "—"}°F`,
        `${vitals.respiratory_rate ?? "—"}/min`,
        `${vitals.pain_level ?? "—"}/10`,
      ]],
      styles: { fontSize: 8, cellPadding: 2.5, halign: "center", lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: "bold" },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ──────────────────────────────────────────────
  // LAB RESULTS
  // ──────────────────────────────────────────────
  if (labs.length > 0) {
    sectionTitle(`Lab Results (${labs.length})`, [124, 58, 237]);
    autoTable(doc, {
      startY: y,
      head: [["Test", "Value", "Reference", "Status", "Date"]],
      body: labs.map((l) => [
        String(l.test_name),
        `${l.value} ${l.unit ?? ""}`,
        `${l.reference_low ?? "—"} – ${l.reference_high ?? "—"}`,
        String(l.status ?? "normal"),
        l.resulted_at ? new Date(String(l.resulted_at)).toLocaleDateString() : "—",
      ]),
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 3) {
          const s = data.row.raw[3];
          if (s === "critical") data.cell.styles.textColor = [220, 38, 38];
          else if (s === "abnormal") data.cell.styles.textColor = [217, 119, 6];
          else data.cell.styles.textColor = [22, 163, 74];
        }
      },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ──────────────────────────────────────────────
  // DOCTOR INSTRUCTIONS
  // ──────────────────────────────────────────────
  const activeIns = instructions.filter((i) => i.status !== "cancelled");
  if (activeIns.length > 0) {
    sectionTitle(`Doctor Instructions (${activeIns.length})`, [245, 158, 11]);
    autoTable(doc, {
      startY: y,
      head: [["Priority", "Category", "Instruction", "Doctor", "Status"]],
      body: activeIns.map((i) => [
        String(i.priority ?? "routine").toUpperCase(),
        String(i.category ?? "—"),
        String(i.instruction ?? ""),
        String(i.doctor_name ?? "—"),
        String(i.status ?? "pending"),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 2: { cellWidth: 65 } },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ──────────────────────────────────────────────
  // MED ADMIN LOG
  // ──────────────────────────────────────────────
  if (medAdmin.length > 0) {
    sectionTitle(`Medication Administration (${medAdmin.length})`, [6, 182, 212]);
    autoTable(doc, {
      startY: y,
      head: [["Time", "Drug", "Dose", "Status", "By", "Notes"]],
      body: medAdmin.map((m) => [
        m.administered_at ? new Date(String(m.administered_at)).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—",
        String(m.drug_name ?? "—"),
        String(m.dose_given ?? ""),
        String(m.status ?? "given"),
        String(m.administered_by ?? "—"),
        String(m.notes ?? m.reason ?? "—"),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ──────────────────────────────────────────────
  // NURSE NOTES
  // ──────────────────────────────────────────────
  if (notes.length > 0) {
    sectionTitle(`Nurse Notes (${notes.length})`, [59, 130, 246]);
    autoTable(doc, {
      startY: y,
      head: [["Date/Time", "Type", "Author", "Note"]],
      body: notes.map((n) => [
        n.created_at ? new Date(String(n.created_at)).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—",
        String(n.note_type ?? ""),
        String(n.author ?? ""),
        String(n.content ?? ""),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 3: { cellWidth: 85 } },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ──────────────────────────────────────────────
  // AI CARE PLAN
  // ──────────────────────────────────────────────
  if (data.carePlan) {
    newPage();

    // Full-width care plan title banner
    doc.setFillColor(...BRAND.primary);
    doc.roundedRect(14, y, pw - 28, 12, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("AI-Generated Care Plan", 20, y + 8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Patient: ${patient.name}`, pw - 20, y + 8, { align: "right" });
    y += 18;

    const M = 14;        // left margin
    const BI = 18;       // bullet dot x
    const TI = 22;       // text indent after bullet/number
    const TW = pw - TI - 14; // text wrap width for bullets/numbers
    const PW_BODY = pw - 28; // text wrap width for paragraphs
    const LH = 4.2;      // line height

    // Helper: render text with inline **bold** handling
    const renderRichText = (text: string, startX: number, startY: number, maxWidth: number): number => {
      // Split on ** markers
      const parts = text.split("**");
      if (parts.length <= 1) {
        // No bold markers, render plain
        const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT.body);
        wrapped.forEach((l: string, i: number) => doc.text(l, startX, startY + i * LH));
        return wrapped.length;
      }

      // Has bold markers: parts alternate normal/bold/normal/bold...
      // First flatten and re-wrap to fit width, then render segments
      const plainText = text.replace(/\*\*/g, "");
      const wrapped = doc.splitTextToSize(plainText, maxWidth) as string[];

      // For each wrapped line, find which bold segments apply
      // Simple approach: render line-by-line with bold tracking
      let charPos = 0;
      for (let lineIdx = 0; lineIdx < wrapped.length; lineIdx++) {
        const wLine = wrapped[lineIdx];
        let xPos = startX;
        let remaining = wLine;

        while (remaining.length > 0) {
          // Find where we are in the original parts
          let partOffset = 0;
          let isBold = false;
          let consumed = 0;
          for (let p = 0; p < parts.length; p++) {
            const pEnd = partOffset + parts[p].length;
            if (charPos >= partOffset && charPos < pEnd) {
              isBold = p % 2 === 1;
              // How many chars left in this part
              const charsInPart = pEnd - charPos;
              const charsToRender = Math.min(charsInPart, remaining.length);
              const segment = remaining.slice(0, charsToRender);

              doc.setFont("helvetica", isBold ? "bold" : "normal");
              doc.setTextColor(...TEXT.body);
              doc.text(segment, xPos, startY + lineIdx * LH);
              xPos += doc.getTextWidth(segment);
              remaining = remaining.slice(charsToRender);
              charPos += charsToRender;
              consumed = charsToRender;
              break;
            }
            partOffset = pEnd;
          }
          if (consumed === 0) break; // safety
        }
      }
      doc.setFont("helvetica", "normal");
      return wrapped.length;
    };

    const planLines = data.carePlan.split("\n");
    doc.setFontSize(9);

    let lineIdx = 0;
    while (lineIdx < planLines.length) {
      const cl = stripEmoji(planLines[lineIdx]);

      // ── Table detection: lines starting with | ──
      if (cl.trim().startsWith("|")) {
        // Collect all consecutive pipe-containing lines
        const tableLines: string[] = [];
        while (lineIdx < planLines.length && stripEmoji(planLines[lineIdx]).trim().startsWith("|")) {
          tableLines.push(stripEmoji(planLines[lineIdx]).trim());
          lineIdx++;
        }

        if (tableLines.length >= 2) {
          // Parse header from first line
          const parseRow = (row: string) =>
            row.split("|").map(c => c.trim()).filter(c => c.length > 0);

          const headers = parseRow(tableLines[0]);

          // Skip separator lines (contain ---)
          const dataRows: string[][] = [];
          for (let r = 1; r < tableLines.length; r++) {
            if (tableLines[r].includes("---")) continue;
            dataRows.push(parseRow(tableLines[r]));
          }

          if (headers.length > 0 && dataRows.length > 0) {
            checkBreak(30);
            autoTable(doc, {
              startY: y,
              head: [headers],
              body: dataRows,
              styles: { fontSize: 8, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.2 },
              headStyles: { fillColor: BRAND.primary, textColor: [255, 255, 255], fontStyle: "bold" },
              alternateRowStyles: { fillColor: [248, 250, 252] },
            });
            y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
          }
        }
        continue; // already advanced lineIdx
      }

      lineIdx++;

      // Detect heading level (handles #, ##, ###, ####, #####, and "##### ### text" patterns)
      const headingMatch = cl.match(/^(#{1,6})\s+(?:#{1,6}\s+)*(.*)/);
      if (headingMatch && headingMatch[2].replace(/^#+\s*/, "").trim()) {
        const level = Math.min(headingMatch[1].length, 4);
        const headerText = headingMatch[2].replace(/^#+\s*/, "").trim();

        if (level <= 2) {
          // ## level: green background bar
          const headerLines = doc.splitTextToSize(headerText, pw - 28 - 6) as string[];
          const headerHeight = headerLines.length * LH + 4;
          if (y + headerHeight > ph - 30) { newPage(); }
          y += 3;
          doc.setFillColor(240, 253, 244);
          doc.rect(M, y - 3, pw - 2 * M, headerHeight + 2, "F");
          doc.setFillColor(...BRAND.primary);
          doc.rect(M, y - 3, 3, headerHeight + 2, "F");
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...BRAND.primary);
          doc.setFontSize(level === 1 ? 11 : 10.5);
          doc.text(headerText, M + 5, y + 2);
          y += headerHeight + 4;
        } else {
          // ### and ####+ level: bold text
          if (y > ph - 25) { newPage(); }
          y += 2;
          doc.setFont("helvetica", "bold");
          doc.setTextColor(level === 3 ? BRAND.primary[0] : TEXT.heading[0], level === 3 ? BRAND.primary[1] : TEXT.heading[1], level === 3 ? BRAND.primary[2] : TEXT.heading[2]);
          doc.setFontSize(level === 3 ? 9.5 : 9);
          doc.text(headerText, M + 2, y);
          y += 5.5;
        }
        doc.setFontSize(9);
        doc.setTextColor(...TEXT.body);
        doc.setFont("helvetica", "normal");

      } else if (/^[-*•·]\s+/.test(cl)) {
        const txt = cl.replace(/^[-*•·]\s+/, "");
        const plainTxt = txt.replace(/\*\*/g, "");
        const wrapped = doc.splitTextToSize(plainTxt, TW) as string[];
        if (y + wrapped.length * LH > ph - 20) { newPage(); }
        doc.setFillColor(...BRAND.primary);
        doc.circle(BI, y - 0.6, 0.7, "F");
        doc.setFontSize(9);
        renderRichText(txt, TI, y, TW);
        y += wrapped.length * LH + 1.8;

      } else if (/^\d+\.\s/.test(cl)) {
        const m = cl.match(/^(\d+)\.\s(.*)$/);
        if (m) {
          const txt = m[2];
          const plainTxt = txt.replace(/\*\*/g, "");
          const wrapped = doc.splitTextToSize(plainTxt, TW) as string[];
          if (y + wrapped.length * LH > ph - 20) { newPage(); }
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...BRAND.primary);
          doc.setFontSize(9);
          doc.text(`${m[1]}.`, M + 2, y);
          renderRichText(txt, TI, y, TW);
          y += wrapped.length * LH + 1.8;
        }

      } else if (cl.startsWith("**") && cl.endsWith("**")) {
        if (y > ph - 20) { newPage(); }
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...TEXT.heading);
        doc.setFontSize(9);
        doc.text(cl.replace(/\*\*/g, ""), M, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT.body);
        y += 5;

      } else if (cl.trim() === "" || cl.startsWith("---")) {
        y += 3;

      } else if (cl.trim()) {
        const plainTxt = cl.replace(/\*\*/g, "");
        const wrapped = doc.splitTextToSize(plainTxt, PW_BODY) as string[];
        if (y + wrapped.length * LH > ph - 20) { newPage(); }
        doc.setFontSize(9);
        renderRichText(cl, M, y, PW_BODY);
        y += wrapped.length * LH + 1;
      }
    }
  }

  // ──────────────────────────────────────────────
  // FINALIZE: Add footers to all pages
  // ──────────────────────────────────────────────
  addFooter();

  const fileName = `MedTrace_${String(patient.name ?? "Patient").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
