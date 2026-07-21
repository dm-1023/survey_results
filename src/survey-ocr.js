(() => {
  "use strict";

  const MIN_INK_RATIO = 0.0012;
  const PADDLE_WORKER_PATH = "./vendor/paddleocr/worker.js";
  const PADDLE_MODEL_PATH = "./vendor/paddleocr/models";
  const ORT_RUNTIME_PATH = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/";
  const DETECTION_MODEL_NAME = "PP-OCRv6_small_det";
  const RECOGNITION_MODEL_NAME = "PP-OCRv6_small_rec";
  let clientPromise = null;
  let progressListener = null;

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

  class PaddleWorkerClient {
    constructor(worker) {
      this.worker = worker;
      this.pending = new Map();
      this.nextRequestId = 1;
      this.failed = false;
      worker.addEventListener("message", (event) => this.handleMessage(event.data));
      worker.addEventListener("error", (event) => {
        this.fail(new Error(event.message || "文字認識ワーカーでエラーが発生しました。"));
      });
      worker.addEventListener("messageerror", () => {
        this.fail(new Error("文字認識ワーカーとの通信に失敗しました。"));
      });
    }

    handleMessage(message) {
      if (!message || message.kind !== "worker-transport-response") return;
      const pending = this.pending.get(message.requestId);
      if (!pending) return;
      this.pending.delete(message.requestId);
      if (message.status === "success") {
        pending.resolve(message.payload);
        return;
      }
      const error = new Error(message.error?.message || "文字認識に失敗しました。");
      error.name = message.error?.name || "Error";
      pending.reject(error);
    }

    fail(error) {
      this.failed = true;
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    }

    request(type, payload, transferables = []) {
      if (this.failed) return Promise.reject(new Error("文字認識ワーカーを再起動してください。"));
      const requestId = this.nextRequestId;
      this.nextRequestId += 1;
      return new Promise((resolve, reject) => {
        this.pending.set(requestId, { resolve, reject });
        try {
          this.worker.postMessage({
            kind: "worker-transport-request",
            type,
            payload,
            requestId,
          }, transferables);
        } catch (error) {
          this.pending.delete(requestId);
          reject(error);
        }
      });
    }

    dispose() {
      this.fail(new Error("文字認識ワーカーを終了しました。"));
      this.worker.terminate();
    }
  }

  function createPipelineConfig() {
    return {
      pipelineName: "OCR",
      raw: {},
      warnings: [],
      unsupportedFeatures: [],
      modelSelection: {
        textDetectionModelName: DETECTION_MODEL_NAME,
        textRecognitionModelName: RECOGNITION_MODEL_NAME,
      },
      assets: {
        det: { url: assetUrl(`${PADDLE_MODEL_PATH}/${DETECTION_MODEL_NAME}.tar`) },
        rec: { url: assetUrl(`${PADDLE_MODEL_PATH}/${RECOGNITION_MODEL_NAME}.tar`) },
      },
      runtimeDefaults: {
        text_det_limit_side_len: 64,
        text_det_limit_type: "min",
        text_det_max_side_limit: 4000,
        text_det_thresh: 0.2,
        text_det_box_thresh: 0.3,
        text_det_unclip_ratio: 1.8,
        text_rec_score_thresh: 0,
      },
      pipelineBatchSize: 1,
      textDetectionBatchSize: 1,
      textRecognitionBatchSize: 6,
    };
  }

  async function getClient() {
    if (clientPromise) return clientPromise;
    clientPromise = (async () => {
      if (typeof Worker !== "function" || typeof createImageBitmap !== "function") {
        throw new Error("このブラウザは画像の文字認識に対応していません。最新版のChromeまたはEdgeを使用してください。");
      }
      const worker = new Worker(assetUrl(PADDLE_WORKER_PATH), { type: "module", name: "survey-paddleocr" });
      const client = new PaddleWorkerClient(worker);
      try {
        await client.request("init", {
          options: {
            pipelineConfig: createPipelineConfig(),
            ortOptions: {
              backend: "wasm",
              wasmPaths: ORT_RUNTIME_PATH,
              numThreads: 1,
              simd: true,
              disableWasmProxy: true,
            },
          },
        });
        return client;
      } catch (error) {
        client.dispose();
        throw error;
      }
    })().catch((error) => {
      clientPromise = null;
      throw error;
    });
    return clientPromise;
  }

  async function recognizeRegions(regions, options = {}) {
    const entries = Array.isArray(regions) ? regions : [];
    const readable = entries.filter((region) => region.imageDataUrl && Number(region.inkRatio) >= MIN_INK_RATIO);
    const readableSet = new Set(readable);
    const results = entries
      .filter((region) => !readableSet.has(region))
      .map((region) => ({ ...region, text: "", confidence: null, blank: true }));
    if (!readable.length) return results;

    progressListener = options.onProgress || null;
    emitProgress({ stage: "preparing", progress: 0 });
    try {
      const client = await getClient();
      for (let index = 0; index < readable.length; index += 1) {
        const region = readable[index];
        emitProgress({ stage: "recognizing", completed: index, total: readable.length, region });
        try {
          results.push(await recognizeRegion(client, region));
        } catch (error) {
          console.error(error);
          results.push({
            ...region,
            text: "",
            confidence: null,
            blank: false,
            error: error?.message || "文字を認識できませんでした。",
          });
        }
      }
      emitProgress({ stage: "complete", completed: readable.length, total: readable.length });
      return results.sort((a, b) => (a.pageNumber - b.pageNumber) || (a.questionIndex - b.questionIndex));
    } finally {
      progressListener = null;
    }
  }

  async function recognizeRegion(client, region) {
    const images = getRecognitionImages(region);
    const imageBitmaps = await Promise.all(images.map(dataUrlToImageBitmap));
    let predictions;
    try {
      predictions = await client.request("predict", {
        sources: imageBitmaps.map((imageBitmap) => ({ kind: "imageBitmap", imageBitmap })),
        params: {},
      }, imageBitmaps);
    } catch (error) {
      imageBitmaps.forEach((imageBitmap) => imageBitmap.close?.());
      throw error;
    }

    const recognizedLines = [];
    const confidences = [];
    let ignoredPrintedOnly = false;
    for (const prediction of Array.isArray(predictions) ? predictions : []) {
      const candidate = predictionToCandidate(prediction, region);
      ignoredPrintedOnly ||= candidate.printedOnly;
      if (candidate.text) recognizedLines.push(candidate.text);
      if (candidate.confidence !== null) confidences.push(candidate.confidence);
    }
    if (!recognizedLines.length && region.kind === "number" && region.numberHint) {
      recognizedLines.push(region.numberHint);
      confidences.push(20);
    }
    const text = recognizedLines.join("\n");
    return {
      ...region,
      text,
      confidence: confidences.length
        ? confidences.reduce((sum, confidence) => sum + confidence, 0) / confidences.length
        : null,
      blank: region.kind === "other" && !text && ignoredPrintedOnly,
    };
  }

  function getRecognitionImages(region) {
    const lineImages = Array.isArray(region.lineImageDataUrls) ? region.lineImageDataUrls.filter(Boolean) : [];
    return lineImages.length ? lineImages : [region.imageDataUrl];
  }

  function predictionToCandidate(prediction, region) {
    const items = (Array.isArray(prediction?.items) ? prediction.items : [])
      .filter((item) => item && typeof item.text === "string")
      .sort(compareRecognitionItems);
    const rawText = cleanRecognizedText(items.map((item) => item.text).join(""));
    const cleaned = cleanRecognizedTextForRegion(rawText, region);
    const itemConfidences = items
      .map((item) => normalizeConfidence(item.score))
      .filter((confidence) => confidence !== null);
    return {
      text: cleaned.text,
      confidence: itemConfidences.length
        ? itemConfidences.reduce((sum, confidence) => sum + confidence, 0) / itemConfidences.length
        : null,
      printedOnly: cleaned.printedOnly,
    };
  }

  function compareRecognitionItems(left, right) {
    const leftPosition = getItemPosition(left);
    const rightPosition = getItemPosition(right);
    const lineTolerance = Math.max(8, Math.min(leftPosition.height, rightPosition.height) * 0.6);
    if (Math.abs(leftPosition.y - rightPosition.y) > lineTolerance) return leftPosition.y - rightPosition.y;
    return leftPosition.x - rightPosition.x;
  }

  function getItemPosition(item) {
    const points = Array.isArray(item?.poly) ? item.poly : [];
    const xs = points.map((point) => Number(point?.[0])).filter(Number.isFinite);
    const ys = points.map((point) => Number(point?.[1])).filter(Number.isFinite);
    const minY = ys.length ? Math.min(...ys) : 0;
    const maxY = ys.length ? Math.max(...ys) : minY;
    return {
      x: xs.length ? Math.min(...xs) : 0,
      y: minY,
      height: Math.max(1, maxY - minY),
    };
  }

  async function dataUrlToImageBitmap(dataUrl) {
    const blob = dataUrlToBlob(dataUrl);
    return createImageBitmap(blob);
  }

  function dataUrlToBlob(dataUrl) {
    const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(String(dataUrl || ""));
    if (!match) throw new Error("文字認識用の画像データが不正です。");
    const mimeType = match[1] || "application/octet-stream";
    const bytes = match[2]
      ? Uint8Array.from(atob(match[3]), (character) => character.charCodeAt(0))
      : new TextEncoder().encode(decodeURIComponent(match[3]));
    return new Blob([bytes], { type: mimeType });
  }

  function cleanRecognizedTextForRegion(text, region) {
    if (region.kind !== "other") return { text, printedOnly: false };
    const cleaned = text
      .replace(/^[\s()\[\]{}（）［］｛｝【】「」『』〔〕〈〉《》]+/gu, "")
      .replace(/[\s()\[\]{}（）［］｛｝【】「」『』〔〕〈〉《》]+$/gu, "")
      .trim();
    return { text: cleaned, printedOnly: Boolean(text) && !cleaned };
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
    const percentage = confidence <= 1 ? confidence * 100 : confidence;
    return Math.max(0, Math.min(100, percentage));
  }

  window.SurveyOcr = Object.freeze({
    ENGINE_NAME: "PaddleOCR",
    MIN_INK_RATIO,
    cleanRecognizedText,
    recognizeRegions,
  });
})();
