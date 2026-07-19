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
  const PRESET_SURVEY_TITLE = "〇〇町内会アンケート";
  const PRESET_LEGACY_SURVEY_TITLE = "新川第2町内会 アンケート";
  const PRESET_DELETED_STORAGE_KEY = `${APP_NAME}:preset-deleted`;
  const PRESET_FAMILY_QUESTION_TITLE = "今後の活動・事業の参考にするためにお聞きします。ご家族構成について教えてください。（当てはまるところに人数を記入）また、回答者様の世代を右の（ ）のところに○をつけてください。";
  const PRESET_DEFAULTS_VERSION = "familyReportOffV1";
  const PRESET_CONTENT_VERSION = "paperWordingV4";
  const PRESET_TITLE_VERSION = "genericTitleV1";
  const PRESET_ACTIVITY_COMBINED_ROW_ID = "cleaning";
  const PRESET_ACTIVITY_LEGACY_ROW_ID = "extinguisher_training";
  const PRESET_ACTIVITY_COMBINED_ROW_LABEL = "町内・公園清掃、消火器訓練";
  const REPORT_CHART_COLORS = ["#0072B2", "#E69F00", "#009E73", "#CC79A7", "#D55E00", "#56B4E9", "#F0E442", "#6F4E9C", "#4D4D4D", "#8C564B"];
  const SURVEY_FORM_CONTENT_LEFT_MM = 7;
  const SURVEY_FORM_CONTENT_TOP_MM = 15;
  const SURVEY_FORM_CONTENT_WIDTH_MM = 172;
  const SURVEY_SCAN_PX_PER_MM = 5;
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
      body: "氏名・住所・電話番号・メモは内部確認用として別画面で扱います。配布用の集計資料には含めない運用にしてください。",
    },
  ];
  const TOUR_ROUTES = [
    {
      id: "response-output",
      title: "回答登録から出力まで",
      description: "アンケートを選び、回答を登録し、集計レポートをWord/PDFで出力する流れ。",
      steps: [
        { view: "home", target: "preset-select", title: "アンケートを選ぶ", body: `${PRESET_SURVEY_TITLE}の選択ボタンを押して、回答登録へ進みます。` },
        { view: "list", target: "new-response", title: "回答を登録する", body: "「手入力で回答を登録」を押します。回答一覧で入力欄を選んでいないときは、Enterキーでも開けます。" },
        { view: "response-edit", target: "answer-form", title: "回答内容を入力する", body: "選択肢は1～9キー、10番目は0キーで選べます。通常はEnterで次へ、Shift＋Enterで前へ移動します。表形式は、単一選択なら数字キーで次の行へ進み、複数選択ならEnterで行を移動します。" },
        { view: "response-edit", target: "save-response", title: "保存する", body: "入力後は「保存」を押します。続けて次の回答を登録する場合は、テンキーの＋を押すと保存して新しい回答画面を開きます。" },
        { view: "list", target: "report-link", title: "集計レポートへ進む", body: "回答を登録したら、回答一覧から集計レポートを開きます。" },
        { view: "report", target: "export-report", title: "Word/PDFで出力する", body: "表示中の集計レポートをWordファイルまたはPDF印刷で出力します。" },
      ],
    },
    {
      id: "scan-response",
      title: "回答用紙を画像で取り込む",
      description: "アプリから出力した回答用紙を撮影し、選択回答と自由記述を仮入力する流れ。",
      steps: [
        { view: "list", target: "survey-form-export", title: "読取対応用紙を出力する", body: "最初に「アンケートPDF出力・印刷」から回答用紙を作成します。画像取込は、このPDFから印刷した用紙に対応しています。" },
        { view: "list", target: "scan-import-open", title: "画像取込を開く", body: "記入済み用紙を撮影したら「画像から回答を登録」を押します。" },
        { view: "scan-import", target: "scan-import-panel", title: "用紙全体を追加する", body: "四隅の黒い印まで入るように真上から撮影し、1件分の全ページを追加します。ページ順は自動で判定されます。" },
        { view: "scan-import", target: "scan-import-actions", title: "読み取りを開始する", body: "「画像を追加」で写真を選び、全ページが揃ったら「読み取りを開始」を押します。" },
        { view: "response-edit", target: "answer-form", title: "読み取り結果を確認する", body: "選択結果と自由記述が回答画面へ反映されます。自由記述は文字認識による仮入力なので、用紙と照合して誤りを直します。数字、連絡先、「その他」の文字は手入力します。" },
        { view: "response-edit", target: "save-response", title: "確認して保存する", body: "画像と入力内容を照合し、間違いがなければ保存します。用紙画像そのものは回答データへ保存されません。" },
      ],
    },
    {
      id: "response-organize",
      title: "回答タグとCSV",
      description: "回答に目印を付けて絞り込み、必要に応じて一覧を書き出す流れ。",
      steps: [
        { view: "response-edit", target: "response-tags", title: "回答にタグを付ける", body: "「協力者」「意見記入者」など任意のタグを追加できます。既存のタグは候補から再利用できます。" },
        { view: "list", target: "response-list", title: "回答を整理する", body: "タグが登録されていると、回答一覧に絞り込み欄が表示されます。各行の「編集」で内容を直し、不要な回答は「削除」できます。" },
        { view: "list", target: "response-csv", title: "回答一覧を書き出す", body: "全回答を確認したい場合はCSVへ書き出せます。自由記述や連絡先が含まれる可能性があるため、内部で管理してください。" },
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
      id: "report-settings",
      title: "レポートの表示を整える",
      description: "掲載する設問、並び順、グラフ、自由記述へのコメントを設定する流れ。",
      steps: [
        { view: "home", target: "preset-edit", title: "アンケートを編集する", body: "アンケート一覧の「編集」を押すと、基本情報とレポートへ載せる設問を変更できます。" },
        { view: "survey-edit", target: "question-settings", title: "掲載する設問を選ぶ", body: "レポートへ出したくない設問は「集計レポートに含める」のチェックを外して保存します。回答データ自体は削除されません。", useExistingSurvey: true },
        { view: "report", target: "report-order", title: "項目の並び順を選ぶ", body: "全体集計は「件数が多い順」または「設問順」で表示できます。クロス集計の並びには影響しません。" },
        { view: "report", target: "report-chart", title: "グラフを選ぶ", body: "グラフに対応する設問では、横棒、ドーナツ、帯、表のみから選べます。選択内容はWord/PDFにも反映されます。" },
        { view: "report", target: "report-comments", title: "自由記述へコメントを付ける", body: "自由記述に対応を掲載する場合は「コメントを掲載する」にチェックし、回答へのコメントを入力します。出力時は赤字で掲載されます。" },
        { view: "report", target: "export-report", title: "設定した内容を出力する", body: "画面で掲載内容を確認してから、WordまたはPDF印刷で出力します。編集を加える場合はWordが便利です。" },
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
      description: "「連絡先 非公開」設問を追加したアンケートで、氏名・住所・電話番号・メモを回答データと分けて扱う流れ。",
      steps: [
        { view: "response-edit", target: "contact-entry", title: "連絡先を入力する", body: "アンケート設定で「連絡先 非公開」設問を追加した場合だけ、回答入力画面に連絡先欄が表示されます。集計レポートには含まれません。" },
        { view: "list", target: "contact-link", title: "連絡先管理を開く", body: "「連絡先 非公開」設問があるアンケートでは、回答一覧から連絡先管理へ進み、内部確認用の連絡先を確認できます。" },
        { view: "contacts", target: "contacts", title: "内部用として管理する", body: "氏名・住所・電話番号・メモは配布資料に載せず、必要な場合だけ内部で確認します。" },
        { view: "contacts", target: "contacts-export", title: "必要な場合だけ書き出す", body: "連絡先CSVには個人情報が含まれます。運営内部で利用し、公開場所へ保存しないでください。" },
      ],
    },
  ];

  let root = null;
  let dbCache = null;
  let stackedChartDrawFrame = 0;
  const freeTextReplySaveTimers = new Map();

  const state = {
    view: "home",
    surveys: [],
    responses: [],
    contacts: [],
    currentSurveyId: "",
    surveyDraft: null,
    currentResponse: null,
    currentContact: null,
    scanImport: null,
    scanReview: null,
    surveyPrintPages: null,
    responseSaveInProgress: false,
    responseTagFilter: "",
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
      if (action === "open-scan-import") return openScanImport();
      if (action === "scan-add-files") return document.getElementById("scan-image-files")?.click();
      if (action === "scan-remove-page") return removeScanImportPage(button.dataset.id || "");
      if (action === "scan-analyze") return analyzeScanImport();
      if (action === "edit-response") return openResponseEditor(button.dataset.id);
      if (action === "save-response") return saveCurrentResponse();
      if (action === "delete-response") return deleteResponse(button.dataset.id);
      if (action === "add-response-tag") return addResponseTags(button.dataset.tag || root?.querySelector("[data-response-tag-input]")?.value || "");
      if (action === "remove-response-tag") return removeResponseTag(button.dataset.tag || "");
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
      if (action === "print-survey-form") return printSurveyForm();
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

    if (target.id === "scan-image-files" && event.type === "change") {
      await addScanImportFiles(target.files);
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

    if (target.matches("[data-response-tag-filter]")) {
      state.responseTagFilter = target.value;
      render();
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

    if (target.matches("[data-free-text-reply-enabled]")) {
      if (event.type !== "change") return;
      const responseId = target.dataset.responseId || "";
      const questionId = target.dataset.questionId || "";
      setFreeTextReplyEnabled(responseId, questionId, target.checked);
      await saveFreeTextReply(responseId, questionId);
      render();
      return;
    }

    if (target.matches("[data-free-text-reply]")) {
      const responseId = target.dataset.responseId || "";
      const questionId = target.dataset.questionId || "";
      setFreeTextReply(responseId, questionId, target.value);
      updateFreeTextReplyPrintPreview(target, target.value);
      if (event.type === "change") await saveFreeTextReply(responseId, questionId);
      else scheduleFreeTextReplySave(responseId, questionId);
      return;
    }

    if (target.matches("[data-contact-field]")) {
      if (!state.currentContact) return;
      state.currentContact[target.dataset.contactField] = target.value;
    }
  }

  function handleKeyDown(event) {
    if (isListNewResponseShortcut(event)) {
      event.preventDefault();
      openResponseEditor();
      return;
    }
    if (event.repeat || event.isComposing) return;
    if (state.view === "response-edit" && event.key === "Enter" && event.target instanceof HTMLInputElement && event.target.matches("[data-response-tag-input]")) {
      event.preventDefault();
      addResponseTags(event.target.value);
      return;
    }
    if (state.view !== "response-edit" || state.tourActive || state.tourPickerOpen) return;
    if (isResponseSaveAndNextShortcut(event)) {
      event.preventDefault();
      void saveCurrentResponse({ openNext: true });
      return;
    }
    if (shouldIgnoreAnswerShortcut(event.target)) return;
    if (event.key === "Enter" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const question = getCurrentSurvey()?.questions?.[state.activeAnswerQuestionIndex];
      if (question?.type === "matrix_multiple") moveActiveMatrixRow(event.shiftKey ? -1 : 1);
      else moveActiveAnswer(event.shiftKey ? -1 : 1);
      return;
    }
    const shortcutNumber = getAnswerShortcutNumber(event.key);
    if (!event.ctrlKey && !event.metaKey && !event.altKey && shortcutNumber !== null) {
      if (applyAnswerShortcut(shortcutNumber)) event.preventDefault();
    }
  }

  function getAnswerShortcutNumber(key) {
    if (key === "0") return 10;
    if (/^[1-9]$/.test(key)) return Number(key);
    return null;
  }

  function isListNewResponseShortcut(event) {
    return state.view === "list"
      && !state.tourActive
      && !state.tourPickerOpen
      && !event.repeat
      && !event.isComposing
      && event.key === "Enter"
      && !event.shiftKey
      && !event.ctrlKey
      && !event.metaKey
      && !event.altKey
      && !shouldIgnoreListShortcut(event.target);
  }

  function shouldIgnoreListShortcut(target) {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest("button,a,input,textarea,select,[role='button'],[contenteditable='true']"));
  }

  function isResponseSaveAndNextShortcut(event) {
    const isNumpadAdd = event.code === "NumpadAdd" || (event.key === "+" && event.location === 3);
    return state.view === "response-edit"
      && !state.tourActive
      && !state.tourPickerOpen
      && !state.responseSaveInProgress
      && !event.repeat
      && !event.isComposing
      && isNumpadAdd
      && !event.shiftKey
      && !event.ctrlKey
      && !event.metaKey
      && !event.altKey
      && !shouldIgnoreAnswerShortcut(event.target);
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
    return ["single", "multiple", "matrix_single", "matrix_multiple"].includes(question?.type);
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
    if (question?.type === "matrix_single" || question?.type === "matrix_multiple") {
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

  function moveActiveMatrixRow(direction) {
    const question = getCurrentSurvey()?.questions?.[state.activeAnswerQuestionIndex];
    if (question?.type !== "matrix_multiple" || !question.rows.length) return moveActiveAnswer(direction);
    const nextIndex = state.activeMatrixRowIndex + direction;
    if (nextIndex >= 0 && nextIndex < question.rows.length) {
      state.activeMatrixRowIndex = nextIndex;
      state.scrollActiveAnswerOnRender = true;
      render();
      return;
    }
    moveActiveAnswer(direction);
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
    if (question.type === "matrix_multiple") return applyMatrixMultipleShortcut(question, answers, number);
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

  function applyMatrixMultipleShortcut(question, answers, number) {
    const column = question.columns[number - 1];
    const row = question.rows[state.activeMatrixRowIndex];
    if (!column || !row) return false;
    if (!answers[question.id] || typeof answers[question.id] !== "object" || Array.isArray(answers[question.id])) answers[question.id] = {};
    const selected = new Set(getMatrixSelectedColumnIds(answers[question.id], row.id));
    if (selected.has(column.id)) selected.delete(column.id);
    else selected.add(column.id);
    answers[question.id][row.id] = Array.from(selected);
    state.scrollActiveAnswerOnRender = true;
    render();
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

  function queuePageTopScroll() {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
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
      "scan-import": "回答用紙の画像取込",
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
    if (state.view === "scan-import") return renderScanImportPage();
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
    const isTourExample = survey.id === getTourSurveyId();
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
          <button class="button button-primary" type="button" data-action="select-survey" data-id="${escapeAttr(survey.id)}"${isTourExample ? tourAttr("preset-select") : ""}>選択</button>
          <button class="button" type="button" data-action="edit-survey" data-id="${escapeAttr(survey.id)}"${isTourExample ? tourAttr("preset-edit") : ""}>編集</button>
          <button class="button button-danger" type="button" data-action="delete-survey" data-id="${escapeAttr(survey.id)}">削除</button>
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
      ["matrix_single", "表形式（単一選択）"],
      ["matrix_multiple", "表形式（複数選択）"],
      ["number_matrix", "人数表"],
      ["text", "自由記述"],
      ["contact", "連絡先 非公開"],
    ];
    return types.map(([value, label]) => `<option value="${value}"${current === value ? " selected" : ""}>${label}</option>`).join("");
  }

  function renderQuestionDetailEditor(question, index, locked = false) {
    if (question.type === "single" || question.type === "multiple") return renderOptionEditor(question, index, locked);
    if (question.type === "matrix_single" || question.type === "matrix_multiple" || question.type === "number_matrix") return `${renderRowEditor(question, index, locked)}${renderColumnEditor(question, index, locked)}`;
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
    const tagOptions = getResponseTagCounts(responses);
    const activeTag = tagOptions.some((item) => item.tag === state.responseTagFilter) ? state.responseTagFilter : "";
    if (activeTag !== state.responseTagFilter) state.responseTagFilter = activeTag;
    const visibleResponses = activeTag ? responses.filter((response) => responseHasTag(response, activeTag)) : responses;
    const countLabel = activeTag ? `${visibleResponses.length}/${responses.length}件` : `${responses.length}件`;
    return `
      <section class="toolbar response-main-toolbar no-print">
        <button class="button button-back" type="button" data-action="home">← アンケート一覧へ戻る</button>
        <span class="toolbar-break" aria-hidden="true"></span>
        <span class="response-entry-actions">
          <button class="button button-primary response-new-button" type="button" data-action="new-response" aria-keyshortcuts="Enter"${tourAttr("new-response")}>手入力で回答を登録</button>
          <button class="button" type="button" data-action="open-scan-import"${tourAttr("scan-import-open")}>画像から回答を登録</button>
        </span>
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
          <button class="button" type="button" data-action="export-response-csv"${tourAttr("response-csv")}>回答一覧CSV出力</button>
        </span>
      </section>
      <section class="panel no-print"${tourAttr("response-list")}>
        <div class="section-heading"><h2>${survey?.title + " 回答一覧"}</h2><p class="count-label">${countLabel}</p></div>
        ${tagOptions.length ? `
          <div class="response-list-filter">
            <label class="field response-tag-filter">
              <span>タグで絞り込み</span>
              <select data-response-tag-filter>
                <option value="">すべての回答</option>
                ${tagOptions.map((item) => `<option value="${escapeAttr(item.tag)}"${item.tag === activeTag ? " selected" : ""}>${escapeHtml(item.tag)}（${item.count}件）</option>`).join("")}
              </select>
            </label>
          </div>
        ` : ""}
        ${responses.length ? (visibleResponses.length ? renderResponseTable(visibleResponses, hasContactQuestion, responses) : `<div class="empty-state">該当する回答はありません。</div>`) : `<div class="empty-state">登録済みの回答はありません。</div>`}
      </section>
      ${renderSurveyFormPrint(survey)}
    `;
  }

  function renderScanImportPage() {
    const survey = getCurrentSurvey();
    const scanImport = state.scanImport || createScanImportState();
    const pages = scanImport.pages || [];
    return `
      <section class="toolbar no-print">
        <button class="button button-back" type="button" data-action="list">← 回答一覧へ戻る</button>
      </section>
      ${renderPrivacyNotice()}
      <section class="panel scan-import-panel no-print"${tourAttr("scan-import-panel")}>
        <div class="section-heading">
          <div>
            <h2>回答用紙の画像を追加</h2>
            <p class="muted-text">${escapeHtml(survey?.title || "アンケート")}</p>
          </div>
          <p class="count-label">${pages.length}ページ</p>
        </div>
        <div class="scan-instructions">
          <p>このアプリの「アンケートPDF出力・印刷」で作成した、1件分の回答用紙を読み取ります。</p>
          <ul>
            <li>用紙全体と四隅の黒い印が入るよう、真上から明るい場所で撮影してください。</li>
            <li>複数ページは順不同で追加できます。用紙の識別コードから自動で並べ替えます。</li>
            <li>自由記述は文字認識して仮入力します。誤認識があるため、用紙と照合して修正してください。</li>
            <li>数字、連絡先、「その他」の記入文字は、読み取り後に手入力してください。</li>
            <li>初回の自由記述読み取りでは、日本語の文字認識データを読み込むため少し時間がかかります。</li>
            <li>画像は読み取り中だけ使用し、回答データには保存しません。</li>
          </ul>
        </div>
        ${scanImport.errors?.length ? `
          <div class="message-group message-error scan-errors" role="alert">
            <h3>画像を確認してください</h3>
            <ul>${scanImport.errors.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}</ul>
          </div>
        ` : ""}
        <input class="visually-hidden" id="scan-image-files" type="file" accept="image/jpeg,image/png,image/webp" multiple />
        <div class="scan-import-actions"${tourAttr("scan-import-actions")}>
          <button class="button" type="button" data-action="scan-add-files"${scanImport.processing ? " disabled" : ""}>画像を追加</button>
          <button class="button button-primary" type="button" data-action="scan-analyze"${!pages.length || scanImport.processing ? " disabled" : ""}>${scanImport.processing ? escapeHtml(scanImport.progressText || "読み取り中…") : "読み取りを開始"}</button>
        </div>
        ${pages.length ? `
          <ol class="scan-page-list">
            ${pages.map((page, index) => renderScanImportPageItem(page, index, scanImport.processing)).join("")}
          </ol>
        ` : `<div class="empty-state scan-empty-state">まだ画像がありません。「画像を追加」から回答用紙を選んでください。</div>`}
      </section>
    `;
  }

  function renderScanImportPageItem(page, index, processing) {
    return `
      <li class="scan-page-card">
        <img src="${escapeAttr(page.previewUrl)}" alt="追加した回答用紙 ${index + 1}ページ目" />
        <div class="scan-page-card__body">
          <div>
            <strong>画像 ${index + 1}</strong>
            <p>${escapeHtml(page.file.name)}</p>
          </div>
          <div class="icon-actions">
            <button class="button button-danger" type="button" data-action="scan-remove-page" data-id="${escapeAttr(page.id)}"${processing ? " disabled" : ""}>削除</button>
          </div>
        </div>
      </li>
    `;
  }

  function renderResponseTable(responses, hasContactQuestion, allResponses = responses) {
    return `
      <div class="table-wrap">
        <table class="report-table">
          <thead><tr><th>番号</th><th>タグ</th>${hasContactQuestion ? "<th>連絡先</th>" : ""}<th class="no-print">操作</th></tr></thead>
          <tbody>
            ${responses.map((response) => {
              const contact = getContactForResponse(response.id);
              const responseNumber = allResponses.findIndex((item) => item.id === response.id) + 1;
              return `
                <tr>
                  <td>${responseNumber}</td>
                  <td>${renderResponseTagBadges(response.tags)}</td>
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
    const prepared = state.surveyPrintPages;
    if (!survey || !prepared || prepared.surveyId !== survey.id) return "";
    return `
      <div class="survey-form-pages print-only">
        ${prepared.pages.map((page, pageIndex) => `
          <article class="survey-form-page print-page">
            ${renderSurveyScanOverlay(prepared, page, pageIndex)}
            <div class="survey-form-page__content">
              ${renderSurveyFormHeader(survey, pageIndex > 0)}
              <div class="survey-form__questions">
                ${page.questions.map(({ question, index }) => renderSurveyFormQuestion(question, index)).join("")}
              </div>
            </div>
            <footer class="survey-form-page__footer">
              <span>画像読取対応用紙</span>
              <span>${pageIndex + 1} / ${prepared.pages.length}ページ</span>
            </footer>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderSurveyFormHeader(survey, continued = false) {
    return `
      <header class="survey-form__header${continued ? " survey-form__header--continued" : ""}">
        <h2>${escapeHtml(survey.title || "アンケート")}${continued ? "（続き）" : ""}</h2>
        ${continued ? "" : `
          <dl class="survey-form__meta">
            ${survey.issuer ? `<div><dt>実施者</dt><dd>${escapeHtml(survey.issuer)}</dd></div>` : ""}
            ${survey.periodStart || survey.periodEnd || survey.periodText ? `<div><dt>実施期間</dt><dd>${renderReportPeriod(survey)}</dd></div>` : ""}
          </dl>
          ${survey.note ? `<p>${escapeHtml(survey.note)}</p>` : ""}
          <p class="survey-scan-instruction">選択する回答は、□の中に大きく濃い○または✓を記入してください。</p>
        `}
      </header>
    `;
  }

  function renderSurveyScanOverlay(prepared, page, pageIndex) {
    const bits = window.SurveyScan?.encodePageCode({
      fingerprint: prepared.fingerprint,
      pageNumber: pageIndex + 1,
      pageCount: prepared.pages.length,
      targetStart: page.targetStart,
      targetCount: page.targetCount,
      totalTargets: prepared.totalTargets,
    }) || [];
    return `
      <div class="survey-scan-overlay" aria-hidden="true">
        <span class="survey-registration-marker survey-registration-marker--top-left"></span>
        <span class="survey-registration-marker survey-registration-marker--top-right"></span>
        <span class="survey-registration-marker survey-registration-marker--bottom-right"></span>
        <span class="survey-registration-marker survey-registration-marker--bottom-left"></span>
        <span class="survey-scan-code">${bits.map((bit) => `<span class="survey-scan-code__cell${bit ? " is-black" : ""}"></span>`).join("")}</span>
      </div>
    `;
  }

  function renderSurveyFormQuestion(question, index) {
    const heading = `<h3>${index + 1}. ${escapeHtml(question.title)}</h3>`;
    if (question.type === "single" || question.type === "multiple") {
      return `
        <section class="survey-form-question">
          ${heading}
          <div class="survey-form-options">
            ${question.options.map((option) => `<div class="survey-form-option"><span class="survey-omr-box" aria-hidden="true"></span><span>${escapeHtml(formatSurveyChoiceLabel(option))}</span></div>`).join("")}
          </div>
        </section>
      `;
    }
    if (question.type === "matrix_single" || question.type === "matrix_multiple" || question.type === "number_matrix") {
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
                    ${question.columns.map(() => `<td>${question.type === "matrix_single" || question.type === "matrix_multiple" ? `<span class="survey-omr-box" aria-hidden="true"></span>` : ""}</td>`).join("")}
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

  async function printSurveyForm() {
    const survey = getCurrentSurvey();
    if (!survey) return;
    try {
      state.surveyPrintPages = await prepareSurveyPrintPages(survey);
      document.body.classList.add("printing-survey-form");
      render();
      await nextAnimationFrame();
      await nextAnimationFrame();
      window.print();
    } catch (error) {
      console.error(error);
      state.flash = error.message || "アンケート用紙を準備できませんでした。";
      render();
    } finally {
      document.body.classList.remove("printing-survey-form");
    }
  }

  async function prepareSurveyPrintPages(survey) {
    const measurement = document.createElement("div");
    measurement.className = "survey-form-measurement";
    measurement.innerHTML = `
      <div class="survey-form-measure-capacity" data-measure-capacity></div>
      <div data-measure-header-first>${renderSurveyFormHeader(survey, false)}</div>
      <div data-measure-header-next>${renderSurveyFormHeader(survey, true)}</div>
      <div data-measure-questions>
        ${survey.questions.map((question, index) => `<div data-measure-question="${index}">${renderSurveyFormQuestion(question, index)}</div>`).join("")}
      </div>
    `;
    document.body.appendChild(measurement);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const capacity = measurement.querySelector("[data-measure-capacity]")?.getBoundingClientRect().height || 940;
      const firstHeaderHeight = getOuterHeight(measurement.querySelector("[data-measure-header-first] > .survey-form__header"));
      const nextHeaderHeight = getOuterHeight(measurement.querySelector("[data-measure-header-next] > .survey-form__header"));
      const measurementRect = measurement.getBoundingClientRect();
      const pixelsPerMm = measurementRect.width / SURVEY_FORM_CONTENT_WIDTH_MM;
      const questionEntries = survey.questions.map((question, index) => {
        const element = measurement.querySelector(`[data-measure-question="${index}"] > .survey-form-question`);
        const textLines = question.type === "text" ? element?.querySelector(".survey-text-lines") : null;
        const elementRect = element?.getBoundingClientRect();
        const textRect = textLines?.getBoundingClientRect();
        return {
          question,
          index,
          height: getOuterHeight(element),
          targetCount: getQuestionScanTargets(question, index).length,
          textRegion: elementRect && textRect ? {
            left: textRect.left - measurementRect.left,
            top: textRect.top - elementRect.top,
            width: textRect.width,
            height: textRect.height,
          } : null,
        };
      });
      const pages = [];
      let current = { questions: [], usedHeight: firstHeaderHeight, targetStart: 0, targetCount: 0 };
      questionEntries.forEach((entry) => {
        if (nextHeaderHeight + entry.height > capacity) {
          throw new Error(`${entry.index + 1}問目が1ページに収まりません。設問文または選択肢を短くしてください。`);
        }
        if (current.usedHeight + entry.height > capacity) {
          pages.push(current);
          current = { questions: [], usedHeight: nextHeaderHeight, targetStart: 0, targetCount: 0 };
        }
        current.questions.push({ ...entry, top: current.usedHeight });
        current.usedHeight += entry.height;
      });
      if (current.questions.length || !pages.length) pages.push(current);

      let targetStart = 0;
      pages.forEach((page, pageIndex) => {
        page.targetStart = targetStart;
        page.targetCount = page.questions.reduce((sum, entry) => sum + entry.targetCount, 0);
        page.textRegions = page.questions
          .filter((entry) => entry.textRegion)
          .map((entry) => ({
            questionId: entry.question.id,
            questionIndex: entry.index,
            label: `${entry.index + 1}. ${entry.question.title}`,
            pageNumber: pageIndex + 1,
            x: Math.round((SURVEY_FORM_CONTENT_LEFT_MM + entry.textRegion.left / pixelsPerMm) * SURVEY_SCAN_PX_PER_MM),
            y: Math.round((SURVEY_FORM_CONTENT_TOP_MM + (entry.top + entry.textRegion.top) / pixelsPerMm) * SURVEY_SCAN_PX_PER_MM),
            width: Math.round(entry.textRegion.width / pixelsPerMm * SURVEY_SCAN_PX_PER_MM),
            height: Math.round(entry.textRegion.height / pixelsPerMm * SURVEY_SCAN_PX_PER_MM),
          }));
        if (page.targetCount > 255) throw new Error("1ページの回答欄が多すぎます。設問を分割してください。");
        targetStart += page.targetCount;
      });
      if (pages.length > 255) throw new Error("アンケート用紙が255ページを超えています。設問数を減らしてください。");
      if (targetStart > 65535) throw new Error("回答欄が多すぎます。設問数を減らしてください。");
      return {
        surveyId: survey.id,
        fingerprint: getSurveyScanFingerprint(survey),
        totalTargets: targetStart,
        pages,
      };
    } finally {
      measurement.remove();
    }
  }

  function getOuterHeight(element) {
    if (!(element instanceof HTMLElement)) return 0;
    const style = window.getComputedStyle(element);
    return element.getBoundingClientRect().height + parseFloat(style.marginTop || 0) + parseFloat(style.marginBottom || 0);
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
      ${renderScanReview()}
      <div${tourAttr("answer-form")}>
        ${survey.questions.map((question, index) => renderAnswerQuestion(question, index)).join("")}
      </div>
      ${renderResponseTagEditor()}
      <section class="toolbar toolbar-bottom no-print">
        <button class="button button-primary" type="button" data-action="save-response">保存</button>
      </section>
    `;
  }

  function renderScanReview() {
    const review = state.scanReview;
    if (!review) return "";
    const reviewedTexts = (review.textResults || []).filter((item) => !item.blank);
    return `
      <section class="panel scan-review-panel no-print">
        <div class="section-heading">
          <div>
            <h2>画像の読み取り結果</h2>
            <p class="muted-text">${review.pageCount}ページ、回答欄${review.markCount}個を確認${review.textResultCount ? `、自由記述${review.textResultCount}件を仮入力` : ""}しました。</p>
          </div>
          <p class="scan-review-status">回答入力へ反映済み</p>
        </div>
        <p>回答枠は緑が選択あり、灰色が選択なし、オレンジが要確認です。自由記述欄は青枠で示しています。用紙画像と入力内容を照合してから保存してください。</p>
        <p class="scan-manual-note">自由記述は文字認識による仮入力です。誤りや抜けを修正してください。数字、連絡先、「その他」の記入文字は手入力してください。</p>
        ${review.warnings.length ? `
          <div class="message-group message-warning scan-review-warnings">
            <h3>確認が必要な箇所</h3>
            <ul>${review.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>
          </div>
        ` : ""}
        ${reviewedTexts.length ? `
          <div class="scan-text-review">
            <h3>自由記述の読み取り</h3>
            <div class="scan-text-review-list">
              ${reviewedTexts.map((item) => `
                <article class="scan-text-review-item">
                  <img src="${escapeAttr(item.imageDataUrl)}" alt="${escapeAttr(item.label)}の切り出し画像" />
                  <div>
                    <h4>${escapeHtml(item.label)}</h4>
                    <p>${item.text ? escapeHtml(item.text) : "文字を認識できませんでした。回答欄へ手入力してください。"}</p>
                  </div>
                </article>
              `).join("")}
            </div>
          </div>
        ` : ""}
        <div class="scan-review-pages">
          ${review.pages.map((page) => `
            <figure>
              <img src="${escapeAttr(page.previewDataUrl)}" alt="読み取り結果 ${page.metadata.pageNumber}ページ目" />
              <figcaption>${page.metadata.pageNumber} / ${page.metadata.pageCount}ページ</figcaption>
            </figure>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderResponseTagEditor() {
    const selectedTags = normalizeResponseTags(state.currentResponse?.tags);
    const selected = new Set(selectedTags);
    const reusableTags = getResponseTagCounts(getCurrentResponses()).map((item) => item.tag).filter((tag) => !selected.has(tag));
    return `
      <section class="panel response-tags-panel no-print"${tourAttr("response-tags")}>
        <div class="section-heading"><h2>回答タグ</h2><p class="count-label">任意</p></div>
        <div class="response-tag-editor">
          <div class="response-tag-list">
            ${selectedTags.length ? selectedTags.map((tag) => `
              <button class="response-tag response-tag-removable" type="button" data-action="remove-response-tag" data-tag="${escapeAttr(tag)}" aria-label="${escapeAttr(`${tag}を外す`)}" title="タグを外す">
                <span>${escapeHtml(tag)}</span><span class="response-tag-remove" aria-hidden="true">×</span>
              </button>
            `).join("") : `<span class="response-tag-empty">なし</span>`}
          </div>
          <div class="response-tag-entry">
            <label class="field"><span>タグを追加</span><input type="text" maxlength="40" autocomplete="off" data-response-tag-input /></label>
            <button class="button" type="button" data-action="add-response-tag">追加</button>
          </div>
          ${reusableTags.length ? `
            <div class="response-tag-suggestions">
              <span class="response-tag-suggestions-label">既存のタグ</span>
              <div class="response-tag-list">
                ${reusableTags.map((tag) => `<button class="response-tag response-tag-choice" type="button" data-action="add-response-tag" data-tag="${escapeAttr(tag)}">${escapeHtml(tag)}</button>`).join("")}
              </div>
            </div>
          ` : ""}
        </div>
      </section>
    `;
  }

  function renderResponseTagBadges(tags) {
    const normalized = normalizeResponseTags(tags);
    if (!normalized.length) return `<span class="response-tag-empty">なし</span>`;
    return `<div class="response-tag-list">${normalized.map((tag) => `<span class="response-tag">${escapeHtml(tag)}</span>`).join("")}</div>`;
  }

  function renderAnswerQuestion(question, index) {
    const answer = state.currentResponse.answers[question.id];
    if (question.type === "contact") return renderContactAnswer(question, index);
    if (question.type === "single") return renderSingleAnswer(question, index, answer || "");
    if (question.type === "multiple") return renderMultipleAnswer(question, index, answer || []);
    if (question.type === "matrix_single") return renderMatrixSingleAnswer(question, index, answer || {});
    if (question.type === "matrix_multiple") return renderMatrixMultipleAnswer(question, index, answer || {});
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
    if (index < 0 || index >= 10) return "";
    const key = index === 9 ? 0 : index + 1;
    return `<span class="shortcut-key${extraClass ? ` ${extraClass}` : ""}" aria-hidden="true">${key}</span>`;
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
    return renderChoiceMatrixAnswer(question, index, answer, false);
  }

  function renderMatrixMultipleAnswer(question, index, answer) {
    return renderChoiceMatrixAnswer(question, index, answer, true);
  }

  function renderChoiceMatrixAnswer(question, index, answer, multiple) {
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
                  ${question.columns.map((column) => `<td class="choice-cell"><label class="table-choice"><input type="${multiple ? "checkbox" : "radio"}"${multiple ? "" : ` name="answer_${escapeAttr(question.id)}_${escapeAttr(row.id)}"`} value="${escapeAttr(column.id)}" data-answer data-question-id="${escapeAttr(question.id)}" data-row-id="${escapeAttr(row.id)}"${getMatrixSelectedColumnIds(answer, row.id).includes(column.id) ? " checked" : ""} /><span class="visually-hidden">${escapeHtml(column.label)}</span></label></td>`).join("")}
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
          <label class="field field-wide"><span>メモ</span><textarea rows="3" data-contact-field="memo">${escapeHtml(contact.memo || "")}</textarea></label>
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
      <section class="panel no-print report-overall-settings"${tourAttr("report-order")}>
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
    if (question.type === "matrix_single" || question.type === "matrix_multiple") return renderMatrixCrossAggregateQuestion(item, groups);
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
                        const count = countMatrixAnswers(question, group.responses, row.id, column.id);
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
    if (question.type === "matrix_single" || question.type === "matrix_multiple") return renderMatrixAggregate(question, responses, index, itemOrder);
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
      count: countMatrixAnswers(question, responses, row.id, column.id),
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
    const firstChartQuestion = getReportableQuestions(getCurrentSurvey()).find(isReportChartQuestion);
    const chartTourAttr = firstChartQuestion?.id === question.id ? tourAttr("report-chart") : "";
    return `
      <div class="report-question-heading">
        <h3>${index + 1}. ${escapeHtml(question.title)}</h3>
        ${isReportChartQuestion(question) ? `
          <label class="chart-type-field no-print"${chartTourAttr}>
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

  function getMatrixSelectedColumnIds(answer, rowId) {
    const value = answer?.[rowId];
    if (Array.isArray(value)) return value.filter(Boolean);
    return value ? [value] : [];
  }

  function countMatrixAnswers(question, responses, rowId, columnId) {
    return responses.filter((response) => getMatrixSelectedColumnIds(response.answers[question.id], rowId).includes(columnId)).length;
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
      paletteIndex: index % REPORT_CHART_COLORS.length,
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
    return `<span class="chart-key chart-key--${entry.paletteIndex + 1}" aria-hidden="true">${entry.number}</span>`;
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
        const contrastClass = entry.textColor === "#FFFFFF" ? "donut-chart__number--light" : "donut-chart__number--dark";
        labels.push(`<text class="donut-chart__number ${contrastClass}" x="${x.toFixed(3)}" y="${y.toFixed(3)}">${entry.number}</text>`);
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
    const answers = getTextAnswerEntries(question, responses);
    const firstTextQuestion = getReportableQuestions(getCurrentSurvey()).find((item) => item.type === "text");
    const commentsTourAttr = firstTextQuestion?.id === question.id ? tourAttr("report-comments") : "";
    return `
      <section class="question-block text-question-block"${commentsTourAttr}>
        <h3>${index + 1}. ${escapeHtml(question.title)}</h3>
        <p>記入あり: ${answers.length}件</p>
        ${answers.length ? `
          <div class="free-text-report free-text-report-with-replies">
            ${answers.map((entry, answerIndex) => `
              <article class="free-text-report-item">
                <div class="free-text-answer">
                  <div class="free-text-answer-label">回答 ${answerIndex + 1}</div>
                  <div class="free-text-answer-body">${escapeHtml(entry.answer)}</div>
                </div>
                <label class="free-text-reply-toggle no-print">
                  <input type="checkbox" data-free-text-reply-enabled data-response-id="${escapeAttr(entry.response.id)}" data-question-id="${escapeAttr(question.id)}"${entry.replyEnabled ? " checked" : ""} />
                  <span>コメントを掲載する</span>
                </label>
                ${entry.replyEnabled ? `
                  <label class="field free-text-reply-editor no-print">
                    <span>回答へのコメント</span>
                    <textarea rows="3" data-free-text-reply data-response-id="${escapeAttr(entry.response.id)}" data-question-id="${escapeAttr(question.id)}">${escapeHtml(entry.replyValue)}</textarea>
                  </label>
                ` : ""}
                <div class="free-text-reply print-only${entry.replyEnabled && entry.reply ? "" : " is-empty"}" data-free-text-reply-print>
                  <strong>回答へのコメント</strong>
                  <div class="free-text-reply-text" data-free-text-reply-print-text>${escapeHtml(entry.reply)}</div>
                </div>
              </article>
            `).join("")}
          </div>
        ` : `<p class="question-note">記入された回答はありません。</p>`}
      </section>
    `;
  }

  function getTextAnswerEntries(question, responses) {
    return responses.map((response) => {
      const answer = String(response.answers[question.id] || "").trim();
      const replyValue = String(response.freeTextReplies?.[question.id] || "");
      const replyEnabled = response.freeTextReplyEnabled?.[question.id] === true;
      return { response, answer, replyValue, reply: replyValue.trim(), replyEnabled };
    }).filter((entry) => entry.answer);
  }

  function renderContactsPage() {
    const responseIds = new Set(getCurrentResponses().map((response) => response.id));
    const contacts = state.contacts.filter((contact) => responseIds.has(contact.responseId) && hasContactValue(contact));
    return `
      <section class="toolbar no-print">
        <button class="button button-back" type="button" data-action="list">← 回答一覧へ戻る</button>
        <span class="toolbar-break" aria-hidden="true"></span>
        <button class="button button-primary" type="button" data-action="export-contact-csv"${tourAttr("contacts-export")}>連絡先CSV</button>
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
          <thead><tr><th>回答番号</th><th>名前</th><th>住所</th><th>電話番号</th><th>メモ</th></tr></thead>
          <tbody>
            ${contacts.map((contact) => {
              const index = responses.findIndex((response) => response.id === contact.responseId);
              return `<tr><td>${index >= 0 ? index + 1 : "-"}</td><td>${escapeHtml(contact.name || "")}</td><td>${escapeHtml(contact.address || "")}</td><td>${escapeHtml(contact.phone || "")}</td><td>${escapeHtml(contact.memo || "")}</td></tr>`;
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
    const responses = getResponsesForSurvey(id);
    if (!window.confirm(`「${survey.title}」と回答${responses.length}件を削除します。よろしいですか？`)) return;
    for (const response of responses) {
      await deleteRecord(RESPONSE_STORE, response.id);
      await deleteRecord(CONTACT_STORE, response.id);
    }
    await deleteRecord(SURVEY_STORE, id);
    if (survey.id === PRESET_SURVEY_ID) markDefaultPresetDeleted();
    await refreshData();
    showHome();
  }

  function selectSurvey(id) {
    if (!state.surveys.some((survey) => survey.id === id)) return;
    disposeScanImport();
    state.currentSurveyId = id;
    state.scanReview = null;
    state.surveyPrintPages = null;
    state.responseTagFilter = "";
    resetReportSelection();
    state.view = "list";
    state.flash = "";
    render();
  }

  function showHome() {
    disposeScanImport();
    state.view = "home";
    state.currentSurveyId = "";
    state.surveyDraft = null;
    state.currentResponse = null;
    state.currentContact = null;
    state.scanReview = null;
    state.surveyPrintPages = null;
    state.responseTagFilter = "";
    resetActiveAnswerPosition(null);
    resetReportSelection();
    state.messages = [];
    render();
  }

  function showWorkspace(view) {
    if (!state.currentSurveyId) return showHome();
    if (state.view === "scan-import") disposeScanImport();
    state.view = view;
    state.currentResponse = null;
    state.currentContact = null;
    state.scanReview = null;
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
      const surveyId = step.useExistingSurvey ? getTourSurveyId() : "";
      const existingSurvey = state.surveys.find((survey) => survey.id === surveyId);
      state.view = "survey-edit";
      state.currentSurveyId = "";
      if (step.useExistingSurvey) state.surveyDraft = existingSurvey ? clone(existingSurvey) : createDefaultSurvey();
      else if (!state.surveyDraft) state.surveyDraft = createDefaultSurvey();
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

  function createScanImportState() {
    return { pages: [], errors: [], processing: false, progressText: "" };
  }

  function openScanImport() {
    const survey = getCurrentSurvey();
    if (!survey) return showHome();
    disposeScanImport();
    state.scanImport = createScanImportState();
    state.scanReview = null;
    state.view = "scan-import";
    state.messages = [];
    state.flash = "";
    render();
  }

  async function addScanImportFiles(fileList) {
    if (!state.scanImport) state.scanImport = createScanImportState();
    const files = Array.from(fileList || []);
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    const errors = [];
    files.forEach((file) => {
      if (!allowedTypes.has(file.type)) {
        errors.push(`${file.name} はJPEG・PNG・WebP画像ではありません。`);
        return;
      }
      if (file.size > 30 * 1024 * 1024) {
        errors.push(`${file.name} は30MBを超えているため追加できません。`);
        return;
      }
      if (state.scanImport.pages.length >= 30) {
        errors.push("一度に追加できる画像は30ページまでです。");
        return;
      }
      state.scanImport.pages.push({
        id: createId("scan-page"),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    });
    state.scanImport.errors = errors;
    render();
  }

  function removeScanImportPage(id) {
    const pageIndex = state.scanImport?.pages.findIndex((page) => page.id === id) ?? -1;
    if (pageIndex < 0) return;
    const [page] = state.scanImport.pages.splice(pageIndex, 1);
    if (page?.previewUrl) URL.revokeObjectURL(page.previewUrl);
    state.scanImport.errors = [];
    render();
  }

  function disposeScanImport() {
    state.scanImport?.pages?.forEach((page) => {
      if (page.previewUrl) URL.revokeObjectURL(page.previewUrl);
    });
    state.scanImport = null;
  }

  async function analyzeScanImport() {
    const survey = getCurrentSurvey();
    const scanImport = state.scanImport;
    if (!survey || !scanImport?.pages.length || scanImport.processing) return;
    if (!window.SurveyScan) {
      scanImport.errors = ["画像読み取り機能を読み込めませんでした。画面を再読み込みしてください。"];
      render();
      return;
    }
    scanImport.processing = true;
    scanImport.errors = [];
    scanImport.progressText = "用紙の読み取り位置を確認中…";
    render();
    await nextAnimationFrame();

    let prepared;
    try {
      prepared = await prepareSurveyPrintPages(survey);
    } catch (error) {
      console.error(error);
      scanImport.processing = false;
      scanImport.progressText = "";
      scanImport.errors = [error.message || "アンケート用紙の読み取り位置を確認できませんでした。"];
      render();
      return;
    }

    const fingerprint = prepared.fingerprint;
    const textRegionsByPage = Object.fromEntries(prepared.pages.map((page, index) => [index + 1, page.textRegions || []]));
    const results = [];
    const errors = [];
    for (let index = 0; index < scanImport.pages.length; index += 1) {
      if (state.scanImport !== scanImport) return;
      const page = scanImport.pages[index];
      scanImport.progressText = `用紙画像を読み取り中（${index + 1}/${scanImport.pages.length}）`;
      render();
      await nextAnimationFrame();
      try {
        const result = await window.SurveyScan.analyzeFile(page.file, {
          expectedFingerprint: fingerprint,
          textRegionsByPage,
        });
        results.push({ ...result, sourceName: page.file.name });
      } catch (error) {
        console.error(error);
        errors.push(`${index + 1}番目の画像（${page.file.name}）: ${error.message || "読み取れませんでした。"}`);
      }
      await nextAnimationFrame();
    }

    if (state.scanImport !== scanImport) return;

    const targets = getSurveyScanTargets(survey);
    if (!errors.length) errors.push(...validateScanResults(results, targets, fingerprint));
    if (errors.length) {
      scanImport.processing = false;
      scanImport.progressText = "";
      scanImport.errors = errors;
      render();
      return;
    }

    results.sort((a, b) => a.metadata.pageNumber - b.metadata.pageNumber);
    const textRegions = results.flatMap((page) => page.textRegions || []);
    let textResults = [];
    let ocrWarning = "";
    if (textRegions.length) {
      if (!window.SurveyOcr) {
        ocrWarning = "自由記述の文字認識機能を読み込めませんでした。用紙を見ながら手入力してください。";
      } else {
        let lastProgressText = "";
        try {
          textResults = await window.SurveyOcr.recognizeRegions(textRegions, {
            onProgress(progress) {
              if (state.scanImport !== scanImport) return;
              let progressText = "自由記述の文字認識を準備中…";
              if (progress.stage === "recognizing" || progress.stage === "recognizing-progress") {
                const current = Math.min((progress.completed || 0) + 1, progress.total || 1);
                progressText = `自由記述を読み取り中（${current}/${progress.total || 1}）`;
              }
              if (progressText === lastProgressText) return;
              lastProgressText = progressText;
              scanImport.progressText = progressText;
              render();
            },
          });
        } catch (error) {
          console.error(error);
          ocrWarning = "自由記述を文字認識できませんでした。用紙を見ながら手入力してください。";
        }
      }
    }

    const applied = applyScanResultsToResponse(survey, targets, results, textResults);
    if (ocrWarning) applied.warnings.push(ocrWarning);
    disposeScanImport();
    state.currentResponse = applied.response;
    state.currentContact = createContact(applied.response.id);
    state.scanReview = {
      pageCount: results.length,
      markCount: results.reduce((sum, page) => sum + page.marks.length, 0),
      pages: results,
      textResults,
      textResultCount: textResults.filter((item) => item.text).length,
      warnings: [...new Set(applied.warnings)],
    };
    state.view = "response-edit";
    resetActiveAnswerPosition(survey);
    state.messages = [];
    state.flash = "読み取り結果を回答入力へ反映しました。自由記述を含め、用紙と照合してから保存してください。";
    render();
    queuePageTopScroll();
  }

  function validateScanResults(results, targets, expectedFingerprint) {
    const errors = [];
    if (!results.length) return ["回答用紙を読み取れませんでした。"];
    const first = results[0].metadata;
    if (results.some((page) => page.metadata.fingerprint !== (expectedFingerprint >>> 0))) {
      errors.push("別のアンケート用紙が含まれています。");
    }
    if (results.some((page) => page.metadata.pageCount !== first.pageCount)) {
      errors.push("異なる出力時点の回答用紙が混在しています。");
    }
    if (results.some((page) => page.metadata.totalTargets !== targets.length)) {
      errors.push("アンケート設問が用紙出力後に変更されています。現在のアンケートから用紙を出力し直してください。");
    }
    const pageNumbers = results.map((page) => page.metadata.pageNumber);
    const uniquePageNumbers = new Set(pageNumbers);
    if (uniquePageNumbers.size !== pageNumbers.length) errors.push("同じページが複数回追加されています。");
    const expectedPages = Array.from({ length: first.pageCount }, (_, index) => index + 1);
    const missingPages = expectedPages.filter((pageNumber) => !uniquePageNumbers.has(pageNumber));
    if (missingPages.length) errors.push(`不足しているページがあります：${missingPages.join("、")}ページ`);
    if (results.length > first.pageCount) errors.push("この回答用紙に含まれない画像があります。");

    const sorted = [...results].sort((a, b) => a.metadata.pageNumber - b.metadata.pageNumber);
    let expectedStart = 0;
    sorted.forEach((page) => {
      if (page.metadata.targetStart !== expectedStart) {
        errors.push(`${page.metadata.pageNumber}ページ目の回答欄位置が現在のアンケートと一致しません。`);
      }
      if (page.marks.length !== page.metadata.targetCount) {
        errors.push(`${page.metadata.pageNumber}ページ目は回答欄${page.metadata.targetCount}個のうち${page.marks.length}個を検出しました。影や傾きを避けて撮影し直してください。`);
      }
      expectedStart = page.metadata.targetStart + page.metadata.targetCount;
    });
    if (expectedStart !== targets.length) errors.push("回答欄の総数が現在のアンケートと一致しません。");
    return [...new Set(errors)];
  }

  function applyScanResultsToResponse(survey, targets, results, textResults = []) {
    const response = createResponse(survey.id);
    const warnings = [];
    const singleGroups = new Map();

    results.forEach((page) => {
      page.marks.forEach((mark, markIndex) => {
        const targetIndex = page.metadata.targetStart + markIndex;
        const target = targets[targetIndex];
        if (!target) return;
        if (mark.uncertain) warnings.push(`${target.label} の記入が薄い、または枠線に近いため確認してください。`);
        if (!mark.selected) return;
        if (target.type === "single" || target.type === "matrix_single") {
          const groupKey = target.type === "single" ? target.questionId : `${target.questionId}:${target.rowId}`;
          if (!singleGroups.has(groupKey)) singleGroups.set(groupKey, []);
          singleGroups.get(groupKey).push({ target, mark });
          return;
        }
        if (target.type === "multiple") {
          if (!Array.isArray(response.answers[target.questionId])) response.answers[target.questionId] = [];
          response.answers[target.questionId].push(target.optionId);
          return;
        }
        if (target.type === "matrix_multiple") {
          if (!response.answers[target.questionId] || typeof response.answers[target.questionId] !== "object") response.answers[target.questionId] = {};
          if (!Array.isArray(response.answers[target.questionId][target.rowId])) response.answers[target.questionId][target.rowId] = [];
          response.answers[target.questionId][target.rowId].push(target.columnId);
        }
      });
    });

    singleGroups.forEach((entries) => {
      entries.sort((a, b) => b.mark.score - a.mark.score);
      const selected = entries[0].target;
      if (selected.type === "single") {
        response.answers[selected.questionId] = selected.optionId;
      } else {
        if (!response.answers[selected.questionId] || typeof response.answers[selected.questionId] !== "object") response.answers[selected.questionId] = {};
        response.answers[selected.questionId][selected.rowId] = selected.columnId;
      }
      if (entries.length > 1) warnings.push(`${selected.groupLabel} に複数の記入を検出しました。最も濃い回答を入力しています。`);
    });

    let recognizedTextCount = 0;
    textResults.forEach((item) => {
      if (item.blank) return;
      const question = survey.questions.find((entry) => entry.id === item.questionId && entry.type === "text");
      if (!question) return;
      if (item.error || !item.text) {
        warnings.push(`${item.label} は文字を認識できませんでした。用紙を見ながら入力してください。`);
        return;
      }
      response.answers[item.questionId] = response.answers[item.questionId]
        ? `${response.answers[item.questionId]}\n${item.text}`
        : item.text;
      recognizedTextCount += 1;
      if (item.confidence !== null && item.confidence < 50) {
        warnings.push(`${item.label} は文字認識の確度が低いため、特に注意して確認してください。`);
      }
    });
    if (recognizedTextCount) {
      warnings.push("自由記述は文字認識による仮入力です。用紙の原文と照合し、誤りや抜けを修正してください。");
    }

    return { response, warnings: [...new Set(warnings)] };
  }

  function getSurveyScanTargets(survey) {
    return (survey?.questions || []).flatMap((question, questionIndex) => getQuestionScanTargets(question, questionIndex));
  }

  function getQuestionScanTargets(question, questionIndex) {
    if (question.type === "single" || question.type === "multiple") {
      return question.options.map((option) => ({
        type: question.type,
        questionId: question.id,
        optionId: option.id,
        label: `${questionIndex + 1}. ${option.label}`,
        groupLabel: `${questionIndex + 1}. ${question.title}`,
      }));
    }
    if (question.type === "matrix_single" || question.type === "matrix_multiple") {
      return question.rows.flatMap((row) => question.columns.map((column) => ({
        type: question.type,
        questionId: question.id,
        rowId: row.id,
        columnId: column.id,
        label: `${questionIndex + 1}. ${row.label}／${column.label}`,
        groupLabel: `${questionIndex + 1}. ${row.label}`,
      })));
    }
    return [];
  }

  function getSurveyScanFingerprint(survey) {
    if (!window.SurveyScan) return 0;
    const definition = (survey?.questions || []).map((question) => ({
      id: question.id,
      type: question.type,
      options: (question.options || []).map((option) => option.id),
      rows: (question.rows || []).map((row) => row.id),
      columns: (question.columns || []).map((column) => column.id),
    }));
    return window.SurveyScan.fingerprint(JSON.stringify({ questions: definition }));
  }

  function nextAnimationFrame() {
    return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
  }

  function openResponseEditor(id) {
    const survey = getCurrentSurvey();
    if (!survey) return showHome();
    const response = id ? getCurrentResponses().find((item) => item.id === id) : null;
    state.currentResponse = response ? clone(response) : createResponse(survey.id);
    state.currentContact = clone(state.contacts.find((contact) => contact.responseId === state.currentResponse.id) || createContact(state.currentResponse.id));
    state.scanReview = null;
    state.view = "response-edit";
    resetActiveAnswerPosition(survey);
    state.messages = [];
    state.flash = "";
    render();
  }

  function addResponseTags(value) {
    if (!state.currentResponse) return;
    const additions = normalizeResponseTags(value);
    if (!additions.length) return;
    state.currentResponse.tags = mergeResponseTags(state.currentResponse.tags, additions);
    render();
  }

  function removeResponseTag(tag) {
    if (!state.currentResponse) return;
    state.currentResponse.tags = normalizeResponseTags(state.currentResponse.tags).filter((item) => item !== tag);
    render();
  }

  async function saveCurrentResponse(options = {}) {
    const survey = getCurrentSurvey();
    if (!survey || !state.currentResponse || state.responseSaveInProgress) return;
    state.responseSaveInProgress = true;
    try {
      const pendingTags = normalizeResponseTags(root?.querySelector("[data-response-tag-input]")?.value || "");
      if (pendingTags.length) state.currentResponse.tags = mergeResponseTags(state.currentResponse.tags, pendingTags);
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
      state.scanReview = null;
      if (options.openNext) {
        state.view = "response-edit";
        state.currentResponse = createResponse(survey.id);
        state.currentContact = createContact(state.currentResponse.id);
        resetActiveAnswerPosition(survey);
        state.flash = "保存しました。次の回答を入力できます。";
        render();
        queuePageTopScroll();
        return;
      }
      state.view = "list";
      state.currentResponse = null;
      state.currentContact = null;
      resetActiveAnswerPosition(survey);
      state.flash = "保存しました。";
      render();
    } catch (error) {
      console.error(error);
      state.flash = "回答の保存に失敗しました。もう一度保存してください。";
      render();
    } finally {
      state.responseSaveInProgress = false;
    }
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
    } else if (question.type === "matrix_multiple") {
      answers[question.id] ||= {};
      const selected = new Set(getMatrixSelectedColumnIds(answers[question.id], target.dataset.rowId));
      if (target.checked) selected.add(target.value);
      else selected.delete(target.value);
      answers[question.id][target.dataset.rowId] = Array.from(selected);
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
      presetDefaultsApplied: { [PRESET_DEFAULTS_VERSION]: true, [PRESET_CONTENT_VERSION]: true, [PRESET_TITLE_VERSION]: true },
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
      createQuestion("matrix_multiple", "第2町内会で行われている（過去におこなっていた）次の活動・行事について、それぞれお答えください。当てはまる欄に○をつけてください。", [["general_meeting", "総会"], ["year_end_new_year_party", "忘年会・新年会"], [PRESET_ACTIVITY_COMBINED_ROW_ID, PRESET_ACTIVITY_COMBINED_ROW_LABEL], ["park_meal", "公園での食事会"], ["snow_light_event", "冬のイベント ゆきあかり"], ["radio_exercise", "ラジオ体操"]], [["participated", "参加したことがある"], ["not_participated", "参加したことがない"], ["continue", "今後も継続してほしい"], ["discontinue", "今後継続の必要はない"], ["unknown", "わからない"]]),
      createQuestion("multiple", "新川第2町内会でどのような企画・テーマであれば参加したいですか？（当てはまるものすべてに○をつけて下さい）", [["cooking", "料理教室・お菓子作り教室・コーヒー教室"], ["tea", "お茶会"], ["community_dining", "飲食店とタイアップした地域食堂"], ["walking", "まち歩きスタンプラリー"], ["child_event", "子育てサロン、子ども向けイベント"], ["disaster_health", "防災の勉強会、健康づくり教室"], ["smartphone", "スマートフォン・SNSの使い方講座"], ["other", "その他"]]),
      createQuestion("single", "新川第2町内会では町内会活動をお伝えするために回覧板で情報発信を行っています。回覧板はどのくらいご覧になっていますか？（当てはまるもの1つに○をつけて下さい）", [["always", "毎回しっかり見ている"], ["mostly", "しっかりではないが内容はだいたい見ている"], ["rarely", "ほとんど見ていない・読んでいない"], ["never", "まったく見ていない"], ["never_and_burdensome", "まったく見ないし、回覧板を回すのもめんどう"], ["unknown", "わからない"], ["other", "その他"]]),
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
    if (type === "matrix_single" || type === "matrix_multiple" || type === "number_matrix") {
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
    } else if (question.type === "matrix_single" || question.type === "matrix_multiple" || question.type === "number_matrix") {
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
    return { id: createId("response"), surveyId, answers: {}, tags: [], freeTextReplies: {}, freeTextReplyEnabled: {}, createdAt: now, updatedAt: now };
  }

  function createContact(responseId) {
    const now = nowIsoString();
    return { responseId, name: "", address: "", phone: "", memo: "", createdAt: now, updatedAt: now };
  }

  async function ensurePresetSurvey() {
    const presetSurveys = state.surveys.filter(isPresetSurvey);
    const activeSurveys = new Map(state.surveys.map((survey) => [survey.id, survey]));
    let changed = false;

    for (const presetSurvey of presetSurveys) {
      const updated = applyPresetDefaultsOnce(presetSurvey);
      if (updated) {
        await putRecord(SURVEY_STORE, updated);
        activeSurveys.set(updated.id, updated);
        changed = true;
      }
    }

    for (const survey of activeSurveys.values()) {
      const merged = mergeLegacyPresetActivityRows(survey);
      const activeSurvey = merged || survey;
      if (merged) {
        await putRecord(SURVEY_STORE, merged);
        changed = true;
      }
      if (await migratePresetActivityResponses(activeSurvey)) changed = true;
    }

    if (!presetSurveys.length && !wasDefaultPresetDeleted()) {
      await putRecord(SURVEY_STORE, createPresetSurvey());
      changed = true;
    }
    if (changed) await refreshData();
  }

  function mergeLegacyPresetActivityRows(survey) {
    const activityQuestion = survey?.questions?.find((question) => question.rows?.some((row) => row.id === PRESET_ACTIVITY_LEGACY_ROW_ID));
    if (!activityQuestion) return null;
    const updated = clone(survey);
    const updatedQuestion = updated.questions.find((question) => question.id === activityQuestion.id);
    const hasCombinedRow = updatedQuestion.rows.some((row) => row.id === PRESET_ACTIVITY_COMBINED_ROW_ID);
    updatedQuestion.type = "matrix_multiple";
    updatedQuestion.options = [];
    updatedQuestion.reportChartType = getReportChartType(updatedQuestion);
    updatedQuestion.rows = updatedQuestion.rows.flatMap((row) => {
      if (row.id === PRESET_ACTIVITY_LEGACY_ROW_ID) {
        return hasCombinedRow ? [] : [{ ...row, id: PRESET_ACTIVITY_COMBINED_ROW_ID, label: PRESET_ACTIVITY_COMBINED_ROW_LABEL }];
      }
      if (row.id === PRESET_ACTIVITY_COMBINED_ROW_ID) return [{ ...row, label: PRESET_ACTIVITY_COMBINED_ROW_LABEL }];
      return [row];
    });
    updated.updatedAt = nowIsoString();
    return updated;
  }

  async function migratePresetActivityResponses(survey) {
    const activityQuestion = survey?.questions?.find((question) => question.rows?.some((row) => row.id === PRESET_ACTIVITY_COMBINED_ROW_ID));
    if (!activityQuestion) return false;
    let changed = false;
    for (const response of state.responses.filter((item) => item.surveyId === survey.id)) {
      const migrated = migratePresetActivityResponse(response, activityQuestion.id);
      if (!migrated) continue;
      await putRecord(RESPONSE_STORE, migrated);
      changed = true;
    }
    return changed;
  }

  function migratePresetActivityResponse(response, questionId) {
    const currentAnswer = response?.answers?.[questionId];
    if (!currentAnswer || typeof currentAnswer !== "object" || Array.isArray(currentAnswer) || !Object.prototype.hasOwnProperty.call(currentAnswer, PRESET_ACTIVITY_LEGACY_ROW_ID)) return null;
    const selected = new Set([
      ...getMatrixSelectedColumnIds(currentAnswer, PRESET_ACTIVITY_COMBINED_ROW_ID),
      ...getMatrixSelectedColumnIds(currentAnswer, PRESET_ACTIVITY_LEGACY_ROW_ID),
    ]);
    const migrated = clone(response);
    const nextAnswer = { ...currentAnswer };
    if (selected.size) nextAnswer[PRESET_ACTIVITY_COMBINED_ROW_ID] = Array.from(selected);
    delete nextAnswer[PRESET_ACTIVITY_LEGACY_ROW_ID];
    migrated.answers[questionId] = nextAnswer;
    migrated.updatedAt = nowIsoString();
    return migrated;
  }

  function wasDefaultPresetDeleted() {
    try {
      return window.localStorage.getItem(PRESET_DELETED_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }

  function markDefaultPresetDeleted() {
    try {
      window.localStorage.setItem(PRESET_DELETED_STORAGE_KEY, "true");
    } catch {
      // IndexedDBの削除自体は完了しているため、保存できない環境でも処理を続ける。
    }
  }

  function applyPresetDefaultsOnce(survey) {
    const defaultsApplied = survey?.presetDefaultsApplied || {};
    const needsFamilyDefault = !defaultsApplied[PRESET_DEFAULTS_VERSION];
    const needsContentUpdate = !defaultsApplied[PRESET_CONTENT_VERSION];
    const needsTitleUpdate = !defaultsApplied[PRESET_TITLE_VERSION];
    if (!needsFamilyDefault && !needsContentUpdate && !needsTitleUpdate) return null;
    const updated = clone(survey);
    if (needsContentUpdate) updated.questions = mergePresetQuestionContent(updated.questions, createDefaultQuestions());
    if (needsFamilyDefault) {
      const familyQuestion = updated.questions.find((question) => question.type === "number_matrix");
      if (familyQuestion) familyQuestion.includeInReport = false;
    }
    if (needsTitleUpdate && (!updated.title || updated.title === PRESET_LEGACY_SURVEY_TITLE)) updated.title = PRESET_SURVEY_TITLE;
    updated.presetDefaultsApplied = {
      ...(updated.presetDefaultsApplied || {}),
      [PRESET_DEFAULTS_VERSION]: true,
      [PRESET_CONTENT_VERSION]: true,
      [PRESET_TITLE_VERSION]: true,
    };
    updated.updatedAt = nowIsoString();
    return updated;
  }

  function mergePresetQuestionContent(currentQuestions, templateQuestions) {
    return templateQuestions.map((template, index) => {
      const current = currentQuestions?.[index];
      const compatibleMatrixChange = current?.type === "matrix_single" && template.type === "matrix_multiple";
      if (!current || (current.type !== template.type && !compatibleMatrixChange)) return template;
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
    return survey?.id === PRESET_SURVEY_ID
      || survey?.presetKey === "shinkawa_2_chonaikai"
      || survey?.title === PRESET_SURVEY_TITLE
      || survey?.title === PRESET_LEGACY_SURVEY_TITLE;
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
      type: ["single", "multiple", "matrix_single", "matrix_multiple", "number_matrix", "text", "contact"].includes(input?.type) ? input.type : "single",
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
    const freeTextReplies = normalizeFreeTextReplies(input?.freeTextReplies);
    const hasReplySettings = Boolean(input && Object.prototype.hasOwnProperty.call(input, "freeTextReplyEnabled"));
    return {
      id: input?.id || createId("response"),
      surveyId: input?.surveyId || surveyId || "",
      answers: input?.answers && typeof input.answers === "object" ? input.answers : {},
      tags: normalizeResponseTags(input?.tags),
      freeTextReplies,
      freeTextReplyEnabled: hasReplySettings
        ? normalizeFreeTextReplyEnabled(input.freeTextReplyEnabled)
        : Object.fromEntries(Object.keys(freeTextReplies).map((questionId) => [questionId, true])),
      createdAt: input?.createdAt || nowIsoString(),
      updatedAt: input?.updatedAt || input?.createdAt || nowIsoString(),
    };
  }

  function normalizeFreeTextReplies(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value)
      .map(([questionId, reply]) => [String(questionId || "").trim(), String(reply ?? "")])
      .filter(([questionId, reply]) => questionId && reply.trim()));
  }

  function normalizeFreeTextReplyEnabled(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value)
      .map(([questionId, enabled]) => [String(questionId || "").trim(), enabled === true])
      .filter(([questionId]) => questionId));
  }

  function normalizeResponseTags(value) {
    const source = Array.isArray(value) ? value : (typeof value === "string" ? value.split(/[,、\n]/) : []);
    const seen = new Set();
    return source
      .map((tag) => String(tag ?? "").trim().replace(/\s+/g, " ").slice(0, 40))
      .filter((tag) => {
        if (!tag || seen.has(tag)) return false;
        seen.add(tag);
        return true;
      });
  }

  function mergeResponseTags(currentTags, additions) {
    return normalizeResponseTags([...normalizeResponseTags(currentTags), ...normalizeResponseTags(additions)]);
  }

  function normalizeContact(input) {
    return {
      responseId: input?.responseId || createId("response"),
      name: String(input?.name || ""),
      address: String(input?.address || ""),
      phone: String(input?.phone || ""),
      memo: String(input?.memo || ""),
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
      if ((question.type === "matrix_single" || question.type === "matrix_multiple" || question.type === "number_matrix") && (!question.rows.length || !question.columns.length)) messages.push(`${index + 1}問目の行と列を追加してください。`);
      if ((question.type === "single" || question.type === "multiple") && question.options.some((option) => !option.label.trim())) messages.push(`${index + 1}問目の選択肢名を入力してください。`);
      if ((question.type === "matrix_single" || question.type === "matrix_multiple" || question.type === "number_matrix") && question.rows.some((row) => !row.label.trim())) messages.push(`${index + 1}問目の行名を入力してください。`);
      if ((question.type === "matrix_single" || question.type === "matrix_multiple" || question.type === "number_matrix") && question.columns.some((column) => !column.label.trim())) messages.push(`${index + 1}問目の列名を入力してください。`);
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
    return question?.type === "single" || question?.type === "multiple" || question?.type === "matrix_single" || question?.type === "matrix_multiple";
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

  function setFreeTextReplyEnabled(responseId, questionId, enabled) {
    const response = state.responses.find((item) => item.id === responseId && item.surveyId === state.currentSurveyId);
    if (!response || !questionId) return false;
    const settings = normalizeFreeTextReplyEnabled(response.freeTextReplyEnabled);
    settings[questionId] = enabled === true;
    response.freeTextReplyEnabled = settings;
    return true;
  }

  function setFreeTextReply(responseId, questionId, value) {
    const response = state.responses.find((item) => item.id === responseId && item.surveyId === state.currentSurveyId);
    if (!response || !questionId) return false;
    const replies = normalizeFreeTextReplies(response.freeTextReplies);
    const reply = String(value ?? "");
    if (reply.trim()) replies[questionId] = reply;
    else delete replies[questionId];
    response.freeTextReplies = replies;
    return true;
  }

  function updateFreeTextReplyPrintPreview(target, value) {
    const preview = target.closest(".free-text-report-item")?.querySelector("[data-free-text-reply-print]");
    const previewText = preview?.querySelector("[data-free-text-reply-print-text]");
    if (!preview || !previewText) return;
    const reply = String(value ?? "").trim();
    preview.classList.toggle("is-empty", !reply);
    previewText.textContent = reply;
  }

  function scheduleFreeTextReplySave(responseId, questionId) {
    const key = `${responseId}:${questionId}`;
    const currentTimer = freeTextReplySaveTimers.get(key);
    if (currentTimer) window.clearTimeout(currentTimer);
    const timer = window.setTimeout(() => {
      freeTextReplySaveTimers.delete(key);
      void persistFreeTextReply(responseId).catch((error) => console.error(error));
    }, 400);
    freeTextReplySaveTimers.set(key, timer);
  }

  async function saveFreeTextReply(responseId, questionId) {
    const key = `${responseId}:${questionId}`;
    const currentTimer = freeTextReplySaveTimers.get(key);
    if (currentTimer) window.clearTimeout(currentTimer);
    freeTextReplySaveTimers.delete(key);
    await persistFreeTextReply(responseId);
  }

  async function persistFreeTextReply(responseId) {
    const response = state.responses.find((item) => item.id === responseId && item.surveyId === state.currentSurveyId);
    if (!response) return;
    response.updatedAt = nowIsoString();
    await putRecord(RESPONSE_STORE, normalizeResponse(response, response.surveyId));
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
    return getReportableQuestions(survey).filter((question) => question.id !== axisQuestionId && (question.type === "single" || question.type === "multiple" || question.type === "matrix_single" || question.type === "matrix_multiple"));
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
    return Boolean(String(contact?.name || "").trim() || String(contact?.address || "").trim() || String(contact?.phone || "").trim() || String(contact?.memo || "").trim());
  }

  function getContactForResponse(responseId) {
    return state.contacts.find((contact) => contact.responseId === responseId && hasContactValue(contact)) || null;
  }

  function formatContactListValue(contact) {
    if (!contact) return "なし";
    return String(contact.name || "").trim() || "名前未入力";
  }

  function getResponseTagCounts(responses = getCurrentResponses()) {
    const counts = new Map();
    responses.forEach((response) => {
      normalizeResponseTags(response.tags).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
    });
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => a.tag.localeCompare(b.tag, "ja"));
  }

  function responseHasTag(response, tag) {
    return normalizeResponseTags(response?.tags).includes(tag);
  }

  function formatResponseTags(tags) {
    return normalizeResponseTags(tags).join(" / ");
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
    } else if (question.type === "matrix_single" || question.type === "matrix_multiple") {
      question.rows.forEach((row) => {
        question.columns.forEach((column) => {
          const count = countMatrixAnswers(question, responses, row.id, column.id);
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
    if (!window.confirm("連絡先CSVには氏名・住所・電話番号・メモが含まれます。運営内部で管理してください。出力しますか？")) return;
    const rows = [
      ["回答番号", "名前", "住所", "電話番号", "メモ"],
      ...state.contacts.filter((contact) => responseIds.has(contact.responseId) && hasContactValue(contact)).map((contact) => {
        const index = responses.findIndex((response) => response.id === contact.responseId);
        return [index >= 0 ? index + 1 : "", contact.name, contact.address, contact.phone, contact.memo];
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
    const contactHeaders = hasContactQuestion ? ["連絡先名前", "連絡先住所", "連絡先電話番号", "連絡先メモ"] : [];
    const rows = [
      ["回答番号", "入力日時", "タグ", ...questions.map((question) => question.title), ...contactHeaders],
      ...responses.map((response, index) => {
        const contact = getContactForResponse(response.id);
        const contactValues = hasContactQuestion ? [contact?.name || "", contact?.address || "", contact?.phone || "", contact?.memo || ""] : [];
        return [
          index + 1,
          formatDateTime(response.createdAt),
          formatResponseTags(response.tags),
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
    if (question.type === "matrix_single" || question.type === "matrix_multiple" || question.type === "number_matrix") {
      const rows = [["項目", ...question.columns.map((column) => column.label)]];
      question.rows.forEach((row) => {
        rows.push([row.label, ...question.columns.map(() => (question.type === "matrix_single" || question.type === "matrix_multiple" ? "□" : ""))]);
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
    if (question.type === "matrix_single" || question.type === "matrix_multiple") return wordMatrixCrossQuestionBlock(item, groups);
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
          ...groups.map((group) => wordAggregateCell(countMatrixAnswers(question, group.responses, row.id, column.id), group.responses.length)),
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
    if (question.type === "matrix_single" || question.type === "matrix_multiple") {
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
    const answers = getTextAnswerEntries(question, responses);
    const answerParagraphs = answers.length
      ? answers.map((entry, answerIndex) => [
        wordParagraph(`回答 ${answerIndex + 1}`, { bold: true, color: "555555", size: 20, after: 60 }),
        wordParagraph(entry.answer, { size: 30 }),
        entry.replyEnabled && entry.reply ? wordParagraph("回答へのコメント", { bold: true, color: "C00000", size: 20, after: 40 }) : "",
        entry.replyEnabled && entry.reply ? wordParagraph(entry.reply, { color: "C00000", size: 27 }) : "",
      ].join("")).join("")
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
    const requestedSize = Number(options.size);
    const fontSize = Number.isFinite(requestedSize) && requestedSize > 0
      ? Math.round(requestedSize)
      : options.style === "Title" ? 32 : options.style === "Heading1" ? 24 : 0;
    const color = String(options.color || "").replace("#", "").toUpperCase();
    const pPr = [
      options.style ? `<w:pStyle w:val="${escapeXml(options.style)}"/>` : "",
      `<w:spacing w:after="${options.after ?? (options.compact ? 80 : 160)}"/>`,
    ].join("");
    const rPr = [
      `<w:rFonts w:ascii="Yu Gothic" w:hAnsi="Yu Gothic" w:eastAsia="Yu Gothic"/>`,
      options.bold ? "<w:b/>" : "",
      options.style === "Title" || options.style === "Heading1" ? "<w:b/>" : "",
      fontSize ? `<w:sz w:val="${fontSize}"/>` : "",
      color ? `<w:color w:val="${escapeXml(color)}"/>` : "",
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
      await ensurePresetSurvey();
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
    if (question.type === "matrix_single" || question.type === "matrix_multiple") {
      return question.rows.map((row) => {
        const labels = question.columns.filter((column) => getMatrixSelectedColumnIds(answer, row.id).includes(column.id)).map((column) => column.label);
        return `${row.label}:${labels.join("・")}`;
      }).join(" / ");
    }
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
    anchor.className = "download-anchor";
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
