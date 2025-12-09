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
  if (
    root >= 5 &&
    root <= 25 &&
    root * root <= len + 2 &&
    root * root >= len - 2
  )
    return root;
  if (len <= 40) return len;
  return 20;
};

const drawLinePlotWithAxes = (
  doc,
  x,
  y,
  width,
  height,
  xs,
  ys,
  xLabel,
  yLabel
) => {
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

  // outer box
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.9);
  doc.rect(left, top, width, height);

  // axes
  doc.line(left, bottom, right, bottom);
  doc.line(left, top, left, bottom);

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  // X ticks
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

  // Y ticks
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const t = i / yTicks;
    const yPos = bottom - t * height;
    const v = minY + t * spanY;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.4);
    doc.line(left - 4, yPos, left, yPos);
    const label =
      Math.abs(spanY) > 5 ? Math.round(v).toString() : v.toFixed(2);
    doc.text(label, left - 6 - doc.getTextWidth(label), yPos + 3);
  }

  // axis labels
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);

  if (xLabel)
    doc.text(
      xLabel,
      left + width / 2 - doc.getTextWidth(xLabel) / 2,
      bottom + 26
    );

  if (yLabel)
    doc.text(yLabel, left - 40, top + height / 2, {
      angle: 90,
      align: "center",
    });

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

const drawSectionHeader = (doc, label, margin, y) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(26, 111, 214);
  doc.text(label, margin, y);
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.7);
  doc.line(margin, y + 4, margin + 220, y + 4);
  doc.setTextColor(40, 40, 40);
  return y + 20;
};


const computeWeightStats = (matrix) => {
  if (!matrix || !matrix.length || !matrix[0].length) return null;
  const rows = matrix.length;
  const cols = matrix[0].length;
  const total = rows * cols;

  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let sumSq = 0;
  let pos = 0;
  let neg = 0;
  let zero = 0;

  for (let r = 0; r < rows; r++) {
    const row = matrix[r];
    for (let c = 0; c < cols; c++) {
      const v = row[c];
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
      sumSq += v * v;
      if (v > 0) pos++;
      else if (v < 0) neg++;
      else zero++;
    }
  }

  const mean = sum / total;
  const variance = sumSq / total - mean * mean;
  const std = Math.sqrt(Math.max(0, variance));

  return {
    min,
    max,
    mean,
    std,
    posPct: (pos / total) * 100,
    negPct: (neg / total) * 100,
    zeroPct: (zero / total) * 100,
  };
};

export const generateCapacityReportPdf = ({
  experimentName,
  activationRule,
  capacityNoiseLevel,
  capacityResults,
  finalW,
  learningInfo,
  fileName,
  
  weightsCanvas,
}) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const margin = 48;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const lineHeight = 16;
  let y = margin;

  const addNewPageIfNeeded = (needed = lineHeight * 2) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const name = experimentName || "Untitled Experiment";

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(26, 111, 214);
  doc.text("Memory Capacity Test Report", margin, y);
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 6, pageWidth - margin, y + 6);
  y += 32;

  // Overview
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);

  doc.text(safeText("Experiment Name", name), margin, y);
  y += lineHeight;

  const lrText = (learningInfo && learningInfo.rule) || "Standard Hebbian";
  doc.text(`Learning Rule: ${lrText}`, margin, y);
  y += lineHeight;

  doc.text(safeText("Activation Rule", activationRule), margin, y);
  y += lineHeight;

  doc.text(
    `Noise Level: ${
      capacityNoiseLevel != null
        ? (capacityNoiseLevel * 100).toFixed(0) + "%"
        : "(not set)"
    }`,
    margin,
    y
  );
  y += lineHeight * 2;

  // Learning phase info
  if (learningInfo) {
    y = drawSectionHeader(doc, "Learning Phase Summary", margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);

    if (learningInfo.learningRate != null) {
      doc.text(`• Learning Rate: ${learningInfo.learningRate}`, margin, y);
      y += lineHeight;
    }

    if (learningInfo.numNeurons != null) {
      doc.text(`• Number of Neurons: ${learningInfo.numNeurons}`, margin, y);
      y += lineHeight;
    }

    if (learningInfo.numMemories != null) {
      doc.text(`• Number of Memories: ${learningInfo.numMemories}`, margin, y);
      y += lineHeight;
    }

    if (learningInfo.colorMap) {
      doc.text(`• Colormap: ${learningInfo.colorMap}`, margin, y);
      y += lineHeight;
    }

    y += lineHeight / 2;
  }

addNewPageIfNeeded(lineHeight * 3);
y = drawSectionHeader(doc, "Weight Matrix", margin, y);

