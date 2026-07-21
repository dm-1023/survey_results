(() => {
  "use strict";

  const MIN_INK_RATIO = 0.0012;
  let workerPromise = null;
  let progressListener = null;
  let activeRecognition = null;

  function assetUrl(path) {
    return new URL(path, document.baseURI).href;
  }

  function emitProgress(payload) {
    try {
      progressListener?.(payload);
    } catch (error) {
      console.error(error);
    }
  }

  async function getWorker() {
    if (workerPromise) return workerPromise;
    if (!window.Tesseract?.createWorker) throw new Error("文字認識機能を読み込めませんでした。");
    workerPromise = window.Tesseract.createWorker(
      "jpn",
      window.Tesseract.OEM?.LSTM_ONLY ?? 1,
      {
        workerPath: assetUrl("./src/tesseract-worker.js"),
        corePath: assetUrl("./vendor/tesseract-core"),
        langPath: assetUrl("./vendor/tessdata"),
        workerBlobURL: false,
        logger(message) {
          emitProgress({
            stage: message?.status === "recognizing text" ? "recognizing-progress" : "preparing",
            progress: Number(message?.progress) || 0,
            ...activeRecognition,
          });
        },
      },
    ).then(async (worker) => {
      await worker.setParameters({
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      return worker;
    }).catch((error) => {
      workerPromise = null;
      throw error;
    });
    return workerPromise;
  }

  async function recognizeRegions(regions, options = {}) {
    const entries = Array.isArray(regions) ? regions : [];
    const readable = entries.filter((region) => region.imageDataUrl && Number(region.inkRatio) >= MIN_INK_RATIO);
    const results = entries
      .filter((region) => !readable.includes(region))
      .map((region) => ({ ...region, text: "", confidence: null, blank: true }));
    if (!readable.length) return results;

    progressListener = options.onProgress || null;
    emitProgress({ stage: "preparing", progress: 0 });
    try {
      const worker = await getWorker();
      for (let index = 0; index < readable.length; index += 1) {
        const region = readable[index];
        emitProgress({ stage: "recognizing", completed: index, total: readable.length, region });
        try {
          activeRecognition = { completed: index, total: readable.length, region };
          await worker.setParameters({
            tessedit_pageseg_mode: region.lineCount === 1
              ? window.Tesseract.PSM?.SINGLE_LINE ?? "7"
              : window.Tesseract.PSM?.SINGLE_BLOCK ?? "6",
          });
          const recognition = await worker.recognize(region.imageDataUrl);
          results.push({
            ...region,
            text: cleanRecognizedText(recognition?.data?.text),
            confidence: normalizeConfidence(recognition?.data?.confidence),
            blank: false,
          });
        } catch (error) {
          console.error(error);
          results.push({
            ...region,
            text: "",
            confidence: null,
            blank: false,
            error: error?.message || "文字を認識できませんでした。",
          });
        } finally {
          activeRecognition = null;
        }
      }
      emitProgress({ stage: "complete", completed: readable.length, total: readable.length });
      return results.sort((a, b) => (a.pageNumber - b.pageNumber) || (a.questionIndex - b.questionIndex));
    } finally {
      activeRecognition = null;
      progressListener = null;
    }
  }

  function cleanRecognizedText(value) {
    const japanese = "\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}々〆〇ヶー";
    return String(value || "")
      .replace(/\f/g, "")
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+$/gm, "")
      .replace(/^[ \t]+/gm, "")
      .replace(new RegExp(`([${japanese}]) +(?=[${japanese}])`, "gu"), "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function normalizeConfidence(value) {
    const confidence = Number(value);
    if (!Number.isFinite(confidence)) return null;
    return Math.max(0, Math.min(100, confidence));
  }

  window.SurveyOcr = Object.freeze({
    MIN_INK_RATIO,
    cleanRecognizedText,
    recognizeRegions,
  });
})();
