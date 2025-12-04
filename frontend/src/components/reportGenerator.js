import { jsPDF } from "jspdf";

const safeText = (label, value) =>
  `${label}: ${value && value.toString().trim().length ? value : "(not set)"}`;

const chunkArray = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const pickMatrixCols = (len) => {
  const root = Math.round(Math.sqrt(len));
  if (root >= 5 && root <= 25 && root * root <= len + 2 && root * root >= len - 2)
    return root;
  if (len <= 40) return len;
  return 20;
};

const drawLinePlotWithAxes = (doc, x, y, width, height, xs, ys, xLabel, yLabel) => {
  const n = Math.min(xs.length, ys.length);
  if (!n) return y;

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const left = x;
  const bottom = y + height;
  const right = x + width;
  const top = y;

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.9);
  doc.rect(left, top, width, height);

  doc.line(left, bottom, right, bottom);
  doc.line(left, top, left, bottom);

  doc.setFontSize(9);

  const xTicks = 6;
  for (let i = 0; i <= xTicks; i++) {
    const t = i / xTicks;
    const xPos = left + t * width;
    const v = minX + t * spanX;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.4);
    doc.line(xPos, bottom, xPos, bottom + 4);
    const label = spanX > 5 ? Math.round(v).toString() : v.toFixed(2);
    doc.text(label, xPos - doc.getTextWidth(label) / 2, bottom + 14);
  }

  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const t = i / yTicks;
    const yPos = bottom - t * height;
    const v = minY + t * spanY;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.4);
    doc.line(left - 4, yPos, left, yPos);
    const label = Math.abs(spanY) > 5 ? Math.round(v).toString() : v.toFixed(2);
    doc.text(label, left - 6 - doc.getTextWidth(label), yPos + 3);
  }

  doc.setFontSize(10);
  if (xLabel)
    doc.text(xLabel, left + width / 2 - doc.getTextWidth(xLabel) / 2, bottom + 26);

  if (yLabel)
    doc.text(yLabel, left - 40, top + height / 2, { angle: 90, align: "center" });

  doc.setDrawColor(26, 111, 214);
  doc.setLineWidth(2);

  let prevX = null;
  let prevY = null;

  for (let i = 0; i < n; i++) {
    const pX = left + ((xs[i] - minX) / spanX) * width;
    const pY = bottom - ((ys[i] - minY) / spanY) * height;
    if (i > 0) doc.line(prevX, prevY, pX, pY);
    prevX = pX;
    prevY = pY;
  }

  return bottom + 40;
};

export const generateCapacityReportPdf = ({
  experimentName,
  activationRule,
  capacityNoiseLevel,
  capacityResults,
  finalW,
  learningInfo,
  fileName,
}) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const margin = 48;
  const pageHeight = doc.internal.pageSize.getHeight();
  const lineHeight = 16;
  let y = margin;

  const addNewPageIfNeeded = (needed = lineHeight * 2) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const name = experimentName || "Untitled Experiment";

  doc.setFontSize(20);
  doc.text("Memory Capacity Test Report", margin, y);
  y += 32;

  doc.setFontSize(12);
  doc.text(safeText("Experiment Name", name), margin, y);
  y += lineHeight;

  const lrText = (learningInfo && learningInfo.rule) || "Standard Hebbian";
  doc.text(`Learning Rule: ${lrText}`, margin, y);
  y += lineHeight;

  doc.text(safeText("Activation Rule", activationRule), margin, y);
  y += lineHeight;

  doc.text(
    `Noise Level: ${
      capacityNoiseLevel != null ? (capacityNoiseLevel * 100).toFixed(0) + "%" : "(not set)"
    }`,
    margin,
    y
  );
  y += lineHeight * 2;

  if (learningInfo) {
    doc.setFontSize(14);
    doc.text("Learning Phase Information", margin, y);
    y += lineHeight;

    doc.setFontSize(12);
    if (learningInfo.learningRate != null)
      doc.text(`Learning Rate: ${learningInfo.learningRate}`, margin, y), (y += lineHeight);

    if (learningInfo.numNeurons != null)
      doc.text(`Number of Neurons: ${learningInfo.numNeurons}`, margin, y),
        (y += lineHeight);

    if (learningInfo.numMemories != null)
      doc.text(`Number of Memories: ${learningInfo.numMemories}`, margin, y),
        (y += lineHeight);

    y += lineHeight;
  }

  doc.setFontSize(14);
  doc.text("Weight Matrix", margin, y);
  y += lineHeight;

  if (finalW && finalW.length && finalW[0].length) {
    doc.setFontSize(9);
    const maxRows = 20;
    const maxCols = 25;
    const rowsToShow = Math.min(finalW.length, maxRows);

    for (let r = 0; r < rowsToShow; r++) {
      addNewPageIfNeeded(lineHeight);
      const row = finalW[r]
        .slice(0, maxCols)
        .map((v) => (Math.abs(v) < 1e-4 ? "0" : v.toFixed(1)))
        .join(" ");
      doc.text(row, margin, y);
      y += lineHeight;
    }

    if (finalW.length > maxRows || finalW[0].length > maxCols) {
      addNewPageIfNeeded(lineHeight);
      doc.text("(truncated)", margin, y);
      y += lineHeight;
    }
  } else {
    doc.setFontSize(12);
    doc.text("No weight matrix available.", margin, y);
    y += lineHeight;
  }

  doc.setFontSize(14);
  doc.text("Capacity Plot", margin, y);
  y += lineHeight;

  if (capacityResults && capacityResults.length) {
    const xs = capacityResults.map((r) => r.num_patterns);
    const ys = capacityResults.map((r) => r.success_count);

    addNewPageIfNeeded(260);
    y = drawLinePlotWithAxes(doc, margin, y, 500, 200, xs, ys, "Number of Patterns", "Successful Recalls");
  } else {
    doc.setFontSize(12);
    doc.text("No capacity test data available.", margin, y);
    y += lineHeight * 2;
  }

  const baseName =
    fileName && fileName.trim().length
        ? fileName.trim()
        : "memory_capacity_report";
  const finalName = baseName.toLowerCase().endsWith(".pdf")
    ? baseName
    : `${baseName}.pdf`;
  doc.save(finalName);

};

