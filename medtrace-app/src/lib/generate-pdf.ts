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

export function generatePatientPdf(data: PatientPdfData) {
  const { patient, allergies, labs, notes, instructions, medAdmin } = data;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // =========== HEADER ===========
  doc.setFillColor(15, 15, 20);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(139, 92, 246); // violet
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("MedTrace", 14, y + 5);

  doc.setTextColor(161, 161, 170); // zinc-400
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Hospital Nursing Station — Patient Report", 14, y + 12);

  doc.setTextColor(250, 250, 250);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, y + 5, { align: "right" });
  doc.text(`Report ID: RPT-${Date.now().toString(36).toUpperCase()}`, pageWidth - 14, y + 10, { align: "right" });

  y = 48;

  // =========== PATIENT INFO ===========
  doc.setTextColor(40, 40, 45);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(String(patient.name ?? "Unknown"), 14, y);

  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 110);
  const admission = patient.admission as Row | undefined;
  const room = patient.room as Row | undefined;
  const doctor = patient.assigned_doctor as Row | undefined;
  const ec = patient.emergency_contact as Row | undefined;

  doc.text(`${patient.age}y ${patient.sex}  |  Blood Group: ${patient.blood_group ?? "—"}  |  DOB: ${patient.date_of_birth ?? "—"}  |  Room: ${room?.room_number ?? "—"}`, 14, y);

  y += 8;

  // Key info table
  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", textColor: [100, 100, 110], cellWidth: 40 }, 1: { cellWidth: 55 }, 2: { fontStyle: "bold", textColor: [100, 100, 110], cellWidth: 40 }, 3: { cellWidth: 55 } },
    body: [
      ["Admission Date", String(admission?.admission_date ? new Date(String(admission.admission_date)).toLocaleDateString() : "—"), "Primary Doctor", String(doctor?.name ?? "Unassigned")],
      ["Reason", String(admission?.reason ?? "—"), "Specialization", String(doctor?.specialization ?? "—")],
      ["Diagnosis", String(admission?.diagnosis ?? "—"), "Doctor Phone", String(doctor?.phone ?? "—")],
      ["Emergency Contact", ec ? `${ec.name} (${ec.relationship})` : "—", "Phone", String(ec?.phone ?? "—")],
    ],
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // =========== ALLERGIES ===========
  if (allergies.length > 0) {
    doc.setFillColor(254, 226, 226);
    doc.setDrawColor(239, 68, 68);
    doc.roundedRect(14, y, pageWidth - 28, 7 + allergies.length * 5.5, 2, 2, "FD");
    doc.setTextColor(185, 28, 28);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ALLERGIES", 18, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    allergies.forEach((a, i) => {
      doc.text(`${a.allergen} — ${a.reaction} (${a.severity})`, 18, y + 11 + i * 5.5);
    });
    y += 12 + allergies.length * 5.5;
  }

  // =========== MEDICATIONS ===========
  const meds = (patient.medications ?? []) as Row[];
  if (meds.length > 0) {
    doc.setTextColor(40, 40, 45);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`Medications (${meds.length})`, 14, y + 2);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Drug", "Dose", "Frequency", "Route", "Prescriber", "Status", "Instructions"]],
      body: meds.map((m) => [
        String((m.drug as Row)?.name ?? "—"),
        String(m.dose ?? ""),
        String(m.frequency ?? ""),
        String(m.route ?? ""),
        String(m.prescriber ?? ""),
        String(m.status ?? ""),
        String(m.instructions ?? "—"),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 250] },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // =========== VITALS ===========
  const vitals = patient.latest_vitals as Row | undefined;
  if (vitals) {
    checkPageBreak();
    doc.setTextColor(40, 40, 45);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Latest Vitals", 14, y + 2);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Heart Rate", "Blood Pressure", "SpO2", "Blood Sugar", "Temperature", "Resp Rate", "Pain", "Recorded By"]],
      body: [[
        `${vitals.heart_rate ?? "—"} bpm`,
        `${vitals.blood_pressure_sys ?? "—"}/${vitals.blood_pressure_dia ?? "—"} mmHg`,
        `${vitals.spo2 ?? "—"}%`,
        `${vitals.blood_sugar ?? "—"} mg/dL`,
        `${vitals.temperature ?? "—"}°F`,
        `${vitals.respiratory_rate ?? "—"}/min`,
        `${vitals.pain_level ?? "—"}/10`,
        String(vitals.recorded_by ?? "—"),
      ]],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold" },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // =========== LAB RESULTS ===========
  if (labs.length > 0) {
    checkPageBreak();
    doc.setTextColor(40, 40, 45);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`Lab Results (${labs.length})`, 14, y + 2);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Test", "Value", "Reference Range", "Status", "Ordered By", "Date"]],
      body: labs.map((l) => [
        String(l.test_name),
        `${l.value} ${l.unit ?? ""}`,
        `${l.reference_low ?? "—"} – ${l.reference_high ?? "—"} ${l.unit ?? ""}`,
        String(l.status ?? "normal"),
        String(l.ordered_by ?? "—"),
        l.resulted_at ? new Date(String(l.resulted_at)).toLocaleDateString() : "—",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [168, 85, 247], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 3) {
          const status = data.row.raw[3];
          if (status === "critical") data.cell.styles.textColor = [220, 38, 38];
          else if (status === "abnormal") data.cell.styles.textColor = [217, 119, 6];
          else data.cell.styles.textColor = [22, 163, 74];
        }
      },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // =========== DOCTOR INSTRUCTIONS ===========
  const activeInstructions = instructions.filter((i) => i.status !== "cancelled");
  if (activeInstructions.length > 0) {
    checkPageBreak();
    doc.setTextColor(40, 40, 45);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`Doctor Instructions (${activeInstructions.length})`, 14, y + 2);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Priority", "Category", "Instruction", "Doctor", "Status"]],
      body: activeInstructions.map((i) => [
        String(i.priority ?? "routine").toUpperCase(),
        String(i.category ?? "—"),
        String(i.instruction ?? ""),
        String(i.doctor_name ?? "—"),
        String(i.status ?? "pending"),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      columnStyles: { 2: { cellWidth: 70 } },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // =========== MEDICATION ADMINISTRATION LOG ===========
  if (medAdmin.length > 0) {
    checkPageBreak();
    doc.setTextColor(40, 40, 45);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`Medication Administration Log (${medAdmin.length})`, 14, y + 2);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Time", "Drug", "Dose", "Status", "Administered By", "Notes"]],
      body: medAdmin.map((m) => [
        m.administered_at ? new Date(String(m.administered_at)).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—",
        String(m.drug_name ?? "—"),
        String(m.dose_given ?? ""),
        String(m.status ?? "given"),
        String(m.administered_by ?? "—"),
        String(m.notes ?? m.reason ?? "—"),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 250] },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // =========== NURSE NOTES ===========
  if (notes.length > 0) {
    checkPageBreak();
    doc.setTextColor(40, 40, 45);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`Nurse Notes (${notes.length})`, 14, y + 2);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [["Date/Time", "Type", "Author", "Shift", "Note"]],
      body: notes.map((n) => [
        n.created_at ? new Date(String(n.created_at)).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—",
        String(n.note_type ?? ""),
        String(n.author ?? ""),
        String(n.shift ?? ""),
        String(n.content ?? ""),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      columnStyles: { 4: { cellWidth: 80 } },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // =========== AI CARE PLAN ===========
  if (data.carePlan) {
    checkPageBreak();
    doc.setTextColor(40, 40, 45);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("AI Care Plan & Recommendations", 14, y + 2);
    y += 8;

    // Split care plan into lines and render
    const planLines = data.carePlan.split("\n");
    doc.setFontSize(9);
    for (const line of planLines) {
      if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 15; }
      if (line.startsWith("## ")) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(27, 107, 58);
        doc.setFontSize(11);
        y += 3;
        doc.text(line.slice(3), 14, y);
        y += 6;
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 45);
        doc.setFont("helvetica", "normal");
      } else if (line.startsWith("### ")) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        y += 2;
        doc.text(line.slice(4), 14, y);
        y += 5;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        const text = doc.splitTextToSize("  • " + line.slice(2), pageWidth - 32);
        doc.text(text, 14, y);
        y += text.length * 4;
      } else if (line.startsWith("**") && line.endsWith("**")) {
        doc.setFont("helvetica", "bold");
        doc.text(line.replace(/\*\*/g, ""), 14, y);
        doc.setFont("helvetica", "normal");
        y += 4.5;
      } else if (line.trim() === "" || line.startsWith("---")) {
        y += 2;
      } else {
        const text = doc.splitTextToSize(line.replace(/\*\*/g, ""), pageWidth - 28);
        doc.text(text, 14, y);
        y += text.length * 4;
      }
    }
    y += 6;
  }

  // =========== FOOTER on every page ===========
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).getNumberOfPages() as number;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 170);
    doc.text(`MedTrace — Confidential Patient Record — Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
    doc.text("This document is auto-generated and should be verified by a licensed healthcare provider.", pageWidth / 2, doc.internal.pageSize.getHeight() - 4, { align: "center" });
  }

  // Save
  const fileName = `MedTrace_${String(patient.name ?? "Patient").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);

  function checkPageBreak() {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 15;
    }
  }
}
