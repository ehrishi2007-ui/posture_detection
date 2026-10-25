import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generates and downloads a clean, beautifully formatted PDF report for a single session.
 * @param {Object} sessionData - { stats, report, timestamp, userName, sessionId }
 */
export function exportSessionPDF({
  stats = {},
  report = "",
  timestamp = new Date().toISOString(),
  userName = "User",
  sessionId = null,
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // ── 1. Header Banner ────────────────────────────────────────────────────────
  doc.setFillColor(17, 24, 39); // Dark slate #111827
  doc.rect(0, 0, pageWidth, 85, "F");

  // Rust orange accent bar
  doc.setFillColor(200, 90, 42); // #C85A2A
  doc.rect(0, 85, pageWidth, 4, "F");

  // App Brand Wordmark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("MERU", margin, 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 90, 42);
  doc.text("ERGONOMIC & POSTURE HEALTH PLATFORM", margin, 58);

  // Right-side document label
  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175);
  doc.text("CLINICAL ERGONOMIC REPORT", pageWidth - margin, 42, { align: "right" });

  const dateStr = new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Generated: ${dateStr}`, pageWidth - margin, 58, { align: "right" });

  // ── 2. User & Session Metadata ──────────────────────────────────────────────
  let y = 115;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text("Postural Alignment Assessment", margin, y);

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  const sessionText = sessionId ? ` · Session #${sessionId}` : "";
  doc.text(`User Profile: ${userName}${sessionText} · Analysis Model: Gemini 2.5 Flash + MediaPipe Pose`, margin, y);

  // ── 3. Key Metrics Cards Row ────────────────────────────────────────────────
  y += 20;
  const cardWidth = (contentWidth - 30) / 4;
  const cardHeight = 58;

  const metrics = [
    {
      label: "POSTURE SCORE",
      val: `${stats.score ?? 80}%`,
      color: stats.score >= 80 ? [43, 158, 126] : stats.score >= 60 ? [194, 136, 48] : [194, 54, 64],
    },
    {
      label: "DURATION",
      val: stats.duration_min ? `${stats.duration_min.toFixed(1)} min` : "1.5 min",
      color: [17, 24, 39],
    },
    {
      label: "AVG SPINE ANGLE",
      val: stats.avg_spine_deg ? `${stats.avg_spine_deg.toFixed(1)}°` : "165.0°",
      color: [17, 24, 39],
    },
    {
      label: "WORST STREAK",
      val: `${stats.worst_streak ?? 0} frames`,
      color: stats.worst_streak > 15 ? [194, 54, 64] : [107, 114, 128],
    },
  ];

  metrics.forEach((m, idx) => {
    const cx = margin + idx * (cardWidth + 10);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 6, 6, "F");
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 6, 6, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(m.label, cx + cardWidth / 2, y + 18, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, cx + cardWidth / 2, y + 42, { align: "center" });
  });

  // ── 4. Posture Distribution Breakdown Table ─────────────────────────────────
  y += cardHeight + 24;

  const counts = stats.posture_counts || { "Good Posture": 80, Slouching: 10, "Leaning Forward": 10 };
  const totalFrames = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  const tableRows = Object.entries(counts).map(([name, count]) => {
    const pct = Math.round((count / totalFrames) * 100);
    let statusLabel = "Optimal Alignment";
    if (name === "Slouching") statusLabel = "Spinal Curvature Collapse";
    if (name === "Leaning Forward") statusLabel = "Forward Head & Torso Crane";
    if (name === "Shoulder Tilt") statusLabel = "Lateral Shoulder Asymmetry";
    if (name === "Head Tilt") statusLabel = "Cervical Lateral Tilt";

    return [name, `${count} frames`, `${pct}%`, statusLabel];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Posture Classification", "Observed Count", "Time %", "Clinical Indicator"]],
    body: tableRows,
    theme: "plain",
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [55, 65, 81],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      textColor: [31, 41, 55],
      fontSize: 9,
      rowPageBreak: "avoid",
    },
    columnStyles: {
      0: { fontStyle: "bold", width: 140 },
      1: { halign: "center", width: 90 },
      2: { halign: "center", fontStyle: "bold", width: 70 },
      3: { textColor: [107, 114, 128] },
    },
    styles: {
      cellPadding: 6,
      lineColor: [243, 244, 246],
      lineWidth: 1,
    },
  });

  // ── 5. AI Ergonomic Coaching Feedback ───────────────────────────────────────
  const finalTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : y + 90;
  y = finalTableY + 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text("AI Ergonomic Coach Clinical Assessment", margin, y);

  y += 12;
  const coachingText =
    report && report.trim().length > 0
      ? report
      : "Excellent overall alignment observed. Continue maintaining regular gaze breaks, keeping your display centered at eye level, and engaging your core muscles against the chair backrest.";

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);

  const splitText = doc.splitTextToSize(coachingText, contentWidth - 24);
  const textHeight = splitText.length * 14 + 18;

  doc.roundedRect(margin, y, contentWidth, Math.min(textHeight, 180), 6, 6, "F");
  doc.roundedRect(margin, y, contentWidth, Math.min(textHeight, 180), 6, 6, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(55, 65, 81);
  doc.text(splitText.slice(0, 12), margin + 12, y + 18);

  // ── 6. Ergonomic Recommendations Footer Box ────────────────────────────────
  y += Math.min(textHeight, 180) + 16;

  doc.setFillColor(254, 243, 199); // Amber tint
  doc.roundedRect(margin, y, contentWidth, 42, 6, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(146, 64, 14);
  doc.text("ERGONOMIC DESK PROTOCOLS:", margin + 12, y + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(146, 64, 14);
  doc.text(
    "1. Keep monitor 20-30 inches away · 2. Top third of screen at eye height · 3. Feet flat on floor with 90° knee angle",
    margin + 12,
    y + 30
  );

  // ── 7. Page Footer ──────────────────────────────────────────────────────────
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, pageHeight - 32, pageWidth - margin, pageHeight - 32);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text("Meru Desktop Posture & Health Platform · Generated Report", margin, pageHeight - 20);
  doc.text("Confidential Personal Ergonomic Assessment · Page 1 of 1", pageWidth - margin, pageHeight - 20, {
    align: "right",
  });

  // ── 8. Trigger Download ─────────────────────────────────────────────────────
  const fileName = `Meru_Session_Report_${new Date(timestamp).toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

/**
 * Generates and downloads a consolidated summary PDF report containing ALL recorded sessions.
 * @param {Object} data - { sessions: Array, userName: string }
 */
export function exportAllSessionsSummaryPDF({
  sessions = [],
  userName = "Rishitha",
}) {
  if (!sessions || sessions.length === 0) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // ── 1. Header Banner ────────────────────────────────────────────────────────
  doc.setFillColor(17, 24, 39); // Dark slate #111827
  doc.rect(0, 0, pageWidth, 85, "F");

  // Rust orange accent bar
  doc.setFillColor(200, 90, 42); // #C85A2A
  doc.rect(0, 85, pageWidth, 4, "F");

  // App Brand Wordmark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("MERU", margin, 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 90, 42);
  doc.text("ERGONOMIC & POSTURE HEALTH PLATFORM", margin, 58);

  // Right-side document label
  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175);
  doc.text("HISTORICAL SESSIONS SUMMARY", pageWidth - margin, 42, { align: "right" });

  const generatedDate = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Generated: ${generatedDate}`, pageWidth - margin, 58, { align: "right" });

  // ── 2. Report Title & Scope ─────────────────────────────────────────────────
  let y = 115;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text("Consolidated Postural Performance Summary", margin, y);

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);

  const totalCount = sessions.length;
  const earliestDate = new Date(sessions[sessions.length - 1]?.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const latestDate = new Date(sessions[0]?.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  doc.text(`User: ${userName} · Total Sessions Logged: ${totalCount} · Period: ${earliestDate} to ${latestDate}`, margin, y);

  // ── 3. Aggregate Performance Metrics ───────────────────────────────────────
  y += 20;
  const avgScore = Math.round(sessions.reduce((acc, s) => acc + (s.score || 0), 0) / (totalCount || 1));
  const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_min || 0), 0);
  const totalHoursStr = totalMinutes >= 60 ? `${(totalMinutes / 60).toFixed(1)} hrs` : `${Math.round(totalMinutes)} min`;

  // Count most common non-good issue
  const issueCounts = {};
  sessions.forEach((s) => {
    const iss = s.top_issue || "Good Posture";
    issueCounts[iss] = (issueCounts[iss] || 0) + 1;
  });
  const mostFrequentIssue = Object.keys(issueCounts).reduce((a, b) => (issueCounts[a] > issueCounts[b] ? a : b), "Good Posture");

  const optimalSessionsCount = sessions.filter((s) => (s.score || 0) >= 80).length;
  const complianceRate = Math.round((optimalSessionsCount / (totalCount || 1)) * 100);

  const cardWidth = (contentWidth - 30) / 4;
  const cardHeight = 58;

  const aggregateCards = [
    {
      label: "AVERAGE SCORE",
      val: `${avgScore}%`,
      color: avgScore >= 80 ? [43, 158, 126] : avgScore >= 60 ? [194, 136, 48] : [194, 54, 64],
    },
    {
      label: "TOTAL MONITORED",
      val: totalHoursStr,
      color: [17, 24, 39],
    },
    {
      label: "80%+ COMPLIANCE",
      val: `${complianceRate}%`,
      color: complianceRate >= 70 ? [43, 158, 126] : [194, 136, 48],
    },
    {
      label: "TOP RECURRING",
      val: mostFrequentIssue.length > 13 ? `${mostFrequentIssue.slice(0, 11)}..` : mostFrequentIssue,
      color: mostFrequentIssue === "Good Posture" ? [43, 158, 126] : [200, 90, 42],
    },
  ];

  aggregateCards.forEach((c, idx) => {
    const cx = margin + idx * (cardWidth + 10);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 6, 6, "F");
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 6, 6, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(c.label, cx + cardWidth / 2, y + 18, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.val, cx + cardWidth / 2, y + 42, { align: "center" });
  });

  // ── 4. Comprehensive Master Table of All Sessions ──────────────────────────
  y += cardHeight + 24;

  const tableData = sessions.map((s, index) => {
    const timeFormatted = new Date(s.timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const durationText = s.duration_min ? `${s.duration_min.toFixed(1)}m` : "1m";
    const spineText = s.avg_spine_deg ? `${s.avg_spine_deg.toFixed(1)}°` : "160°";
    const issueText = s.top_issue || "Good Posture";

    // Clean excerpt of AI coaching advice
    const rawAdvice = s.ai_report || s.tip || "Keep up your upright spinal alignment.";
    const cleanExcerpt = rawAdvice.replace(/[\n\r]+/g, " ").slice(0, 75) + (rawAdvice.length > 75 ? "…" : "");

    return [
      `#${s.id || totalCount - index}`,
      timeFormatted,
      `${s.score}%`,
      durationText,
      spineText,
      issueText,
      cleanExcerpt,
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 45 },
    head: [["ID", "Date & Time", "Score", "Duration", "Spine", "Primary State", "AI Coaching Takeaway"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [17, 24, 39],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    bodyStyles: {
      textColor: [31, 41, 55],
      fontSize: 8.5,
      cellPadding: 5.5,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { halign: "center", width: 32, fontStyle: "bold", textColor: [107, 114, 128] },
      1: { width: 95 },
      2: { halign: "center", fontStyle: "bold", width: 48 },
      3: { halign: "center", width: 55 },
      4: { halign: "center", width: 50 },
      5: { width: 95, fontStyle: "bold" },
      6: { textColor: [75, 85, 99] },
    },
    didDrawPage: (data) => {
      // Header for page 2+
      if (data.pageNumber > 1) {
        doc.setFillColor(17, 24, 39);
        doc.rect(0, 0, pageWidth, 28, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text("MERU · ALL SESSIONS SUMMARY REPORT", margin, 18);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(156, 163, 175);
        doc.text(`User: ${userName}`, pageWidth - margin, 18, { align: "right" });
      }

      // Footer on all pages
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text("Meru Desktop Ergonomic Health Platform · Confidential Summary", margin, pageHeight - 16);
      doc.text(`Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 16, {
        align: "right",
      });
    },
  });

  // ── 5. Trigger Download ─────────────────────────────────────────────────────
  const fileName = `Meru_All_Sessions_Summary_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
