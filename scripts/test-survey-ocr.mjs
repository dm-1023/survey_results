import assert from "node:assert/strict";

const createWorkerCalls = [];
const parameters = [];
const recognizedImages = [];
let currentParameters = {};
const worker = {
  async setParameters(value) {
    parameters.push(value);
    currentParameters = value;
  },
  async recognize(image) {
    recognizedImages.push(image);
    if (image === "data:image/png;base64,number-fallback") {
      return currentParameters.tessedit_pageseg_mode === "10"
        ? { data: { text: " １ \f", confidence: 20 } }
        : { data: { text: "", confidence: 0 } };
    }
    const outputs = {
      "data:image/png;base64,line-one": { text: "  町 内 会 \f", confidence: 47.5 },
      "data:image/png;base64,line-two": { text: " テスト \f", confidence: 62 },
      "data:image/png;base64,number": { text: " １２ \f", confidence: 85 },
      "data:image/png;base64,phone": { text: " 011-123-4567 \f", confidence: 72 },
    };
    return { data: outputs[image] || { text: "", confidence: 0 } };
  },
};

globalThis.document = { baseURI: "http://127.0.0.1:4173/" };
globalThis.window = {
  Tesseract: {
    OEM: { LSTM_ONLY: 1 },
    PSM: { SINGLE_BLOCK: "6", SINGLE_LINE: "7", SINGLE_WORD: "8", SINGLE_CHAR: "10" },
    async createWorker(...args) {
      createWorkerCalls.push(args);
      return worker;
    },
  },
};

await import("../src/survey-ocr.js");

const progress = [];
const results = await window.SurveyOcr.recognizeRegions([
  {
    questionId: "q2",
    questionIndex: 1,
    pageNumber: 2,
    kind: "text",
    imageDataUrl: "data:image/png;base64,second",
    lineImageDataUrls: ["data:image/png;base64,line-one", "data:image/png;base64,line-two"],
    inkRatio: 0.02,
    lineCount: 2,
  },
  { questionId: "q1", questionIndex: 0, pageNumber: 1, imageDataUrl: "data:image/png;base64,blank", inkRatio: 0.0001 },
], { onProgress: (item) => progress.push(item.stage) });

assert.equal(createWorkerCalls.length, 1);
assert.equal(createWorkerCalls[0][0], "jpn");
assert.equal(createWorkerCalls[0][2].workerBlobURL, false);
assert.equal(createWorkerCalls[0][2].workerPath, "http://127.0.0.1:4173/src/tesseract-worker.js");
assert.equal(createWorkerCalls[0][2].langPath, "http://127.0.0.1:4173/vendor/tessdata");
assert.deepEqual(parameters[0], {
  preserve_interword_spaces: "1",
  user_defined_dpi: "300",
});
assert.deepEqual(parameters[1], { tessedit_pageseg_mode: "7", tessedit_char_whitelist: "" });
assert.deepEqual(parameters[2], { tessedit_pageseg_mode: "7", tessedit_char_whitelist: "" });
assert.deepEqual(recognizedImages, ["data:image/png;base64,line-one", "data:image/png;base64,line-two"]);
assert.equal(results[0].questionId, "q1");
assert.equal(results[0].blank, true);
assert.equal(results[1].text, "町内会\nテスト");
assert.equal(results[1].confidence, 54.75);
assert.ok(progress.includes("preparing") && progress.includes("recognizing") && progress.includes("complete"));

await window.SurveyOcr.recognizeRegions([
  { questionId: "q3", questionIndex: 2, pageNumber: 3, kind: "number", imageDataUrl: "data:image/png;base64,number", inkRatio: 0.03, lineCount: 1 },
]);
assert.equal(createWorkerCalls.length, 1, "OCR worker should be reused within the browser session");
assert.deepEqual(parameters[3], { tessedit_pageseg_mode: "8", tessedit_char_whitelist: "0123456789" });

const numberFallbackResults = await window.SurveyOcr.recognizeRegions([
  { questionId: "q3b", questionIndex: 2, pageNumber: 3, kind: "number", imageDataUrl: "data:image/png;base64,number-fallback", inkRatio: 0.03, lineCount: 1 },
]);
assert.deepEqual(parameters[4], { tessedit_pageseg_mode: "8", tessedit_char_whitelist: "0123456789" });
assert.deepEqual(parameters[5], { tessedit_pageseg_mode: "10", tessedit_char_whitelist: "0123456789" });
assert.equal(numberFallbackResults[0].text, "１");

await window.SurveyOcr.recognizeRegions([
  { questionId: "q4", questionIndex: 3, pageNumber: 4, kind: "contact", contactField: "phone", imageDataUrl: "data:image/png;base64,phone", inkRatio: 0.03, lineCount: 1 },
]);
assert.deepEqual(parameters[6], { tessedit_pageseg_mode: "7", tessedit_char_whitelist: "0123456789-ー()（）" });

console.log("Survey OCR tests passed");
