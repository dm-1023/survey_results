class MockCanvas {
  constructor(width = 0, height = 0) {
    this._width = width;
    this._height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  get width() {
    return this._width;
  }

  set width(value) {
    this._width = value;
    this.data = new Uint8ClampedArray(this._width * this._height * 4);
  }

  get height() {
    return this._height;
  }

  set height(value) {
    this._height = value;
    this.data = new Uint8ClampedArray(this._width * this._height * 4);
  }

  getContext() {
    const canvas = this;
    return {
      getImageData: (x = 0, y = 0, width = canvas.width, height = canvas.height) => {
        const data = new Uint8ClampedArray(width * height * 4);
        for (let row = 0; row < height; row += 1) {
          for (let column = 0; column < width; column += 1) {
            const sourceIndex = ((y + row) * canvas.width + x + column) * 4;
            const targetIndex = (row * width + column) * 4;
            data.set(canvas.data.subarray(sourceIndex, sourceIndex + 4), targetIndex);
          }
        }
        return { data };
      },
      createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
      putImageData: (image) => { canvas.data = image.data; },
      fillRect: () => {},
      drawImage: () => {},
    };
  }

  toDataURL(type = "image/png") {
    return `data:${type};base64,mock`;
  }
}

globalThis.window = {};
globalThis.document = {
  createElement(name) {
    if (name !== "canvas") throw new Error(`Unexpected element: ${name}`);
    return new MockCanvas();
  },
};

await import("../src/survey-scan.js");

const width = 930;
const height = 1365;
const page = new MockCanvas(width, height);
for (let index = 0; index < page.data.length; index += 4) page.data.set([255, 255, 255, 255], index);

function drawRect(x, y, rectWidth, rectHeight, value = 0) {
  for (let offsetY = 0; offsetY < rectHeight; offsetY += 1) {
    for (let offsetX = 0; offsetX < rectWidth; offsetX += 1) {
      const index = ((y + offsetY) * width + x + offsetX) * 4;
      page.data[index] = value;
      page.data[index + 1] = value;
      page.data[index + 2] = value;
      page.data[index + 3] = 255;
    }
  }
}

drawRect(0, 0, 30, 30);
drawRect(width - 30, 0, 30, 30);
drawRect(width - 30, height - 30, 30, 30);
drawRect(0, height - 30, 30, 30);

const metadata = {
  fingerprint: 0x1234abcd,
  pageNumber: 1,
  pageCount: 1,
  targetStart: 0,
  targetCount: 4,
  totalTargets: 4,
};
const bits = window.SurveyScan.encodePageCode(metadata);
const codeCell = 10;
const codeLeft = width - 45 - 16 * codeCell;
bits.forEach((bit, index) => {
  if (!bit) return;
  drawRect(codeLeft + (index % 16) * codeCell, 5 + Math.floor(index / 16) * codeCell, codeCell, codeCell);
});

function drawAnswerBox(x, y, marked, markValue = 0) {
  drawRect(x, y, 35, 3);
  drawRect(x, y + 32, 35, 3);
  drawRect(x, y, 3, 35);
  drawRect(x + 32, y, 3, 35);
  if (!marked) return;
  for (let offset = 8; offset <= 26; offset += 1) {
    drawRect(x + offset, y + offset, 2, 2, markValue);
    drawRect(x + 34 - offset, y + offset, 2, 2, markValue);
  }
}

drawAnswerBox(100, 210, false);
drawAnswerBox(200, 210, true);
drawAnswerBox(100, 310, true, 145);
drawRect(185, 295, 65, 65, 185);
drawAnswerBox(200, 310, false);

const result = window.SurveyScan.analyzeCanvas(page, {
  expectedFingerprint: metadata.fingerprint,
  skipPreview: true,
  textRegionsByPage: {
    1: [{ questionId: "free-text", questionIndex: 10, pageNumber: 1, x: 80, y: 190, width: 180, height: 190 }],
  },
});

if (bits.length !== 112) throw new Error(`Unexpected code length: ${bits.length}`);
if (result.metadata.fingerprint !== metadata.fingerprint || result.metadata.targetCount !== 4) {
  throw new Error(`Page metadata mismatch: ${JSON.stringify(result.metadata)}`);
}
if (result.marks.length !== 4) throw new Error(`Expected 4 answer boxes, detected ${result.marks.length}`);
if (result.marks[0].selected || !result.marks[1].selected || !result.marks[2].selected || result.marks[3].selected) {
  throw new Error(`Unexpected mark detection: ${JSON.stringify(result.marks)}`);
}
if (result.textRegions.length !== 1 || result.textRegions[0].questionId !== "free-text" || !result.textRegions[0].imageDataUrl) {
  throw new Error(`Unexpected text-region extraction: ${JSON.stringify(result.textRegions)}`);
}

const rotatedPage = new MockCanvas(width, height);
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const sourceIndex = (y * width + x) * 4;
    const targetIndex = ((height - y - 1) * width + (width - x - 1)) * 4;
    rotatedPage.data.set(page.data.subarray(sourceIndex, sourceIndex + 4), targetIndex);
  }
}
const rotatedResult = window.SurveyScan.analyzeCanvas(rotatedPage, {
  expectedFingerprint: metadata.fingerprint,
  skipPreview: true,
});
if (rotatedResult.rotation !== 2 || rotatedResult.marks.length !== 4 || !rotatedResult.marks[1].selected || !rotatedResult.marks[2].selected) {
  throw new Error(`Rotated page mismatch: ${JSON.stringify(rotatedResult)}`);
}

