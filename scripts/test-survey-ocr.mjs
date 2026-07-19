import assert from "node:assert/strict";

const createWorkerCalls = [];
const parameters = [];
const recognizedImages = [];
const worker = {
  async setParameters(value) {
    parameters.push(value);
  },
  async recognize(image) {
    recognizedImages.push(image);
    return { data: { text: "  町 内 会 アン ケー ト\n\n\n テスト \f", confidence: 47.5 } };
  },
};

globalThis.document = { baseURI: "http://127.0.0.1:4173/" };
globalThis.window = {
  Tesseract: {
    OEM: { LSTM_ONLY: 1 },
    PSM: { SINGLE_BLOCK: "6" },
    async createWorker(...args) {
      createWorkerCalls.push(args);
      return worker;
    },
  },
};

await import("../src/survey-ocr.js");

const progress = [];
const results = await window.SurveyOcr.recognizeRegions([
  { questionId: "q2", questionIndex: 1, pageNumber: 2, imageDataUrl: "data:image/png;base64,second", inkRatio: 0.02 },
  { questionId: "q1", questionIndex: 0, pageNumber: 1, imageDataUrl: "data:image/png;base64,blank", inkRatio: 0.0001 },
], { onProgress: (item) => progress.push(item.stage) });

assert.equal(createWorkerCalls.length, 1);
assert.equal(createWorkerCalls[0][0], "jpn");
assert.equal(createWorkerCalls[0][2].workerBlobURL, false);
assert.equal(createWorkerCalls[0][2].workerPath, "http://127.0.0.1:4173/vendor/tesseract/worker.min.js");
assert.equal(createWorkerCalls[0][2].langPath, "http://127.0.0.1:4173/vendor/tessdata");
assert.deepEqual(parameters[0], {
  tessedit_pageseg_mode: "6",
  preserve_interword_spaces: "1",
  user_defined_dpi: "300",
});
assert.deepEqual(recognizedImages, ["data:image/png;base64,second"]);
assert.equal(results[0].questionId, "q1");
assert.equal(results[0].blank, true);
assert.equal(results[1].text, "町内会アンケート\n\nテスト");
assert.equal(results[1].confidence, 47.5);
assert.ok(progress.includes("preparing") && progress.includes("recognizing") && progress.includes("complete"));

await window.SurveyOcr.recognizeRegions([
  { questionId: "q3", questionIndex: 2, pageNumber: 3, imageDataUrl: "data:image/png;base64,third", inkRatio: 0.03 },
]);
assert.equal(createWorkerCalls.length, 1, "OCR worker should be reused within the browser session");

console.log("Survey OCR tests passed");