if (finalW && finalW.length && finalW[0].length) {
  const stats = computeWeightStats(finalW);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(70, 70, 70);

  const rows = finalW.length;
  const cols = finalW[0].length;

  
  doc.text(`Shape: ${rows} × ${cols}`, margin, y);
  y += lineHeight;

  if (stats) {
    doc.text(
      `Min: ${stats.min.toFixed(2)}   Max: ${stats.max.toFixed(
        2
      )}   Mean: ${stats.mean.toFixed(2)}   Std: ${stats.std.toFixed(2)}`,
      margin,
      y
    );
    y += lineHeight;

    doc.text(
      `Sign distribution: + ${stats.posPct.toFixed(
        1
      )}%   - ${stats.negPct.toFixed(1)}%   0 ${stats.zeroPct.toFixed(1)}%`,
      margin,
      y
    );
    y += lineHeight * 1.5;
  }

  
  if (weightsCanvas) {
    const imgData = weightsCanvas.toDataURL("image/png");
    const pageWidth = doc.internal.pageSize.getWidth();
    const targetWidth = pageWidth - margin * 2; // fit page width
    const aspect = weightsCanvas.height / weightsCanvas.width || 1;
    const targetHeight = targetWidth * aspect;

    addNewPageIfNeeded(targetHeight + lineHeight);
    doc.addImage(imgData, "PNG", margin, y, targetWidth, targetHeight);
    y += targetHeight + lineHeight;

    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text("Figure 1: Learned weight matrix heatmap.", margin, y);
    y += lineHeight;
  } else {
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "Heatmap view not available (weights canvas missing).",
      margin,
      y
    );
    y += lineHeight * 2;
  }
} else {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text("No weight matrix available.", margin, y);
  y += lineHeight * 2;
}


  // Capacity plot
  addNewPageIfNeeded(lineHeight * 3);
  y = drawSectionHeader(doc, "Capacity Plot", margin, y);

  if (capacityResults && capacityResults.length) {
    const xs = capacityResults.map((r) => r.num_patterns);
    const ys = capacityResults.map((r) => r.success_count);

    addNewPageIfNeeded(260);
    y = drawLinePlotWithAxes(
      doc,
      margin,
      y,
      pageWidth - margin * 2,
      200,
      xs,
      ys,
      "Number of Patterns",
      "Successful Recalls"
    );
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("No capacity test data available.", margin, y);
    y += lineHeight * 2;
  }

  const baseName =
    fileName && fileName.trim().length ? fileName.trim() : "memory_capacity_report";
  const finalName = baseName.toLowerCase().endsWith(".pdf")
    ? baseName
    : `${baseName}.pdf`;
  doc.save(finalName);
};

