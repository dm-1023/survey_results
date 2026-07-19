(() => {
  "use strict";

  const CODE_VERSION = 1;
  const CODE_COLUMNS = 16;
  const CODE_ROWS = 7;
  const CODE_BYTES = 14;
  const CANONICAL_WIDTH = 930;
  const CANONICAL_HEIGHT = 1365;
  const PX_PER_MM = 5;
  const MARKER_CENTER = 3 * PX_PER_MM;
  const CODE_CELL = 2 * PX_PER_MM;
  const CODE_RIGHT_MARGIN = 9 * PX_PER_MM;
  const CODE_LEFT = CANONICAL_WIDTH - CODE_RIGHT_MARGIN - CODE_COLUMNS * CODE_CELL;
  const CODE_TOP = 1 * PX_PER_MM;

  function fingerprint(value) {
    const bytes = new TextEncoder().encode(String(value ?? ""));
    let hash = 0x811c9dc5;
    bytes.forEach((byte) => {
      hash ^= byte;
      hash = Math.imul(hash, 0x01000193);
    });
    return hash >>> 0;
  }

  function encodePageCode(metadata) {
    const bytes = new Uint8Array(CODE_BYTES);
    const surveyFingerprint = Number(metadata.fingerprint) >>> 0;
    bytes[0] = 0xad;
    bytes[1] = 0x30 | CODE_VERSION;
    bytes[2] = (surveyFingerprint >>> 24) & 0xff;
    bytes[3] = (surveyFingerprint >>> 16) & 0xff;
    bytes[4] = (surveyFingerprint >>> 8) & 0xff;
    bytes[5] = surveyFingerprint & 0xff;
    bytes[6] = clampInteger(metadata.pageNumber, 1, 255);
    bytes[7] = clampInteger(metadata.pageCount, 1, 255);
    bytes[8] = (clampInteger(metadata.targetStart, 0, 65535) >>> 8) & 0xff;
    bytes[9] = clampInteger(metadata.targetStart, 0, 65535) & 0xff;
    bytes[10] = clampInteger(metadata.targetCount, 0, 255);
    bytes[11] = (clampInteger(metadata.totalTargets, 0, 65535) >>> 8) & 0xff;
    bytes[12] = clampInteger(metadata.totalTargets, 0, 65535) & 0xff;
    bytes[13] = crc8(bytes.subarray(0, 13));
    return bytesToBits(bytes);
  }

  function decodePageCode(bits) {
    if (!Array.isArray(bits) || bits.length !== CODE_COLUMNS * CODE_ROWS) return null;
    const bytes = bitsToBytes(bits);
    if (bytes.length !== CODE_BYTES || bytes[0] !== 0xad || bytes[1] !== (0x30 | CODE_VERSION)) return null;
    if (bytes[13] !== crc8(bytes.subarray(0, 13))) return null;
    return {
      version: bytes[1] & 0x0f,
      fingerprint: (((bytes[2] << 24) >>> 0) + (bytes[3] << 16) + (bytes[4] << 8) + bytes[5]) >>> 0,
      pageNumber: bytes[6],
      pageCount: bytes[7],
      targetStart: (bytes[8] << 8) | bytes[9],
      targetCount: bytes[10],
      totalTargets: (bytes[11] << 8) | bytes[12],
    };
  }

  async function analyzeFile(file, options = {}) {
    const source = await loadImageCanvas(file);
    return analyzeCanvas(source, options);
  }

  function analyzeCanvas(source, options = {}) {
    const gray = canvasToGray(source);
    const threshold = clampNumber(otsuThreshold(gray.data), 55, 150);
    const registration = findRegistrationMarkers(gray.data, gray.width, gray.height, threshold);
    if (!registration) {
      throw new Error("用紙四隅の黒い読取マークを確認できません。用紙全体が写るように撮影してください。");
    }

    let decoded = null;
    let transform = null;
    let rotation = 0;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const sourceCorners = rotateCorners(registration, attempt);
      const candidateTransform = createCanonicalToSourceTransform(sourceCorners);
      const code = readPageCode(gray, candidateTransform);
      if (!code) continue;
      if (options.expectedFingerprint !== undefined && code.fingerprint !== (Number(options.expectedFingerprint) >>> 0)) continue;
      decoded = code;
      transform = candidateTransform;
      rotation = attempt;
      break;
    }

    if (!decoded || !transform) {
      throw new Error("このアンケートの読取コードを確認できません。対象アンケートからPDF出力した用紙を使用してください。");
    }

    const corrected = warpCanvas(source, transform);
    const markResult = detectAnswerMarks(corrected);
    const annotated = options.skipPreview ? null : drawDetectionPreview(corrected, markResult.marks, decoded);
    return {
      metadata: decoded,
      rotation,
      marks: markResult.marks,
      threshold: markResult.threshold,
      previewDataUrl: annotated ? annotated.toDataURL("image/jpeg", 0.86) : "",
    };
  }

  async function loadImageCanvas(file) {
    let image = null;
    let objectUrl = "";
    try {
      if (typeof createImageBitmap === "function") {
        image = await createImageBitmap(file, { imageOrientation: "from-image" });
      } else {
        objectUrl = URL.createObjectURL(file);
        image = await loadHtmlImage(objectUrl);
      }
      const sourceWidth = image.width || image.naturalWidth;
      const sourceHeight = image.height || image.naturalHeight;
      const maxSide = 1700;
      const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally {
      if (image && typeof image.close === "function") image.close();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  function loadHtmlImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("画像を読み込めませんでした。"));
      image.src = url;
    });
  }

  function canvasToGray(canvas) {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const output = new Uint8Array(canvas.width * canvas.height);
    for (let sourceIndex = 0, targetIndex = 0; sourceIndex < imageData.data.length; sourceIndex += 4, targetIndex += 1) {
      output[targetIndex] = Math.round(
        imageData.data[sourceIndex] * 0.299
        + imageData.data[sourceIndex + 1] * 0.587
        + imageData.data[sourceIndex + 2] * 0.114,
      );
    }
    return { data: output, width: canvas.width, height: canvas.height };
  }

  function otsuThreshold(gray) {
    const histogram = new Uint32Array(256);
    gray.forEach((value) => { histogram[value] += 1; });
    let totalWeight = 0;
    for (let index = 0; index < 256; index += 1) totalWeight += index * histogram[index];
    let backgroundWeight = 0;
    let backgroundTotal = 0;
    let bestVariance = -1;
    let bestThreshold = 128;
    for (let threshold = 0; threshold < 256; threshold += 1) {
      backgroundTotal += histogram[threshold];
      if (!backgroundTotal) continue;
      const foregroundTotal = gray.length - backgroundTotal;
      if (!foregroundTotal) break;
      backgroundWeight += threshold * histogram[threshold];
      const backgroundMean = backgroundWeight / backgroundTotal;
      const foregroundMean = (totalWeight - backgroundWeight) / foregroundTotal;
      const variance = backgroundTotal * foregroundTotal * (backgroundMean - foregroundMean) ** 2;
      if (variance > bestVariance) {
        bestVariance = variance;
        bestThreshold = threshold;
      }
    }
    return bestThreshold;
  }

  function findRegistrationMarkers(gray, width, height, threshold) {
    const components = connectedComponents(gray, width, height, threshold, {
      minWidth: Math.max(7, Math.round(Math.min(width, height) * 0.006)),
      maxWidth: Math.round(Math.min(width, height) * 0.07),
      minHeight: Math.max(7, Math.round(Math.min(width, height) * 0.006)),
      maxHeight: Math.round(Math.min(width, height) * 0.07),
      minPixels: 40,
    });
    const candidates = components
      .filter((item) => item.aspect >= 0.72 && item.aspect <= 1.38 && item.fill >= 0.62)
      .sort((a, b) => b.area - a.area)
      .slice(0, 80);
    let best = null;
    candidates.forEach((reference) => {
      const group = candidates.filter((item) => item.area >= reference.area * 0.48 && item.area <= reference.area * 1.85);
      if (group.length < 4) return;
      const picks = [
        minBy(group, (item) => item.centerX + item.centerY),
        minBy(group, (item) => (width - item.centerX) + item.centerY),
        minBy(group, (item) => (width - item.centerX) + (height - item.centerY)),
        minBy(group, (item) => item.centerX + (height - item.centerY)),
      ];
      if (new Set(picks).size !== 4) return;
      const spanX = ((picks[1].centerX + picks[2].centerX) - (picks[0].centerX + picks[3].centerX)) / 2;
      const spanY = ((picks[2].centerY + picks[3].centerY) - (picks[0].centerY + picks[1].centerY)) / 2;
      if (spanX < width * 0.38 || spanY < height * 0.5) return;
      const areas = picks.map((item) => item.area);
      const meanArea = areas.reduce((sum, value) => sum + value, 0) / areas.length;
      const areaVariation = Math.max(...areas.map((value) => Math.abs(value - meanArea) / meanArea));
      if (areaVariation > 0.58) return;
      const score = (spanX / width) * (spanY / height) * (1 - areaVariation * 0.6) * Math.sqrt(meanArea);
      if (!best || score > best.score) best = { score, picks };
    });
    if (!best) return null;
    return best.picks.map((item) => ({ x: item.centerX, y: item.centerY }));
  }

  function connectedComponents(gray, width, height, threshold, limits) {
    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    const output = [];
    const isDark = (index) => gray[index] <= threshold;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const start = y * width + x;
        if (visited[start] || !isDark(start)) continue;
        let head = 0;
        let tail = 0;
        let pixels = 0;
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;
        visited[start] = 1;
        queue[tail++] = start;
        while (head < tail) {
          const index = queue[head++];
          const currentY = Math.floor(index / width);
          const currentX = index - currentY * width;
          pixels += 1;
          if (currentX < minX) minX = currentX;
          if (currentX > maxX) maxX = currentX;
          if (currentY < minY) minY = currentY;
          if (currentY > maxY) maxY = currentY;
          if (currentX > 0) enqueueDark(index - 1);
          if (currentX + 1 < width) enqueueDark(index + 1);
          if (currentY > 0) enqueueDark(index - width);
          if (currentY + 1 < height) enqueueDark(index + width);
        }
        const componentWidth = maxX - minX + 1;
        const componentHeight = maxY - minY + 1;
        if (pixels < limits.minPixels
          || componentWidth < limits.minWidth || componentWidth > limits.maxWidth
          || componentHeight < limits.minHeight || componentHeight > limits.maxHeight) continue;
        const area = componentWidth * componentHeight;
        output.push({
          minX,
          maxX,
          minY,
          maxY,
          width: componentWidth,
          height: componentHeight,
          area,
          pixels,
          fill: pixels / area,
          aspect: componentWidth / componentHeight,
          centerX: (minX + maxX) / 2,
          centerY: (minY + maxY) / 2,
        });

        function enqueueDark(next) {
          if (visited[next] || !isDark(next)) return;
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }
    return output;
  }

  function rotateCorners(corners, amount) {
    return corners.map((_, index) => corners[(index + amount) % corners.length]);
  }

  function createCanonicalToSourceTransform(sourceCorners) {
    const destinationCorners = [
      { x: MARKER_CENTER, y: MARKER_CENTER },
      { x: CANONICAL_WIDTH - MARKER_CENTER, y: MARKER_CENTER },
      { x: CANONICAL_WIDTH - MARKER_CENTER, y: CANONICAL_HEIGHT - MARKER_CENTER },
      { x: MARKER_CENTER, y: CANONICAL_HEIGHT - MARKER_CENTER },
    ];
    return solveHomography(destinationCorners, sourceCorners);
  }

  function solveHomography(from, to) {
    const matrix = [];
    for (let index = 0; index < 4; index += 1) {
      const x = from[index].x;
      const y = from[index].y;
      const u = to[index].x;
      const v = to[index].y;
      matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
      matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
    }
    for (let column = 0; column < 8; column += 1) {
      let pivot = column;
      for (let row = column + 1; row < 8; row += 1) {
        if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
      }
      if (Math.abs(matrix[pivot][column]) < 1e-9) throw new Error("画像の傾きを補正できませんでした。");
      [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
      const divisor = matrix[column][column];
      for (let cell = column; cell < 9; cell += 1) matrix[column][cell] /= divisor;
      for (let row = 0; row < 8; row += 1) {
        if (row === column) continue;
        const factor = matrix[row][column];
        for (let cell = column; cell < 9; cell += 1) matrix[row][cell] -= factor * matrix[column][cell];
      }
    }
    return matrix.map((row) => row[8]);
  }

  function projectPoint(transform, x, y) {
    const denominator = transform[6] * x + transform[7] * y + 1;
    return {
      x: (transform[0] * x + transform[1] * y + transform[2]) / denominator,
      y: (transform[3] * x + transform[4] * y + transform[5]) / denominator,
    };
  }

  function readPageCode(gray, transform) {
    const values = [];
    for (let row = 0; row < CODE_ROWS; row += 1) {
      for (let column = 0; column < CODE_COLUMNS; column += 1) {
        const point = projectPoint(
          transform,
          CODE_LEFT + (column + 0.5) * CODE_CELL,
          CODE_TOP + (row + 0.5) * CODE_CELL,
        );
        values.push(sampleGray(gray, point.x, point.y, 2));
      }
    }
    const clusters = twoGrayClusters(values);
    if (!clusters || clusters.light - clusters.dark < 48) return null;
    return decodePageCode(values.map((value) => value < clusters.threshold ? 1 : 0));
  }

  function sampleGray(gray, x, y, radius) {
    const centerX = Math.round(x);
    const centerY = Math.round(y);
    let sum = 0;
    let count = 0;
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      const sampleY = centerY + offsetY;
      if (sampleY < 0 || sampleY >= gray.height) continue;
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        const sampleX = centerX + offsetX;
        if (sampleX < 0 || sampleX >= gray.width) continue;
        sum += gray.data[sampleY * gray.width + sampleX];
        count += 1;
      }
    }
    return count ? sum / count : 255;
  }

  function twoGrayClusters(values) {
    if (!values.length) return null;
    let dark = Math.min(...values);
    let light = Math.max(...values);
    for (let iteration = 0; iteration < 12; iteration += 1) {
      const midpoint = (dark + light) / 2;
      const darkValues = values.filter((value) => value < midpoint);
      const lightValues = values.filter((value) => value >= midpoint);
      if (!darkValues.length || !lightValues.length) return null;
      dark = darkValues.reduce((sum, value) => sum + value, 0) / darkValues.length;
      light = lightValues.reduce((sum, value) => sum + value, 0) / lightValues.length;
    }
    return { dark, light, threshold: (dark + light) / 2 };
  }

  function warpCanvas(source, transform) {
    const output = document.createElement("canvas");
    output.width = CANONICAL_WIDTH;
    output.height = CANONICAL_HEIGHT;
    const sourceContext = source.getContext("2d", { willReadFrequently: true });
    const sourceData = sourceContext.getImageData(0, 0, source.width, source.height).data;
    const outputContext = output.getContext("2d", { willReadFrequently: true });
    const outputImage = outputContext.createImageData(output.width, output.height);
    for (let y = 0; y < output.height; y += 1) {
      for (let x = 0; x < output.width; x += 1) {
        const sourcePoint = projectPoint(transform, x, y);
        const sourceX = Math.round(sourcePoint.x);
        const sourceY = Math.round(sourcePoint.y);
        const outputIndex = (y * output.width + x) * 4;
        if (sourceX < 0 || sourceX >= source.width || sourceY < 0 || sourceY >= source.height) {
          outputImage.data[outputIndex] = 255;
          outputImage.data[outputIndex + 1] = 255;
          outputImage.data[outputIndex + 2] = 255;
          outputImage.data[outputIndex + 3] = 255;
          continue;
        }
        const sourceIndex = (sourceY * source.width + sourceX) * 4;
        outputImage.data[outputIndex] = sourceData[sourceIndex];
        outputImage.data[outputIndex + 1] = sourceData[sourceIndex + 1];
        outputImage.data[outputIndex + 2] = sourceData[sourceIndex + 2];
        outputImage.data[outputIndex + 3] = 255;
      }
    }
    outputContext.putImageData(outputImage, 0, 0);
    return output;
  }

  function detectAnswerMarks(canvas) {
    const gray = canvasToGray(canvas);
    const threshold = clampNumber(otsuThreshold(gray.data), 75, 185);
    const components = connectedComponents(gray.data, gray.width, gray.height, threshold, {
      minWidth: 24,
      maxWidth: 52,
      minHeight: 24,
      maxHeight: 52,
      minPixels: 50,
    });
    const candidates = components.filter((item) => {
      if (item.aspect < 0.72 || item.aspect > 1.32 || item.fill < 0.07 || item.fill > 0.78) return false;
      return squareBorderScore(gray, item, threshold) >= 0.34;
    });
    const deduplicated = deduplicateSquares(candidates);
    const ordered = sortReadingOrder(deduplicated);
    const marks = ordered.map((item, index) => {
      const score = interiorDarkRatio(gray, item, threshold);
      return {
        index,
        x: item.minX,
        y: item.minY,
        width: item.width,
        height: item.height,
        score,
        selected: score >= 0.055,
        uncertain: score >= 0.03 && score < 0.085,
      };
    });
    return { marks, threshold };
  }

  function squareBorderScore(gray, item, threshold) {
    const band = Math.max(2, Math.round(Math.min(item.width, item.height) * 0.14));
    let dark = 0;
    let total = 0;
    for (let y = item.minY; y <= item.maxY; y += 1) {
      for (let x = item.minX; x <= item.maxX; x += 1) {
        const localX = x - item.minX;
        const localY = y - item.minY;
        if (localX >= band && localX < item.width - band && localY >= band && localY < item.height - band) continue;
        total += 1;
        if (gray.data[y * gray.width + x] <= threshold) dark += 1;
      }
    }
    return total ? dark / total : 0;
  }

  function interiorDarkRatio(gray, item, threshold) {
    const margin = Math.max(4, Math.round(Math.min(item.width, item.height) * 0.16));
    const values = [];
    for (let y = item.minY + margin; y <= item.maxY - margin; y += 1) {
      for (let x = item.minX + margin; x <= item.maxX - margin; x += 1) {
        values.push(gray.data[y * gray.width + x]);
      }
    }
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const background = sorted[Math.floor(sorted.length * 0.82)];
    const inkThreshold = Math.max(45, Math.min(background - 28, threshold + 90));
    return values.filter((value) => value <= inkThreshold).length / values.length;
  }

  function deduplicateSquares(items) {
    const output = [];
    items.sort((a, b) => b.area - a.area).forEach((item) => {
      const overlaps = output.some((existing) => {
        const dx = existing.centerX - item.centerX;
        const dy = existing.centerY - item.centerY;
        return Math.hypot(dx, dy) < Math.min(existing.width, item.width) * 0.55;
      });
      if (!overlaps) output.push(item);
    });
    return output;
  }

  function sortReadingOrder(items) {
    if (!items.length) return [];
    const medianHeight = median(items.map((item) => item.height));
    const rows = [];
    items.sort((a, b) => a.centerY - b.centerY).forEach((item) => {
      let row = rows.find((candidate) => Math.abs(candidate.centerY - item.centerY) <= medianHeight * 0.58);
      if (!row) {
        row = { centerY: item.centerY, items: [] };
        rows.push(row);
      }
      row.items.push(item);
      row.centerY = row.items.reduce((sum, entry) => sum + entry.centerY, 0) / row.items.length;
    });
    rows.sort((a, b) => a.centerY - b.centerY);
    return rows.flatMap((row) => row.items.sort((a, b) => a.centerX - b.centerX));
  }

  function drawDetectionPreview(source, marks, metadata) {
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext("2d");
    context.drawImage(source, 0, 0);
    context.lineWidth = 3;
    context.font = "700 15px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "bottom";
    marks.forEach((mark, index) => {
      context.strokeStyle = mark.uncertain ? "#d97706" : mark.selected ? "#147a4b" : "#64748b";
      context.fillStyle = context.strokeStyle;
      context.strokeRect(mark.x - 3, mark.y - 3, mark.width + 6, mark.height + 6);
      context.fillText(String(metadata.targetStart + index + 1), mark.x + mark.width / 2, mark.y - 5);
    });
    return canvas;
  }

  function bytesToBits(bytes) {
    const bits = [];
    bytes.forEach((byte) => {
      for (let shift = 7; shift >= 0; shift -= 1) bits.push((byte >>> shift) & 1);
    });
    return bits;
  }

  function bitsToBytes(bits) {
    const bytes = new Uint8Array(Math.ceil(bits.length / 8));
    bits.forEach((bit, index) => {
      if (bit) bytes[Math.floor(index / 8)] |= 1 << (7 - (index % 8));
    });
    return bytes;
  }

  function crc8(bytes) {
    let crc = 0;
    bytes.forEach((byte) => {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    });
    return crc;
  }

  function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function minBy(items, readValue) {
    return items.reduce((best, item) => readValue(item) < readValue(best) ? item : best, items[0]);
  }

  function clampInteger(value, min, max) {
    return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
  }

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  window.SurveyScan = Object.freeze({
    CODE_COLUMNS,
    CODE_ROWS,
    analyzeCanvas,
    analyzeFile,
    decodePageCode,
    encodePageCode,
    fingerprint,
  });
})();
