(() => {
  "use strict";

  const DB_NAME = "town_survey_dynamic_registry";
  const DB_VERSION = 1;
  const SURVEY_STORE = "surveys";
  const RESPONSE_STORE = "responses";
  const CONTACT_STORE = "contacts";
  const APP_NAME = "town_survey_dynamic_registry";
  const SCHEMA_VERSION = 1;
  const PRESET_SURVEY_ID = "preset_shinkawa_2_chonaikai";
  const PRESET_SURVEY_TITLE = "新川第2町内会 アンケート";
  const PRESET_FAMILY_QUESTION_TITLE = "今後の活動・事業の参考にするためにお聞きします。ご家族構成について教えてください。（当てはまるところに人数を記入）また、回答者様の世代を右の（ ）のところに○をつけてください。";
  const PRESET_DEFAULTS_VERSION = "familyReportOffV1";
  const PRESET_CONTENT_VERSION = "paperWordingV1";
  const REPORT_CHART_COLORS = ["#0072B2", "#E69F00", "#009E73", "#CC79A7", "#D55E00", "#56B4E9", "#F0E442", "#6F4E9C", "#4D4D4D", "#8C564B"];
  const TOUR_STEPS = [
    {
      view: "home",
      target: "survey-list",
      title: "アンケートを選ぶ",
      body: "トップにはプリセットと作成済みアンケートが並びます。集計したいアンケートを選択して、回答登録へ進みます。",
    },
    {
      view: "home",
      target: "new-survey",
      title: "新しいアンケートを作る",
      body: "新規作成は空のアンケートから始まります。設問文と回答項目は、編集画面でセットで追加できます。",
    },
    {
      view: "list",
      target: "new-response",
      title: "回答を1件ずつ登録する",
      body: "紙の回答用紙を1件ずつ登録します。連絡先設問は回答データと分けて保存され、集計レポートには出ません。",
    },
    {
      view: "report",
      target: "cross-report",
      title: "集計レポートを確認する",
      body: "全体集計を確認し、必要に応じてクロス集計を追加します。回答を分ける設問と集計する設問の組み合わせを指定できます。",
    },
    {
      view: "report",
      target: "export-report",
      title: "PDF・Wordで出力する",
      body: "表示中の集計内容をPDF印刷またはWordファイルとして出力できます。クロス集計を追加した場合も出力内容に反映されます。",
    },
    {
      view: "contacts",
      target: "contacts",
      title: "連絡先を内部管理する",
      body: "氏名・住所・電話番号は内部確認用として別画面で扱います。配布用の集計資料には含めない運用にしてください。",
    },
  ];
  const TOUR_ROUTES = [
    {
      id: "response-output",
      title: "回答登録から出力まで",
      description: "アンケートを選び、回答を登録し、集計レポートをWord/PDFで出力する流れ。",
      steps: [
        { view: "home", target: "preset-select", title: "アンケートを選ぶ", body: "新川第2町内会アンケートの選択ボタンを押して、回答登録へ進みます。" },
        { view: "list", target: "new-response", title: "回答を登録する", body: "回答を1件ずつ登録します。登録後は保存して回答一覧に戻ります。" },
        { view: "response-edit", target: "answer-form", title: "回答内容を入力する", body: "設問ごとに回答を入力します。" },
        { view: "list", target: "report-link", title: "集計レポートへ進む", body: "回答を登録したら、回答一覧から集計レポートを開きます。" },
        { view: "report", target: "export-report", title: "Word/PDFで出力する", body: "表示中の集計レポートをWordファイルまたはPDF印刷で出力します。" },
      ],
    },
    {
      id: "create-survey",
      title: "新しいアンケート作成",
      description: "空のアンケートを作り、基本情報と設問を設定する流れ。",
      steps: [
        { view: "home", target: "new-survey", title: "新規作成を始める", body: "新しいアンケートは空の状態から作成します。" },
        { view: "survey-edit", target: "survey-basic", title: "基本情報を設定する", body: "タイトル、実施者、実施期間、配布数などを入力します。" },
        { view: "survey-edit", target: "question-settings", title: "設問を設定する", body: "設問文と回答項目をセットで追加・編集します。設問ごとに回答形式も変更できます。" },
        { view: "survey-edit", target: "save-survey", title: "保存する", body: "設定が終わったら保存します。保存後は回答登録に進めます。" },
        { view: "list", target: "survey-form-export", title: "アンケート用紙を出力する", body: "保存後は回答一覧画面から、アンケート用紙をWordまたはPDF印刷で出力できます。" },
      ],
    },
    {
      id: "cross-report",
      title: "クロス集計",
      description: "回答を分ける設問と集計する設問を組み合わせる流れ。",
      steps: [
        { view: "report", target: "cross-report", title: "クロス集計を追加する", body: "集計レポート画面で、回答を分ける設問と集計する設問を選びます。" },
        { view: "report", target: "cross-add", title: "組み合わせを追加する", body: "組み合わせを追加すると、全体集計の下にクロス集計表が追加されます。" },
        { view: "report", target: "export-report", title: "出力にも反映する", body: "追加したクロス集計は、PDF印刷やWord出力にも反映されます。" },
      ],
    },
    {
      id: "backup-file",
      title: "保存ファイル",
      description: "全アンケートと回答を保存し、別環境で読み込む流れ。",
      steps: [
        { view: "home", target: "export-backup", title: "保存ファイルを作成する", body: "すべてのアンケート設定、回答、連絡先を保存ファイルとして書き出します。" },
        { view: "home", target: "import-backup", title: "保存ファイルを読み込む", body: "作成した保存ファイルを別のPCやブラウザで読み込むと、データを追加できます。" },
        { view: "home", target: "export-backup", title: "取り扱いに注意する", body: "保存ファイルには連絡先が含まれる場合があります。公開場所には置かず、内部で管理してください。" },
      ],
    },
    {
      id: "contacts",
      title: "連絡先管理",
      description: "「連絡先 非公開」設問を追加したアンケートで、氏名・住所・電話番号を回答データと分けて扱う流れ。",
      steps: [
        { view: "response-edit", target: "contact-entry", title: "連絡先を入力する", body: "アンケート設定で「連絡先 非公開」設問を追加した場合だけ、回答入力画面に連絡先欄が表示されます。集計レポートには含まれません。" },
        { view: "list", target: "contact-link", title: "連絡先管理を開く", body: "「連絡先 非公開」設問があるアンケートでは、回答一覧から連絡先管理へ進み、内部確認用の連絡先を確認できます。" },
        { view: "contacts", target: "contacts", title: "内部用として管理する", body: "氏名・住所・電話番号は配布資料に載せず、必要な場合だけ内部で確認します。" },
      ],
    },
  ];

  let root = null;
  let dbCache = null;
  let stackedChartDrawFrame = 0;

  const state = {
    view: "home",
    surveys: [],
    responses: [],
    contacts: [],
    currentSurveyId: "",
    surveyDraft: null,
    currentResponse: null,
    currentContact: null,
    reportDraftAxisQuestionId: "",
    reportDraftTargetQuestionId: "",
    reportCrossItems: [],
    activeAnswerQuestionIndex: 0,
    activeMatrixRowIndex: 0,
    scrollActiveAnswerOnRender: false,
    tourPickerOpen: false,
    tourActive: false,
    tourRouteId: "",
    tourStepIndex: 0,
    flash: "",
    messages: [],
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    root = document.getElementById("app");
    if (!root) return;
    root.addEventListener("click", handleClick);
    root.addEventListener("input", handleInput);
    root.addEventListener("change", handleInput);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", queueStackedChartDraw);
    window.addEventListener("beforeprint", drawStackedCharts);
    await refreshData();
    await ensurePresetSurvey();
    render();
  }

  async function handleClick(event) {
    updateActiveAnswerFromEvent(event);
    const button = event.target.closest("[data-action]");
    if (!button) return;
    event.preventDefault();

    try {
      const action = button.dataset.action;
      if (action === "home") return showHome();
      if (action === "new-survey") return openSurveyEditor();
      if (action === "edit-survey") return openSurveyEditor(button.dataset.id);
      if (action === "save-survey") return saveSurveyDraft();
      if (action === "delete-survey") return deleteSurvey(button.dataset.id);
      if (action === "select-survey") return selectSurvey(button.dataset.id);
      if (action === "list") return showWorkspace("list");
      if (action === "report") return showWorkspace("report");
      if (action === "contacts") return showWorkspace("contacts");
      if (action === "new-response") return openResponseEditor();
      if (action === "edit-response") return openResponseEditor(button.dataset.id);
      if (action === "save-response") return saveCurrentResponse();
      if (action === "delete-response") return deleteResponse(button.dataset.id);
      if (action === "add-question") return addQuestion(button.dataset.questionType || "single");
      if (action === "remove-question") return removeQuestion(readIndex(button.dataset.questionIndex));
      if (action === "move-question") return moveQuestion(readIndex(button.dataset.questionIndex), readDirection(button.dataset.direction));
      if (action === "add-option") return addOption(readIndex(button.dataset.questionIndex));
      if (action === "remove-option") return removeOption(readIndex(button.dataset.questionIndex), readIndex(button.dataset.optionIndex));
      if (action === "add-row") return addRow(readIndex(button.dataset.questionIndex));
      if (action === "remove-row") return removeRow(readIndex(button.dataset.questionIndex), readIndex(button.dataset.rowIndex));
      if (action === "add-column") return addColumn(readIndex(button.dataset.questionIndex));
      if (action === "remove-column") return removeColumn(readIndex(button.dataset.questionIndex), readIndex(button.dataset.columnIndex));
      if (action === "export-anonymous-csv") return exportAnonymousCsv();
      if (action === "export-aggregate-csv") return exportAggregateCsv();
      if (action === "export-contact-csv") return exportContactCsv();
      if (action === "export-response-csv") return exportResponseCsv();
      if (action === "export-backup-json") return exportBackupJson();
      if (action === "export-word-report") return exportWordReport();
      if (action === "export-word-survey") return exportWordSurveyForm();
      if (action === "import-click") return document.getElementById("import-file")?.click();
      if (action === "add-report-cross") return addReportCrossItem();
      if (action === "remove-report-cross") return removeReportCrossItem(readIndex(button.dataset.crossIndex));
      if (action === "move-report-cross") return moveReportCrossItem(readIndex(button.dataset.crossIndex), readDirection(button.dataset.direction));
      if (action === "start-tour") return openTourPicker();
      if (action === "start-tour-route") return startTour(button.dataset.tourRoute);
      if (action === "next-tour") return moveTour(1);
      if (action === "prev-tour") return moveTour(-1);
      if (action === "close-tour") return closeTour();
      if (action === "print-survey-form") return window.print();
      if (action === "print") return window.print();
    } catch (error) {
      console.error(error);
      state.flash = "処理に失敗しました。内容をご確認ください。";
      render();
    }
  }

  async function handleInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.id === "import-file" && event.type === "change") {
      const file = target.files && target.files[0];
      if (file) await importBackupJson(file);
      target.value = "";
      return;
    }

    if (target.matches("[data-survey-field]")) {
      if (!state.surveyDraft) return;
      state.surveyDraft[target.dataset.surveyField] = readControlValue(target);
      return;
    }

    if (target.matches("[data-report-axis]")) {
      state.reportDraftAxisQuestionId = target.value;
      if (!getCurrentReportTargetCandidates().some((question) => question.id === state.reportDraftTargetQuestionId)) state.reportDraftTargetQuestionId = "";
      render();
      return;
    }

    if (target.matches("[data-report-target]")) {
      state.reportDraftTargetQuestionId = target.value;
      render();
      return;
    }

    if (target.matches("[data-report-item-order]")) {
      await updateReportItemOrder(target.value);
      return;
    }

    if (target.matches("[data-report-chart]")) {
      await updateReportChartType(target.dataset.questionId, target.value);
      return;
    }

    if (target.matches("[data-question-field]")) {
      const question = getDraftQuestion(readIndex(target.dataset.questionIndex));
      if (!question) return;
      const field = target.dataset.questionField;
      if (field === "includeInReport") question.includeInReport = target.checked;
      else if (isSurveyDraftQuestionsLocked()) return;
      else if (field === "type") {
        question.type = target.value;
        normalizeQuestionShape(question);
        render();
      } else question[field] = target.value;
      return;
    }

    if (target.matches("[data-option-field]")) {
      if (isSurveyDraftQuestionsLocked()) return;
      const question = getDraftQuestion(readIndex(target.dataset.questionIndex));
      const option = question?.options?.[readIndex(target.dataset.optionIndex)];
      if (option) option.label = target.value;
      return;
    }

    if (target.matches("[data-row-field]")) {
      if (isSurveyDraftQuestionsLocked()) return;
      const question = getDraftQuestion(readIndex(target.dataset.questionIndex));
      const row = question?.rows?.[readIndex(target.dataset.rowIndex)];
      if (row) row.label = target.value;
      return;
    }

    if (target.matches("[data-column-field]")) {
      if (isSurveyDraftQuestionsLocked()) return;
      const question = getDraftQuestion(readIndex(target.dataset.questionIndex));
      const column = question?.columns?.[readIndex(target.dataset.columnIndex)];
      if (column) column.label = target.value;
      return;
    }

    if (target.matches("[data-answer]")) {
      updateActiveAnswerFromElement(target);
      updateAnswer(target);
      return;
    }

    if (target.matches("[data-other-answer]")) {
      updateActiveAnswerFromElement(target);
      updateOtherAnswer(target);
      return;
    }

    if (target.matches("[data-contact-field]")) {
      if (!state.currentContact) return;
      state.currentContact[target.dataset.contactField] = target.value;
    }
  }

  function handleKeyDown(event) {
    if (state.view !== "response-edit" || state.tourActive || state.tourPickerOpen) return;
    if (shouldIgnoreAnswerShortcut(event.target)) return;
    if (event.key === "Enter" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      moveActiveAnswer(event.shiftKey ? -1 : 1);
      return;
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && /^[1-9]$/.test(event.key)) {
      if (applyAnswerShortcut(Number(event.key))) event.preventDefault();
    }
  }

  function shouldIgnoreAnswerShortcut(target) {
    if (!(target instanceof HTMLElement)) return false;
    if (target.closest("button,a,[role='button']")) return true;
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
    if (target instanceof HTMLInputElement) {
      return !["radio", "checkbox"].includes(target.type);
    }
    return target.isContentEditable;
  }

  function getShortcutQuestionIndexes(survey = getCurrentSurvey()) {
    return (survey?.questions || [])
      .map((question, index) => ({ question, index }))
      .filter(({ question }) => isShortcutQuestion(question))
      .map(({ index }) => index);
  }

  function isShortcutQuestion(question) {
    return ["single", "multiple", "matrix_single"].includes(question?.type);
  }

  function ensureActiveAnswerPosition() {
    const survey = getCurrentSurvey();
    const indexes = getShortcutQuestionIndexes(survey);
    if (!indexes.length) {
      state.activeAnswerQuestionIndex = 0;
      state.activeMatrixRowIndex = 0;
      return;
    }
    if (!indexes.includes(state.activeAnswerQuestionIndex)) {
      state.activeAnswerQuestionIndex = indexes[0];
      state.activeMatrixRowIndex = 0;
    }
    const question = survey.questions[state.activeAnswerQuestionIndex];
    if (question?.type === "matrix_single") {
      state.activeMatrixRowIndex = clampIndex(state.activeMatrixRowIndex, question.rows.length);
    } else {
      state.activeMatrixRowIndex = 0;
    }
  }

  function resetActiveAnswerPosition(survey = getCurrentSurvey()) {
    const indexes = getShortcutQuestionIndexes(survey);
    state.activeAnswerQuestionIndex = indexes[0] ?? 0;
    state.activeMatrixRowIndex = 0;
    state.scrollActiveAnswerOnRender = false;
  }

  function updateActiveAnswerFromEvent(event) {
    if (state.view !== "response-edit") return;
    updateActiveAnswerFromElement(event.target);
  }

  function updateActiveAnswerFromElement(element) {
    if (state.view !== "response-edit" || !(element instanceof HTMLElement)) return;
    const panel = element.closest("[data-answer-index]");
    if (!panel) return;
    state.activeAnswerQuestionIndex = readIndex(panel.dataset.answerIndex);
    const row = element.closest("[data-matrix-row-index]");
    state.activeMatrixRowIndex = row ? readIndex(row.dataset.matrixRowIndex) : 0;
    ensureActiveAnswerPosition();
  }

  function moveActiveAnswer(direction) {
    const indexes = getShortcutQuestionIndexes();
    if (!indexes.length) return;
    ensureActiveAnswerPosition();
    const currentIndex = indexes.indexOf(state.activeAnswerQuestionIndex);
    const nextIndex = Math.max(0, Math.min(indexes.length - 1, currentIndex + direction));
    state.activeAnswerQuestionIndex = indexes[nextIndex];
    state.activeMatrixRowIndex = 0;
    state.scrollActiveAnswerOnRender = true;
    render();
  }

  function applyAnswerShortcut(number) {
    const survey = getCurrentSurvey();
    if (!survey || !state.currentResponse) return false;
    ensureActiveAnswerPosition();
    const question = survey.questions[state.activeAnswerQuestionIndex];
    if (!question) return false;
    const answers = state.currentResponse.answers;
    if (question.type === "single") return applySingleShortcut(question, answers, number);
    if (question.type === "multiple") return applyMultipleShortcut(question, answers, number);
    if (question.type === "matrix_single") return applyMatrixSingleShortcut(question, answers, number);
    return false;
  }

  function applySingleShortcut(question, answers, number) {
    const option = question.options[number - 1];
    if (!option) return false;
    answers[question.id] = option.id;
    const otherOption = getOtherOption(question);
    if (otherOption && option.id !== otherOption.id) delete answers[otherTextAnswerKey(question.id)];
    state.scrollActiveAnswerOnRender = true;
    render();
    return true;
  }

  function applyMultipleShortcut(question, answers, number) {
    const option = question.options[number - 1];
    if (!option) return false;
    const selected = new Set(Array.isArray(answers[question.id]) ? answers[question.id] : []);
    if (selected.has(option.id)) selected.delete(option.id);
    else selected.add(option.id);
    answers[question.id] = Array.from(selected);
    const otherOption = getOtherOption(question);
    if (otherOption && !selected.has(otherOption.id)) delete answers[otherTextAnswerKey(question.id)];
    state.scrollActiveAnswerOnRender = true;
    render();
    return true;
  }

  function applyMatrixSingleShortcut(question, answers, number) {
    const column = question.columns[number - 1];
    const row = question.rows[state.activeMatrixRowIndex];
    if (!column || !row) return false;
    if (!answers[question.id] || typeof answers[question.id] !== "object" || Array.isArray(answers[question.id])) answers[question.id] = {};
    answers[question.id][row.id] = column.id;
    if (state.activeMatrixRowIndex < question.rows.length - 1) {
      state.activeMatrixRowIndex += 1;
      state.scrollActiveAnswerOnRender = true;
      render();
    } else {
      const indexes = getShortcutQuestionIndexes();
      const currentIndex = indexes.indexOf(state.activeAnswerQuestionIndex);
      if (currentIndex >= 0 && currentIndex < indexes.length - 1) moveActiveAnswer(1);
      else {
        state.scrollActiveAnswerOnRender = true;
        render();
      }
    }
    return true;
  }

  function queueActiveAnswerScroll() {
    if (!state.scrollActiveAnswerOnRender || state.view !== "response-edit") return;
    state.scrollActiveAnswerOnRender = false;
    window.requestAnimationFrame(() => {
      const target = root.querySelector(".matrix-row-active") || root.querySelector('[data-answer-active="true"]');
      target?.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
    });
  }

  function clampIndex(index, length) {
    if (!length) return 0;
    return Math.max(0, Math.min(length - 1, readIndex(index)));
  }

  function render() {
    root.innerHTML = `
      <div class="app-shell">
        ${renderHeader()}
        <main class="app-main">
          ${renderFlash()}
          ${renderView()}
        </main>
        ${renderTour()}
      </div>
    `;
    queueTourTargetScroll();
    queueActiveAnswerScroll();
    queueStackedChartDraw();
  }

  function queueStackedChartDraw() {
    if (!root) return;
    if (stackedChartDrawFrame) window.cancelAnimationFrame(stackedChartDrawFrame);
    stackedChartDrawFrame = window.requestAnimationFrame(() => {
      stackedChartDrawFrame = 0;
      drawStackedCharts();
    });
  }

  function drawStackedCharts() {
    root?.querySelectorAll("[data-stacked-chart]").forEach(drawStackedChartCanvas);
  }

  function drawStackedChartCanvas(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) return;
    let entries = [];
    try {
      entries = JSON.parse(canvas.dataset.chartEntries || "[]");
    } catch (error) {
      console.error(error);
      return;
    }
    const width = Math.max(1, canvas.clientWidth || 600);
    const height = Math.max(1, canvas.clientHeight || 30);
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "#E3E7E4";
    context.fillRect(0, 0, width, height);

    let offset = 0;
    const boundaries = [];
    const labels = [];
    entries.forEach((entry) => {
      const rate = Math.max(0, Math.min(100 - offset, Number(entry.rate) || 0));
      if (rate <= 0) return;
      const startX = (width * offset) / 100;
      const segmentWidth = (width * rate) / 100;
      boundaries.push(startX);
      context.fillStyle = entry.color;
      context.fillRect(startX, 0, segmentWidth, height);
      if (rate >= 4 && segmentWidth >= 16) labels.push({ entry, x: startX + segmentWidth / 2 });
      offset += rate;
    });
    if (boundaries.length && offset < 99.999) boundaries.push((width * offset) / 100);

    context.strokeStyle = "#FFFFFF";
    context.lineWidth = 2;
    boundaries.forEach((boundaryX) => {
      context.beginPath();
      context.moveTo(boundaryX, 0);
      context.lineTo(boundaryX, height);
      context.stroke();
    });
    context.font = "700 12px 'Yu Gothic', 'Meiryo', sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    labels.forEach(({ entry, x }) => {
      context.lineWidth = 3;
      context.strokeStyle = entry.textColor === "#FFFFFF" ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.85)";
      context.strokeText(String(entry.number), x, height / 2);
      context.fillStyle = entry.textColor;
      context.fillText(String(entry.number), x, height / 2);
    });
  }

  function queueTourTargetScroll() {
    if (!state.tourActive || state.tourPickerOpen) return;
    const step = getCurrentTourSteps()[state.tourStepIndex];
    if (step?.target === "answer-form") return;
    window.requestAnimationFrame(() => {
      root.querySelector('[data-tour-active="true"]')?.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
    });
  }

  function renderHeader() {
    const title = {
      home: "アンケート一覧",
      "survey-edit": "アンケート設定",
      list: "回答一覧",
      "response-edit": "回答入力",
      report: "集計レポート",
      contacts: "連絡先管理",
    }[state.view] || "アンケート一覧";
    return `
      <header class="app-header no-print">
        <button class="app-brand" type="button" data-action="home" aria-label="アンケート一覧へ移動">
          <p class="app-kicker">Survey Registry</p>
          <h1>アンケート集計</h1>
        </button>
        <div class="app-header__actions">
          <p class="app-header__subtitle">${escapeHtml(title)}</p>
          <button class="button button-tour" type="button" data-action="start-tour">使い方</button>
        </div>
      </header>
    `;
  }

  function renderFlash() {
    const flash = state.flash ? `<div class="flash no-print">${escapeHtml(state.flash)}</div>` : "";
    const messages = state.messages.length
      ? `<section class="messages no-print"><div class="message-group message-error"><h2>確認してください</h2><ul>${state.messages.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}</ul></div></section>`
      : "";
    return `${flash}${messages}`;
  }

  function renderView() {
    if (state.view === "survey-edit") return renderSurveyEditPage();
    if (state.view === "list") return renderResponseListPage();
    if (state.view === "response-edit") return renderResponseEditPage();
    if (state.view === "report") return renderReportPage();
    if (state.view === "contacts") return renderContactsPage();
    return renderHomePage();
  }

  function renderTour() {
    if (state.tourPickerOpen) return renderTourPicker();
    if (!state.tourActive) return "";
    const route = getCurrentTourRoute();
    const steps = getCurrentTourSteps();
    const step = steps[state.tourStepIndex] || steps[0];
    const isFirst = state.tourStepIndex === 0;
    const isLast = state.tourStepIndex === steps.length - 1;
    return `
      <div class="tour-layer no-print" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <div class="tour-backdrop" data-action="close-tour"></div>
        <section class="tour-panel">
          <div class="tour-panel__head">
            <p class="tour-progress">${escapeHtml(route.title)} ${state.tourStepIndex + 1} / ${steps.length}</p>
            <button class="icon-button" type="button" data-action="close-tour" aria-label="チュートリアルを閉じる">×</button>
          </div>
          <h2 id="tour-title">${escapeHtml(step.title)}</h2>
          <p>${escapeHtml(step.body)}</p>
          <div class="tour-actions">
            <button class="button" type="button" data-action="prev-tour"${isFirst ? " disabled" : ""}>前へ</button>
            <button class="button button-primary" type="button" data-action="${isLast ? "close-tour" : "next-tour"}">${isLast ? "完了" : "次へ"}</button>
          </div>
        </section>
      </div>
    `;
  }

  function renderTourPicker() {
    return `
      <div class="tour-layer no-print" role="dialog" aria-modal="true" aria-labelledby="tour-picker-title">
        <div class="tour-backdrop" data-action="close-tour"></div>
        <section class="tour-panel tour-panel-wide">
          <div class="tour-panel__head">
            <p class="tour-progress">チュートリアル</p>
            <button class="icon-button" type="button" data-action="close-tour" aria-label="チュートリアルを閉じる">×</button>
          </div>
          <h2 id="tour-picker-title">使い方を選ぶ</h2>
          <div class="tour-route-list">
            ${TOUR_ROUTES.map((route) => `
              <button class="tour-route-button" type="button" data-action="start-tour-route" data-tour-route="${escapeAttr(route.id)}">
                <span>${escapeHtml(route.title)}</span>
                <small>${escapeHtml(route.description)}</small>
              </button>
            `).join("")}
          </div>
        </section>
      </div>
    `;
  }

  function tourAttr(target) {
    const step = state.tourActive ? getCurrentTourSteps()[state.tourStepIndex] : null;
    return ` data-tour="${escapeAttr(target)}"${step?.target === target ? ` data-tour-active="true"` : ""}`;
  }

  function renderHomePage() {
    return `
      <section class="toolbar home-toolbar no-print">
        <button class="button button-primary home-new-survey" type="button" data-action="new-survey"${tourAttr("new-survey")}>新しいアンケートを作成</button>
        <span class="button-row backup-file-actions">
          <button class="button" type="button" data-action="export-backup-json"${tourAttr("export-backup")} title="アンケート設定・回答・連絡先を保存ファイルとして書き出す">保存ファイルを作成</button>
          <button class="button" type="button" data-action="import-click"${tourAttr("import-backup")} title="保存ファイルを読み込んで現在のデータに追加">保存ファイルを読み込む</button>
        </span>
        <input id="import-file" class="visually-hidden" type="file" accept="application/json,.json" />
      </section>
      <section class="panel"${tourAttr("survey-list")}>
        <div class="section-heading">
          <h2>アンケート一覧</h2>
          <p class="count-label">${state.surveys.length}件</p>
        </div>
        <div class="list-grid">
          ${state.surveys.length ? state.surveys.map(renderSurveyCard).join("") : `<div class="empty-state">アンケートがありません。</div>`}
        </div>
      </section>
    `;
  }

  function renderSurveyCard(survey) {
    const count = getResponsesForSurvey(survey.id).length;
    return `
      <article class="survey-card">
        <div class="survey-card__main">
          <h2>${escapeHtml(survey.title || "無題のアンケート")}</h2>
          <dl class="meta-grid">
            <div><dt>実施者</dt><dd>${escapeHtml(survey.issuer || "-")}</dd></div>
            <div><dt>実施期間</dt><dd>${renderReportPeriod(survey)}</dd></div>
            <div><dt>設問数</dt><dd>${survey.questions.length}件</dd></div>
            <div><dt>回答数</dt><dd>${count}件</dd></div>
          </dl>
        </div>
        <div class="card-actions no-print">
          <button class="button button-primary" type="button" data-action="select-survey" data-id="${escapeAttr(survey.id)}"${isPresetSurvey(survey) ? tourAttr("preset-select") : ""}>選択</button>
          <button class="button" type="button" data-action="edit-survey" data-id="${escapeAttr(survey.id)}">編集</button>
          ${isPresetSurvey(survey) ? "" : `<button class="button button-danger" type="button" data-action="delete-survey" data-id="${escapeAttr(survey.id)}">削除</button>`}
        </div>
      </article>
    `;
  }

  function renderSurveyEditPage() {
    const survey = state.surveyDraft;
    if (!survey) return renderMissing("アンケート設定が見つかりません。");
    const questionsLocked = isPresetSurvey(survey);
    return `
      <section class="toolbar no-print">
        <button class="button button-back" type="button" data-action="home">← アンケート一覧へ戻る</button>
        <span class="toolbar-break" aria-hidden="true"></span>
        <button class="button button-primary" type="button" data-action="save-survey"${tourAttr("save-survey")}>保存</button>
      </section>
      <section class="panel"${tourAttr("survey-basic")}>
        <div class="section-heading"><h2>基本情報</h2></div>
        <div class="form-grid">
          <label class="field field-wide"><span>タイトル<span class="required">必須</span></span><input type="text" value="${escapeAttr(survey.title)}" data-survey-field="title" required /></label>
          <label class="field"><span>実施者</span><input type="text" value="${escapeAttr(survey.issuer)}" data-survey-field="issuer" /></label>
          <label class="field"><span>実施期間</span><div class="date-range"><input type="date" value="${escapeAttr(survey.periodStart || "")}" data-survey-field="periodStart" aria-label="開始日" /><span class="date-range__separator" aria-hidden="true">〜</span><input type="date" value="${escapeAttr(survey.periodEnd || "")}" data-survey-field="periodEnd" aria-label="終了日" /></div></label>
          <label class="field"><span>配布数</span><input type="number" min="0" step="1" value="${escapeAttr(survey.distributedCount ?? "")}" data-survey-field="distributedCount" /></label>
          <label class="field field-wide"><span>メモ</span><textarea rows="3" data-survey-field="note">${escapeHtml(survey.note)}</textarea></label>
        </div>
      </section>
      <section class="panel"${tourAttr("question-settings")}>
        <div class="section-heading section-heading-actions">
          <h2>設問<span class="required">必須</span></h2>
          <div class="button-row no-print">
            ${questionsLocked ? "" : `<button class="button" type="button" data-action="add-question"${tourAttr("add-question")}>設問を追加</button>`}
          </div>
        </div>
        ${questionsLocked ? `<p class="notice-inline">このプリセットアンケートの設問内容は固定です。基本情報と「集計レポートに含める」の設定のみ編集できます。</p>` : ""}
        <div class="question-editor-list">
          ${survey.questions.length ? survey.questions.map((question, index) => renderQuestionEditor(question, index, questionsLocked)).join("") : `<div class="empty-state">設問がありません。上のボタンから追加してください。</div>`}
        </div>
      </section>
      <section class="toolbar toolbar-bottom no-print">
        <button class="button button-primary" type="button" data-action="save-survey">保存</button>
      </section>
    `;
  }

  function renderQuestionEditor(question, index, locked = false) {
    const lockedAttr = locked ? " disabled" : "";
    return `
      <article class="question-editor">
        <div class="question-editor__head">
          <div class="question-title-field">
            <span class="question-number">${index + 1}.</span>
            <label class="field question-title-input"><span>設問文<span class="required">必須</span></span><input type="text" value="${escapeAttr(question.title)}" placeholder="設問文を入力" data-question-field="title" data-question-index="${index}" required${lockedAttr} /></label>
          </div>
          ${locked ? "" : `
            <div class="icon-actions no-print">
              <button class="icon-button" title="上へ" type="button" data-action="move-question" data-question-index="${index}" data-direction="-1">↑</button>
              <button class="icon-button" title="下へ" type="button" data-action="move-question" data-question-index="${index}" data-direction="1">↓</button>
              <button class="button button-danger" type="button" data-action="remove-question" data-question-index="${index}">削除</button>
            </div>
          `}
        </div>
        <div class="form-grid">
          <label class="field">
            <span>回答形式</span>
            <select data-question-field="type" data-question-index="${index}"${lockedAttr}>
              ${questionTypeOptions(question.type)}
            </select>
          </label>
          <label class="choice-item">
            <input type="checkbox" data-question-field="includeInReport" data-question-index="${index}"${question.includeInReport ? " checked" : ""}${question.type === "contact" ? " disabled" : ""} />
            <span>集計レポートに含める</span>
          </label>
        </div>
        ${renderQuestionDetailEditor(question, index, locked)}
      </article>
    `;
  }

  function questionTypeOptions(current) {
    const types = [
      ["single", "単一選択"],
      ["multiple", "複数選択"],
      ["matrix_single", "表形式"],
      ["number_matrix", "人数表"],
      ["text", "自由記述"],
      ["contact", "連絡先 非公開"],
    ];
    return types.map(([value, label]) => `<option value="${value}"${current === value ? " selected" : ""}>${label}</option>`).join("");
  }

  function renderQuestionDetailEditor(question, index, locked = false) {
    if (question.type === "single" || question.type === "multiple") return renderOptionEditor(question, index, locked);
    if (question.type === "matrix_single" || question.type === "number_matrix") return `${renderRowEditor(question, index, locked)}${renderColumnEditor(question, index, locked)}`;
    if (question.type === "contact") return `<p class="notice-inline">この設問は連絡先として別保存され、集計レポートや匿名CSVには含めません。</p>`;
    return `<p class="muted-text">自由記述は選択肢設定不要です。</p>`;
  }

  function renderOptionEditor(question, questionIndex, locked = false) {
    const lockedAttr = locked ? " disabled" : "";
    return `
      <div class="subsection">
        <div class="subsection-head"><h4>回答選択肢</h4>${locked ? "" : `<button class="button no-print" type="button" data-action="add-option" data-question-index="${questionIndex}">＋ 選択肢</button>`}</div>
        <div class="option-list">
          ${question.options.map((option, optionIndex) => `
            <div class="option-row">
              <label class="field option-name"><span>選択肢<span class="required">必須</span></span><input type="text" value="${escapeAttr(option.label)}" data-option-field data-question-index="${questionIndex}" data-option-index="${optionIndex}" required${lockedAttr} /></label>
              ${locked ? "" : `<button class="button button-danger no-print" type="button" data-action="remove-option" data-question-index="${questionIndex}" data-option-index="${optionIndex}">選択肢を削除</button>`}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderRowEditor(question, questionIndex, locked = false) {
    const lockedAttr = locked ? " disabled" : "";
    return `
      <div class="subsection">
        <div class="subsection-head"><h4>行項目</h4>${locked ? "" : `<button class="button no-print" type="button" data-action="add-row" data-question-index="${questionIndex}">＋ 行</button>`}</div>
        <div class="option-list">
          ${question.rows.map((row, rowIndex) => `
            <div class="option-row">
              <label class="field option-name"><span>行<span class="required">必須</span></span><input type="text" value="${escapeAttr(row.label)}" data-row-field data-question-index="${questionIndex}" data-row-index="${rowIndex}" required${lockedAttr} /></label>
              ${locked ? "" : `<button class="button button-danger no-print" type="button" data-action="remove-row" data-question-index="${questionIndex}" data-row-index="${rowIndex}">行を削除</button>`}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderColumnEditor(question, questionIndex, locked = false) {
    const lockedAttr = locked ? " disabled" : "";
    return `
      <div class="subsection">
        <div class="subsection-head"><h4>列項目</h4>${locked ? "" : `<button class="button no-print" type="button" data-action="add-column" data-question-index="${questionIndex}">＋ 列</button>`}</div>
        <div class="option-list">
          ${question.columns.map((column, columnIndex) => `
            <div class="option-row">
              <label class="field option-name"><span>列<span class="required">必須</span></span><input type="text" value="${escapeAttr(column.label)}" data-column-field data-question-index="${questionIndex}" data-column-index="${columnIndex}" required${lockedAttr} /></label>
              ${locked ? "" : `<button class="button button-danger no-print" type="button" data-action="remove-column" data-question-index="${questionIndex}" data-column-index="${columnIndex}">列を削除</button>`}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderResponseListPage() {
    const survey = getCurrentSurvey();
    const responses = getCurrentResponses();
    const hasContactQuestion = surveyHasContactQuestion(survey);
    return `
      <section class="toolbar response-main-toolbar no-print">
        <button class="button button-back" type="button" data-action="home">← アンケート一覧へ戻る</button>
        <span class="toolbar-break" aria-hidden="true"></span>
        <button class="button button-primary response-new-button" type="button" data-action="new-response"${tourAttr("new-response")}>回答を登録</button>
        <span class="button-row survey-form-export-actions"${tourAttr("survey-form-export")}>
          <button class="button" type="button" data-action="export-word-survey">アンケートWord出力</button>
          <button class="button" type="button" data-action="print-survey-form">アンケートPDF出力・印刷</button>
        </span>
      </section>
      ${renderPrivacyNotice()}
      <section class="toolbar response-report-toolbar no-print">
        <button class="button button-primary" type="button" data-action="report"${tourAttr("report-link")}>集計レポートを表示</button>
        <span class="button-row response-secondary-actions">
          ${hasContactQuestion ? `<button class="button" type="button" data-action="contacts"${tourAttr("contact-link")}>連絡先管理</button>` : ""}
          <button class="button" type="button" data-action="export-response-csv">回答一覧CSV出力</button>
        </span>
      </section>
      <section class="panel no-print">
        <div class="section-heading"><h2>${survey?.title + " 回答一覧"}</h2><p class="count-label">${responses.length}件</p></div>
        ${responses.length ? renderResponseTable(responses, hasContactQuestion) : `<div class="empty-state">登録済みの回答はありません。</div>`}
      </section>
      ${renderSurveyFormPrint(survey)}
    `;
  }

  function renderResponseTable(responses, hasContactQuestion) {
    return `
      <div class="table-wrap">
        <table class="report-table">
          <thead><tr><th>番号</th><th>入力日時</th>${hasContactQuestion ? "<th>連絡先</th>" : ""}<th class="no-print">操作</th></tr></thead>
          <tbody>
            ${responses.map((response, index) => {
              const contact = getContactForResponse(response.id);
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${escapeHtml(formatDateTime(response.createdAt))}</td>
                  ${hasContactQuestion ? `<td>${escapeHtml(formatContactListValue(contact))}</td>` : ""}
                  <td class="no-print">
                    <div class="button-row">
                      <button class="button" type="button" data-action="edit-response" data-id="${escapeAttr(response.id)}">編集</button>
                      <button class="button button-danger" type="button" data-action="delete-response" data-id="${escapeAttr(response.id)}">削除</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderSurveyFormPrint(survey) {
    if (!survey) return "";
    return `
      <article class="survey-form print-page print-only">
        <header class="survey-form__header">
          <h2>${escapeHtml(survey.title || "アンケート")}</h2>
          <dl class="survey-form__meta">
            ${survey.issuer ? `<div><dt>実施者</dt><dd>${escapeHtml(survey.issuer)}</dd></div>` : ""}
            ${survey.periodStart || survey.periodEnd || survey.periodText ? `<div><dt>実施期間</dt><dd>${renderReportPeriod(survey)}</dd></div>` : ""}
          </dl>
          ${survey.note ? `<p>${escapeHtml(survey.note)}</p>` : ""}
        </header>
        <div class="survey-form__questions">
          ${survey.questions.map((question, index) => renderSurveyFormQuestion(question, index)).join("")}
        </div>
      </article>
    `;
  }

  function renderSurveyFormQuestion(question, index) {
    const heading = `<h3>${index + 1}. ${escapeHtml(question.title)}</h3>`;
    if (question.type === "single" || question.type === "multiple") {
      return `
        <section class="survey-form-question">
          ${heading}
          <div class="survey-form-options">
            ${question.options.map((option) => `<div class="survey-form-option"><span class="survey-check">□</span><span>${escapeHtml(formatSurveyChoiceLabel(option))}</span></div>`).join("")}
          </div>
        </section>
      `;
    }
    if (question.type === "matrix_single" || question.type === "number_matrix") {
      return `
        <section class="survey-form-question">
          ${heading}
          <div class="table-wrap">
            <table class="report-table survey-form-table">
              <thead><tr><th>項目</th>${question.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
              <tbody>
                ${question.rows.map((row) => `
                  <tr>
                    <th>${escapeHtml(row.label)}</th>
                    ${question.columns.map(() => `<td>${question.type === "matrix_single" ? "□" : ""}</td>`).join("")}
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </section>
      `;
    }
    if (question.type === "contact") {
      return `
        <section class="survey-form-question">
          ${heading}
          <div class="survey-contact-lines">
            <div><span>お名前</span><span class="survey-blank-line"></span></div>
            <div><span>住所</span><span class="survey-blank-line"></span></div>
            <div><span>連絡先：電話番号</span><span class="survey-blank-line"></span></div>
          </div>
        </section>
      `;
    }
    return `
      <section class="survey-form-question">
        ${heading}
        <div class="survey-text-lines">
          <span></span><span></span><span></span><span></span>
        </div>
      </section>
    `;
  }

  function formatSurveyChoiceLabel(option) {
    if (option.id === "other" || option.label.includes("その他")) return `${option.label}（　　　　　　　　　）`;
    return option.label;
  }

  function renderResponseEditPage() {
    const survey = getCurrentSurvey();
    if (!survey || !state.currentResponse) return renderMissing("回答が見つかりません。");
    ensureActiveAnswerPosition();
    return `
      <section class="toolbar no-print">
        <button class="button button-back" type="button" data-action="list">← 回答一覧へ戻る</button>
        <span class="toolbar-break" aria-hidden="true"></span>
        <button class="button button-primary" type="button" data-action="save-response"${tourAttr("save-response")}>保存</button>
      </section>
      ${renderPrivacyNotice()}
      <div${tourAttr("answer-form")}>
        ${survey.questions.map((question, index) => renderAnswerQuestion(question, index)).join("")}
      </div>
      <section class="toolbar toolbar-bottom no-print">
        <button class="button button-primary" type="button" data-action="save-response">保存</button>
      </section>
    `;
  }

  function renderAnswerQuestion(question, index) {
    const answer = state.currentResponse.answers[question.id];
    if (question.type === "contact") return renderContactAnswer(question, index);
    if (question.type === "single") return renderSingleAnswer(question, index, answer || "");
    if (question.type === "multiple") return renderMultipleAnswer(question, index, answer || []);
    if (question.type === "matrix_single") return renderMatrixSingleAnswer(question, index, answer || {});
    if (question.type === "number_matrix") return renderNumberMatrixAnswer(question, index, answer || {});
    return renderTextAnswer(question, index, answer || "");
  }

  function answerPanelClass(index, extraClass = "") {
    const classes = ["panel", "answer-panel"];
    if (state.activeAnswerQuestionIndex === index) classes.push("answer-panel-active");
    if (extraClass) classes.push(extraClass);
    return classes.join(" ");
  }

  function answerPanelAttrs(index) {
    return `data-answer-index="${index}"${state.activeAnswerQuestionIndex === index ? ' data-answer-active="true"' : ""}`;
  }

  function shortcutKeyBadge(index, extraClass = "") {
    if (index < 0 || index >= 9) return "";
    return `<span class="shortcut-key${extraClass ? ` ${extraClass}` : ""}" aria-hidden="true">${index + 1}</span>`;
  }

  function renderSingleAnswer(question, index, answer) {
    const otherOption = getOtherOption(question);
    const selectedOther = Boolean(otherOption && answer === otherOption.id);
    return `
      <section class="${answerPanelClass(index)}" ${answerPanelAttrs(index)}>
        <div class="section-heading"><h2>${index + 1}. ${escapeHtml(question.title)}</h2></div>
        <div class="choice-grid">
          ${question.options.map((option, optionIndex) => `
            <label class="choice-item">
              <input type="radio" name="answer_${escapeAttr(question.id)}" value="${escapeAttr(option.id)}" data-answer data-question-id="${escapeAttr(question.id)}"${answer === option.id ? " checked" : ""} />
              ${shortcutKeyBadge(optionIndex)}
              <span>${escapeHtml(option.label)}</span>
            </label>
          `).join("")}
        </div>
        ${selectedOther ? renderOtherAnswerField(question) : ""}
      </section>
    `;
  }

  function renderMultipleAnswer(question, index, answer) {
    const selected = new Set(Array.isArray(answer) ? answer : []);
    const otherOption = getOtherOption(question);
    const selectedOther = Boolean(otherOption && selected.has(otherOption.id));
    return `
      <section class="${answerPanelClass(index)}" ${answerPanelAttrs(index)}>
        <div class="section-heading"><h2>${index + 1}. ${escapeHtml(question.title)}</h2></div>
        <div class="choice-grid">
          ${question.options.map((option, optionIndex) => `
            <label class="choice-item">
              <input type="checkbox" value="${escapeAttr(option.id)}" data-answer data-question-id="${escapeAttr(question.id)}"${selected.has(option.id) ? " checked" : ""} />
              ${shortcutKeyBadge(optionIndex)}
              <span>${escapeHtml(option.label)}</span>
            </label>
          `).join("")}
        </div>
        ${selectedOther ? renderOtherAnswerField(question) : ""}
      </section>
    `;
  }

  function renderOtherAnswerField(question) {
    const value = state.currentResponse?.answers?.[otherTextAnswerKey(question.id)] || "";
    return `
      <label class="field field-wide other-field">
        <span>その他の記入内容</span>
        <input type="text" value="${escapeAttr(value)}" data-other-answer data-question-id="${escapeAttr(question.id)}" />
      </label>
    `;
  }

  function renderMatrixSingleAnswer(question, index, answer) {
    return `
      <section class="${answerPanelClass(index)}" ${answerPanelAttrs(index)}>
        <div class="section-heading"><h2>${index + 1}. ${escapeHtml(question.title)}</h2></div>
        <div class="table-wrap">
          <table class="report-table compact-table">
            <thead><tr><th>項目</th>${question.columns.map((column, columnIndex) => `<th>${shortcutKeyBadge(columnIndex, "table-shortcut-key")}${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
            <tbody>
              ${question.rows.map((row, rowIndex) => `
                <tr data-matrix-row-index="${rowIndex}"${state.activeAnswerQuestionIndex === index && state.activeMatrixRowIndex === rowIndex ? ' class="matrix-row-active"' : ""}>
                  <th>${escapeHtml(row.label)}</th>
                  ${question.columns.map((column) => `<td class="choice-cell"><label class="table-choice"><input type="radio" name="answer_${escapeAttr(question.id)}_${escapeAttr(row.id)}" value="${escapeAttr(column.id)}" data-answer data-question-id="${escapeAttr(question.id)}" data-row-id="${escapeAttr(row.id)}"${answer[row.id] === column.id ? " checked" : ""} /><span class="visually-hidden">${escapeHtml(column.label)}</span></label></td>`).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderNumberMatrixAnswer(question, index, answer) {
    return `
      <section class="panel">
        <div class="section-heading"><h2>${index + 1}. ${escapeHtml(question.title)}</h2></div>
        <div class="table-wrap">
          <table class="report-table compact-table">
            <thead><tr><th>項目</th>${question.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
            <tbody>
              ${question.rows.map((row) => `
                <tr>
                  <th>${escapeHtml(row.label)}</th>
                  ${question.columns.map((column) => `<td><input class="table-input" type="number" min="0" step="1" value="${escapeAttr(answer[row.id]?.[column.id] ?? "")}" data-answer data-question-id="${escapeAttr(question.id)}" data-row-id="${escapeAttr(row.id)}" data-column-id="${escapeAttr(column.id)}" /></td>`).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderTextAnswer(question, index, answer) {
    return `
      <section class="panel">
        <div class="section-heading"><h2>${index + 1}. ${escapeHtml(question.title)}</h2></div>
        <p class="notice-inline">自由記述には個人情報が含まれる可能性があります。配布資料に使う前に内容を確認してください。</p>
        <label class="field field-wide"><span>回答</span><textarea rows="6" data-answer data-question-id="${escapeAttr(question.id)}">${escapeHtml(answer)}</textarea></label>
      </section>
    `;
  }

  function renderContactAnswer(question, index) {
    const contact = state.currentContact || createContact(state.currentResponse.id);
    return `
      <section class="panel sensitive-panel"${tourAttr("contact-entry")}>
        <div class="section-heading"><h2>${index + 1}. ${escapeHtml(question.title)} 非公開</h2></div>
        <p class="notice-inline">連絡先は運営内部用です。集計レポートや匿名CSVには含めません。</p>
        <div class="form-grid">
          <label class="field"><span>お名前</span><input type="text" value="${escapeAttr(contact.name || "")}" data-contact-field="name" /></label>
          <label class="field"><span>連絡先：電話番号</span><input type="text" value="${escapeAttr(contact.phone || "")}" data-contact-field="phone" /></label>
          <label class="field field-wide"><span>住所</span><input type="text" value="${escapeAttr(contact.address || "")}" data-contact-field="address" /></label>
        </div>
      </section>
    `;
  }

  function renderReportPage() {
    const survey = getCurrentSurvey();
    const responses = getCurrentResponses();
    if (!survey) return renderMissing("アンケートが選択されていません。");
    const config = getReportConfig(survey);
    return `
      <section class="toolbar no-print">
        <button class="button button-back" type="button" data-action="list">← 回答一覧へ戻る</button>
        <span class="toolbar-break" aria-hidden="true"></span>
        <span class="button-row report-export-actions"${tourAttr("export-report")}>
          <button class="button button-primary" type="button" data-action="export-word-report">Word出力</button>
          <button class="button button-primary" type="button" data-action="print">PDF出力・印刷</button>
        </span>
      </section>
      ${renderReportOverallControls(config)}
      <div${tourAttr("cross-report")}>
        ${renderReportControls(survey, config)}
      </div>
      <article class="report print-page">
        <header class="report-header">
          <h2>${escapeHtml(survey.title)} - レポート</h2>
          <dl class="report-summary">
            <div><dt>実施者</dt><dd>${escapeHtml(survey.issuer || "-")}</dd></div>
            <div><dt>実施期間</dt><dd>${renderReportPeriod(survey)}</dd></div>
            <div><dt>配布数</dt><dd>${survey.distributedCount ?? "-"}</dd></div>
            <div><dt>回答数</dt><dd>${responses.length}件</dd></div>
            <div><dt>作成日</dt><dd>${escapeHtml(formatDate(new Date()))}</dd></div>
          </dl>
        </header>
        ${renderReportBody(config, responses)}
      </article>
    `;
  }

  function renderReportOverallControls(config) {
    return `
      <section class="panel no-print report-overall-settings">
        <div class="section-heading"><h2>全体集計の設定</h2></div>
        <label class="field report-order-field">
          <span>項目の並び順</span>
          <select data-report-item-order>
            <option value="question"${config.itemOrder === "question" ? " selected" : ""}>設問順</option>
            <option value="count_desc"${config.itemOrder === "count_desc" ? " selected" : ""}>件数が多い順</option>
          </select>
        </label>
      </section>
    `;
  }

  function renderReportControls(survey, config) {
    const axisCandidates = getReportAxisCandidates(survey);
    const draftAxisQuestion = getReportAxisQuestionById(survey, state.reportDraftAxisQuestionId);
    const targetCandidates = draftAxisQuestion ? getReportTargetCandidates(survey, draftAxisQuestion.id) : [];
    if (!state.reportDraftTargetQuestionId && targetCandidates.length) state.reportDraftTargetQuestionId = targetCandidates[0].id;
    const draftPairExists = state.reportCrossItems.some((item) => item.axisQuestionId === state.reportDraftAxisQuestionId && item.targetQuestionId === state.reportDraftTargetQuestionId);
    const canAdd = Boolean(draftAxisQuestion && targetCandidates.some((question) => question.id === state.reportDraftTargetQuestionId) && !draftPairExists);
    return `
      <section class="panel no-print report-settings">
        <div class="section-heading">
          <h2>クロス集計を追加</h2>
          <p class="count-label">${config.crossItems.length}件</p>
        </div>
        <div class="form-grid">
          <label class="field">
            <span>回答を分ける設問</span>
            <select data-report-axis>
              <option value="">選択してください</option>
              ${axisCandidates.map((question) => `<option value="${escapeAttr(question.id)}"${state.reportDraftAxisQuestionId === question.id ? " selected" : ""}>${escapeHtml(question.title)}</option>`).join("")}
            </select>
          </label>
          <label class="field">
            <span>集計する設問</span>
            <select data-report-target${draftAxisQuestion ? "" : " disabled"}>
              <option value="">選択してください</option>
              ${targetCandidates.map((question) => `<option value="${escapeAttr(question.id)}"${state.reportDraftTargetQuestionId === question.id ? " selected" : ""}>${escapeHtml(question.title)}</option>`).join("")}
            </select>
          </label>
        </div>
        ${axisCandidates.length ? "" : `<p class="muted-text">回答を分ける設問に使える単一選択の設問がありません。</p>`}
        <div class="button-row report-add-row"${tourAttr("cross-add")}>
          <button class="button button-primary" type="button" data-action="add-report-cross"${canAdd ? "" : " disabled"}>クロス集計を追加</button>
        </div>
        <div class="subsection report-cross-list">
          <div class="subsection-head">
            <h4>追加済み</h4>
          </div>
          <div class="cross-config-list">
            ${config.crossItems.length ? config.crossItems.map((item) => renderReportCrossConfigItem(item)).join("") : `<div class="empty-state">追加済みのクロス集計はありません。</div>`}
          </div>
        </div>
      </section>
    `;
  }

  function renderReportCrossConfigItem(item) {
    return `
      <div class="cross-config-item">
        <span>${escapeHtml(item.axisQuestion.title)} × ${escapeHtml(item.targetQuestion.title)}</span>
        <div class="icon-actions">
          <button class="icon-button" title="上へ" type="button" data-action="move-report-cross" data-cross-index="${item.sourceIndex}" data-direction="-1">↑</button>
          <button class="icon-button" title="下へ" type="button" data-action="move-report-cross" data-cross-index="${item.sourceIndex}" data-direction="1">↓</button>
          <button class="button button-danger" type="button" data-action="remove-report-cross" data-cross-index="${item.sourceIndex}">削除</button>
        </div>
      </div>
    `;
  }

  function renderReportBody(config, responses) {
    const overall = config.overallQuestions.length
      ? config.overallQuestions.map((question, index) => renderAggregateQuestion(question, responses, index, config.itemOrder)).join("")
      : `<section class="question-block"><p class="question-note">集計する設問がありません。</p></section>`;
    return `
      <section class="report-section-heading"><h3>全体集計</h3></section>
      ${overall}
      ${renderCrossAggregateSection(config, responses)}
    `;
  }

  function renderCrossAggregateSection(config, responses) {
    if (!config.crossItems.length) return "";
    return `
      <section class="cross-report-section">
        <h3>クロス集計</h3>
        ${config.crossItems.map((item) => renderCrossAggregateQuestion(item, responses)).join("")}
      </section>
    `;
  }

  function renderCrossAggregateQuestion(item, responses) {
    const groups = getSegmentGroups(item.axisQuestion, responses);
    const question = item.targetQuestion;
    if (question.type === "matrix_single") return renderMatrixCrossAggregateQuestion(item, groups);
    if (question.type !== "single" && question.type !== "multiple") return "";
    return `
      <section class="question-block cross-question-block">
        <h4>${escapeHtml(item.axisQuestion.title)} × ${escapeHtml(question.title)}</h4>
        <div class="table-wrap">
          <table class="report-table cross-table">
            <thead><tr><th>項目</th>${groups.map((group) => `<th>${escapeHtml(group.label)}<br><span>${group.responses.length}件</span></th>`).join("")}</tr></thead>
            <tbody>
              ${question.options.map((option) => `
                <tr>
                  <th>${escapeHtml(option.label)}</th>
                  ${groups.map((group) => {
                    const count = countChoiceAnswers(question, group.responses, option.id);
                    return `<td>${renderCrossCellAggregate(count, group.responses.length)}</td>`;
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderMatrixCrossAggregateQuestion(item, groups) {
    const question = item.targetQuestion;
    return `
      <section class="question-block cross-question-block">
        <h4>${escapeHtml(item.axisQuestion.title)} × ${escapeHtml(question.title)}</h4>
        ${question.rows.map((row) => `
          <div class="matrix-row-report">
            <h5>${escapeHtml(row.label)}</h5>
            <div class="table-wrap">
              <table class="report-table cross-table matrix-cross-table">
                <thead><tr><th>項目</th>${groups.map((group) => `<th>${escapeHtml(group.label)}<br><span>${group.responses.length}件</span></th>`).join("")}</tr></thead>
                <tbody>
                  ${question.columns.map((column) => `
                    <tr>
                      <th>${escapeHtml(column.label)}</th>
                      ${groups.map((group) => {
                        const count = countMatrixSingleAnswers(question, group.responses, row.id, column.id);
                        return `<td>${renderCrossCellAggregate(count, group.responses.length)}</td>`;
                      }).join("")}
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        `).join("")}
      </section>
    `;
  }

  function renderCrossCellAggregate(count, denominator) {
    const rate = denominator > 0 ? (count / denominator) * 100 : null;
    return `
      <div class="cross-cell-aggregate">
        <div><strong>${count}件</strong><span>${escapeHtml(formatRate(rate))}</span></div>
      </div>
    `;
  }

  function renderAggregateQuestion(question, responses, index, itemOrder) {
    if (question.type === "single" || question.type === "multiple") return renderChoiceAggregate(question, responses, index, itemOrder);
    if (question.type === "matrix_single") return renderMatrixAggregate(question, responses, index, itemOrder);
    if (question.type === "number_matrix") return renderNumberMatrixAggregate(question, responses, index, itemOrder);
    return renderTextAggregate(question, responses, index);
  }

  function renderChoiceAggregate(question, responses, index, itemOrder) {
    const denominator = responses.length;
    const rows = getChoiceAggregateRows(question, responses, itemOrder);
    return `<section class="question-block">${renderReportQuestionHeading(question, index)}${renderAggregateTable(rows, denominator, getReportChartType(question), question.title)}${renderOtherTextAggregate(question, responses)}</section>`;
  }

  function sortAggregateRows(rows, itemOrder, valueKey = "count") {
    if (itemOrder !== "count_desc") return rows;
    return rows
      .map((row, sourceIndex) => ({ row, sourceIndex }))
      .sort((left, right) => (right.row[valueKey] - left.row[valueKey]) || (left.sourceIndex - right.sourceIndex))
      .map((item) => item.row);
  }

  function getChoiceAggregateRows(question, responses, itemOrder) {
    const rows = question.options.map((option) => ({
      id: option.id,
      label: option.label,
      count: countChoiceAnswers(question, responses, option.id),
    }));
    return sortAggregateRows(rows, itemOrder);
  }

  function getMatrixAggregateRows(question, row, responses, itemOrder) {
    const rows = question.columns.map((column) => ({
      id: column.id,
      label: column.label,
      count: countMatrixSingleAnswers(question, responses, row.id, column.id),
    }));
    return sortAggregateRows(rows, itemOrder);
  }

  function getNumberMatrixAggregateRows(question, responses, itemOrder) {
    const rows = question.rows.map((row) => {
      const values = question.columns.map((column) => responses.reduce((sum, response) => sum + safeInteger(response.answers[question.id]?.[row.id]?.[column.id]), 0));
      return { id: row.id, label: row.label, values, total: values.reduce((sum, value) => sum + value, 0) };
    });
    return sortAggregateRows(rows, itemOrder, "total");
  }

  function renderReportQuestionHeading(question, index) {
    return `
      <div class="report-question-heading">
        <h3>${index + 1}. ${escapeHtml(question.title)}</h3>
        ${isReportChartQuestion(question) ? `
          <label class="chart-type-field no-print">
            <span>グラフ</span>
            <select data-report-chart data-question-id="${escapeAttr(question.id)}">
              ${getReportChartOptions(question).map((option) => `<option value="${escapeAttr(option.value)}"${getReportChartType(question) === option.value ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
            </select>
          </label>
        ` : ""}
      </div>
    `;
  }

  function renderOtherTextAggregate(question, responses) {
    const answers = getOtherTextAnswers(question, responses);
    if (!answers.length) return "";
    return `
      <div class="summary-box other-text-summary">
        <h5>その他の記入内容</h5>
        <ul class="free-text-report">${answers.map((answer) => `<li>${escapeHtml(answer)}</li>`).join("")}</ul>
      </div>
    `;
  }

  function countChoiceAnswers(question, responses, optionId) {
    return responses.filter((response) => {
      const answer = response.answers[question.id];
      return question.type === "multiple" ? Array.isArray(answer) && answer.includes(optionId) : answer === optionId;
    }).length;
  }

  function getOtherOption(question) {
    if (question.type !== "single" && question.type !== "multiple") return null;
    return question.options.find((option) => option.id === "other" || option.label.includes("その他")) || null;
  }

  function hasOtherOption(question) {
    return Boolean(getOtherOption(question));
  }

  function isOtherSelected(question, answer) {
    const otherOption = getOtherOption(question);
    if (!otherOption) return false;
    return question.type === "multiple" ? Array.isArray(answer) && answer.includes(otherOption.id) : answer === otherOption.id;
  }

  function otherTextAnswerKey(questionId) {
    return `${questionId}__otherText`;
  }

  function getOtherTextAnswer(question, response) {
    if (!hasOtherOption(question) || !isOtherSelected(question, response.answers[question.id])) return "";
    return String(response.answers[otherTextAnswerKey(question.id)] || "").trim();
  }

  function getOtherTextAnswers(question, responses) {
    return responses.map((response) => getOtherTextAnswer(question, response)).filter(Boolean);
  }

  function countMatrixSingleAnswers(question, responses, rowId, columnId) {
    return responses.filter((response) => response.answers[question.id]?.[rowId] === columnId).length;
  }

  function renderAggregateTable(rows, denominator, chartType = "bar", chartLabel = "") {
    const entries = getChartEntries(rows, denominator);
    const showBar = chartType === "bar";
    const showColorKey = chartType === "donut" || chartType === "stacked";
    return `
      <div class="aggregate-display aggregate-display--${escapeAttr(chartType)}">
        <div class="table-wrap">
          <table class="report-table">
            <thead><tr><th>項目</th><th>件数</th><th>割合</th>${showBar ? "<th>グラフ</th>" : ""}</tr></thead>
            <tbody>
              ${entries.map((entry) => `
                <tr>
                  <th>${showColorKey ? renderChartKey(entry) : ""}${escapeHtml(entry.label)}</th>
                  <td class="numeric">${entry.count}件</td>
                  <td class="numeric">${formatRate(entry.rate)}</td>
                  ${showBar ? `<td>${renderBar(entry.rate)}</td>` : ""}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ${renderAggregateChart(entries, denominator, chartType, chartLabel)}
      </div>
    `;
  }

  function getChartEntries(rows, denominator) {
    return rows.map((row, index) => ({
      ...row,
      rate: denominator > 0 ? (row.count / denominator) * 100 : null,
      color: REPORT_CHART_COLORS[index % REPORT_CHART_COLORS.length],
      number: index + 1,
      textColor: getChartTextColor(REPORT_CHART_COLORS[index % REPORT_CHART_COLORS.length]),
    }));
  }

  function getChartTextColor(color) {
    const hex = String(color || "").replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(hex)) return "#FFFFFF";
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    return red * 0.299 + green * 0.587 + blue * 0.114 > 160 ? "#1A1A1A" : "#FFFFFF";
  }

  function renderChartKey(entry) {
    return `<span class="chart-key" style="background:${escapeAttr(entry.color)};color:${escapeAttr(entry.textColor)}" aria-hidden="true">${entry.number}</span>`;
  }

  function renderAggregateChart(entries, denominator, chartType, chartLabel) {
    if (chartType === "donut") return renderDonutChart(entries, denominator, chartLabel);
    if (chartType === "stacked") return renderStackedChart(entries, denominator, chartLabel);
    return "";
  }

  function renderDonutChart(entries, denominator, chartLabel) {
    let offset = 0;
    const segments = [];
    const separators = [];
    const labels = [];
    entries.forEach((entry) => {
      const rate = denominator > 0 ? Math.max(0, Math.min(100 - offset, entry.rate || 0)) : 0;
      if (rate <= 0) return;
      separators.push(renderDonutSeparator(offset));
      segments.push(`<circle class="donut-chart__segment" cx="50" cy="50" r="40" pathLength="100" stroke="${escapeAttr(entry.color)}" stroke-dasharray="${rate.toFixed(3)} ${(100 - rate).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}"></circle>`);
      if (rate >= 4) {
        const angle = ((offset + rate / 2) / 100) * Math.PI * 2 - Math.PI / 2;
        const x = 50 + Math.cos(angle) * 40;
        const y = 50 + Math.sin(angle) * 40;
        const outlineColor = entry.textColor === "#FFFFFF" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.8)";
        labels.push(`<text class="donut-chart__number" x="${x.toFixed(3)}" y="${y.toFixed(3)}" fill="${escapeAttr(entry.textColor)}" style="stroke:${escapeAttr(outlineColor)}">${entry.number}</text>`);
      }
      offset += rate;
    });
    if (offset > 0 && offset < 99.999) separators.push(renderDonutSeparator(offset));
    const answered = Math.min(denominator, entries.reduce((sum, entry) => sum + entry.count, 0));
    const description = getChartAriaLabel(chartLabel, entries, denominator);
    return `
      <figure class="aggregate-chart aggregate-chart--donut">
        <svg class="donut-chart" viewBox="0 0 100 100" role="img" aria-label="${escapeAttr(description)}">
          <title>${escapeHtml(description)}</title>
          <circle class="donut-chart__track" cx="50" cy="50" r="40"></circle>
          ${segments.join("")}
          ${separators.join("")}
          ${labels.join("")}
          <text class="donut-chart__value" x="50" y="48">${answered}</text>
          <text class="donut-chart__total" x="50" y="61">/${denominator}件</text>
        </svg>
        ${renderChartUnansweredNote(entries, denominator)}
      </figure>
    `;
  }

  function renderDonutSeparator(percent) {
    const angle = (percent / 100) * Math.PI * 2 - Math.PI / 2;
    const innerX = 50 + Math.cos(angle) * 31;
    const innerY = 50 + Math.sin(angle) * 31;
    const outerX = 50 + Math.cos(angle) * 49;
    const outerY = 50 + Math.sin(angle) * 49;
    return `<line class="donut-chart__separator" x1="${innerX.toFixed(3)}" y1="${innerY.toFixed(3)}" x2="${outerX.toFixed(3)}" y2="${outerY.toFixed(3)}"></line>`;
  }

  function renderStackedChart(entries, denominator, chartLabel) {
    const description = getChartAriaLabel(chartLabel, entries, denominator);
    const chartEntries = entries.map((entry) => ({
      rate: entry.rate,
      color: entry.color,
      number: entry.number,
      textColor: entry.textColor,
    }));
    let printOffset = 0;
    const printSegments = [];
    const printBoundaries = [];
    const printLabels = [];
    chartEntries.forEach((entry) => {
      const rate = Math.max(0, Math.min(100 - printOffset, Number(entry.rate) || 0));
      if (rate <= 0) return;
      const start = printOffset * 10;
      const width = rate * 10;
      if (printSegments.length) printBoundaries.push(`<line x1="${start.toFixed(3)}" y1="0" x2="${start.toFixed(3)}" y2="38" stroke="#FFFFFF" stroke-width="3"></line>`);
      printSegments.push(`<rect x="${start.toFixed(3)}" y="0" width="${width.toFixed(3)}" height="38" fill="${escapeAttr(entry.color)}"></rect>`);
      if (rate >= 4) {
        const labelX = start + width / 2;
        const outlineColor = entry.textColor === "#FFFFFF" ? "#333333" : "#FFFFFF";
        printLabels.push(`<text x="${labelX.toFixed(3)}" y="19" fill="${escapeAttr(entry.textColor)}" stroke="${outlineColor}" stroke-width="1.5" paint-order="stroke fill" text-anchor="middle" dominant-baseline="central" font-family="Yu Gothic, Meiryo, sans-serif" font-size="17" font-weight="700">${entry.number}</text>`);
      }
      printOffset += rate;
    });
    return `
      <figure class="aggregate-chart aggregate-chart--stacked">
        <canvas class="stacked-chart stacked-chart--screen" data-stacked-chart data-chart-entries="${escapeAttr(JSON.stringify(chartEntries))}" role="img" aria-label="${escapeAttr(description)}">${escapeHtml(description)}</canvas>
        <svg class="stacked-chart stacked-chart--print" viewBox="0 0 1000 38" preserveAspectRatio="none" aria-hidden="true">
          <rect x="0" y="0" width="1000" height="38" fill="#E3E7E4"></rect>
          ${printSegments.join("")}
          ${printBoundaries.join("")}
          ${printLabels.join("")}
        </svg>
        ${renderChartUnansweredNote(entries, denominator)}
      </figure>
    `;
  }

  function getChartUnansweredCount(entries, denominator) {
    return Math.max(0, denominator - entries.reduce((sum, entry) => sum + entry.count, 0));
  }

  function renderChartUnansweredNote(entries, denominator) {
    const count = getChartUnansweredCount(entries, denominator);
    if (!count) return "";
    const rate = denominator > 0 ? (count / denominator) * 100 : null;
    return `<figcaption class="chart-unanswered"><span aria-hidden="true"></span>未回答 ${count}件（${formatRate(rate)}）</figcaption>`;
  }

  function getChartAriaLabel(chartLabel, entries, denominator) {
    const unanswered = getChartUnansweredCount(entries, denominator);
    const values = entries.map((entry) => `${entry.number}. ${entry.label} ${entry.count}件 ${formatRate(entry.rate)}`);
    if (unanswered) values.push(`未回答 ${unanswered}件 ${formatRate((unanswered / denominator) * 100)}`);
    return `${chartLabel}。${values.join("、")}`;
  }

  function renderMatrixAggregate(question, responses, index, itemOrder) {
    return `
      <section class="question-block">
        ${renderReportQuestionHeading(question, index)}
        ${question.rows.map((row) => {
          const rows = getMatrixAggregateRows(question, row, responses, itemOrder);
          return `<div class="matrix-row-report"><h4>${escapeHtml(row.label)}</h4>${renderAggregateTable(rows, responses.length, getReportChartType(question), `${question.title} ${row.label}`)}</div>`;
        }).join("")}
      </section>
    `;
  }

  function renderNumberMatrixAggregate(question, responses, index, itemOrder) {
    const rows = getNumberMatrixAggregateRows(question, responses, itemOrder);
    return `
      <section class="question-block">
        <h3>${index + 1}. ${escapeHtml(question.title)}</h3>
        <div class="table-wrap">
          <table class="report-table">
            <thead><tr><th>項目</th>${question.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}<th>合計</th></tr></thead>
            <tbody>
              ${rows.map((row) => `<tr><th>${escapeHtml(row.label)}</th>${row.values.map((value) => `<td class="numeric">${value}</td>`).join("")}<td class="numeric">${row.total}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderTextAggregate(question, responses, index) {
    const answers = responses.map((response) => String(response.answers[question.id] || "").trim()).filter(Boolean);
    return `
      <section class="question-block">
        <h3>${index + 1}. ${escapeHtml(question.title)}</h3>
        <p>記入あり: ${answers.length}件</p>
        ${answers.length ? `<ul class="free-text-report">${answers.map((answer) => `<li>${escapeHtml(answer)}</li>`).join("")}</ul>` : `<p class="question-note">記入された回答はありません。</p>`}
      </section>
    `;
  }

  function renderContactsPage() {
    const responseIds = new Set(getCurrentResponses().map((response) => response.id));
    const contacts = state.contacts.filter((contact) => responseIds.has(contact.responseId) && hasContactValue(contact));
    return `
      <section class="toolbar no-print">
        <button class="button button-back" type="button" data-action="list">← 回答一覧へ戻る</button>
        <span class="toolbar-break" aria-hidden="true"></span>
        <button class="button button-primary" type="button" data-action="export-contact-csv">連絡先CSV</button>
      </section>
      <section class="panel sensitive-panel"${tourAttr("contacts")}>
        <div class="section-heading"><h2>連絡先管理</h2><p class="count-label">${contacts.length}件</p></div>
        <p class="notice-inline">この画面は運営内部用です。配布用レポートには連絡先を載せないでください。</p>
        ${contacts.length ? renderContactTable(contacts) : `<div class="empty-state">連絡先の登録はありません。</div>`}
      </section>
    `;
  }

  function renderContactTable(contacts) {
    const responses = getCurrentResponses();
    return `
      <div class="table-wrap">
        <table class="report-table">
          <thead><tr><th>回答番号</th><th>名前</th><th>住所</th><th>電話番号</th></tr></thead>
          <tbody>
            ${contacts.map((contact) => {
              const index = responses.findIndex((response) => response.id === contact.responseId);
              return `<tr><td>${index >= 0 ? index + 1 : "-"}</td><td>${escapeHtml(contact.name || "")}</td><td>${escapeHtml(contact.address || "")}</td><td>${escapeHtml(contact.phone || "")}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderPrivacyNotice() {
    return `
      <aside class="notice no-print">
        入力したデータはこのブラウザ内に保存され、外部サーバーには送信されません。
        別の端末やブラウザで使う場合は、アンケート一覧の保存ファイルを作成して読み込んでください。
      </aside>
    `;
  }

  function renderMissing(message) {
    return `<section class="panel"><p>${escapeHtml(message)}</p><button class="button button-back" type="button" data-action="home">← アンケート一覧へ戻る</button></section>`;
  }

  async function openSurveyEditor(id) {
    const survey = id ? state.surveys.find((item) => item.id === id) : null;
    state.surveyDraft = survey ? clone(survey) : createDefaultSurvey();
    state.view = "survey-edit";
    state.flash = "";
    state.messages = [];
    render();
  }

  async function saveSurveyDraft() {
    if (!state.surveyDraft) return;
    const survey = isPresetSurvey(state.surveyDraft)
      ? normalizeSurvey(mergeLockedPresetQuestions(state.surveyDraft))
      : normalizeSurvey(state.surveyDraft);
    const messages = validateSurvey(survey);
    state.messages = messages;
    if (messages.length) {
      state.flash = "アンケート設定を確認してください。";
      render();
      return;
    }
    survey.updatedAt = nowIsoString();
    await putRecord(SURVEY_STORE, survey);
    await refreshData();
    state.currentSurveyId = "";
    state.surveyDraft = null;
    state.view = "home";
    state.flash = "アンケート設定を保存しました。";
    render();
  }

  function mergeLockedPresetQuestions(draft) {
    const original = state.surveys.find((survey) => survey.id === draft.id) || createPresetSurvey();
    const includeById = new Map((draft.questions || []).map((question) => [question.id, question.includeInReport !== false]));
    const chartTypeById = new Map((draft.questions || []).map((question) => [question.id, getReportChartType(question)]));
    return {
      ...draft,
      id: original.id,
      presetKey: original.presetKey || "shinkawa_2_chonaikai",
      questions: (original.questions || []).map((question) => ({
        ...clone(question),
        includeInReport: question.type === "contact" ? false : includeById.get(question.id) ?? question.includeInReport !== false,
        reportChartType: chartTypeById.get(question.id) || getReportChartType(question),
      })),
    };
  }

  async function deleteSurvey(id) {
    const survey = state.surveys.find((item) => item.id === id);
    if (!survey) return;
    if (isPresetSurvey(survey)) return;
    const responses = getResponsesForSurvey(id);
    if (!window.confirm(`「${survey.title}」と回答${responses.length}件を削除します。よろしいですか？`)) return;
    for (const response of responses) {
      await deleteRecord(RESPONSE_STORE, response.id);
      await deleteRecord(CONTACT_STORE, response.id);
    }
    await deleteRecord(SURVEY_STORE, id);
    await refreshData();
    showHome();
  }

  function selectSurvey(id) {
    if (!state.surveys.some((survey) => survey.id === id)) return;
    state.currentSurveyId = id;
    resetReportSelection();
    state.view = "list";
    state.flash = "";
    render();
  }

  function showHome() {
    state.view = "home";
    state.currentSurveyId = "";
    state.surveyDraft = null;
    state.currentResponse = null;
    state.currentContact = null;
    resetActiveAnswerPosition(null);
    resetReportSelection();
    state.messages = [];
    render();
  }

  function showWorkspace(view) {
    if (!state.currentSurveyId) return showHome();
    state.view = view;
    state.currentResponse = null;
    state.currentContact = null;
    resetActiveAnswerPosition();
    state.messages = [];
    state.flash = "";
    render();
  }

  function openTourPicker() {
    state.tourPickerOpen = true;
    state.tourActive = false;
    state.tourRouteId = "";
    state.tourStepIndex = 0;
    render();
  }

  function startTour(routeId) {
    const route = TOUR_ROUTES.find((item) => item.id === routeId) || TOUR_ROUTES[0];
    state.tourPickerOpen = false;
    state.tourActive = true;
    state.tourRouteId = route.id;
    state.tourStepIndex = 0;
    applyTourStep();
    render();
  }

  function moveTour(direction) {
    if (!state.tourActive) return;
    const steps = getCurrentTourSteps();
    const nextIndex = state.tourStepIndex + direction;
    if (nextIndex < 0) return;
    if (nextIndex >= steps.length) return closeTour();
    state.tourStepIndex = nextIndex;
    applyTourStep();
    render();
  }

  function closeTour() {
    state.tourPickerOpen = false;
    state.tourActive = false;
    state.tourRouteId = "";
    render();
  }

  function applyTourStep() {
    const step = getCurrentTourSteps()[state.tourStepIndex] || getCurrentTourSteps()[0];
    if (step.view === "home") {
      state.view = "home";
      state.currentSurveyId = "";
      state.surveyDraft = null;
      state.currentResponse = null;
      state.currentContact = null;
      resetActiveAnswerPosition(null);
    } else if (step.view === "survey-edit") {
      state.view = "survey-edit";
      state.currentSurveyId = "";
      if (!state.surveyDraft) state.surveyDraft = createDefaultSurvey();
      state.currentResponse = null;
      state.currentContact = null;
      resetActiveAnswerPosition(null);
    } else if (step.view === "response-edit") {
      const surveyId = getTourSurveyId();
      state.currentSurveyId = surveyId;
      state.view = "response-edit";
      state.surveyDraft = null;
      state.currentResponse = createResponse(surveyId);
      state.currentContact = createContact(state.currentResponse.id);
      resetActiveAnswerPosition(getCurrentSurvey());
    } else {
      state.currentSurveyId = getTourSurveyId();
      state.view = step.view;
      state.surveyDraft = null;
      state.currentResponse = null;
      state.currentContact = null;
      resetActiveAnswerPosition(getCurrentSurvey());
    }
    state.messages = [];
    state.flash = "";
  }

  function getCurrentTourRoute() {
    return TOUR_ROUTES.find((route) => route.id === state.tourRouteId) || TOUR_ROUTES[0];
  }

  function getCurrentTourSteps() {
    return getCurrentTourRoute().steps;
  }

  function getTourSurveyId() {
    if (state.tourRouteId === "contacts") {
      const current = state.surveys.find((survey) => survey.id === state.currentSurveyId);
      if (surveyHasContactQuestion(current)) return current.id;
      const contactSurvey = state.surveys.find(surveyHasContactQuestion);
      if (contactSurvey) return contactSurvey.id;
    }
    if (state.currentSurveyId && state.surveys.some((survey) => survey.id === state.currentSurveyId)) return state.currentSurveyId;
    return state.surveys.find(isPresetSurvey)?.id || state.surveys[0]?.id || "";
  }

  function openResponseEditor(id) {
    const survey = getCurrentSurvey();
    if (!survey) return showHome();
    const response = id ? getCurrentResponses().find((item) => item.id === id) : null;
    state.currentResponse = response ? clone(response) : createResponse(survey.id);
    state.currentContact = clone(state.contacts.find((contact) => contact.responseId === state.currentResponse.id) || createContact(state.currentResponse.id));
    state.view = "response-edit";
    resetActiveAnswerPosition(survey);
    state.messages = [];
    state.flash = "";
    render();
  }

  async function saveCurrentResponse() {
    const survey = getCurrentSurvey();
    if (!survey || !state.currentResponse) return;
    const response = normalizeResponse(state.currentResponse, survey.id);
    response.updatedAt = nowIsoString();
    await putRecord(RESPONSE_STORE, response);
    if (state.currentContact && hasContactValue(state.currentContact)) {
      state.currentContact.responseId = response.id;
      await putRecord(CONTACT_STORE, normalizeContact(state.currentContact));
    } else {
      await deleteRecord(CONTACT_STORE, response.id);
    }
    await refreshData();
    state.view = "list";
    state.currentResponse = null;
    state.currentContact = null;
    resetActiveAnswerPosition(survey);
    state.flash = "保存しました。";
    render();
  }

  async function deleteResponse(id) {
    if (!window.confirm("この回答を削除します。よろしいですか？")) return;
    await deleteRecord(RESPONSE_STORE, id);
    await deleteRecord(CONTACT_STORE, id);
    await refreshData();
    render();
  }

  function addQuestion(type) {
    if (!state.surveyDraft) return;
    if (isSurveyDraftQuestionsLocked()) return;
    state.surveyDraft.questions.push(createQuestion(type));
    render();
  }

  function removeQuestion(index) {
    if (!state.surveyDraft?.questions[index]) return;
    if (isSurveyDraftQuestionsLocked()) return;
    if (!window.confirm("この設問を削除します。既存回答の該当データは集計されなくなります。よろしいですか？")) return;
    state.surveyDraft.questions.splice(index, 1);
    render();
  }

  function moveQuestion(index, direction) {
    if (!state.surveyDraft) return;
    if (isSurveyDraftQuestionsLocked()) return;
    moveItem(state.surveyDraft.questions, index, direction);
    render();
  }

  function addOption(questionIndex) {
    if (isSurveyDraftQuestionsLocked()) return;
    const question = getDraftQuestion(questionIndex);
    if (!question) return;
    question.options.push(createItem(""));
    render();
  }

  function removeOption(questionIndex, optionIndex) {
    if (isSurveyDraftQuestionsLocked()) return;
    const question = getDraftQuestion(questionIndex);
    if (!question) return;
    question.options.splice(optionIndex, 1);
    render();
  }

  function addRow(questionIndex) {
    if (isSurveyDraftQuestionsLocked()) return;
    const question = getDraftQuestion(questionIndex);
    if (!question) return;
    question.rows.push(createItem(""));
    render();
  }

  function removeRow(questionIndex, rowIndex) {
    if (isSurveyDraftQuestionsLocked()) return;
    const question = getDraftQuestion(questionIndex);
    if (!question) return;
    question.rows.splice(rowIndex, 1);
    render();
  }

  function addColumn(questionIndex) {
    if (isSurveyDraftQuestionsLocked()) return;
    const question = getDraftQuestion(questionIndex);
    if (!question) return;
    question.columns.push(createItem(""));
    render();
  }

  function removeColumn(questionIndex, columnIndex) {
    if (isSurveyDraftQuestionsLocked()) return;
    const question = getDraftQuestion(questionIndex);
    if (!question) return;
    question.columns.splice(columnIndex, 1);
    render();
  }

  function updateAnswer(target) {
    const question = getCurrentSurvey()?.questions.find((item) => item.id === target.dataset.questionId);
    if (!question || !state.currentResponse) return;
    const answers = state.currentResponse.answers;
    const otherOption = getOtherOption(question);
    const wasOtherSelected = isOtherSelected(question, answers[question.id]);
    if (question.type === "single") {
      answers[question.id] = target.value;
      if (otherOption && target.value !== otherOption.id) delete answers[otherTextAnswerKey(question.id)];
    } else if (question.type === "multiple") {
      const current = new Set(Array.isArray(answers[question.id]) ? answers[question.id] : []);
      if (target.checked) current.add(target.value);
      else current.delete(target.value);
      answers[question.id] = Array.from(current);
      if (otherOption && !current.has(otherOption.id)) delete answers[otherTextAnswerKey(question.id)];
    } else if (question.type === "matrix_single") {
      answers[question.id] ||= {};
      answers[question.id][target.dataset.rowId] = target.value;
    } else if (question.type === "number_matrix") {
      answers[question.id] ||= {};
      answers[question.id][target.dataset.rowId] ||= {};
      answers[question.id][target.dataset.rowId][target.dataset.columnId] = readOptionalInteger(target.value);
    } else {
      answers[question.id] = target.value;
    }
    if (otherOption && wasOtherSelected !== isOtherSelected(question, answers[question.id])) render();
  }

  function updateOtherAnswer(target) {
    const question = getCurrentSurvey()?.questions.find((item) => item.id === target.dataset.questionId);
    if (!question || !state.currentResponse || !hasOtherOption(question)) return;
    state.currentResponse.answers[otherTextAnswerKey(question.id)] = target.value;
  }

  function createPresetSurvey() {
    return {
      ...createDefaultSurvey(),
      id: PRESET_SURVEY_ID,
      presetKey: "shinkawa_2_chonaikai",
      title: PRESET_SURVEY_TITLE,
      presetDefaultsApplied: { [PRESET_DEFAULTS_VERSION]: true, [PRESET_CONTENT_VERSION]: true },
      questions: createDefaultQuestions(),
    };
  }

  function createDefaultSurvey() {
    const now = nowIsoString();
    return {
      id: createId("survey"),
      presetKey: "",
      title: "",
      issuer: "",
      periodText: "",
      periodStart: "",
      periodEnd: "",
      distributedCount: undefined,
      note: "",
      reportItemOrder: "count_desc",
      questions: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  function createDefaultQuestions() {
    const ageOptions = [["age_0_9", "0〜9歳"], ["age_10s", "10代"], ["age_20s", "20代"], ["age_30s", "30代"], ["age_40s", "40代"], ["age_50s", "50代"], ["age_60s", "60代"], ["age_70s", "70代"], ["age_80s", "80代"], ["age_90s", "90代"]];
    const familyQuestion = createQuestion("number_matrix", PRESET_FAMILY_QUESTION_TITLE, ageOptions, [["male", "男（名）"], ["female", "女（名）"]]);
    familyQuestion.includeInReport = false;
    return [
      familyQuestion,
      createQuestion("single", "回答者様の世代", ageOptions),
      createQuestion("single", "居住年数は何年ですか？（当てはまるところに1つ○をつけてください）", [["under_1", "1年未満"], ["1_5", "1〜5年"], ["5_10", "5〜10年"], ["10_15", "10〜15年"], ["15_20", "15〜20年"], ["20_plus", "20年以上"]]),
      createQuestion("single", "ここ5年以内に、町内会の活動や行事に参加したことはありますか？（いずれか1つに○をつけてください）", [["yes", "ある（問4へ）"], ["no", "ない（問3-Bへ）"]]),
      createQuestion("multiple", "問3-Aで「②ない」に○をつけた方のみお聞きします。参加できない（または、参加したくない）理由を教えてください。（当てはまるものすべてに○をつけてください）", [["no_info", "いつどのようなことが行われているか知らない（情報が届かない）"], ["no_time", "地域活動に取り組む時間がない（曜日、時間が合わない）"], ["personal_priority", "自分の時間、用事を優先したい"], ["no_invitation", "参加のきっかけがない（近所からのお誘いがない）"], ["hard_to_join_alone", "一人では参加しづらい"], ["not_suitable", "内容が世代や家庭環境と合わない"], ["physical_burden", "身体的負担感が大きい"], ["no_benefit", "参加のメリットを感じない"], ["social_burden", "地域の人との付き合いがわずらわしい"], ["not_interested", "町内会には関心がない"], ["other", "その他"]]),
      createQuestion("matrix_single", "第2町内会で行われている（過去におこなっていた）次の活動・行事について、それぞれお答えください。当てはまる欄に○をつけてください。", [["general_meeting", "総会"], ["year_end_new_year_party", "忘年会・新年会"], ["cleaning", "町内・公園清掃"], ["extinguisher_training", "消火器訓練"], ["park_meal", "公園での食事会"], ["snow_light_event", "冬のイベント ゆきあかり"], ["radio_exercise", "ラジオ体操"]], [["participated", "参加したことがある"], ["not_participated", "参加したことがない"], ["continue", "今後も継続してほしい"], ["discontinue", "今後継続の必要はない"], ["unknown", "わからない"]]),
      createQuestion("multiple", "新川第2町内会でどのような企画・テーマであれば参加したいですか？（当てはまるものすべてに○をつけて下さい）", [["cooking", "料理教室・お菓子作り教室・コーヒー教室"], ["tea", "お茶会"], ["community_dining", "飲食店とタイアップした地域食堂"], ["walking", "まち歩きスタンプラリー"], ["child_event", "子育てサロン、子ども向けイベント"], ["disaster_health", "防災の勉強会、健康づくり教室"], ["smartphone", "スマートフォン・SNSの使い方講座"], ["other", "その他"]]),
      createQuestion("single", "新川第2町内会では町内会活動をお伝えするために回覧板で情報発信を行っています。回覧板はどのくらいご覧になっていますか？（当てはまるもの1つに○をつけて下さい）", [["always", "毎回しっかり見ている"], ["mostly", "しっかりではないが内容はだいたい見ている"], ["rarely", "ほとんど見ていない・読んでいない"], ["never", "まったく見ていない"], ["never_and_burdensome", "まったく見ないし、回覧板を回すのもめんどう"], ["unknown", "わからない"]]),
      createQuestion("multiple", "新川第2町内会の活動状況などを皆様に広くお伝えする方法について便利だと思うものを教えてください。", [["bulletin_board", "回覧板"], ["mail", "メール"], ["homepage", "ホームページ"], ["line_sns", "LINE・SNSなど"], ["garbage_station", "ゴミステーションに掲示板"], ["not_needed", "町内会は必要ない"], ["unknown", "わからない"], ["other", "その他"]]),
      createQuestion("multiple", "新川第2町内会では、役員の担い手不足と高齢化により、このままでは今後の町内会運営に支障をきたすことが懸念されます。（主にゴミステーションの管理、あおぞら公園の管理、パートナーシップ排雪等）活動の参加、サポートの可能性について伺います。（当てはまるものに○をつけて下さい）", [["difficult", "体調や時間的制限などにより町内会活動（行事）参加することは難しい"], ["seasonal", "時期・季節によっては、町内会活動を行うことができる"], ["watch_support", "見守り活動のサポートぐらいは協力できる"], ["participation_only", "町内会活動（行事）には参加するが、運営のサポートはできない"], ["planning_support", "事前にわかっていれば行事の企画や準備ならサポートできる"], ["day_support", "事前にわかっていれば行事などの当日のサポート・手伝いならできる"], ["pr_support", "町内会の回覧やお知らせ、広報などを作る程度ならできる"], ["sns_support", "SNSでの町内会情報の発信ぐらいならできる"], ["officer", "役員をやってもよい（会長、副会長、会計、総務、子ども会など）"], ["not_needed", "町内会は必要ない"], ["other", "その他"]]),
      createQuestion("contact", "問8で町内会の活動の参加、サポートが可能とお答え頂いた方にお願いします。差し支えなければお名前と連絡先をご記入下さい。"),
      createQuestion("multiple", "町内会の運営に関して、今後どのようなあり方を望みますか。（当てはまるものに○をつけて下さい）", [["reduce_work", "役員の仕事の縮小や分担がされ、負担が軽減されていく"], ["prioritize_life", "仕事や家庭を優先することができる"], ["fair_rotation", "役員の回り番制による任期が必ず守られる"], ["same_generation", "同世代の人が役員の中にいる"], ["accept_ideas", "意見や提案が受け入れられる"], ["not_needed", "町内会を必要と思わない"], ["lower_fee", "町内会費を安くしてほしい"], ["other", "その他"]]),
      createQuestion("text", "町内会活動・行事や運営などについてご意見があれば、ご自由にご記入ください。"),
    ];
  }

  function createQuestion(type, title = "", first = null, second = null) {
    const question = {
      id: createId("question"),
      type,
      title: title || "",
      includeInReport: type !== "contact",
      reportChartType: "bar",
      options: [],
      rows: [],
      columns: [],
    };
    if (type === "single" || type === "multiple") question.options = first ? first.map(([id, label]) => ({ id, label })) : [createItem("")];
    if (type === "matrix_single" || type === "number_matrix") {
      question.rows = first ? first.map(([id, label]) => ({ id, label })) : [createItem("")];
      question.columns = second ? second.map(([id, label]) => ({ id, label })) : [createItem("")];
    }
    return question;
  }

  function normalizeQuestionShape(question) {
    if (question.type === "single" || question.type === "multiple") {
      if (!question.options?.length) question.options = [createItem("")];
      question.rows = [];
      question.columns = [];
    } else if (question.type === "matrix_single" || question.type === "number_matrix") {
      if (!question.rows?.length) question.rows = [createItem("")];
      if (!question.columns?.length) question.columns = [createItem("")];
      question.options = [];
    } else if (question.type === "contact") {
      question.options = [];
      question.rows = [];
      question.columns = [];
      question.includeInReport = false;
    } else {
      question.options = [];
      question.rows = [];
      question.columns = [];
    }
  }

  function createItem(label) {
    return { id: createId("item"), label };
  }

  function createResponse(surveyId) {
    const now = nowIsoString();
    return { id: createId("response"), surveyId, answers: {}, createdAt: now, updatedAt: now };
  }

  function createContact(responseId) {
    const now = nowIsoString();
    return { responseId, name: "", address: "", phone: "", createdAt: now, updatedAt: now };
  }

  async function ensurePresetSurvey() {
    const presetSurvey = state.surveys.find(isPresetSurvey);
    if (presetSurvey) {
      const updated = applyPresetDefaultsOnce(presetSurvey);
      if (updated) {
        await putRecord(SURVEY_STORE, updated);
        await refreshData();
      }
      return;
    }
    await putRecord(SURVEY_STORE, createPresetSurvey());
    await refreshData();
  }

  function applyPresetDefaultsOnce(survey) {
    const defaultsApplied = survey?.presetDefaultsApplied || {};
    const needsFamilyDefault = !defaultsApplied[PRESET_DEFAULTS_VERSION];
    const needsContentUpdate = !defaultsApplied[PRESET_CONTENT_VERSION];
    if (!needsFamilyDefault && !needsContentUpdate) return null;
    const updated = clone(survey);
    if (needsContentUpdate) updated.questions = mergePresetQuestionContent(updated.questions, createDefaultQuestions());
    if (needsFamilyDefault) {
      const familyQuestion = updated.questions.find((question) => question.type === "number_matrix");
      if (familyQuestion) familyQuestion.includeInReport = false;
    }
    updated.presetDefaultsApplied = {
      ...(updated.presetDefaultsApplied || {}),
      [PRESET_DEFAULTS_VERSION]: true,
      [PRESET_CONTENT_VERSION]: true,
    };
    updated.updatedAt = nowIsoString();
    return updated;
  }

  function mergePresetQuestionContent(currentQuestions, templateQuestions) {
    return templateQuestions.map((template, index) => {
      const current = currentQuestions?.[index];
      if (!current || current.type !== template.type) return template;
      return {
        ...current,
        type: template.type,
        title: template.title,
        options: mergePresetItems(current.options, template.options),
        rows: mergePresetItems(current.rows, template.rows),
        columns: mergePresetItems(current.columns, template.columns),
      };
    });
  }

  function mergePresetItems(currentItems, templateItems) {
    const currentById = new Map((currentItems || []).map((item) => [item.id, item]));
    return (templateItems || []).map((template) => ({
      ...(currentById.get(template.id) || {}),
      id: template.id,
      label: template.label,
    }));
  }

  function isPresetSurvey(survey) {
    return survey?.id === PRESET_SURVEY_ID || survey?.presetKey === "shinkawa_2_chonaikai" || survey?.title === PRESET_SURVEY_TITLE;
  }

  async function refreshData() {
    state.surveys = (await getAll(SURVEY_STORE)).map(normalizeSurvey).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    state.responses = (await getAll(RESPONSE_STORE)).map((item) => normalizeResponse(item, item.surveyId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    state.contacts = (await getAll(CONTACT_STORE)).map(normalizeContact);
  }

  async function openDb() {
    if (dbCache) return dbCache;
    dbCache = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SURVEY_STORE)) db.createObjectStore(SURVEY_STORE, { keyPath: "id" });
        if (!db.objectStoreNames.contains(RESPONSE_STORE)) db.createObjectStore(RESPONSE_STORE, { keyPath: "id" });
        if (!db.objectStoreNames.contains(CONTACT_STORE)) db.createObjectStore(CONTACT_STORE, { keyPath: "responseId" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbCache;
  }

  async function getAll(storeName) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function putRecord(storeName, record) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const request = transaction.objectStore(storeName).put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteRecord(storeName, key) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const request = transaction.objectStore(storeName).delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  function normalizeSurvey(input) {
    const base = createDefaultSurvey();
    const survey = { ...base, ...(input || {}) };
    survey.id = input?.id || base.id;
    survey.title = String(input?.title || base.title);
    survey.issuer = String(input?.issuer || "");
    survey.periodText = String(input?.periodText || "");
    survey.periodStart = String(input?.periodStart || "");
    survey.periodEnd = String(input?.periodEnd || "");
    survey.distributedCount = readOptionalInteger(input?.distributedCount);
    survey.note = String(input?.note || "");
    survey.reportItemOrder = input?.reportItemOrder === "question" ? "question" : "count_desc";
    survey.questions = Array.isArray(input?.questions) ? input.questions.map(normalizeQuestion) : base.questions;
    survey.createdAt = input?.createdAt || base.createdAt;
    survey.updatedAt = input?.updatedAt || survey.createdAt;
    return survey;
  }

  function normalizeQuestion(input) {
    const question = {
      id: input?.id || createId("question"),
      type: ["single", "multiple", "matrix_single", "number_matrix", "text", "contact"].includes(input?.type) ? input.type : "single",
      title: String(input?.title || "無題の設問"),
      includeInReport: input?.type === "contact" ? false : input?.includeInReport !== false,
      reportChartType: String(input?.reportChartType || "bar"),
      options: Array.isArray(input?.options) ? input.options.map(normalizeItem) : [],
      rows: Array.isArray(input?.rows) ? input.rows.map(normalizeItem) : [],
      columns: Array.isArray(input?.columns) ? input.columns.map(normalizeItem) : [],
    };
    normalizeQuestionShape(question);
    question.reportChartType = getReportChartType(question);
    return question;
  }

  function normalizeItem(input) {
    return { id: input?.id || createId("item"), label: String(input?.label || "") };
  }

  function normalizeResponse(input, surveyId) {
    return {
      id: input?.id || createId("response"),
      surveyId: input?.surveyId || surveyId || "",
      answers: input?.answers && typeof input.answers === "object" ? input.answers : {},
      createdAt: input?.createdAt || nowIsoString(),
      updatedAt: input?.updatedAt || input?.createdAt || nowIsoString(),
    };
  }

  function normalizeContact(input) {
    return {
      responseId: input?.responseId || createId("response"),
      name: String(input?.name || ""),
      address: String(input?.address || ""),
      phone: String(input?.phone || ""),
      createdAt: input?.createdAt || nowIsoString(),
      updatedAt: input?.updatedAt || input?.createdAt || nowIsoString(),
    };
  }

  function validateSurvey(survey) {
    const messages = [];
    if (!survey.title.trim()) messages.push("タイトルを入力してください。");
    if (!survey.questions.length) messages.push("設問を1件以上追加してください。");
    survey.questions.forEach((question, index) => {
      if (!question.title.trim()) messages.push(`${index + 1}問目の設問文を入力してください。`);
      if ((question.type === "single" || question.type === "multiple") && !question.options.length) messages.push(`${index + 1}問目の選択肢を追加してください。`);
      if ((question.type === "matrix_single" || question.type === "number_matrix") && (!question.rows.length || !question.columns.length)) messages.push(`${index + 1}問目の行と列を追加してください。`);
      if ((question.type === "single" || question.type === "multiple") && question.options.some((option) => !option.label.trim())) messages.push(`${index + 1}問目の選択肢名を入力してください。`);
      if ((question.type === "matrix_single" || question.type === "number_matrix") && question.rows.some((row) => !row.label.trim())) messages.push(`${index + 1}問目の行名を入力してください。`);
      if ((question.type === "matrix_single" || question.type === "number_matrix") && question.columns.some((column) => !column.label.trim())) messages.push(`${index + 1}問目の列名を入力してください。`);
    });
    return messages;
  }

  function getCurrentSurvey() {
    return state.surveys.find((survey) => survey.id === state.currentSurveyId) || null;
  }

  function getResponsesForSurvey(surveyId) {
    return state.responses.filter((response) => response.surveyId === surveyId);
  }

  function getCurrentResponses() {
    return getResponsesForSurvey(state.currentSurveyId);
  }

  function getDraftQuestion(index) {
    return state.surveyDraft?.questions?.[index] || null;
  }

  function isSurveyDraftQuestionsLocked() {
    return Boolean(state.surveyDraft && isPresetSurvey(state.surveyDraft));
  }

  function getReportConfig(survey) {
    return {
      overallQuestions: getReportableQuestions(survey),
      crossItems: getReportCrossItems(survey),
      itemOrder: getReportItemOrder(survey),
    };
  }

  function getReportItemOrder(survey) {
    return survey?.reportItemOrder === "question" ? "question" : "count_desc";
  }

  async function updateReportItemOrder(value) {
    const survey = getCurrentSurvey();
    if (!survey) return;
    const nextValue = value === "question" ? "question" : "count_desc";
    if (getReportItemOrder(survey) === nextValue) return;
    survey.reportItemOrder = nextValue;
    survey.updatedAt = nowIsoString();
    await putRecord(SURVEY_STORE, survey);
    render();
  }

  function isReportChartQuestion(question) {
    return question?.type === "single" || question?.type === "multiple" || question?.type === "matrix_single";
  }

  function getReportChartOptions(question) {
    const options = [
      { value: "bar", label: "横棒グラフ" },
    ];
    if (question?.type === "single" || question?.type === "matrix_single") {
      options.push(
        { value: "donut", label: "円グラフ（ドーナツ）" },
        { value: "stacked", label: "帯グラフ" },
      );
    }
    options.push({ value: "none", label: "表のみ" });
    return options;
  }

  function getReportChartType(question) {
    const value = String(question?.reportChartType || "bar");
    return getReportChartOptions(question).some((option) => option.value === value) ? value : "bar";
  }

  async function updateReportChartType(questionId, value) {
    const survey = getCurrentSurvey();
    const question = survey?.questions?.find((item) => item.id === questionId);
    if (!survey || !question || !isReportChartQuestion(question)) return;
    const nextValue = getReportChartOptions(question).some((option) => option.value === value) ? value : "bar";
    if (question.reportChartType === nextValue) return;
    question.reportChartType = nextValue;
    survey.updatedAt = nowIsoString();
    await putRecord(SURVEY_STORE, survey);
    render();
  }

  function getReportableQuestions(survey) {
    return (survey?.questions || []).filter((question) => question.includeInReport && question.type !== "contact");
  }

  function getReportAxisCandidates(survey) {
    return (survey?.questions || []).filter((question) => question.type === "single");
  }

  function getReportAxisQuestionById(survey, questionId) {
    return getReportAxisCandidates(survey).find((question) => question.id === questionId) || null;
  }

  function getReportTargetCandidates(survey, axisQuestionId = "") {
    return getReportableQuestions(survey).filter((question) => question.id !== axisQuestionId && (question.type === "single" || question.type === "multiple" || question.type === "matrix_single"));
  }

  function getReportTargetQuestionById(survey, axisQuestionId, questionId) {
    return getReportTargetCandidates(survey, axisQuestionId).find((question) => question.id === questionId) || null;
  }

  function getCurrentReportTargetCandidates() {
    const survey = getCurrentSurvey();
    if (!survey || !state.reportDraftAxisQuestionId) return [];
    return getReportTargetCandidates(survey, state.reportDraftAxisQuestionId);
  }

  function getReportCrossItems(survey) {
    return state.reportCrossItems.flatMap((item, sourceIndex) => {
      const axisQuestion = getReportAxisQuestionById(survey, item.axisQuestionId);
      if (!axisQuestion) return [];
      const targetQuestion = getReportTargetQuestionById(survey, axisQuestion.id, item.targetQuestionId);
      if (!targetQuestion) return [];
      return [{ ...item, sourceIndex, axisQuestion, targetQuestion }];
    });
  }

  function getSegmentGroups(axisQuestion, responses) {
    const optionIds = new Set(axisQuestion.options.map((option) => option.id));
    const groups = axisQuestion.options.map((option) => ({
      label: option.label,
      responses: responses.filter((response) => response.answers[axisQuestion.id] === option.id),
    }));
    const unanswered = responses.filter((response) => !optionIds.has(response.answers[axisQuestion.id]));
    if (unanswered.length) groups.push({ label: "未回答", responses: unanswered });
    return groups;
  }

  function addReportCrossItem() {
    const survey = getCurrentSurvey();
    if (!survey) return;
    const axisQuestion = getReportAxisQuestionById(survey, state.reportDraftAxisQuestionId);
    if (!axisQuestion) return;
    const targetQuestion = getReportTargetQuestionById(survey, axisQuestion.id, state.reportDraftTargetQuestionId);
    if (!targetQuestion) return;
    const exists = state.reportCrossItems.some((item) => item.axisQuestionId === axisQuestion.id && item.targetQuestionId === targetQuestion.id);
    if (!exists) {
      state.reportCrossItems.push({
        id: createId("cross"),
        axisQuestionId: axisQuestion.id,
        targetQuestionId: targetQuestion.id,
      });
    }
    render();
  }

  function removeReportCrossItem(index) {
    if (index < 0 || index >= state.reportCrossItems.length) return;
    state.reportCrossItems.splice(index, 1);
    render();
  }

  function moveReportCrossItem(index, direction) {
    moveItem(state.reportCrossItems, index, direction);
    render();
  }

  function resetReportSelection() {
    state.reportDraftAxisQuestionId = "";
    state.reportDraftTargetQuestionId = "";
    state.reportCrossItems = [];
  }

  function hasContactValue(contact) {
    return Boolean(String(contact?.name || "").trim() || String(contact?.address || "").trim() || String(contact?.phone || "").trim());
  }

  function getContactForResponse(responseId) {
    return state.contacts.find((contact) => contact.responseId === responseId && hasContactValue(contact)) || null;
  }

  function formatContactListValue(contact) {
    if (!contact) return "なし";
    return String(contact.name || "").trim() || "名前未入力";
  }

  function surveyHasContactQuestion(survey) {
    return Boolean(survey?.questions?.some((question) => question.type === "contact"));
  }

  function exportAnonymousCsv() {
    const survey = getCurrentSurvey();
    const responses = getCurrentResponses();
    if (!survey) return;
    const reportQuestions = survey.questions.filter((question) => question.type !== "contact");
    const rows = [
      ["回答番号", ...reportQuestions.map((question) => question.title)],
      ...responses.map((response, index) => [index + 1, ...reportQuestions.map((question) => formatAnswerForCsv(question, response.answers[question.id], response.answers))]),
    ];
    downloadCsv("anonymous-responses.csv", rows);
  }

  function exportAggregateCsv() {
    const survey = getCurrentSurvey();
    const responses = getCurrentResponses();
    if (!survey) return;
    const rows = [["設問", "項目", "件数または合計", "分母", "割合"]];
    survey.questions.filter((question) => question.includeInReport && question.type !== "contact").forEach((question) => {
      pushAggregateCsvRows(rows, question, responses);
    });
    downloadCsv("aggregate.csv", rows);
  }

  function pushAggregateCsvRows(rows, question, responses) {
    if (question.type === "single" || question.type === "multiple") {
      question.options.forEach((option) => {
        const count = responses.filter((response) => {
          const answer = response.answers[question.id];
          return question.type === "multiple" ? Array.isArray(answer) && answer.includes(option.id) : answer === option.id;
        }).length;
        rows.push([question.title, option.label, count, responses.length, formatRate(responses.length ? (count / responses.length) * 100 : null)]);
      });
      getOtherTextAnswers(question, responses).forEach((answer) => {
        rows.push([question.title, "その他の記入内容", answer, "", ""]);
      });
    } else if (question.type === "matrix_single") {
      question.rows.forEach((row) => {
        question.columns.forEach((column) => {
          const count = responses.filter((response) => response.answers[question.id]?.[row.id] === column.id).length;
          rows.push([question.title, `${row.label}: ${column.label}`, count, responses.length, formatRate(responses.length ? (count / responses.length) * 100 : null)]);
        });
      });
    } else if (question.type === "number_matrix") {
      question.rows.forEach((row) => {
        question.columns.forEach((column) => {
          const total = responses.reduce((sum, response) => sum + safeInteger(response.answers[question.id]?.[row.id]?.[column.id]), 0);
          rows.push([question.title, `${row.label}: ${column.label}`, total, "", ""]);
        });
      });
    } else {
      const count = responses.filter((response) => String(response.answers[question.id] || "").trim()).length;
      rows.push([question.title, "記入あり", count, responses.length, formatRate(responses.length ? (count / responses.length) * 100 : null)]);
    }
  }

  function exportContactCsv() {
    const responses = getCurrentResponses();
    const responseIds = new Set(responses.map((response) => response.id));
    if (!window.confirm("連絡先CSVには氏名・住所・電話番号が含まれます。運営内部で管理してください。出力しますか？")) return;
    const rows = [
      ["回答番号", "名前", "住所", "電話番号"],
      ...state.contacts.filter((contact) => responseIds.has(contact.responseId) && hasContactValue(contact)).map((contact) => {
        const index = responses.findIndex((response) => response.id === contact.responseId);
        return [index >= 0 ? index + 1 : "", contact.name, contact.address, contact.phone];
      }),
    ];
    downloadCsv("contacts-internal.csv", rows);
  }

  function exportResponseCsv() {
    const survey = getCurrentSurvey();
    const responses = getCurrentResponses();
    if (!survey) return;
    if (!window.confirm("回答一覧CSVには自由記述や連絡先など、個人情報が含まれる可能性があります。運営内部で管理してください。出力しますか？")) return;
    const questions = survey.questions.filter((question) => question.type !== "contact");
    const hasContactQuestion = surveyHasContactQuestion(survey);
    const contactHeaders = hasContactQuestion ? ["連絡先名前", "連絡先住所", "連絡先電話番号"] : [];
    const rows = [
      ["回答番号", "入力日時", ...questions.map((question) => question.title), ...contactHeaders],
      ...responses.map((response, index) => {
        const contact = getContactForResponse(response.id);
        const contactValues = hasContactQuestion ? [contact?.name || "", contact?.address || "", contact?.phone || ""] : [];
        return [
          index + 1,
          formatDateTime(response.createdAt),
          ...questions.map((question) => formatAnswerForCsv(question, response.answers[question.id], response.answers)),
          ...contactValues,
        ];
      }),
    ];
    downloadCsv(`${sanitizeFilename(survey.title || "responses")}-responses.csv`, rows);
  }

  function exportBackupJson() {
    try {
      if (!window.confirm("保存ファイルにはアンケート設定・回答・連絡先が含まれる場合があります。運営内部で管理してください。作成しますか？")) return;
      const data = { appName: APP_NAME, schemaVersion: SCHEMA_VERSION, exportedAt: nowIsoString(), surveys: state.surveys, responses: state.responses, contacts: state.contacts };
      const filename = `survey-data-backup-${formatFilenameDate(new Date())}.json`;
      downloadBlob(filename, JSON.stringify(data, null, 2), "application/json");
      state.flash = "保存ファイルを作成しました。ダウンロード先を確認してください。";
    } catch (error) {
      console.error(error);
      state.flash = "保存ファイルの作成に失敗しました。";
    }
    render();
  }

  function exportWordReport() {
    const survey = getCurrentSurvey();
    const responses = getCurrentResponses();
    if (!survey) return;
    try {
      const filename = `${sanitizeFilename(survey.title || "survey-report")}-${formatFilenameDate(new Date())}.docx`;
      const content = buildWordReportDocx(survey, responses, getReportConfig(survey));
      downloadBlob(filename, content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      state.flash = "Wordファイルを作成しました。ダウンロード先を確認してください。";
    } catch (error) {
      console.error(error);
      state.flash = "Wordファイルの作成に失敗しました。";
    }
    render();
  }

  function exportWordSurveyForm() {
    const survey = getCurrentSurvey();
    if (!survey) return;
    try {
      const filename = `${sanitizeFilename(survey.title || "survey-form")}-questionnaire-${formatFilenameDate(new Date())}.docx`;
      const content = buildWordSurveyFormDocx(survey);
      downloadBlob(filename, content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      state.flash = "アンケート用紙のWordファイルを作成しました。ダウンロード先を確認してください。";
    } catch (error) {
      console.error(error);
      state.flash = "アンケート用紙のWordファイル作成に失敗しました。";
    }
    render();
  }

  function buildWordSurveyFormDocx(survey) {
    return createZip([
      { name: "[Content_Types].xml", data: wordContentTypesXml() },
      { name: "_rels/.rels", data: wordPackageRelsXml() },
      { name: "word/_rels/document.xml.rels", data: wordDocumentRelsXml() },
      { name: "word/styles.xml", data: wordStylesXml() },
      { name: "word/document.xml", data: wordSurveyFormDocumentXml(survey) },
    ]);
  }

  function buildWordReportDocx(survey, responses, config = getReportConfig(survey)) {
    const chartAssets = buildWordChartAssets(config, responses);
    return createZip([
      { name: "[Content_Types].xml", data: wordContentTypesXml(chartAssets.files.length > 0) },
      { name: "_rels/.rels", data: wordPackageRelsXml() },
      { name: "word/_rels/document.xml.rels", data: wordDocumentRelsXml(chartAssets.items) },
      { name: "word/styles.xml", data: wordStylesXml() },
      { name: "word/document.xml", data: wordDocumentXml(survey, responses, config, chartAssets) },
      ...chartAssets.files,
    ]);
  }

  function buildWordChartAssets(config, responses) {
    const lookup = new Map();
    const items = [];
    const files = [];

    const addAsset = (key, chartType, rows) => {
      const entries = getChartEntries(rows, responses.length);
      const bytes = renderWordChartPng(chartType, entries, responses.length);
      const number = items.length + 1;
      const fileName = `report-chart-${number}.png`;
      const asset = {
        key,
        fileName,
        relId: `rId${number + 1}`,
        drawingId: number,
        width: chartType === "donut" ? 1975000 : 6120000,
        height: chartType === "donut" ? 1975000 : 685800,
      };
      lookup.set(key, asset);
      items.push(asset);
      files.push({ name: `word/media/${fileName}`, data: bytes });
    };

    config.overallQuestions.forEach((question) => {
      const chartType = getReportChartType(question);
      if (chartType !== "donut" && chartType !== "stacked") return;
      if (question.type === "single") {
        addAsset(wordChartAssetKey(question), chartType, getChoiceAggregateRows(question, responses, config.itemOrder));
      } else if (question.type === "matrix_single") {
        question.rows.forEach((row) => {
          addAsset(wordChartAssetKey(question, row.id), chartType, getMatrixAggregateRows(question, row, responses, config.itemOrder));
        });
      }
    });

    return { lookup, items, files };
  }

  function wordChartAssetKey(question, rowId = "") {
    return rowId ? `${question.id}:${rowId}` : question.id;
  }

  function renderWordChartPng(chartType, entries, denominator) {
    const canvas = document.createElement("canvas");
    if (chartType === "donut") {
      canvas.width = 480;
      canvas.height = 480;
      drawWordDonutChart(canvas, entries, denominator);
    } else {
      canvas.width = 1200;
      canvas.height = 150;
      drawWordStackedChart(canvas, entries, denominator);
    }
    return dataUrlToBytes(canvas.toDataURL("image/png"));
  }

  function drawWordDonutChart(canvas, entries, denominator) {
    const context = canvas.getContext("2d");
    const center = canvas.width / 2;
    const radius = 150;
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 74;
    context.strokeStyle = "#E3E7E4";
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.stroke();

    let angle = -Math.PI / 2;
    const boundaries = [];
    const labels = [];
    entries.forEach((entry) => {
      const rate = denominator > 0 ? Math.max(0, Math.min(100, entry.rate || 0)) : 0;
      if (!rate) return;
      boundaries.push(angle);
      const nextAngle = angle + (Math.PI * 2 * rate) / 100;
      context.strokeStyle = entry.color;
      context.beginPath();
      context.arc(center, center, radius, angle, nextAngle);
      context.stroke();
      if (rate >= 4) labels.push({ entry, angle: angle + (nextAngle - angle) / 2 });
      angle = nextAngle;
    });
    if (boundaries.length && angle < Math.PI * 1.5 - 0.001) boundaries.push(angle);

    context.strokeStyle = "#FFFFFF";
    context.lineWidth = 8;
    boundaries.forEach((boundary) => {
      context.beginPath();
      context.moveTo(center + Math.cos(boundary) * 111, center + Math.sin(boundary) * 111);
      context.lineTo(center + Math.cos(boundary) * 189, center + Math.sin(boundary) * 189);
      context.stroke();
    });

    context.font = "700 34px 'Yu Gothic', 'Meiryo', sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    labels.forEach(({ entry, angle: labelAngle }) => {
      const labelX = center + Math.cos(labelAngle) * radius;
      const labelY = center + Math.sin(labelAngle) * radius;
      context.lineWidth = 4;
      context.strokeStyle = entry.textColor === "#FFFFFF" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.75)";
      context.strokeText(String(entry.number), labelX, labelY);
      context.fillStyle = entry.textColor;
      context.fillText(String(entry.number), labelX, labelY);
    });

    const answered = Math.min(denominator, entries.reduce((sum, entry) => sum + entry.count, 0));
    context.fillStyle = "#222222";
    context.font = "700 72px 'Yu Gothic', 'Meiryo', sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(answered), center, center - 18);
    context.font = "32px 'Yu Gothic', 'Meiryo', sans-serif";
    context.fillText(`/${denominator}件`, center, center + 54);
  }

  function drawWordStackedChart(canvas, entries, denominator) {
    const context = canvas.getContext("2d");
    const x = 2;
    const y = 32;
    const width = canvas.width - 4;
    const height = 86;
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#E3E7E4";
    context.fillRect(x, y, width, height);
    let offset = 0;
    const boundaries = [];
    const labels = [];
    entries.forEach((entry) => {
      const rate = denominator > 0 ? Math.max(0, Math.min(100 - offset, entry.rate || 0)) : 0;
      if (!rate) return;
      const startX = x + (width * offset) / 100;
      const segmentWidth = (width * rate) / 100;
      boundaries.push(startX);
      context.fillStyle = entry.color;
      context.fillRect(startX, y, segmentWidth, height);
      if (rate >= 4) labels.push({ entry, x: startX + segmentWidth / 2 });
      offset += rate;
    });
    if (boundaries.length && offset < 99.999) boundaries.push(x + (width * offset) / 100);
    context.strokeStyle = "#FFFFFF";
    context.lineWidth = 6;
    boundaries.forEach((boundaryX) => {
      context.beginPath();
      context.moveTo(boundaryX, y);
      context.lineTo(boundaryX, y + height);
      context.stroke();
    });
    context.font = "700 36px 'Yu Gothic', 'Meiryo', sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    labels.forEach(({ entry, x: labelX }) => {
      context.lineWidth = 4;
      context.strokeStyle = entry.textColor === "#FFFFFF" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.75)";
      context.strokeText(String(entry.number), labelX, y + height / 2);
      context.fillStyle = entry.textColor;
      context.fillText(String(entry.number), labelX, y + height / 2);
    });
    context.strokeStyle = "#333333";
    context.lineWidth = 4;
    context.strokeRect(x, y, width, height);
  }

  function dataUrlToBytes(dataUrl) {
    const encoded = String(dataUrl).split(",")[1] || "";
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function wordDocumentXml(survey, responses, config, chartAssets) {
    const reportTitle = `${survey.title || "集計レポート"} - レポート`;
    const body = [
      wordParagraph(reportTitle, { style: "Title" }),
      wordTable([
        ["実施者", survey.issuer || "-"],
        ["実施期間", wordPeriodText(survey)],
        ["配布数", survey.distributedCount ?? "-"],
        ["回答数", `${responses.length}件`],
        ["作成日", formatDate(new Date())],
      ], { header: false, widths: [1800, 7200] }),
      wordSpacer(),
      ...wordReportBlocks(config, responses, chartAssets),
    ].join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  }

  function wordSurveyFormDocumentXml(survey) {
    const metaRows = [];
    if (survey.issuer) metaRows.push(["実施者", survey.issuer]);
    if (survey.periodStart || survey.periodEnd || survey.periodText) metaRows.push(["実施期間", wordPeriodText(survey)]);
    const body = [
      wordParagraph(survey.title || "アンケート", { style: "Title" }),
      metaRows.length ? wordTable(metaRows, { header: false, widths: [1800, 7200] }) : "",
      survey.note ? wordParagraph(survey.note) : "",
      wordSpacer(),
      ...survey.questions.map((question, index) => wordSurveyFormQuestionBlock(question, index)),
    ].join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  }

  function wordSurveyFormQuestionBlock(question, index) {
    const heading = wordParagraph(`${index + 1}. ${question.title}`, { style: "Heading1" });
    if (question.type === "single" || question.type === "multiple") {
      const options = question.options.map((option) => wordParagraph(`□ ${formatSurveyChoiceLabel(option)}`, { compact: true })).join("");
      return heading + options + wordSpacer();
    }
    if (question.type === "matrix_single" || question.type === "number_matrix") {
      const rows = [["項目", ...question.columns.map((column) => column.label)]];
      question.rows.forEach((row) => {
        rows.push([row.label, ...question.columns.map(() => (question.type === "matrix_single" ? "□" : ""))]);
      });
      return heading + wordTable(rows, { widths: wordColumnWidths(rows[0].length, 2600) }) + wordSpacer();
    }
    if (question.type === "contact") {
      return heading + wordTable([
        ["名前", ""],
        ["住所", ""],
        ["電話番号", ""],
      ], { header: false, widths: [1800, 7200] }) + wordSpacer();
    }
    return heading + Array.from({ length: 5 }, () => wordParagraph("____________________________________________________________", { compact: true })).join("") + wordSpacer();
  }

  function wordReportBlocks(config, responses, chartAssets) {
    const blocks = [
      wordParagraph("全体集計", { style: "Heading1" }),
      ...(config.overallQuestions.length
        ? config.overallQuestions.map((question, index) => wordQuestionBlock(question, responses, index, chartAssets, config.itemOrder))
        : [wordParagraph("集計する設問がありません。")]),
    ];
    if (config.crossItems.length) {
      blocks.push(
        wordParagraph("クロス集計", { style: "Heading1" }),
        ...config.crossItems.map((item) => wordCrossQuestionBlock(item, responses)),
      );
    }
    return blocks;
  }

  function wordCrossQuestionBlock(item, responses) {
    const groups = getSegmentGroups(item.axisQuestion, responses);
    const question = item.targetQuestion;
    if (question.type === "matrix_single") return wordMatrixCrossQuestionBlock(item, groups);
    const rows = [[
      "項目",
      ...groups.map((group) => `${group.label}\n${group.responses.length}件`),
    ]];
    question.options.forEach((option) => {
      rows.push([
        option.label,
        ...groups.map((group) => {
          const count = countChoiceAnswers(question, group.responses, option.id);
          return wordAggregateCell(count, group.responses.length);
        }),
      ]);
    });
    return wordParagraph(`${item.axisQuestion.title} × ${question.title}`, { bold: true }) + wordTable(rows, { widths: wordColumnWidths(rows[0].length, 2600) }) + wordSpacer();
  }

  function wordMatrixCrossQuestionBlock(item, groups) {
    const question = item.targetQuestion;
    const rowBlocks = question.rows.map((row) => {
      const rows = [[
        "項目",
        ...groups.map((group) => `${group.label}\n${group.responses.length}件`),
      ]];
      question.columns.forEach((column) => {
        rows.push([
          column.label,
          ...groups.map((group) => wordAggregateCell(countMatrixSingleAnswers(question, group.responses, row.id, column.id), group.responses.length)),
        ]);
      });
      return wordParagraph(row.label, { bold: true }) + wordTable(rows, { widths: wordColumnWidths(rows[0].length, 2600) }) + wordSpacer();
    }).join("");
    return wordParagraph(`${item.axisQuestion.title} × ${question.title}`, { bold: true }) + rowBlocks;
  }

  function wordAggregateCell(count, denominator) {
    const rate = denominator > 0 ? (count / denominator) * 100 : null;
    return { type: "aggregate", count, rate };
  }

  function wordQuestionBlock(question, responses, index, chartAssets, itemOrder) {
    const heading = wordParagraph(`${index + 1}. ${question.title}`, { style: "Heading1" });
    if (question.type === "single" || question.type === "multiple") {
      const chartType = getReportChartType(question);
      const showBar = chartType === "bar";
      const showColorKey = chartType === "donut" || chartType === "stacked";
      const rows = [["項目", "件数", "割合", ...(showBar ? ["グラフ"] : [])]];
      let answeredCount = 0;
      getChoiceAggregateRows(question, responses, itemOrder).forEach((aggregateRow) => {
        const count = aggregateRow.count;
        answeredCount += count;
        const rate = responses.length ? (count / responses.length) * 100 : null;
        const color = REPORT_CHART_COLORS[(rows.length - 1) % REPORT_CHART_COLORS.length];
        rows.push([showColorKey ? { type: "legend", label: aggregateRow.label, color, number: rows.length } : aggregateRow.label, `${count}件`, formatRate(rate), ...(showBar ? [{ type: "bar", rate }] : [])]);
      });
      const chart = wordChartDrawing(chartAssets, wordChartAssetKey(question));
      const unansweredNote = showColorKey ? wordChartUnansweredNote(Math.max(0, responses.length - answeredCount), responses.length) : "";
      const widths = showBar ? [4200, 1100, 1100, 2600] : chartType === "donut" ? [4200, 950, 1250] : [6500, 1200, 1300];
      const table = wordTable(rows, { widths });
      const aggregate = chartType === "donut" && chart ? wordTableChartLayout(table, chart) : table + chart;
      return heading + aggregate + unansweredNote + wordOtherTextBlock(question, responses) + wordSpacer();
    }
    if (question.type === "matrix_single") {
      const chartType = getReportChartType(question);
      const showBar = chartType === "bar";
      const showColorKey = chartType === "donut" || chartType === "stacked";
      const rowBlocks = question.rows.map((row) => {
        const rows = [["項目", "件数", "割合", ...(showBar ? ["グラフ"] : [])]];
        let answeredCount = 0;
        getMatrixAggregateRows(question, row, responses, itemOrder).forEach((aggregateRow, columnIndex) => {
          const count = aggregateRow.count;
          answeredCount += count;
          const rate = responses.length ? (count / responses.length) * 100 : null;
          rows.push([showColorKey ? { type: "legend", label: aggregateRow.label, color: REPORT_CHART_COLORS[columnIndex % REPORT_CHART_COLORS.length], number: columnIndex + 1 } : aggregateRow.label, `${count}件`, formatRate(rate), ...(showBar ? [{ type: "bar", rate }] : [])]);
        });
        const chart = wordChartDrawing(chartAssets, wordChartAssetKey(question, row.id));
        const unansweredNote = showColorKey ? wordChartUnansweredNote(Math.max(0, responses.length - answeredCount), responses.length) : "";
        const widths = showBar ? [4200, 1100, 1100, 2600] : chartType === "donut" ? [4200, 950, 1250] : [6500, 1200, 1300];
        const table = wordTable(rows, { widths });
        const aggregate = chartType === "donut" && chart ? wordTableChartLayout(table, chart) : table + chart;
        return wordParagraph(row.label, { bold: true }) + aggregate + unansweredNote + wordSpacer();
      }).join("");
      return heading + rowBlocks;
    }
    if (question.type === "number_matrix") {
      const rows = [["項目", ...question.columns.map((column) => column.label), "合計"]];
      getNumberMatrixAggregateRows(question, responses, itemOrder).forEach((row) => {
        rows.push([row.label, ...row.values, row.total]);
      });
      return heading + wordTable(rows, { widths: wordColumnWidths(rows[0].length, 2600) }) + wordSpacer();
    }
    const answers = responses.map((response) => String(response.answers[question.id] || "").trim()).filter(Boolean);
    const answerParagraphs = answers.length
      ? answers.map((answer) => wordParagraph(`・${answer}`)).join("")
      : wordParagraph("記入された回答はありません。");
    return heading + wordParagraph(`記入あり: ${answers.length}件`) + answerParagraphs + wordSpacer();
  }

  function wordOtherTextBlock(question, responses) {
    const answers = getOtherTextAnswers(question, responses);
    if (!answers.length) return "";
    return wordParagraph("その他の記入内容", { bold: true }) + answers.map((answer) => wordParagraph(`・${answer}`, { compact: true })).join("");
  }

  function wordChartDrawing(chartAssets, key) {
    const asset = chartAssets?.lookup?.get(key);
    if (!asset) return "";
    return `
<w:p>
  <w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="120"/></w:pPr>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="${asset.width}" cy="${asset.height}"/>
        <wp:docPr id="${asset.drawingId}" name="${escapeXml(asset.fileName)}"/>
        <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic>
              <pic:nvPicPr>
                <pic:cNvPr id="${asset.drawingId}" name="${escapeXml(asset.fileName)}"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${asset.relId}"/>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm><a:off x="0" y="0"/><a:ext cx="${asset.width}" cy="${asset.height}"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>`;
  }

  function wordTableChartLayout(table, chart) {
    return `
<w:tbl>
  <w:tblPr>
    <w:tblW w:w="9638" w:type="dxa"/>
    <w:tblLayout w:type="fixed"/>
    <w:tblCellMar>
      <w:top w:w="0" w:type="dxa"/>
      <w:left w:w="0" w:type="dxa"/>
      <w:bottom w:w="0" w:type="dxa"/>
      <w:right w:w="0" w:type="dxa"/>
    </w:tblCellMar>
    <w:tblBorders>
      <w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid><w:gridCol w:w="6400"/><w:gridCol w:w="3238"/></w:tblGrid>
  <w:tr>
    <w:trPr><w:cantSplit/></w:trPr>
    <w:tc><w:tcPr><w:tcW w:w="6400" w:type="dxa"/><w:vAlign w:val="center"/><w:tcMar><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>${table}${wordParagraph("", { compact: true, after: 0 })}</w:tc>
    <w:tc><w:tcPr><w:tcW w:w="3238" w:type="dxa"/><w:vAlign w:val="center"/><w:tcMar><w:left w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>${chart}</w:tc>
  </w:tr>
</w:tbl>`;
  }

  function wordSpacer() {
    return wordParagraph("", { after: 260 });
  }

  function wordTable(rows, options = {}) {
    const hasHeader = options.header !== false;
    const widths = options.widths || wordColumnWidths(rows[0]?.length || 1, 2400);
    return `
<w:tbl>
  <w:tblPr>
    <w:tblW w:w="5000" w:type="pct"/>
    <w:tblLayout w:type="fixed"/>
    <w:tblCellMar>
      <w:top w:w="80" w:type="dxa"/>
      <w:left w:w="90" w:type="dxa"/>
      <w:bottom w:w="80" w:type="dxa"/>
      <w:right w:w="90" w:type="dxa"/>
    </w:tblCellMar>
    <w:tblBorders>
      <w:top w:val="single" w:sz="6" w:space="0" w:color="555555"/>
      <w:left w:val="single" w:sz="6" w:space="0" w:color="555555"/>
      <w:bottom w:val="single" w:sz="6" w:space="0" w:color="555555"/>
      <w:right w:val="single" w:sz="6" w:space="0" w:color="555555"/>
      <w:insideH w:val="single" w:sz="6" w:space="0" w:color="555555"/>
      <w:insideV w:val="single" w:sz="6" w:space="0" w:color="555555"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid>${widths.map((width) => `<w:gridCol w:w="${width}"/>`).join("")}</w:tblGrid>
  ${rows.map((row, rowIndex) => wordTableRow(row, hasHeader && rowIndex === 0, widths)).join("")}
</w:tbl>`;
  }

  function wordTableRow(cells, header, widths) {
    return `<w:tr>${cells.map((cell, index) => wordTableCell(cell, header, widths[index])).join("")}</w:tr>`;
  }

  function wordTableCell(value, header, width) {
    const cellPr = `<w:tcPr>${width ? `<w:tcW w:w="${width}" w:type="dxa"/>` : ""}${header ? `<w:shd w:val="clear" w:color="auto" w:fill="EEF2EF"/>` : ""}</w:tcPr>`;
    const content = value && typeof value === "object" && value.type === "bar"
      ? wordBar(value.rate)
      : value && typeof value === "object" && value.type === "legend"
        ? wordLegendParagraph(value.label, value.color, value.number)
      : value && typeof value === "object" && value.type === "aggregate"
        ? wordParagraph(`${value.count}件`, { bold: true, compact: true, after: 0 }) + wordParagraph(formatRate(value.rate), { compact: true, after: 0 })
      : wordParagraph(String(value ?? ""), { bold: header, compact: true });
    return `<w:tc>${cellPr}${content}</w:tc>`;
  }

  function wordLegendParagraph(label, color, number) {
    return `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Yu Gothic" w:hAnsi="Yu Gothic" w:eastAsia="Yu Gothic"/><w:b/></w:rPr><w:t xml:space="preserve">${escapeXml(number)}. </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Yu Gothic" w:hAnsi="Yu Gothic" w:eastAsia="Yu Gothic"/><w:color w:val="${escapeXml(String(color || "#555555").replace("#", ""))}"/></w:rPr><w:t xml:space="preserve">■ </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Yu Gothic" w:hAnsi="Yu Gothic" w:eastAsia="Yu Gothic"/></w:rPr>${wordText(label)}</w:r></w:p>`;
  }

  function wordChartUnansweredNote(count, denominator) {
    if (!count) return "";
    const rate = denominator > 0 ? (count / denominator) * 100 : null;
    return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="100"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Yu Gothic" w:hAnsi="Yu Gothic" w:eastAsia="Yu Gothic"/><w:color w:val="AEB7B1"/></w:rPr><w:t xml:space="preserve">■ </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Yu Gothic" w:hAnsi="Yu Gothic" w:eastAsia="Yu Gothic"/></w:rPr>${wordText(`未回答 ${count}件（${formatRate(rate)}）`)}</w:r></w:p>`;
  }

  function wordColumnWidths(count, firstWidth = 2400) {
    if (count <= 1) return [9000];
    const remaining = Math.max(9000 - firstWidth, count - 1);
    const other = Math.floor(remaining / (count - 1));
    return [firstWidth, ...Array.from({ length: count - 1 }, () => other)];
  }

  function wordBar(rate) {
    if (rate === null || rate === undefined || Number.isNaN(rate)) return wordParagraph("", { compact: true });
    const total = 2200;
    const width = Math.max(0, Math.min(100, rate));
    const filled = Math.max(1, Math.round((total * width) / 100));
    const empty = Math.max(1, total - filled);
    return `
<w:tbl>
  <w:tblPr>
    <w:tblW w:w="${total}" w:type="dxa"/>
    <w:tblLayout w:type="fixed"/>
    <w:tblCellMar>
      <w:top w:w="0" w:type="dxa"/>
      <w:left w:w="0" w:type="dxa"/>
      <w:bottom w:w="0" w:type="dxa"/>
      <w:right w:w="0" w:type="dxa"/>
    </w:tblCellMar>
    <w:tblBorders>
      <w:top w:val="single" w:sz="4" w:space="0" w:color="333333"/>
      <w:left w:val="single" w:sz="4" w:space="0" w:color="333333"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="333333"/>
      <w:right w:val="single" w:sz="4" w:space="0" w:color="333333"/>
      <w:insideH w:val="nil"/>
      <w:insideV w:val="nil"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid><w:gridCol w:w="${filled}"/><w:gridCol w:w="${empty}"/></w:tblGrid>
  <w:tr>
    <w:tc><w:tcPr><w:tcW w:w="${filled}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="0072B2"/></w:tcPr>${wordParagraph(" ", { compact: true, after: 0 })}</w:tc>
    <w:tc><w:tcPr><w:tcW w:w="${empty}" w:type="dxa"/></w:tcPr>${wordParagraph(" ", { compact: true, after: 0 })}</w:tc>
  </w:tr>
</w:tbl>${wordParagraph("", { compact: true, after: 0 })}`;
  }

  function wordParagraph(text, options = {}) {
    const pPr = [
      options.style ? `<w:pStyle w:val="${escapeXml(options.style)}"/>` : "",
      `<w:spacing w:after="${options.after ?? (options.compact ? 80 : 160)}"/>`,
    ].join("");
    const rPr = [
      `<w:rFonts w:ascii="Yu Gothic" w:hAnsi="Yu Gothic" w:eastAsia="Yu Gothic"/>`,
      options.bold ? "<w:b/>" : "",
      options.style === "Title" ? "<w:b/><w:sz w:val=\"32\"/>" : "",
      options.style === "Heading1" ? "<w:b/><w:sz w:val=\"24\"/>" : "",
    ].join("");
    return `<w:p><w:pPr>${pPr}</w:pPr><w:r><w:rPr>${rPr}</w:rPr>${wordText(text)}</w:r></w:p>`;
  }

  function wordText(value) {
    const lines = sanitizeXmlText(value).split(/\r?\n/);
    return lines.map((line, index) => `${index ? "<w:br/>" : ""}<w:t xml:space="preserve">${escapeXml(line)}</w:t>`).join("");
  }

  function wordPeriodText(survey) {
    if (survey?.periodStart || survey?.periodEnd) {
      const rows = [];
      const start = formatDateInput(survey.periodStart);
      const end = formatDateInput(survey.periodEnd);
      if (start) rows.push(`開始: ${start}`);
      if (end) rows.push(`終了: ${end}`);
      return rows.join("\n") || "-";
    }
    return survey?.periodText || "-";
  }

  function wordContentTypesXml(hasPng = false) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${hasPng ? '<Default Extension="png" ContentType="image/png"/>' : ""}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
  }

  function wordPackageRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  }

  function wordDocumentRelsXml(chartAssets = []) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${chartAssets.map((asset) => `<Relationship Id="${escapeXml(asset.relId)}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${escapeXml(asset.fileName)}"/>`).join("\n  ")}
</Relationships>`;
  }

  function wordStylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Yu Gothic" w:hAnsi="Yu Gothic" w:eastAsia="Yu Gothic"/><w:sz w:val="21"/></w:rPr></w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/></w:style>
</w:styles>`;
  }

  async function importBackupJson(file) {
    try {
      const data = JSON.parse(await file.text());
      if (!data || data.appName !== APP_NAME || data.schemaVersion !== SCHEMA_VERSION || !Array.isArray(data.surveys)) throw new Error("Invalid backup");
      if (!window.confirm("保存ファイルを読み込みます。現在のデータに追加されます。よろしいですか？")) return;
      const surveyIdMap = new Map();
      const responseIdMap = new Map();
      for (const survey of data.surveys) {
        const normalized = normalizeSurvey(survey);
        const oldId = normalized.id;
        normalized.id = createId("survey");
        surveyIdMap.set(oldId, normalized.id);
        await putRecord(SURVEY_STORE, normalized);
      }
      for (const response of data.responses || []) {
        const normalized = normalizeResponse(response);
        const oldId = normalized.id;
        normalized.id = createId("response");
        normalized.surveyId = surveyIdMap.get(normalized.surveyId) || normalized.surveyId;
        responseIdMap.set(oldId, normalized.id);
        await putRecord(RESPONSE_STORE, normalized);
      }
      for (const contact of data.contacts || []) {
        const newResponseId = responseIdMap.get(contact.responseId);
        if (!newResponseId) continue;
        await putRecord(CONTACT_STORE, normalizeContact({ ...contact, responseId: newResponseId }));
      }
      await refreshData();
      state.flash = "保存ファイルを読み込みました。";
      render();
    } catch (error) {
      console.error(error);
      state.flash = "保存ファイルの読み込みに失敗しました。";
      render();
    }
  }

  function formatAnswerForCsv(question, answer, allAnswers = {}) {
    if (question.type === "single") {
      const label = question.options.find((option) => option.id === answer)?.label || "";
      return formatChoiceAnswerWithOther(question, answer, label, allAnswers);
    }
    if (question.type === "multiple") {
      return question.options
        .filter((option) => Array.isArray(answer) && answer.includes(option.id))
        .map((option) => formatChoiceAnswerWithOther(question, option.id, option.label, allAnswers))
        .join(" / ");
    }
    if (question.type === "matrix_single") return question.rows.map((row) => `${row.label}:${question.columns.find((column) => column.id === answer?.[row.id])?.label || ""}`).join(" / ");
    if (question.type === "number_matrix") return question.rows.map((row) => `${row.label}:${question.columns.map((column) => `${column.label}=${answer?.[row.id]?.[column.id] ?? ""}`).join(";")}`).join(" / ");
    return String(answer || "");
  }

  function formatChoiceAnswerWithOther(question, optionId, label, allAnswers) {
    const otherOption = getOtherOption(question);
    const otherText = String(allAnswers[otherTextAnswerKey(question.id)] || "").trim();
    if (!otherOption || optionId !== otherOption.id || !otherText) return label;
    return `${label}（${otherText}）`;
  }

  function downloadCsv(filename, rows) {
    const csv = rows.map((row) => row.map(formatCsvCell).join(",")).join("\r\n");
    downloadBlob(filename, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  }

  function formatCsvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function createZip(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const timestamp = dosTimestamp(new Date());

    files.forEach((file) => {
      const nameBytes = encoder.encode(file.name);
      const dataBytes = file.data instanceof Uint8Array ? file.data : encoder.encode(String(file.data));
      const crc = crc32(dataBytes);
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const localView = new DataView(localHeader.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, timestamp.time, true);
      localView.setUint16(12, timestamp.date, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, dataBytes.length, true);
      localView.setUint32(22, dataBytes.length, true);
      localView.setUint16(26, nameBytes.length, true);
      localView.setUint16(28, 0, true);
      localHeader.set(nameBytes, 30);
      localParts.push(localHeader, dataBytes);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, timestamp.time, true);
      centralView.setUint16(14, timestamp.date, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, dataBytes.length, true);
      centralView.setUint32(24, dataBytes.length, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      centralHeader.set(nameBytes, 46);
      centralParts.push(centralHeader);

      offset += localHeader.length + dataBytes.length;
    });

    const centralOffset = offset;
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, centralOffset, true);
    endView.setUint16(20, 0, true);

    return concatBytes([...localParts, ...centralParts, end]);
  }

  function concatBytes(parts) {
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(totalLength);
    let offset = 0;
    parts.forEach((part) => {
      output.set(part, offset);
      offset += part.length;
    });
    return output;
  }

  function dosTimestamp(date) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    };
  }

  let crcTable = null;

  function crc32(bytes) {
    if (!crcTable) crcTable = buildCrcTable();
    let crc = 0xffffffff;
    bytes.forEach((byte) => {
      crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
    });
    return (crc ^ 0xffffffff) >>> 0;
  }

  function buildCrcTable() {
    return Array.from({ length: 256 }, (_, index) => {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      return value >>> 0;
    });
  }

  function sanitizeFilename(value) {
    return String(value || "survey-report")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 80) || "survey-report";
  }

  function sanitizeXmlText(value) {
    return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  }

  function escapeXml(value) {
    return sanitizeXmlText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function downloadBlob(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function readControlValue(target) {
    return target.type === "number" ? readOptionalInteger(target.value) : target.value;
  }

  function readOptionalInteger(value) {
    if (value === undefined || value === null || value === "") return undefined;
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : undefined;
  }

  function safeInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : 0;
  }

  function readIndex(value) {
    const number = Number(value);
    return Number.isInteger(number) ? number : -1;
  }

  function readDirection(value) {
    return Number(value) < 0 ? -1 : 1;
  }

  function moveItem(items, index, direction) {
    const next = index + direction;
    if (index < 0 || next < 0 || index >= items.length || next >= items.length) return;
    const [item] = items.splice(index, 1);
    items.splice(next, 0, item);
  }

  function formatRate(rate) {
    if (rate === null || rate === undefined || Number.isNaN(rate)) return "-";
    return `${Number(rate).toFixed(1)}%`;
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }

  function formatSurveyPeriod(survey) {
    if (survey?.periodStart || survey?.periodEnd) {
      const start = formatDateInput(survey.periodStart);
      const end = formatDateInput(survey.periodEnd);
      if (start && end) return `${start}〜${end}`;
      if (start) return `${start}〜`;
      return `〜${end}`;
    }
    return survey?.periodText || "-";
  }

  function renderReportPeriod(survey) {
    if (survey?.periodStart || survey?.periodEnd) {
      const rows = [];
      const start = formatDateInput(survey.periodStart);
      const end = formatDateInput(survey.periodEnd);
      if (start) rows.push(`<span>開始: ${escapeHtml(start)}</span>`);
      if (end) rows.push(`<span>終了: ${escapeHtml(end)}</span>`);
      return `<span class="period-stack">${rows.join("")}</span>`;
    }
    return escapeHtml(survey?.periodText || "-");
  }

  function formatDateInput(value) {
    if (!value) return "";
    const [year, month, day] = String(value).split("-");
    if (!year || !month || !day) return String(value);
    return `${Number(year)}年${Number(month)}月${Number(day)}日`;
  }

  function formatFilenameDate(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function renderBar(rate) {
    const width = rate == null || Number.isNaN(rate) ? 0 : Math.max(0, Math.min(100, rate));
    return `<svg class="bar-graph" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="bar-graph__fill" x="0" y="0" width="${width.toFixed(2)}" height="10"></rect></svg>`;
  }

  function nowIsoString() {
    return new Date().toISOString();
  }

  function createId(prefix) {
    if (window.crypto?.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