const sidewaysPage = new MockCanvas(height, width);
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const sourceIndex = (y * width + x) * 4;
    const targetX = height - y - 1;
    const targetY = x;
    const targetIndex = (targetY * sidewaysPage.width + targetX) * 4;
    sidewaysPage.data.set(page.data.subarray(sourceIndex, sourceIndex + 4), targetIndex);
  }
}
const sidewaysResult = window.SurveyScan.analyzeCanvas(sidewaysPage, {
  expectedFingerprint: metadata.fingerprint,
  skipPreview: true,
});
if (sidewaysResult.marks.length !== 4 || !sidewaysResult.marks[1].selected || !sidewaysResult.marks[2].selected) {
  throw new Error(`Sideways page mismatch: ${JSON.stringify(sidewaysResult)}`);
}

drawAnswerBox(500, 500, true);
drawRect(200, 310, 35, 3, 255);
const guidedResult = window.SurveyScan.analyzeCanvas(page, {
  expectedFingerprint: metadata.fingerprint,
  skipPreview: true,
  markRegionsByPage: {
    1: [
      { x: 94, y: 198, width: 35, height: 35 },
      { x: 194, y: 198, width: 35, height: 35 },
      { x: 94, y: 293, width: 35, height: 35 },
      { x: 194, y: 293, width: 35, height: 35 },
    ],
  },
});
if (guidedResult.marks.length !== 4) throw new Error(`Expected-position detection returned ${guidedResult.marks.length} marks`);
if (guidedResult.marks[0].selected || !guidedResult.marks[1].selected || !guidedResult.marks[2].selected || guidedResult.marks[3].selected) {
  throw new Error(`Expected-position mark detection mismatch: ${JSON.stringify(guidedResult.marks)}`);
}
if (guidedResult.marks.some((mark) => mark.positionUncertain)) {
  throw new Error(`Expected answer boxes were incorrectly marked as position-uncertain: ${JSON.stringify(guidedResult.marks)}`);
}
if (guidedResult.marks.some((mark, index) => {
  const expectedX = index % 2 ? 200 : 100;
  const expectedY = index < 2 ? 210 : 310;
  return Math.abs(mark.x - expectedX) > 4 || Math.abs(mark.y - expectedY) > 4;
})) {
  throw new Error(`Expected-position alignment drifted from the printed boxes: ${JSON.stringify(guidedResult.marks)}`);
}

const changedBits = [...bits];
changedBits[17] = changedBits[17] ? 0 : 1;
if (window.SurveyScan.decodePageCode(changedBits) !== null) throw new Error("CRC accepted a modified page code");

console.log("Survey scan tests passed");
