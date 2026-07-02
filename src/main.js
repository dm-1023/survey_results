(() => {
  "use strict";

  const DB_NAME = "survey_report_builder";
  const DB_VERSION = 1;
  const STORE_NAME = "surveys";
  const APP_NAME = "survey_report_builder";
  const SCHEMA_VERSION = 1;

  /** @type {IDBDatabase | null} */
  let dbCache = null;
  /** @type {HTMLElement | null} */
  let root = null;

  const state = {
    view: "list",
    surveys: [],
    currentSurvey: null,
    validationMessages: [],
    flash: "",
    pendingPrint: false,
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    root = document.getElementById("app");
    if (!root) return;

    root.addEventListener("click", handleClick);
    root.addEventListener("input", handleFieldEvent);
    root.addEventListener("change", handleFieldEvent);

    if (!("indexedDB" in window)) {
      state.flash = "お使いのブラウザではデータ保存機能を利用できません。別のブラウザでお試しください。";
      render();
      return;
    }

    try {
      await refreshSurveys();
    } catch (error) {
      console.error(error);
      state.flash = "保存データの読み込みに失敗しました。ブラウザの保存領域をご確認ください。";
    }

    render();
  }

  async function handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    event.preventDefault();

    const action = button.dataset.action;
    try {
      if (action === "new") {
        state.currentSurvey = createSurvey();
        state.validationMessages = [];
        state.flash = "";
        state.view = "edit";
        render();
        return;
      }

      if (action === "list") {
        state.view = "list";
        state.currentSurvey = null;
        state.validationMessages = [];
        await refreshSurveys();
        render();
        return;
      }

      if (action === "edit") {
        await openSurvey(button.dataset.id, "edit");
        return;
      }

      if (action === "preview") {
        await openSurvey(button.dataset.id, "preview");
        return;
      }

      if (action === "print") {
        await openSurvey(button.dataset.id, "print", true);
        return;
      }

      if (action === "save") {
        await saveCurrentSurvey();
        return;
      }

      if (action === "preview-current") {
        if (!ensureCurrentSurveyIsValid()) return;
        state.view = "preview";
        state.flash = "";
        render();
        return;
      }

      if (action === "print-current") {
        if (!ensureCurrentSurveyIsValid()) return;
        state.view = "print";
        state.pendingPrint = button.dataset.auto === "true";
        state.flash = "";
        render();
        return;
      }

      if (action === "do-print") {
        window.print();
        return;
      }

      if (action === "delete") {
        await deleteSurveyById(button.dataset.id);
        return;
      }

      if (action === "duplicate") {
        await duplicateSurveyById(button.dataset.id);
        return;
      }

      if (action === "export") {
        const survey = await getSurveyFromDb(button.dataset.id);
        if (!survey) throw new Error("Survey not found");
        downloadSurveyJson(survey);
        return;
      }

      if (action === "import-click") {
        const input = document.getElementById("import-file");
        if (input) input.click();
        return;
      }

      if (action === "add-question") {
        addQuestion(button.dataset.questionType || "single_choice");
        return;
      }

      if (action === "remove-question") {
        removeQuestion(readIndex(button.dataset.index));
        return;
      }

      if (action === "duplicate-question") {
        duplicateQuestion(readIndex(button.dataset.index));
        return;
      }

      if (action === "move-question") {
        moveQuestion(readIndex(button.dataset.index), readDirection(button.dataset.direction));
        return;
      }

      if (action === "add-option") {
        addOption(readIndex(button.dataset.questionIndex));
        return;
      }

      if (action === "remove-option") {
        removeOption(readIndex(button.dataset.questionIndex), readIndex(button.dataset.optionIndex));
        return;
      }

      if (action === "move-option") {
        moveOption(
          readIndex(button.dataset.questionIndex),
          readIndex(button.dataset.optionIndex),
          readDirection(button.dataset.direction)
        );
        return;
      }

      if (action === "add-answer") {
        addFreeTextAnswer(readIndex(button.dataset.questionIndex));
        return;
      }

      if (action === "remove-answer") {
        removeFreeTextAnswer(readIndex(button.dataset.questionIndex), readIndex(button.dataset.answerIndex));
        return;
      }

      if (action === "move-answer") {
        moveFreeTextAnswer(
          readIndex(button.dataset.questionIndex),
          readIndex(button.dataset.answerIndex),
          readDirection(button.dataset.direction)
        );
      }
    } catch (error) {
      console.error(error);
      state.flash = "処理に失敗しました。内容をご確認ください。";
      render();
    }
  }

  async function handleFieldEvent(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.id === "import-file" && event.type === "change") {
      const file = target.files && target.files[0];
      if (file) await importSurveyFile(file);
      target.value = "";
      return;
    }

    const needsRender = updateCurrentSurveyFromField(target);
    if (needsRender) render();
  }

  function updateCurrentSurveyFromField(target) {
    const survey = state.currentSurvey;
    if (!survey) return false;

    if (target.matches("[data-survey-field]")) {
      const field = target.dataset.surveyField;
      if (field === "distributedCount" || field === "collectedCount") {
        survey[field] = readOptionalNumber(target.value);
      } else {
        survey[field] = target.value;
      }
      return false;
    }

    if (target.matches("[data-question-field]")) {
      const question = survey.questions[readIndex(target.dataset.questionIndex)];
      if (!question) return false;
      const field = target.dataset.questionField;
      question[field] = target.value;
      if (field === "questionType") {
        if (question.questionType !== "free_text" && question.options.length === 0) {
          question.options.push(createOption(1));
        }
        return true;
      }
      return false;
    }

    if (target.matches("[data-option-field]")) {
      const question = survey.questions[readIndex(target.dataset.questionIndex)];
      const option = question && question.options[readIndex(target.dataset.optionIndex)];
      if (!option) return false;
      const field = target.dataset.optionField;
      option[field] = field === "count" ? readOptionalNumber(target.value) : target.value;
      return false;
    }

    if (target.matches("[data-answer-field]")) {
      const question = survey.questions[readIndex(target.dataset.questionIndex)];
      const answer = question && question.freeTextAnswers[readIndex(target.dataset.answerIndex)];
      if (!answer) return false;
      answer[target.dataset.answerField] = target.value;
      return false;
    }

    return false;
  }

  function render() {
    if (!root) return;
    root.innerHTML = `
      <div class="app-shell">
        ${renderHeader()}
        <main class="app-main">
          ${renderFlash()}
          ${renderView()}
        </main>
      </div>
    `;

    if (state.pendingPrint) {
      state.pendingPrint = false;
      window.setTimeout(() => window.print(), 120);
    }
  }

  function renderHeader() {
    const subtitle = {
      list: "保存済みアンケート",
      edit: "アンケート編集",
      preview: "レポート確認",
      print: "印刷用レポート",
    }[state.view];

    return `
      <header class="app-header no-print">
        <div>
          <p class="app-kicker">Survey Report Builder</p>
          <h1>アンケート集計レポート</h1>
        </div>
        <p class="app-header__subtitle">${escapeHtml(subtitle)}</p>
      </header>
    `;
  }

  function renderFlash() {
    if (!state.flash) return "";
    return `<div class="flash no-print" role="status">${escapeHtml(state.flash)}</div>`;
  }

  function renderView() {
    if (state.view === "edit") return renderEditPage();
    if (state.view === "preview") return renderPreviewPage();
    if (state.view === "print") return renderPrintPage();
    return renderListPage();
  }

  function renderListPage() {
    const rows = state.surveys.length
      ? state.surveys.map(renderSurveyListItem).join("")
      : `<div class="empty-state">保存済みのアンケートはありません。</div>`;

    return `
      <section class="toolbar no-print">
        <button class="button button-primary" type="button" data-action="new">新しいアンケートを作成</button>
        <button class="button" type="button" data-action="import-click">データを読み込み</button>
        <input id="import-file" class="visually-hidden" type="file" accept="application/json,.json" />
      </section>
      ${renderStorageNotice()}
      <section class="list-grid" aria-label="アンケート一覧">
        ${rows}
      </section>
    `;
  }

  function renderSurveyListItem(survey) {
    const questionCount = Array.isArray(survey.questions) ? survey.questions.length : 0;
    return `
      <article class="survey-card">
        <div class="survey-card__main">
          <h2>${escapeHtml(survey.title || "無題のアンケート")}</h2>
          <dl class="meta-grid">
            <div><dt>発行元</dt><dd>${escapeHtml(survey.issuer || "-")}</dd></div>
            <div><dt>実施期間</dt><dd>${escapeHtml(survey.periodText || "-")}</dd></div>
            <div><dt>回収数</dt><dd>${formatCount(survey.collectedCount)}</dd></div>
            <div><dt>設問数</dt><dd>${questionCount}件</dd></div>
            <div><dt>更新日時</dt><dd>${escapeHtml(formatDateTime(survey.updatedAt))}</dd></div>
          </dl>
        </div>
        <div class="card-actions no-print">
          <button class="button" type="button" data-action="edit" data-id="${escapeAttr(survey.id)}">編集</button>
          <button class="button" type="button" data-action="preview" data-id="${escapeAttr(survey.id)}">レポートを確認</button>
          <button class="button" type="button" data-action="print" data-id="${escapeAttr(survey.id)}">PDF出力・印刷</button>
          <button class="button" type="button" data-action="export" data-id="${escapeAttr(survey.id)}">データを保存</button>
          <button class="button" type="button" data-action="duplicate" data-id="${escapeAttr(survey.id)}">複製</button>
          <button class="button button-danger" type="button" data-action="delete" data-id="${escapeAttr(survey.id)}">削除</button>
        </div>
      </article>
    `;
  }

  function renderEditPage() {
    const survey = state.currentSurvey;
    if (!survey) return renderMissingSurvey();
    return `
      <section class="toolbar no-print">
        <button class="button" type="button" data-action="list">一覧へ戻る</button>
        <button class="button button-primary" type="button" data-action="save">保存</button>
        <button class="button" type="button" data-action="preview-current">レポートを確認</button>
      </section>
      ${renderStorageNotice()}
      ${renderValidationMessages(state.validationMessages)}
      <section class="panel">
        <div class="section-heading">
          <h2>基本情報</h2>
        </div>
        <div class="form-grid">
          ${renderTextInput("タイトル", "title", survey.title, true)}
          ${renderTextInput("発行元", "issuer", survey.issuer)}
          ${renderTextInput("実施期間", "periodText", survey.periodText)}
          ${renderNumberInput("配布数", "distributedCount", survey.distributedCount)}
          ${renderNumberInput("回収数", "collectedCount", survey.collectedCount)}
          <label class="field field-wide">
            <span>備考</span>
            <textarea rows="3" data-survey-field="note">${escapeHtml(survey.note || "")}</textarea>
          </label>
        </div>
      </section>
      <section class="panel">
        <div class="section-heading section-heading-actions">
          <h2>設問</h2>
          <div class="button-row no-print">
            <button class="button" type="button" data-action="add-question" data-question-type="single_choice">単一選択を追加</button>
            <button class="button" type="button" data-action="add-question" data-question-type="multiple_choice">複数選択を追加</button>
            <button class="button" type="button" data-action="add-question" data-question-type="free_text">自由記述を追加</button>
          </div>
        </div>
        <div class="question-editor-list">
          ${survey.questions.length ? survey.questions.map(renderQuestionEditor).join("") : `<div class="empty-state">設問がありません。</div>`}
        </div>
      </section>
    `;
  }

  function renderTextInput(label, field, value, required = false) {
    return `
      <label class="field">
        <span>${escapeHtml(label)}${required ? '<b class="required">必須</b>' : ""}</span>
        <input type="text" value="${escapeAttr(value || "")}" data-survey-field="${escapeAttr(field)}" />
      </label>
    `;
  }

  function renderNumberInput(label, field, value) {
    return `
      <label class="field">
        <span>${escapeHtml(label)}</span>
        <input type="number" min="0" step="1" value="${escapeAttr(value ?? "")}" data-survey-field="${escapeAttr(field)}" />
      </label>
    `;
  }

  function renderQuestionEditor(question, index) {
    const title = question.questionText || `設問 ${index + 1}`;
    const body = question.questionType === "free_text"
      ? renderFreeTextEditor(question, index)
      : renderOptionEditor(question, index);

    return `
      <article class="question-editor" id="${escapeAttr(question.id)}">
        <div class="question-editor__head">
          <h3>${index + 1}. ${escapeHtml(title)}</h3>
          <div class="icon-actions no-print">
            <button class="icon-button" type="button" title="上へ移動" data-action="move-question" data-index="${index}" data-direction="-1">↑</button>
            <button class="icon-button" type="button" title="下へ移動" data-action="move-question" data-index="${index}" data-direction="1">↓</button>
            <button class="button" type="button" data-action="duplicate-question" data-index="${index}">複製</button>
            <button class="button button-danger" type="button" data-action="remove-question" data-index="${index}">削除</button>
          </div>
        </div>
        <div class="form-grid">
          <label class="field field-wide">
            <span>設問文<b class="required">必須</b></span>
            <textarea rows="2" data-question-index="${index}" data-question-field="questionText">${escapeHtml(question.questionText || "")}</textarea>
          </label>
          <label class="field">
            <span>回答形式</span>
            <select data-question-index="${index}" data-question-field="questionType">
              <option value="single_choice"${question.questionType === "single_choice" ? " selected" : ""}>単一選択</option>
              <option value="multiple_choice"${question.questionType === "multiple_choice" ? " selected" : ""}>複数選択</option>
              <option value="free_text"${question.questionType === "free_text" ? " selected" : ""}>自由記述</option>
            </select>
          </label>
        </div>
        ${body}
      </article>
    `;
  }

  function renderOptionEditor(question, questionIndex) {
    const rows = question.options.length
      ? question.options.map((option, optionIndex) => renderOptionRow(option, questionIndex, optionIndex)).join("")
      : `<div class="empty-state">選択肢がありません。</div>`;

    return `
      <div class="subsection">
        <div class="subsection-head">
          <h4>選択肢と回答数</h4>
          <button class="button no-print" type="button" data-action="add-option" data-question-index="${questionIndex}">選択肢を追加</button>
        </div>
        <div class="option-list">
          ${rows}
        </div>
      </div>
    `;
  }

  function renderOptionRow(option, questionIndex, optionIndex) {
    return `
      <div class="option-row">
        <label class="field option-name">
          <span>選択肢名</span>
          <input type="text" value="${escapeAttr(option.optionText || "")}" data-question-index="${questionIndex}" data-option-index="${optionIndex}" data-option-field="optionText" />
        </label>
        <label class="field option-count">
          <span>回答数</span>
          <input type="number" min="0" step="1" value="${escapeAttr(option.count ?? "")}" data-question-index="${questionIndex}" data-option-index="${optionIndex}" data-option-field="count" />
        </label>
        <div class="icon-actions no-print">
          <button class="icon-button" type="button" title="上へ移動" data-action="move-option" data-question-index="${questionIndex}" data-option-index="${optionIndex}" data-direction="-1">↑</button>
          <button class="icon-button" type="button" title="下へ移動" data-action="move-option" data-question-index="${questionIndex}" data-option-index="${optionIndex}" data-direction="1">↓</button>
          <button class="button button-danger" type="button" data-action="remove-option" data-question-index="${questionIndex}" data-option-index="${optionIndex}">削除</button>
        </div>
      </div>
    `;
  }

  function renderFreeTextEditor(question, questionIndex) {
    const rows = question.freeTextAnswers.length
      ? question.freeTextAnswers.map((answer, answerIndex) => renderFreeTextRow(answer, questionIndex, answerIndex)).join("")
      : `<div class="empty-state">自由記述がありません。</div>`;

    return `
      <div class="subsection">
        <p class="notice-inline">個人名、住所、電話番号などの個人情報は、必要がない限り入力しないでください。</p>
        <label class="field field-wide">
          <span>自由記述まとめ</span>
          <textarea rows="3" data-question-index="${questionIndex}" data-question-field="freeTextSummary">${escapeHtml(question.freeTextSummary || "")}</textarea>
        </label>
        <div class="subsection-head">
          <h4>自由記述一覧</h4>
          <button class="button no-print" type="button" data-action="add-answer" data-question-index="${questionIndex}">自由記述を追加</button>
        </div>
        <div class="free-text-list">
          ${rows}
        </div>
      </div>
    `;
  }

  function renderFreeTextRow(answer, questionIndex, answerIndex) {
    return `
      <div class="free-text-row">
        <label class="field field-wide">
          <span>自由記述 ${answerIndex + 1}</span>
          <textarea rows="2" data-question-index="${questionIndex}" data-answer-index="${answerIndex}" data-answer-field="text">${escapeHtml(answer.text || "")}</textarea>
        </label>
        <div class="icon-actions no-print">
          <button class="icon-button" type="button" title="上へ移動" data-action="move-answer" data-question-index="${questionIndex}" data-answer-index="${answerIndex}" data-direction="-1">↑</button>
          <button class="icon-button" type="button" title="下へ移動" data-action="move-answer" data-question-index="${questionIndex}" data-answer-index="${answerIndex}" data-direction="1">↓</button>
          <button class="button button-danger" type="button" data-action="remove-answer" data-question-index="${questionIndex}" data-answer-index="${answerIndex}">削除</button>
        </div>
      </div>
    `;
  }

  function renderPreviewPage() {
    const survey = state.currentSurvey;
    if (!survey) return renderMissingSurvey();
    const messages = validateSurvey(survey).filter((message) => message.level === "warning");
    return `
      <section class="toolbar no-print">
        <button class="button" type="button" data-action="edit" data-id="${escapeAttr(survey.id)}">編集に戻る</button>
        <button class="button" type="button" data-action="print-current">印刷用表示</button>
        <button class="button button-primary" type="button" data-action="print-current" data-auto="true">PDF出力・印刷</button>
      </section>
      ${renderValidationMessages(messages)}
      ${renderReport(survey)}
    `;
  }

  function renderPrintPage() {
    const survey = state.currentSurvey;
    if (!survey) return renderMissingSurvey();
    return `
      <section class="toolbar no-print">
        <button class="button" type="button" data-action="preview-current">レポート確認へ戻る</button>
        <button class="button button-primary" type="button" data-action="do-print">PDF出力・印刷</button>
      </section>
      ${renderReport(survey, true)}
    `;
  }

  function renderReport(survey, printMode = false) {
    const collectionRate = calculateCollectionRate(survey.distributedCount, survey.collectedCount);
    const questionBlocks = survey.questions.length
      ? sortByOrder(survey.questions).map((question, index) => renderQuestionReport(question, survey, index)).join("")
      : `<p>設問がありません。</p>`;

    return `
      <article class="report ${printMode ? "print-page" : ""}">
        <header class="report-header">
          <h2>${escapeHtml(survey.title || "無題のアンケート")}</h2>
          <dl class="report-summary">
            <div><dt>発行元</dt><dd>${escapeHtml(survey.issuer || "-")}</dd></div>
            <div><dt>実施期間</dt><dd>${escapeHtml(survey.periodText || "-")}</dd></div>
            <div><dt>配布数</dt><dd>${formatCount(survey.distributedCount)}</dd></div>
            <div><dt>回収数</dt><dd>${formatCount(survey.collectedCount)}</dd></div>
            <div><dt>回収率</dt><dd>${escapeHtml(formatRate(collectionRate))}</dd></div>
          </dl>
          ${survey.note ? `<p class="report-note">${escapeHtml(survey.note)}</p>` : ""}
        </header>
        <section class="report-section">
          <h3>集計結果</h3>
          ${questionBlocks}
        </section>
        <footer class="report-footer">
          <p>※割合は小数第1位まで表示しています。</p>
        </footer>
      </article>
    `;
  }

  function renderQuestionReport(question, survey, index) {
    if (question.questionType === "free_text") {
      return renderFreeTextReport(question, index);
    }
    return renderChoiceReport(question, survey, index);
  }

  function renderChoiceReport(question, survey, index) {
    const options = sortByOrder(question.options);
    const total = sumOptionCounts(options);
    const isMultiple = question.questionType === "multiple_choice";
    const rows = options.map((option) => {
      const count = safeNumber(option.count);
      const rate = isMultiple
        ? calculateMultipleChoiceRate(count, survey.collectedCount)
        : calculateSingleChoiceRate(count, total);
      return `
        <tr>
          <th scope="row">${escapeHtml(option.optionText || "-")}</th>
          <td class="numeric">${count}件</td>
          <td class="numeric">${escapeHtml(formatRate(rate))}</td>
          <td>${renderBarGraph(rate)}</td>
        </tr>
      `;
    }).join("");

    return `
      <section class="question-block">
        <h4>${index + 1}. ${escapeHtml(question.questionText || "設問文未入力")}</h4>
        ${isMultiple ? `<p class="question-note">※複数回答のため、回答数の合計は回収数と一致しない場合があります。</p>` : ""}
        <div class="table-wrap">
          <table class="report-table">
            <thead>
              <tr>
                <th>選択肢</th>
                <th>回答数</th>
                <th>割合</th>
                <th>グラフ</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="4">選択肢がありません。</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderFreeTextReport(question, index) {
    const answers = sortByOrder(question.freeTextAnswers)
      .map((answer) => (answer.text || "").trim())
      .filter(Boolean);
    const answerList = answers.length
      ? `<ul class="free-text-report">${answers.map((answer) => `<li>${escapeHtml(answer)}</li>`).join("")}</ul>`
      : `<p>自由記述はありません。</p>`;

    return `
      <section class="question-block">
        <h4>${index + 1}. ${escapeHtml(question.questionText || "設問文未入力")}</h4>
        ${(question.freeTextSummary || "").trim()
          ? `<div class="summary-box"><h5>主なご意見</h5><p>${escapeHtml(question.freeTextSummary)}</p></div>`
          : ""}
        <h5>自由記述一覧</h5>
        ${answerList}
      </section>
    `;
  }

  function renderBarGraph(rate) {
    const width = clampRateForBar(rate);
    return `
      <div class="bar-graph" aria-hidden="true">
        <span style="width: ${width}%"></span>
      </div>
    `;
  }

  function renderStorageNotice() {
    return `
      <aside class="notice no-print">
        入力データはサーバーには保存されず、このブラウザ内に保存されます。
        別の端末やブラウザでは表示されません。必要に応じて「データを保存」からJSONファイルとして保存してください。
      </aside>
    `;
  }

  function renderValidationMessages(messages) {
    if (!messages || messages.length === 0) return "";
    const errors = messages.filter((message) => message.level === "error");
    const warnings = messages.filter((message) => message.level === "warning");
    return `
      <section class="messages no-print" aria-live="polite">
        ${errors.length ? `<div class="message-group message-error"><h2>修正が必要です</h2><ul>${errors.map((message) => `<li>${escapeHtml(message.message)}</li>`).join("")}</ul></div>` : ""}
        ${warnings.length ? `<div class="message-group message-warning"><h2>確認してください</h2><ul>${warnings.map((message) => `<li>${escapeHtml(message.message)}</li>`).join("")}</ul></div>` : ""}
      </section>
    `;
  }

  function renderMissingSurvey() {
    return `
      <section class="panel">
        <p>対象のアンケートが見つかりません。</p>
        <button class="button" type="button" data-action="list">一覧へ戻る</button>
      </section>
    `;
  }

  function addQuestion(questionType) {
    const survey = state.currentSurvey;
    if (!survey) return;
    const question = createQuestion(questionType, survey.questions.length + 1);
    if (questionType !== "free_text") {
      question.options.push(createOption(1));
    }
    survey.questions.push(question);
    state.validationMessages = [];
    render();
  }

  function removeQuestion(index) {
    const survey = state.currentSurvey;
    if (!survey || !survey.questions[index]) return;
    if (!window.confirm("この設問を削除します。よろしいですか？")) return;
    survey.questions.splice(index, 1);
    normalizeSortOrders(survey.questions);
    render();
  }

  function duplicateQuestion(index) {
    const survey = state.currentSurvey;
    if (!survey || !survey.questions[index]) return;
    const copy = cloneQuestionWithNewIds(survey.questions[index], survey.questions.length + 1);
    copy.questionText = `${copy.questionText || "設問"} のコピー`;
    survey.questions.splice(index + 1, 0, copy);
    normalizeSortOrders(survey.questions);
    render();
  }

  function moveQuestion(index, direction) {
    const survey = state.currentSurvey;
    if (!survey) return;
    moveItem(survey.questions, index, direction);
    normalizeSortOrders(survey.questions);
    render();
  }

  function addOption(questionIndex) {
    const question = getQuestion(questionIndex);
    if (!question) return;
    question.options.push(createOption(question.options.length + 1));
    render();
  }

  function removeOption(questionIndex, optionIndex) {
    const question = getQuestion(questionIndex);
    if (!question || !question.options[optionIndex]) return;
    question.options.splice(optionIndex, 1);
    normalizeSortOrders(question.options);
    render();
  }

  function moveOption(questionIndex, optionIndex, direction) {
    const question = getQuestion(questionIndex);
    if (!question) return;
    moveItem(question.options, optionIndex, direction);
    normalizeSortOrders(question.options);
    render();
  }

  function addFreeTextAnswer(questionIndex) {
    const question = getQuestion(questionIndex);
    if (!question) return;
    question.freeTextAnswers.push(createFreeTextAnswer(question.freeTextAnswers.length + 1));
    render();
  }

  function removeFreeTextAnswer(questionIndex, answerIndex) {
    const question = getQuestion(questionIndex);
    if (!question || !question.freeTextAnswers[answerIndex]) return;
    question.freeTextAnswers.splice(answerIndex, 1);
    normalizeSortOrders(question.freeTextAnswers);
    render();
  }

  function moveFreeTextAnswer(questionIndex, answerIndex, direction) {
    const question = getQuestion(questionIndex);
    if (!question) return;
    moveItem(question.freeTextAnswers, answerIndex, direction);
    normalizeSortOrders(question.freeTextAnswers);
    render();
  }

  function getQuestion(index) {
    const survey = state.currentSurvey;
    return survey && survey.questions[index] ? survey.questions[index] : null;
  }

  async function openSurvey(id, view, autoPrint = false) {
    const survey = await getSurveyFromDb(id);
    if (!survey) {
      state.flash = "対象のアンケートが見つかりません。";
      state.view = "list";
      render();
      return;
    }
    state.currentSurvey = normalizeImportedSurvey(survey, true);
    state.validationMessages = [];
    state.view = view;
    state.pendingPrint = autoPrint;
    state.flash = "";
    render();
  }

  async function saveCurrentSurvey() {
    if (!state.currentSurvey) return;
    const messages = validateSurvey(state.currentSurvey);
    state.validationMessages = messages;
    if (hasErrors(messages)) {
      state.flash = "保存できません。修正が必要な項目があります。";
      render();
      return;
    }

    const saved = await saveSurveyToDb(normalizeSurveyForSave(state.currentSurvey));
    state.currentSurvey = saved;
    await refreshSurveys();
    state.flash = "保存しました。";
    render();
  }

  function ensureCurrentSurveyIsValid() {
    if (!state.currentSurvey) return false;
    const messages = validateSurvey(state.currentSurvey);
    state.validationMessages = messages;
    if (hasErrors(messages)) {
      state.flash = "レポートを表示できません。修正が必要な項目があります。";
      render();
      return false;
    }
    return true;
  }

  async function deleteSurveyById(id) {
    const survey = await getSurveyFromDb(id);
    if (!survey) return;
    if (!window.confirm(`「${survey.title || "無題のアンケート"}」を削除します。よろしいですか？`)) return;
    await deleteSurveyFromDb(id);
    await refreshSurveys();
    state.flash = "削除しました。";
    render();
  }

  async function duplicateSurveyById(id) {
    const survey = await getSurveyFromDb(id);
    if (!survey) return;
    const copy = cloneSurveyWithNewIds(survey);
    copy.title = `${copy.title || "無題のアンケート"} のコピー`;
    const saved = await saveSurveyToDb(copy);
    await refreshSurveys();
    state.currentSurvey = saved;
    state.view = "edit";
    state.flash = "複製しました。";
    render();
  }

  async function refreshSurveys() {
    state.surveys = await listSurveysFromDb();
  }

  function createSurvey() {
    const now = nowIsoString();
    return {
      id: createId("survey"),
      title: "",
      issuer: "",
      periodText: "",
      distributedCount: undefined,
      collectedCount: undefined,
      note: "",
      questions: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  function createQuestion(questionType, sortOrder) {
    return {
      id: createId("question"),
      questionText: "",
      questionType,
      options: [],
      freeTextAnswers: [],
      freeTextSummary: "",
      sortOrder,
    };
  }

  function createOption(sortOrder) {
    return {
      id: createId("option"),
      optionText: "",
      count: undefined,
      sortOrder,
    };
  }

  function createFreeTextAnswer(sortOrder) {
    return {
      id: createId("answer"),
      text: "",
      sortOrder,
    };
  }

  function cloneSurveyWithNewIds(survey) {
    const now = nowIsoString();
    return {
      ...normalizeImportedSurvey(survey, true),
      id: createId("survey"),
      createdAt: now,
      updatedAt: now,
      questions: sortByOrder(survey.questions || []).map((question, index) => cloneQuestionWithNewIds(question, index + 1)),
    };
  }

  function cloneQuestionWithNewIds(question, sortOrder) {
    return {
      id: createId("question"),
      questionText: question.questionText || "",
      questionType: normalizeQuestionType(question.questionType),
      options: sortByOrder(question.options || []).map((option, index) => ({
        id: createId("option"),
        optionText: option.optionText || "",
        count: readOptionalNumber(option.count),
        sortOrder: index + 1,
      })),
      freeTextAnswers: sortByOrder(question.freeTextAnswers || []).map((answer, index) => ({
        id: createId("answer"),
        text: answer.text || answer.answerText || "",
        sortOrder: index + 1,
      })),
      freeTextSummary: question.freeTextSummary || "",
      sortOrder,
    };
  }

  function normalizeSurveyForSave(survey) {
    const now = nowIsoString();
    return {
      id: survey.id || createId("survey"),
      title: (survey.title || "").trim(),
      issuer: (survey.issuer || "").trim(),
      periodText: (survey.periodText || "").trim(),
      distributedCount: normalizeOptionalInteger(survey.distributedCount),
      collectedCount: normalizeOptionalInteger(survey.collectedCount),
      note: (survey.note || "").trim(),
      questions: sortByOrder(survey.questions || []).map((question, index) => ({
        id: question.id || createId("question"),
        questionText: (question.questionText || "").trim(),
        questionType: normalizeQuestionType(question.questionType),
        options: sortByOrder(question.options || []).map((option, optionIndex) => ({
          id: option.id || createId("option"),
          optionText: (option.optionText || "").trim(),
          count: normalizeRequiredInteger(option.count),
          sortOrder: optionIndex + 1,
        })),
        freeTextAnswers: sortByOrder(question.freeTextAnswers || []).map((answer, answerIndex) => ({
          id: answer.id || createId("answer"),
          text: (answer.text || "").trim(),
          sortOrder: answerIndex + 1,
        })),
        freeTextSummary: (question.freeTextSummary || "").trim(),
        sortOrder: index + 1,
      })),
      createdAt: survey.createdAt || now,
      updatedAt: now,
    };
  }

  function normalizeImportedSurvey(input, keepId) {
    const now = nowIsoString();
    const survey = input && typeof input === "object" ? input : {};
    return {
      id: keepId && survey.id ? String(survey.id) : createId("survey"),
      title: typeof survey.title === "string" ? survey.title : "",
      issuer: typeof survey.issuer === "string" ? survey.issuer : "",
      periodText: typeof survey.periodText === "string" ? survey.periodText : "",
      distributedCount: readOptionalNumber(survey.distributedCount),
      collectedCount: readOptionalNumber(survey.collectedCount),
      note: typeof survey.note === "string" ? survey.note : "",
      questions: Array.isArray(survey.questions)
        ? sortByOrder(survey.questions).map((question, index) => cloneQuestionWithNewIds(question, index + 1))
        : [],
      createdAt: keepId && survey.createdAt ? String(survey.createdAt) : now,
      updatedAt: keepId && survey.updatedAt ? String(survey.updatedAt) : now,
    };
  }

  function validateSurvey(survey) {
    const messages = [];
    if (isBlank(survey.title)) {
      messages.push(createValidationMessage("error", "タイトルを入力してください。", "title"));
    }

    validateOptionalInteger(messages, survey.distributedCount, "配布数", "distributedCount");
    validateOptionalInteger(messages, survey.collectedCount, "回収数", "collectedCount");

    if (
      isValidNonNegativeInteger(survey.distributedCount) &&
      isValidNonNegativeInteger(survey.collectedCount) &&
      survey.collectedCount > survey.distributedCount
    ) {
      messages.push(createValidationMessage("warning", "回収数が配布数を超えています。内容をご確認ください。"));
    }

    sortByOrder(survey.questions || []).forEach((question, questionIndex) => {
      if (isBlank(question.questionText)) {
        messages.push(createValidationMessage("error", `${questionIndex + 1}問目の設問文を入力してください。`, question.id));
      }

      if (question.questionType === "single_choice" || question.questionType === "multiple_choice") {
        validateChoiceQuestion(messages, question, questionIndex, survey);
      }

      if (question.questionType === "free_text") {
        validateFreeTextQuestion(messages, question, questionIndex);
      }
    });

    return messages;
  }

  function validateChoiceQuestion(messages, question, questionIndex, survey) {
    const options = sortByOrder(question.options || []);
    if (options.length === 0) {
      messages.push(createValidationMessage("error", `${questionIndex + 1}問目の選択肢を1件以上入力してください。`, question.id));
      return;
    }

    options.forEach((option, optionIndex) => {
      if (isBlank(option.optionText)) {
        messages.push(createValidationMessage("error", `${questionIndex + 1}問目の${optionIndex + 1}個目の選択肢名を入力してください。`, option.id));
      }
      if (option.count === undefined || option.count === null || option.count === "") {
        messages.push(createValidationMessage("error", `${questionIndex + 1}問目の${optionIndex + 1}個目の回答数を入力してください。`, option.id));
      } else if (!isValidNonNegativeInteger(option.count)) {
        messages.push(createValidationMessage("error", `${questionIndex + 1}問目の回答数は0以上の整数で入力してください。`, option.id));
      }
    });

    const validCounts = options.every((option) => isValidNonNegativeInteger(option.count));
    if (!validCounts) return;

    const total = sumOptionCounts(options);
    if (total === 0) {
      messages.push(createValidationMessage("warning", `${questionIndex + 1}問目の回答数が入力されていない可能性があります。`, question.id));
    }

    if (
      question.questionType === "single_choice" &&
      isValidNonNegativeInteger(survey.collectedCount) &&
      total !== survey.collectedCount
    ) {
      messages.push(createValidationMessage("warning", `${questionIndex + 1}問目の単一選択の回答数合計が回収数と一致していません。`, question.id));
    }

    if (
      question.questionType === "multiple_choice" &&
      isValidNonNegativeInteger(survey.collectedCount) &&
      total > survey.collectedCount
    ) {
      messages.push(createValidationMessage("warning", `${questionIndex + 1}問目は複数回答のため、回答数合計が回収数を超える場合があります。`, question.id));
    }
  }

  function validateFreeTextQuestion(messages, question, questionIndex) {
    const answers = question.freeTextAnswers || [];
    const summary = question.freeTextSummary || "";
    const totalLength = answers.reduce((sum, answer) => sum + String(answer.text || "").length, 0) + summary.length;
    if (answers.every((answer) => isBlank(answer.text)) && isBlank(summary)) {
      messages.push(createValidationMessage("warning", `${questionIndex + 1}問目の自由記述の内容が未入力です。`, question.id));
    }
    if (totalLength > 1500) {
      messages.push(createValidationMessage("warning", `${questionIndex + 1}問目の自由記述が長いため、印刷時にページ数が多くなる可能性があります。`, question.id));
    }
  }

  function validateOptionalInteger(messages, value, label, targetId) {
    if (value === undefined || value === null || value === "") return;
    if (!isValidNonNegativeInteger(value)) {
      messages.push(createValidationMessage("error", `${label}は0以上の整数で入力してください。`, targetId));
    }
  }

  function createValidationMessage(level, message, targetId = undefined) {
    return {
      id: createId("message"),
      level,
      message,
      targetId,
    };
  }

  function hasErrors(messages) {
    return messages.some((message) => message.level === "error");
  }

  function calculateCollectionRate(distributedCount, collectedCount) {
    if (!isValidPositiveNumber(distributedCount)) return null;
    if (!isValidNonNegativeNumber(collectedCount)) return null;
    return (Number(collectedCount) / Number(distributedCount)) * 100;
  }

  function calculateSingleChoiceRate(optionCount, totalOptionCount) {
    if (!isValidPositiveNumber(totalOptionCount)) return null;
    return (safeNumber(optionCount) / Number(totalOptionCount)) * 100;
  }

  function calculateMultipleChoiceRate(optionCount, collectedCount) {
    if (!isValidPositiveNumber(collectedCount)) return null;
    return (safeNumber(optionCount) / Number(collectedCount)) * 100;
  }

  function formatRate(rate) {
    if (rate === null || rate === undefined || Number.isNaN(rate)) return "-";
    return `${Number(rate).toFixed(1)}%`;
  }

  function clampRateForBar(rate) {
    if (rate === null || rate === undefined || Number.isNaN(rate)) return 0;
    return Math.max(0, Math.min(100, Number(rate)));
  }

  function sumOptionCounts(options) {
    return options.reduce((sum, option) => sum + safeNumber(option.count), 0);
  }

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function isValidPositiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0;
  }

  function isValidNonNegativeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0;
  }

  function isValidNonNegativeInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0;
  }

  function normalizeRequiredInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : 0;
  }

  function normalizeOptionalInteger(value) {
    if (value === undefined || value === null || value === "") return undefined;
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : undefined;
  }

  function readOptionalNumber(value) {
    if (value === undefined || value === null || value === "") return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }

  function isBlank(value) {
    return String(value || "").trim() === "";
  }

  async function openDb() {
    if (dbCache) return dbCache;
    dbCache = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbCache;
  }

  async function listSurveysFromDb() {
    const db = await openDb();
    const surveys = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    return surveys
      .map((survey) => normalizeImportedSurvey(survey, true))
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }

  async function getSurveyFromDb(id) {
    if (!id) return null;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveSurveyToDb(survey) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const request = transaction.objectStore(STORE_NAME).put(survey);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    return survey;
  }

  async function deleteSurveyFromDb(id) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const request = transaction.objectStore(STORE_NAME).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  function downloadSurveyJson(survey) {
    const exportFile = {
      appName: APP_NAME,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: nowIsoString(),
      survey: normalizeSurveyForSave(survey),
    };
    const blob = new Blob([JSON.stringify(exportFile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `survey-report-${formatFileTimestamp(new Date())}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function importSurveyFile(file) {
    try {
      const text = await file.text();
      const survey = parseSurveyJson(text);
      const saved = await saveSurveyToDb(normalizeSurveyForSave(survey));
      await refreshSurveys();
      state.currentSurvey = saved;
      state.view = "edit";
      state.validationMessages = [];
      state.flash = "データを読み込みました。";
      render();
    } catch (error) {
      console.error(error);
      state.flash = "データの読み込みに失敗しました。ファイル形式をご確認ください。";
      render();
    }
  }

  function parseSurveyJson(jsonText) {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON");
    if (parsed.appName && parsed.appName !== APP_NAME) throw new Error("Invalid appName");
    if (parsed.schemaVersion && parsed.schemaVersion !== SCHEMA_VERSION) throw new Error("Invalid schemaVersion");
    const rawSurvey = parsed.survey || parsed;
    const survey = normalizeImportedSurvey(rawSurvey, false);
    const messages = validateSurvey(survey);
    if (hasErrors(messages)) {
      throw new Error("Imported survey has validation errors");
    }
    return survey;
  }

  function sortByOrder(items) {
    return Array.from(items || []).sort((a, b) => safeNumber(a.sortOrder) - safeNumber(b.sortOrder));
  }

  function normalizeSortOrders(items) {
    items.forEach((item, index) => {
      item.sortOrder = index + 1;
    });
  }

  function moveItem(items, index, direction) {
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || index >= items.length || nextIndex >= items.length) return;
    const [item] = items.splice(index, 1);
    items.splice(nextIndex, 0, item);
  }

  function normalizeQuestionType(questionType) {
    if (questionType === "multiple_choice" || questionType === "free_text") return questionType;
    return "single_choice";
  }

  function readIndex(value) {
    const number = Number(value);
    return Number.isInteger(number) ? number : -1;
  }

  function readDirection(value) {
    return Number(value) < 0 ? -1 : 1;
  }

  function formatCount(value) {
    return isValidNonNegativeInteger(value) ? `${Number(value)}件` : "-";
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function formatFileTimestamp(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
      "-",
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds()),
    ].join("");
  }

  function nowIsoString() {
    return new Date().toISOString();
  }

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}_${window.crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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
