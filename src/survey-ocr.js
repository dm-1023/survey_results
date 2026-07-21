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
          const images = getRecognitionImages(region);
          const recognizedLines = [];
          const confidences = [];
          let ignoredPrintedOnly = false;
          for (let lineIndex = 0; lineIndex < images.length; lineIndex += 1) {
            activeRecognition = { completed: index, total: readable.length, region, lineIndex };
            const { text, confidence, printedOnly } = await recognizeImage(
              worker,
              images[lineIndex],
              region,
              images.length > 1 || region.lineCount === 1,
            );
            ignoredPrintedOnly ||= printedOnly;
            if (text) recognizedLines.push(text);
            if (confidence !== null) confidences.push(confidence);
          }
          if (!recognizedLines.length && region.kind === "number" && region.numberHint) {
            recognizedLines.push(region.numberHint);
            confidences.push(20);
          }
          const text = recognizedLines.join("\n");
          results.push({
            ...region,
            text,
            confidence: confidences.length
              ? confidences.reduce((sum, confidence) => sum + confidence, 0) / confidences.length
              : null,
            blank: region.kind === "other" && !text && ignoredPrintedOnly,
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

  function getRecognitionImages(region) {
    const lineImages = Array.isArray(region.lineImageDataUrls) ? region.lineImageDataUrls.filter(Boolean) : [];
    return lineImages.length ? lineImages : [region.imageDataUrl];
  }

  async function recognizeImage(worker, image, region, useSingleLine) {
    const parameterSets = getRecognitionParameterSets(region, useSingleLine);
    let best = { text: "", confidence: null, printedOnly: false };
    for (let index = 0; index < parameterSets.length; index += 1) {
      await worker.setParameters(parameterSets[index]);
      const recognition = await worker.recognize(image);
      const rawText = cleanRecognizedText(recognition?.data?.text);
      const cleaned = cleanRecognizedTextForRegion(rawText, region);
      const candidate = {
        text: cleaned.text,
        confidence: normalizeConfidence(recognition?.data?.confidence),
        printedOnly: cleaned.printedOnly,
      };
      best = selectRecognitionCandidate(best, candidate, region);
      if (!shouldTryRecognitionFallback(candidate, region, index, parameterSets.length)) break;
    }
    return best;
  }

  function getRecognitionParameterSets(region, useSingleLine) {
    const primary = getRecognitionParameters(region, useSingleLine);
    if (region.kind === "number") {
      return [primary, {
        tessedit_pageseg_mode: window.Tesseract.PSM?.SINGLE_CHAR ?? "10",
        tessedit_char_whitelist: "0123456789",
      }];
    }
    if (region.kind === "contact" && region.contactField === "phone") {
      return [primary, {
        tessedit_pageseg_mode: window.Tesseract.PSM?.SINGLE_WORD ?? "8",
        tessedit_char_whitelist: "0123456789-ー()（）",
      }, {
        tessedit_pageseg_mode: window.Tesseract.PSM?.SPARSE_TEXT ?? "11",
        tessedit_char_whitelist: "0123456789-ー()（）",
      }];
    }
    return [primary];
  }

  function shouldTryRecognitionFallback(candidate, region, index, attemptCount) {
    if (index >= attemptCount - 1) return false;
    const digits = normalizeRecognizedDigits(candidate.text);
    if (region.kind === "number") {
      return !digits || (digits.length === 1 && (candidate.confidence ?? 0) < 45);
    }
    return region.kind === "contact" && region.contactField === "phone" && !digits;
  }

  function selectRecognitionCandidate(current, candidate, region) {
    const digitOnly = region.kind === "number" || (region.kind === "contact" && region.contactField === "phone");
    if (!digitOnly) return candidate;
    const currentDigits = normalizeRecognizedDigits(current.text);
    const candidateDigits = normalizeRecognizedDigits(candidate.text);
    if (!currentDigits) return candidateDigits ? candidate : current;
    if (!candidateDigits) return current;
    if (currentDigits.length !== candidateDigits.length) {
      return currentDigits.length > candidateDigits.length ? current : candidate;
    }
    return (candidate.confidence ?? 0) > (current.confidence ?? 0) ? candidate : current;
  }

  function cleanRecognizedTextForRegion(text, region) {
    if (region.kind !== "other") return { text, printedOnly: false };
    const cleaned = text
      .replace(/^[\s()\[\]{}（）［］｛｝【】「」『』〔〕〈〉《》]+/gu, "")
      .replace(/[\s()\[\]{}（）［］｛｝【】「」『』〔〕〈〉《》]+$/gu, "")
      .trim();
    return { text: cleaned, printedOnly: Boolean(text) && !cleaned };
  }

  function getRecognitionParameters(region, useSingleLine) {
    if (region.kind === "number") {
      return {
        tessedit_pageseg_mode: window.Tesseract.PSM?.SINGLE_WORD ?? "8",
        tessedit_char_whitelist: "0123456789",
      };
    }
    if (region.kind === "contact" && region.contactField === "phone") {
      return {
        tessedit_pageseg_mode: window.Tesseract.PSM?.SINGLE_LINE ?? "7",
        tessedit_char_whitelist: "0123456789-ー()（）",
      };
    }
    return {
      tessedit_pageseg_mode: useSingleLine
        ? window.Tesseract.PSM?.SINGLE_LINE ?? "7"
        : window.Tesseract.PSM?.SINGLE_BLOCK ?? "6",
      tessedit_char_whitelist: "",
    };
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

  function normalizeRecognizedDigits(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/[Oo〇○]/g, "0")
      .replace(/[Il|]/g, "1")
      .replace(/[^0-9]/g, "");
  }

  window.SurveyOcr = Object.freeze({
    MIN_INK_RATIO,
    cleanRecognizedText,
    recognizeRegions,
  });
})();