export const generateReportPdf = ({
  type,
  experimentName,
  activationRule,
  AHist,
  Avec,
  energyHist,
  noise,
  trialsPerDataPoint,
  finalW,
  weightsCanvas,
  parsedMemories,
  learningRule,
  learningRate,
  scale,
  graphImage,
  fileName,
}) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const margin = 48;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const lineHeight = 16;
  let y = margin;

  const addNewPageIfNeeded = (needed = lineHeight * 2) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const name = experimentName || "Untitled Experiment";

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(26, 111, 214);
  doc.text("Memory Recall Test Report", margin, y);
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 6, pageWidth - margin, y + 6);
  y += 32;

  // Overview
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);

  doc.text(safeText("Experiment Name", name), margin, y);
  y += lineHeight;

  doc.text(safeText("Activation Rule", activationRule), margin, y);
  y += lineHeight;

  if (type === "capacity") {
    doc.text(`Noise: ${noise}`, margin, y);
    y += lineHeight;

    doc.text(`Trials per Data Point: ${trialsPerDataPoint}`, margin, y);
    y += lineHeight * 2;
  } else {
    const steps = AHist && AHist.length ? AHist.length - 1 : 0;
    doc.text(`Number of steps needed to converge: ${steps}`, margin, y);
    y += lineHeight * 2;

    // States
    addNewPageIfNeeded(lineHeight * 3);
    y = drawSectionHeader(doc, "State Evolution", margin, y);

    const states =
      AHist && AHist.length ? AHist : Avec && Avec.length ? [Avec] : [];
    const allStates = states || [];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    allStates.forEach((state, idx) => {
      if (!Array.isArray(state) || !state.length) return;

      addNewPageIfNeeded(lineHeight * 3);
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(`Iteration ${idx}:`, margin, y);
      y += lineHeight;

      const cols = pickMatrixCols(state.length);
      const chunks = chunkArray(state, cols);

      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);

      chunks.forEach((chunk) => {
        addNewPageIfNeeded(lineHeight);
        doc.text(chunk.join(" "), margin + 20, y);
        y += lineHeight;
      });

      y += 6;
    });

    // Energy plot
    addNewPageIfNeeded(lineHeight * 3);
    y = drawSectionHeader(doc, "Energy Plot", margin, y);

    if (energyHist && energyHist.length) {
      const xs = energyHist.map((_, i) => i);
      const ys = energyHist;

      addNewPageIfNeeded(260);
      y = drawLinePlotWithAxes(
        doc,
        margin,
        y,
        pageWidth - margin * 2,
        200,
        xs,
        ys,
        "Timestep",
        "Energy"
      );
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("No energy data available.", margin, y);
      y += lineHeight * 2;
    }
  }

  y += lineHeight;

  // Weights Matrix
  addNewPageIfNeeded(lineHeight * 3);
  y = drawSectionHeader(doc, "Weights Matrix", margin, y);

  if (finalW && finalW.length && finalW[0].length) {
    const stats = computeWeightStats(finalW);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);

    const rows = finalW.length;
    const cols = finalW[0].length;
    
    doc.text(`Shape: ${rows} × ${cols}`, margin, y);
    y += lineHeight;

    if (stats) {
      doc.text(
        `Min: ${stats.min.toFixed(2)}   Max: ${stats.max.toFixed(
          2
        )}   Mean: ${stats.mean.toFixed(2)}   Std: ${stats.std.toFixed(2)}`,
        margin,
        y
      );
      y += lineHeight;

      doc.text(
        `Sign distribution: + ${stats.posPct.toFixed(
          1
        )}%   - ${stats.negPct.toFixed(1)}%   0 ${stats.zeroPct.toFixed(1)}%`,
        margin,
        y
      );
      y += lineHeight * 1.5;
    }

    
    if (weightsCanvas) {
      const imgData = weightsCanvas.toDataURL("image/png");
      const pageWidth = doc.internal.pageSize.getWidth();
      const targetWidth = pageWidth - margin * 2; // fit page width
      const aspect = weightsCanvas.height / weightsCanvas.width || 1;
      const targetHeight = targetWidth * aspect;

      addNewPageIfNeeded(targetHeight + lineHeight);
      doc.addImage(imgData, "PNG", margin, y, targetWidth, targetHeight);
      y += targetHeight + lineHeight;
    } else {
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(
        "Heatmap view not available (weights canvas missing).",
        margin,
        y
      );
      y += lineHeight * 2;
    }
  }

  // Memories
  y += lineHeight;

  addNewPageIfNeeded(lineHeight * 3);
  y = drawSectionHeader(doc, "Memories", margin, y);

  const mems = Array.isArray(parsedMemories) ? parsedMemories : [];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Number of Memories: ${mems.length}`, margin, y);
  y += lineHeight;

  mems.forEach((mem, idx) => {
    addNewPageIfNeeded(lineHeight * 2);
    doc.setFontSize(12);
    doc.text(`Memory ${idx + 1}:`, margin, y);
    y += lineHeight;

    const cols = pickMatrixCols(mem.length);
    const chunks = chunkArray(mem, cols);

    doc.setFontSize(9);
    chunks.forEach((chunk) => {
      addNewPageIfNeeded(lineHeight);
      doc.text(chunk.join(" "), margin + 20, y);
      y += lineHeight;
    });

    y += 6;
  });

  y += lineHeight;

  // Learning Params
  addNewPageIfNeeded(lineHeight * 3);
  y = drawSectionHeader(doc, "Learning Parameters", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);

  doc.text(`Learning Rule: ${learningRule}`, margin, y);
  y += lineHeight;

  doc.text(`Learning Rate: ${learningRate}`, margin, y);
  y += lineHeight;

  doc.text(`Scale: ${scale}`, margin, y);
  y += lineHeight * 2;

  // Network Visualization
  if (graphImage) {
    addNewPageIfNeeded(300);
    y = drawSectionHeader(doc, "Network Visualization", margin, y);

    const targetWidth = pageWidth - margin * 2;
    const targetHeight = targetWidth * 0.6; // keep aspect ratio

    doc.addImage(graphImage, "PNG", margin, y, targetWidth, targetHeight);

    y += targetHeight + lineHeight;
  } else {
    y = drawSectionHeader(doc, "Network Visualization", margin, y);
    doc.text("No network visualization available.", margin, y);
    y += lineHeight;
  }

  const baseName =
    fileName && fileName.trim().length ? fileName.trim() : "memory_recall_report";
  const finalName = baseName.toLowerCase().endsWith(".pdf")
    ? baseName
    : `${baseName}.pdf`;
  doc.save(finalName);
};