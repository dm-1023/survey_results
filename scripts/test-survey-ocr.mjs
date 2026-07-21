import assert from "node:assert/strict";

const workerRequests = [];
const workerInstances = [];

class MockWorker {
  constructor(url, options) {
    this.url = String(url);
    this.options = options;
    this.listeners = new Map();
    this.terminated = false;
    workerInstances.push(this);
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  postMessage(message, transferables = []) {
    workerRequests.push({ message, transferables });
    queueMicrotask(() => {
      if (message.type === "init") {
        this.emit("message", {
          kind: "worker-transport-response",
          status: "success",
          requestId: message.requestId,
          payload: { summary: { initialized: true }, modelConfig: {} },
        });
        return;
      }
      if (message.type === "predict") {
        const results = message.payload.sources.map(({ imageBitmap }) => createPrediction(imageBitmap.id));
        this.emit("message", {
          kind: "worker-transport-response",
          status: "success",
          requestId: message.requestId,
          payload: results,
        });
      }
    });
  }

  emit(type, data) {
    for (const listener of this.listeners.get(type) || []) listener({ data });
  }

  terminate() {
    this.terminated = true;
  }
}

function createPrediction(id) {
  const outputs = {
    "line-one": [
      { text: "会", score: 0.6, poly: [[40, 1], [50, 1], [50, 12], [40, 12]] },
      { text: "町内", score: 0.8, poly: [[1, 1], [35, 1], [35, 12], [1, 12]] },
    ],
    "line-two": [{ text: "テスト", score: 0.9, poly: [[1, 1], [40, 1], [40, 12], [1, 12]] }],
    number: [{ text: "〇", score: 0.85, poly: [[1, 1], [12, 1], [12, 12], [1, 12]] }],
    phone: [{ text: "011-123-4567", score: 0.72, poly: [[1, 1], [80, 1], [80, 12], [1, 12]] }],
    "other-close": [{ text: "（）", score: 0.8, poly: [[1, 1], [15, 1], [15, 12], [1, 12]] }],
  };
  return { image: { width: 100, height: 20 }, items: outputs[id] || [] };
}

function imageDataUrl(id) {
  return `data:text/plain;base64,${Buffer.from(id).toString("base64")}`;
}

globalThis.document = { baseURI: "http://127.0.0.1:4173/" };
globalThis.window = {};
globalThis.Worker = MockWorker;
globalThis.createImageBitmap = async (blob) => ({
  id: Buffer.from(await blob.arrayBuffer()).toString(),
  close() {},
});

await import("../src/survey-ocr.js");

const progress = [];
const results = await window.SurveyOcr.recognizeRegions([
  {
    questionId: "q2",
    questionIndex: 1,
    pageNumber: 2,
    kind: "text",
    imageDataUrl: imageDataUrl("second"),
    lineImageDataUrls: [imageDataUrl("line-one"), imageDataUrl("line-two")],
    inkRatio: 0.02,
    lineCount: 2,
  },
  { questionId: "q1", questionIndex: 0, pageNumber: 1, imageDataUrl: imageDataUrl("blank"), inkRatio: 0.0001 },
], { onProgress: (item) => progress.push(item.stage) });

assert.equal(window.SurveyOcr.ENGINE_NAME, "PaddleOCR");
assert.equal(workerInstances.length, 1);
assert.equal(workerInstances[0].url, "http://127.0.0.1:4173/vendor/paddleocr/worker.js");
assert.deepEqual(workerInstances[0].options, { type: "module", name: "survey-paddleocr" });
const initRequest = workerRequests[0].message;
assert.equal(initRequest.type, "init");
assert.equal(initRequest.payload.options.pipelineConfig.modelSelection.textRecognitionModelName, "PP-OCRv6_small_rec");
assert.equal(initRequest.payload.options.pipelineConfig.assets.rec.url, "http://127.0.0.1:4173/vendor/paddleocr/models/PP-OCRv6_small_rec.tar");
assert.equal(initRequest.payload.options.ortOptions.backend, "wasm");
assert.equal(initRequest.payload.options.ortOptions.numThreads, 1);
assert.match(initRequest.payload.options.ortOptions.wasmPaths, /^https:\/\/cdn\.jsdelivr\.net\//);
assert.equal(workerRequests[1].message.type, "predict");
assert.equal(workerRequests[1].message.payload.sources.length, 2);
assert.equal(results[0].questionId, "q1");
assert.equal(results[0].blank, true);
assert.equal(results[1].text, "町内会\nテスト");
assert.equal(results[1].confidence, 80);
assert.ok(progress.includes("preparing") && progress.includes("recognizing") && progress.includes("complete"));

const numberResults = await window.SurveyOcr.recognizeRegions([
  { questionId: "q3", questionIndex: 2, pageNumber: 3, kind: "number", imageDataUrl: imageDataUrl("number"), inkRatio: 0.03, lineCount: 1 },
]);
assert.equal(workerInstances.length, 1, "OCR worker should be reused within the browser session");
assert.equal(numberResults[0].text, "〇");
assert.equal(numberResults[0].confidence, 85);

const phoneResults = await window.SurveyOcr.recognizeRegions([
  { questionId: "q4", questionIndex: 3, pageNumber: 4, kind: "contact", contactField: "phone", imageDataUrl: imageDataUrl("phone"), inkRatio: 0.03, lineCount: 1 },
]);
assert.equal(phoneResults[0].text, "011-123-4567");

const otherCloseResults = await window.SurveyOcr.recognizeRegions([
  { questionId: "q5", questionIndex: 4, pageNumber: 5, kind: "other", imageDataUrl: imageDataUrl("other-close"), inkRatio: 0.03, lineCount: 1 },
]);
assert.equal(otherCloseResults[0].text, "");
assert.equal(otherCloseResults[0].blank, true);

const numberHintResults = await window.SurveyOcr.recognizeRegions([
  { questionId: "q6", questionIndex: 5, pageNumber: 5, kind: "number", numberHint: "1", imageDataUrl: imageDataUrl("unrecognized-number"), inkRatio: 0.03, lineCount: 1 },
]);
assert.equal(numberHintResults[0].text, "1");
assert.equal(numberHintResults[0].confidence, 20);

console.log("Survey OCR tests passed");