export const generateRecallReportPdf = ({
  experimentName,
  activationRule,
  AHist,
  Avec,
  energyHist,
  fileName,
}) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const margin = 48;
  const pageHeight = doc.internal.pageSize.getHeight();
  const lineHeight = 16;
  let y = margin;

  const addNewPageIfNeeded = (needed = lineHeight * 2) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const name = experimentName || "Untitled Experiment";

  doc.setFontSize(20);
  doc.text("Memory Recall Test Report", margin, y);
  y += 32;

  doc.setFontSize(12);
  doc.text(safeText("Experiment Name", name), margin, y);
  y += lineHeight;

  doc.text(safeText("Activation Rule", activationRule), margin, y);
  y += lineHeight;

  const steps = AHist && AHist.length ? AHist.length - 1 : 0;
  doc.text(`Number of steps needed to converge: ${steps}`, margin, y);
  y += lineHeight * 2;

  doc.setFontSize(14);
  doc.text("Energy Plot", margin, y);
  y += lineHeight;

  if (energyHist && energyHist.length) {
    const xs = energyHist.map((_, i) => i);
    const ys = energyHist;

    addNewPageIfNeeded(260);
    y = drawLinePlotWithAxes(doc, margin, y, 500, 200, xs, ys, "Timestep", "Energy");
  } else {
    doc.setFontSize(12);
    doc.text("No energy data available.", margin, y);
    y += lineHeight * 2;
  }

  doc.setFontSize(14);
  doc.text("Visualization of the states", margin, y);
  y += lineHeight;

  const states = AHist && AHist.length ? AHist : Avec && Avec.length ? [Avec] : [];
  const allStates = states || [];

  doc.setFontSize(9);

  allStates.forEach((state, idx) => {
    if (!Array.isArray(state) || !state.length) return;

    addNewPageIfNeeded(lineHeight * 3);
    doc.setFontSize(11);
    doc.text(`Iteration ${idx}:`, margin, y);
    y += lineHeight;

    const cols = pickMatrixCols(state.length);
    const chunks = chunkArray(state, cols);

    doc.setFontSize(9);

    chunks.forEach((chunk) => {
      addNewPageIfNeeded(lineHeight);
      doc.text(chunk.join(" "), margin + 20, y);
      y += lineHeight;
    });

    y += 6;
  });

  const baseName =
    fileName && fileName.trim().length
        ? fileName.trim()
        : "memory_recall_report";
  const finalName = baseName.toLowerCase().endsWith(".pdf")
    ? baseName
    : `${baseName}.pdf`;
  doc.save(finalName);

};
