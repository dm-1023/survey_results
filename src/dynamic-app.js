(() => {
  "use strict";

  const DB_NAME = "town_survey_dynamic_registry";
  const DB_VERSION = 1;
  const SURVEY_STORE = "surveys";
  const RESPONSE_STORE = "responses";
  const CONTACT_STORE = "contacts";
  const APP_NAME = "town_survey_dynamic_registry";
  const SCHEMA_VERSION = 1;

  let root = null;
  let dbCache = null;

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
    await refreshData();
    render();
  }

  async function handleClick(event) {
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
      if (action === "duplicate-response") return duplicateResponse(button.dataset.id);
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
      if (action === "export-backup-json") return exportBackupJson();
      if (action === "export-word-report") return exportWordReport();
      if (action === "import-click") return document.getElementById("import-file")?.click();
      if (action === "add-report-cross") return addReportCrossItem();
      if (action === "remove-report-cross") return removeReportCrossItem(readIndex(button.dataset.crossIndex));
      if (action === "move-report-cross") return moveReportCrossItem(readIndex(button.dataset.crossIndex), readDirection(button.dataset.direction));
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

    if (target.matches("[data-question-field]")) {
      const question = getDraftQuestion(readIndex(target.dataset.questionIndex));
      if (!question) return;
      const field = target.dataset.questionField;
      if (field === "includeInReport") question.includeInReport = target.checked;
      else if (field === "type") {
        question.type = target.value;
        normalizeQuestionShape(question);
        render();
      } else question[field] = target.value;
      return;
    }

    if (target.matches("[data-option-field]")) {
      const question = getDraftQuestion(readIndex(target.dataset.questionIndex));
      const option = question?.options?.[readIndex(target.dataset.optionIndex)];
      if (option) option.label = target.value;
      return;
    }

    if (target.matches("[data-row-field]")) {
      const question = getDraftQuestion(readIndex(target.dataset.questionIndex));
      const row = question?.rows?.[readIndex(target.dataset.rowIndex)];
      if (row) row.label = target.value;
      return;
    }

    if (target.matches("[data-column-field]")) {
      const question = getDraftQuestion(readIndex(target.dataset.questionIndex));
      const column = question?.columns?.[readIndex(target.dataset.columnIndex)];
      if (column) column.label = target.value;
      return;
    }

    if (target.matches("[data-answer]")) {
      updateAnswer(target);
      return;
    }

    if (target.matches("[data-contact-field]")) {
      if (!state.currentContact) return;
      state.currentContact[target.dataset.contactField] = target.value;
    }
  }

  function render() {
    root.innerHTML = `
      <div class="app-shell">
        ${renderHeader()}
        <main class="app-main">
          ${renderFlash()}
          ${renderView()}
        </main>
      </div>
    `;
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
        <div>
          <p class="app-kicker">Survey Registry</p>
          <h1>アンケート集計</h1>
        </div>
        <p class="app-header__subtitle">${escapeHtml(title)}</p>
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

  function renderHomePage() {
    return `
      <section class="toolbar no-print">
        <button class="button button-primary" type="button" data-action="new-survey">新しいアンケートを作成</button>
        <button class="button" type="button" data-action="export-backup-json" title="アンケート設定・回答・連絡先を保存ファイルとして書き出す">保存ファイルを作成</button>
        <button class="button" type="button" data-action="import-click" title="保存ファイルを読み込んで現在のデータに追加">保存ファイルを読み込む</button>
        <input id="import-file" class="visually-hidden" type="file" accept="application/json,.json" />
      </section>
      <section class="panel">
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
          <button class="button button-primary" type="button" data-action="select-survey" data-id="${escapeAttr(survey.id)}">選択</button>
          <button class="button" type="button" data-action="edit-survey" data-id="${escapeAttr(survey.id)}">編集</button>
          <button class="button button-danger" type="button" data-action="delete-survey" data-id="${escapeAttr(survey.id)}">削除</button>
        </div>
      </article>
    `;
  }

  function renderSurveyEditPage() {
    const survey = state.surveyDraft;
    if (!survey) return renderMissing("アンケート設定が見つかりません。");
    return `
      <section class="toolbar no-print">
        <button class="button" type="button" data-action="home">アンケート一覧へ戻る</button>
        <button class="button button-primary" type="button" data-action="save-survey">保存</button>
      </section>
      <section class="panel">
        <div class="section-heading"><h2>基本情報</h2></div>
        <div class="form-grid">
          <label class="field field-wide"><span>タイトル<span class="required">必須</span></span><input type="text" value="${escapeAttr(survey.title)}" data-survey-field="title" required /></label>
          <label class="field"><span>実施者</span><input type="text" value="${escapeAttr(survey.issuer)}" data-survey-field="issuer" /></label>
          <label class="field"><span>実施期間</span><div class="date-range"><input type="date" value="${escapeAttr(survey.periodStart || "")}" data-survey-field="periodStart" aria-label="開始日" /><span class="date-range__separator" aria-hidden="true">〜</span><input type="date" value="${escapeAttr(survey.periodEnd || "")}" data-survey-field="periodEnd" aria-label="終了日" /></div></label>
          <label class="field"><span>配布数</span><input type="number" min="0" step="1" value="${escapeAttr(survey.distributedCount ?? "")}" data-survey-field="distributedCount" /></label>
          <label class="field field-wide"><span>メモ</span><textarea rows="3" data-survey-field="note">${escapeHtml(survey.note)}</textarea></label>
        </div>
      </section>
      <section class="panel">
        <div class="section-heading section-heading-actions">
          <h2>設問<span class="required">必須</span></h2>
          <div class="button-row no-print">
            <button class="button" type="button" data-action="add-question">設問を追加</button>
          </div>
        </div>
        <div class="question-editor-list">
          ${survey.questions.length ? survey.questions.map(renderQuestionEditor).join("") : `<div class="empty-state">設問がありません。上のボタンから追加してください。</div>`}
        </div>
      </section>
    `;
  }

  function renderQuestionEditor(question, index) {
    return `
      <article class="question-editor">
        <div class="question-editor__head">
          <div class="question-title-field">
            <span class="question-number">${index + 1}.</span>
            <label class="field question-title-input"><span>設問文<span class="required">必須</span></span><input type="text" value="${escapeAttr(question.title)}" placeholder="設問文を入力" data-question-field="title" data-question-index="${index}" required /></label>
          </div>
          <div class="icon-actions no-print">
            <button class="icon-button" title="上へ" type="button" data-action="move-question" data-question-index="${index}" data-direction="-1">↑</button>
            <button class="icon-button" title="下へ" type="button" data-action="move-question" data-question-index="${index}" data-direction="1">↓</button>
            <button class="button button-danger" type="button" data-action="remove-question" data-question-index="${index}">削除</button>
          </div>
        </div>
        <div class="form-grid">
          <label class="field">
            <span>回答形式</span>
            <select data-question-field="type" data-question-index="${index}">
              ${questionTypeOptions(question.type)}
            </select>
          </label>
          <label class="choice-item">
            <input type="checkbox" data-question-field="includeInReport" data-question-index="${index}"${question.includeInReport ? " checked" : ""}${question.type === "contact" ? " disabled" : ""} />
            <span>集計レポートに含める</span>
          </label>
        </div>
        ${renderQuestionDetailEditor(question, index)}
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

  function renderQuestionDetailEditor(question, index) {
    if (question.type === "single" || question.type === "multiple") return renderOptionEditor(question, index);
    if (question.type === "matrix_single" || question.type === "number_matrix") return `${renderRowEditor(question, index)}${renderColumnEditor(question, index)}`;
    if (question.type === "contact") return `<p class="notice-inline">この設問は連絡先として別保存され、集計レポートや匿名CSVには含めません。</p>`;
    return `<p class="muted-text">自由記述は選択肢設定不要です。</p>`;
  }

  function renderOptionEditor(question, questionIndex) {
    return `
      <div class="subsection">
        <div class="subsection-head"><h4>回答選択肢</h4><button class="button no-print" type="button" data-action="add-option" data-question-index="${questionIndex}">＋ 選択肢</button></div>
        <div class="option-list">
          ${question.options.map((option, optionIndex) => `
            <div class="option-row">
              <label class="field option-name"><span>選択肢<span class="required">必須</span></span><input type="text" value="${escapeAttr(option.label)}" data-option-field data-question-index="${questionIndex}" data-option-index="${optionIndex}" required /></label>
              <button class="button button-danger no-print" type="button" data-action="remove-option" data-question-index="${questionIndex}" data-option-index="${optionIndex}">選択肢を削除</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderRowEditor(question, questionIndex) {
    return `
      <div class="subsection">
        <div class="subsection-head"><h4>行項目</h4><button class="button no-print" type="button" data-action="add-row" data-question-index="${questionIndex}">＋ 行</button></div>
        <div class="option-list">
          ${question.rows.map((row, rowIndex) => `
            <div class="option-row">
              <label class="field option-name"><span>行<span class="required">必須</span></span><input type="text" value="${escapeAttr(row.label)}" data-row-field data-question-index="${questionIndex}" data-row-index="${rowIndex}" required /></label>
              <button class="button button-danger no-print" type="button" data-action="remove-row" data-question-index="${questionIndex}" data-row-index="${rowIndex}">行を削除</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderColumnEditor(question, questionIndex) {
    return `
      <div class="subsection">
        <div class="subsection-head"><h4>列項目</h4><button class="button no-print" type="button" data-action="add-column" data-question-index="${questionIndex}">＋ 列</button></div>
        <div class="option-list">
          ${question.columns.map((column, columnIndex) => `
            <div class="option-row">
              <label class="field option-name"><span>列<span class="required">必須</span></span><input type="text" value="${escapeAttr(column.label)}" data-column-field data-question-index="${questionIndex}" data-column-index="${columnIndex}" required /></label>
              <button class="button button-danger no-print" type="button" data-action="remove-column" data-question-index="${questionIndex}" data-column-index="${columnIndex}">列を削除</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderResponseListPage() {
    const survey = getCurrentSurvey();
    const responses = getCurrentResponses();
    return `
      <section class="toolbar no-print">
        <button class="button" type="button" data-action="home">アンケート一覧へ戻る</button>
        <button class="button button-primary" type="button" data-action="new-response">回答を登録</button>
        <button class="button" type="button" data-action="report">集計レポート</button>
        <button class="button" type="button" data-action="contacts">連絡先管理</button>
      </section>
      ${renderPrivacyNotice()}
      <section class="panel">
        <div class="section-heading"><h2>${survey?.title + " 回答一覧"}</h2><p class="count-label">${responses.length}件</p></div>
        ${responses.length ? renderResponseTable(responses) : `<div class="empty-state">登録済みの回答はありません。</div>`}
      </section>
    `;
  }

  function renderResponseTable(responses) {
    return `
      <div class="table-wrap">
        <table class="report-table">
          <thead><tr><th>番号</th><th>入力日時</th><th>連絡先</th><th class="no-print">操作</th></tr></thead>
          <tbody>
            ${responses.map((response, index) => {
              const hasContact = state.contacts.some((contact) => contact.responseId === response.id && hasContactValue(contact));
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${escapeHtml(formatDateTime(response.createdAt))}</td>
                  <td>${hasContact ? "あり" : "なし"}</td>
                  <td class="no-print">
                    <div class="button-row">
                      <button class="button" type="button" data-action="edit-response" data-id="${escapeAttr(response.id)}">編集</button>
                      <button class="button" type="button" data-action="duplicate-response" data-id="${escapeAttr(response.id)}">複製</button>
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

  function renderResponseEditPage() {
    const survey = getCurrentSurvey();
    if (!survey || !state.currentResponse) return renderMissing("回答が見つかりません。");
    return `
      <section class="toolbar no-print">
        <button class="button" type="button" data-action="list">回答一覧へ戻る</button>
        <button class="button button-primary" type="button" data-action="save-response">保存</button>
      </section>
      ${renderPrivacyNotice()}
      ${survey.questions.map((question, index) => renderAnswerQuestion(question, index)).join("")}
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

  function renderSingleAnswer(question, index, answer) {
    return `
      <section class="panel">
        <div class="section-heading"><h2>${index + 1}. ${escapeHtml(question.title)}</h2></div>
        <div class="choice-grid">
          ${question.options.map((option) => `
            <label class="choice-item">
              <input type="radio" name="answer_${escapeAttr(question.id)}" value="${escapeAttr(option.id)}" data-answer data-question-id="${escapeAttr(question.id)}"${answer === option.id ? " checked" : ""} />
              <span>${escapeHtml(option.label)}</span>
            </label>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderMultipleAnswer(question, index, answer) {
    const selected = new Set(Array.isArray(answer) ? answer : []);
    return `
      <section class="panel">
        <div class="section-heading"><h2>${index + 1}. ${escapeHtml(question.title)}</h2></div>
        <div class="choice-grid">
          ${question.options.map((option) => `
            <label class="choice-item">
              <input type="checkbox" value="${escapeAttr(option.id)}" data-answer data-question-id="${escapeAttr(question.id)}"${selected.has(option.id) ? " checked" : ""} />
              <span>${escapeHtml(option.label)}</span>
            </label>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderMatrixSingleAnswer(question, index, answer) {
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
      <section class="panel sensitive-panel">
        <div class="section-heading"><h2>${index + 1}. ${escapeHtml(question.title)} 非公開</h2></div>
        <p class="notice-inline">連絡先は運営内部用です。集計レポートや匿名CSVには含めません。</p>
        <div class="form-grid">
          <label class="field"><span>名前</span><input type="text" value="${escapeAttr(contact.name || "")}" data-contact-field="name" /></label>
          <label class="field"><span>電話番号</span><input type="text" value="${escapeAttr(contact.phone || "")}" data-contact-field="phone" /></label>
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
        <button class="button" type="button" data-action="list">回答一覧へ戻る</button>
        <button class="button" type="button" data-action="contacts">連絡先管理</button>
        <button class="button button-primary" type="button" data-action="export-word-report">Word出力</button>
        <button class="button button-primary" type="button" data-action="print">PDF出力・印刷</button>
      </section>
      ${renderReportControls(survey, config)}
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
        <div class="button-row report-add-row">
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
      ? config.overallQuestions.map((question, index) => renderAggregateQuestion(question, responses, index)).join("")
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
                    const rate = group.responses.length ? (count / group.responses.length) * 100 : null;
                    return `<td class="numeric">${count}件<br><span>${escapeHtml(formatRate(rate))}</span></td>`;
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderAggregateQuestion(question, responses, index) {
    if (question.type === "single") return renderChoiceAggregate(question, responses, index, false);
    if (question.type === "multiple") return renderChoiceAggregate(question, responses, index, true);
    if (question.type === "matrix_single") return renderMatrixAggregate(question, responses, index);
    if (question.type === "number_matrix") return renderNumberMatrixAggregate(question, responses, index);
    return renderTextAggregate(question, responses, index);
  }

  function renderChoiceAggregate(question, responses, index, multiple) {
    const denominator = responses.length;
    const rows = question.options.map((option) => {
      const count = countChoiceAnswers(question, responses, option.id);
      return { label: option.label, count };
    });
    return `<section class="question-block"><h3>${index + 1}. ${escapeHtml(question.title)}</h3>${renderAggregateTable(rows, denominator)}</section>`;
  }

  function countChoiceAnswers(question, responses, optionId) {
    return responses.filter((response) => {
      const answer = response.answers[question.id];
      return question.type === "multiple" ? Array.isArray(answer) && answer.includes(optionId) : answer === optionId;
    }).length;
  }

  function renderAggregateTable(rows, denominator) {
    return `
      <div class="table-wrap">
        <table class="report-table">
          <thead><tr><th>項目</th><th>件数</th><th>割合</th><th>グラフ</th></tr></thead>
          <tbody>
            ${rows.map((row) => {
              const rate = denominator > 0 ? (row.count / denominator) * 100 : null;
              return `<tr><th>${escapeHtml(row.label)}</th><td class="numeric">${row.count}件</td><td class="numeric">${formatRate(rate)}</td><td>${renderBar(rate)}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderMatrixAggregate(question, responses, index) {
    return `
      <section class="question-block">
        <h3>${index + 1}. ${escapeHtml(question.title)}</h3>
        <div class="table-wrap">
          <table class="report-table">
            <thead><tr><th>項目</th>${question.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
            <tbody>
              ${question.rows.map((row) => `
                <tr>
                  <th>${escapeHtml(row.label)}</th>
                  ${question.columns.map((column) => {
                    const count = responses.filter((response) => response.answers[question.id]?.[row.id] === column.id).length;
                    return `<td class="numeric">${count}件</td>`;
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderNumberMatrixAggregate(question, responses, index) {
    return `
      <section class="question-block">
        <h3>${index + 1}. ${escapeHtml(question.title)}</h3>
        <div class="table-wrap">
          <table class="report-table">
            <thead><tr><th>項目</th>${question.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}<th>合計</th></tr></thead>
            <tbody>
              ${question.rows.map((row) => {
                let rowTotal = 0;
                const cells = question.columns.map((column) => {
                  const total = responses.reduce((sum, response) => sum + safeInteger(response.answers[question.id]?.[row.id]?.[column.id]), 0);
                  rowTotal += total;
                  return `<td class="numeric">${total}</td>`;
                }).join("");
                return `<tr><th>${escapeHtml(row.label)}</th>${cells}<td class="numeric">${rowTotal}</td></tr>`;
              }).join("")}
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
        <button class="button" type="button" data-action="list">回答一覧へ戻る</button>
        <button class="button button-primary" type="button" data-action="export-contact-csv">連絡先CSV</button>
      </section>
      <section class="panel sensitive-panel">
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
        連絡先設問は回答データと分けて保存します。集計レポートには氏名・住所・電話番号を含めません。
        保存ファイルにはアンケート設定・回答・連絡先が含まれるため、運営内部で保管してください。
      </aside>
    `;
  }

  function renderMissing(message) {
    return `<section class="panel"><p>${escapeHtml(message)}</p><button class="button" type="button" data-action="home">アンケート一覧へ戻る</button></section>`;
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
    const survey = normalizeSurvey(state.surveyDraft);
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
    state.currentSurveyId = survey.id;
    state.surveyDraft = null;
    state.view = "list";
    state.flash = "アンケート設定を保存しました。";
    render();
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
    resetReportSelection();
    state.messages = [];
    render();
  }

  function showWorkspace(view) {
    if (!state.currentSurveyId) return showHome();
    state.view = view;
    state.currentResponse = null;
    state.currentContact = null;
    state.messages = [];
    state.flash = "";
    render();
  }

  function openResponseEditor(id) {
    const survey = getCurrentSurvey();
    if (!survey) return showHome();
    const response = id ? getCurrentResponses().find((item) => item.id === id) : null;
    state.currentResponse = response ? clone(response) : createResponse(survey.id);
    state.currentContact = clone(state.contacts.find((contact) => contact.responseId === state.currentResponse.id) || createContact(state.currentResponse.id));
    state.view = "response-edit";
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

  async function duplicateResponse(id) {
    const response = getCurrentResponses().find((item) => item.id === id);
    if (!response) return;
    const copy = clone(response);
    copy.id = createId("response");
    copy.createdAt = nowIsoString();
    copy.updatedAt = copy.createdAt;
    await putRecord(RESPONSE_STORE, copy);
    await refreshData();
    state.flash = "回答を複製しました。連絡先は複製していません。";
    render();
  }

  function addQuestion(type) {
    if (!state.surveyDraft) return;
    state.surveyDraft.questions.push(createQuestion(type));
    render();
  }

  function removeQuestion(index) {
    if (!state.surveyDraft?.questions[index]) return;
    if (!window.confirm("この設問を削除します。既存回答の該当データは集計されなくなります。よろしいですか？")) return;
    state.surveyDraft.questions.splice(index, 1);
    render();
  }

  function moveQuestion(index, direction) {
    if (!state.surveyDraft) return;
    moveItem(state.surveyDraft.questions, index, direction);
    render();
  }

  function addOption(questionIndex) {
    const question = getDraftQuestion(questionIndex);
    if (!question) return;
    question.options.push(createItem(""));
    render();
  }

  function removeOption(questionIndex, optionIndex) {
    const question = getDraftQuestion(questionIndex);
    if (!question) return;
    question.options.splice(optionIndex, 1);
    render();
  }

  function addRow(questionIndex) {
    const question = getDraftQuestion(questionIndex);
    if (!question) return;
    question.rows.push(createItem(""));
    render();
  }

  function removeRow(questionIndex, rowIndex) {
    const question = getDraftQuestion(questionIndex);
    if (!question) return;
    question.rows.splice(rowIndex, 1);
    render();
  }

  function addColumn(questionIndex) {
    const question = getDraftQuestion(questionIndex);
    if (!question) return;
    question.columns.push(createItem(""));
    render();
  }

  function removeColumn(questionIndex, columnIndex) {
    const question = getDraftQuestion(questionIndex);
    if (!question) return;
    question.columns.splice(columnIndex, 1);
    render();
  }

  function updateAnswer(target) {
    const question = getCurrentSurvey()?.questions.find((item) => item.id === target.dataset.questionId);
    if (!question || !state.currentResponse) return;
    const answers = state.currentResponse.answers;
    if (question.type === "single") {
      answers[question.id] = target.value;
    } else if (question.type === "multiple") {
      const current = new Set(Array.isArray(answers[question.id]) ? answers[question.id] : []);
      if (target.checked) current.add(target.value);
      else current.delete(target.value);
      answers[question.id] = Array.from(current);
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
  }

  function createDefaultSurvey() {
    const now = nowIsoString();
    return {
      id: createId("survey"),
      title: "",
      issuer: "",
      periodText: "",
      periodStart: "",
      periodEnd: "",
      distributedCount: undefined,
      note: "",
      questions: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  function createDefaultQuestions() {
    return [
      createQuestion("number_matrix", "家族構成", [["age_0_9", "0〜9歳"], ["age_10s", "10代"], ["age_20s", "20代"], ["age_30s", "30代"], ["age_40s", "40代"], ["age_50s", "50代"], ["age_60s", "60代"], ["age_70s", "70代"], ["age_80s", "80代"], ["age_90s", "90代"]], [["male", "男"], ["female", "女"]]),
      createQuestion("single", "回答者の世代", [["age_0_9", "0〜9歳"], ["age_10s", "10代"], ["age_20s", "20代"], ["age_30s", "30代"], ["age_40s", "40代"], ["age_50s", "50代"], ["age_60s", "60代"], ["age_70s", "70代"], ["age_80s", "80代"], ["age_90s", "90代"]]),
      createQuestion("single", "居住年数は何年ですか？", [["under_1", "1年未満"], ["1_5", "1〜5年"], ["5_10", "5〜10年"], ["10_15", "10〜15年"], ["15_20", "15〜20年"], ["20_plus", "20年以上"]]),
      createQuestion("single", "ここ5年以内に、町内会の活動や行事に参加したことはありますか？", [["yes", "ある"], ["no", "ない"]]),
      createQuestion("multiple", "参加できない理由", [["no_info", "情報が届かない"], ["no_time", "時間がない"], ["personal_priority", "自分の時間を優先したい"], ["no_invitation", "参加のきっかけがない"], ["physical_burden", "身体的負担が大きい"], ["not_interested", "町内会には関心がない"], ["other", "その他"]]),
      createQuestion("matrix_single", "既存活動・行事について", [["general_meeting", "総会"], ["cleaning", "町内・公園清掃"], ["extinguisher_training", "消火器訓練"], ["park_meal", "公園での食事会"], ["radio_exercise", "ラジオ体操"]], [["participated", "参加したことがある"], ["not_participated", "参加したことがない"], ["continue", "今後も継続してほしい"], ["discontinue", "今後継続の必要はない"], ["unknown", "わからない"]]),
      createQuestion("multiple", "どのような企画・テーマであれば参加したいですか？", [["cooking", "料理教室"], ["tea", "お茶会"], ["walking", "まち歩き"], ["child_event", "子ども向けイベント"], ["disaster_health", "防災・健康づくり"], ["smartphone", "スマートフォン・SNS講座"], ["other", "その他"]]),
      createQuestion("single", "回覧板をどのくらいご覧になっていますか？", [["always", "毎回しっかり見ている"], ["mostly", "内容はだいたい見ている"], ["rarely", "ほとんど見ていない"], ["never", "まったく見ていない"], ["unknown", "わからない"]]),
      createQuestion("multiple", "活動状況を広く伝える方法として便利だと思うもの", [["bulletin_board", "回覧板"], ["mail", "メール"], ["homepage", "ホームページ"], ["line_sns", "LINE・SNS"], ["garbage_station", "掲示板"], ["unknown", "わからない"], ["other", "その他"]]),
      createQuestion("multiple", "活動参加・サポートの可能性", [["difficult", "参加は難しい"], ["seasonal", "時期によってはできる"], ["day_support", "当日の手伝いならできる"], ["pr_support", "広報ならできる"], ["sns_support", "SNS発信ならできる"], ["officer", "役員をやってもよい"], ["other", "その他"]]),
      createQuestion("contact", "連絡先"),
      createQuestion("multiple", "町内会の運営に関して、今後どのようなあり方を望みますか？", [["reduce_work", "役員負担を軽減"], ["prioritize_life", "仕事や家庭を優先できる"], ["fair_rotation", "任期が守られる"], ["accept_ideas", "意見や提案が受け入れられる"], ["not_needed", "町内会を必要と思わない"], ["lower_fee", "町内会費を安くしてほしい"], ["other", "その他"]]),
      createQuestion("text", "町内会活動・行事や運営などについてのご意見"),
    ];
  }

  function createQuestion(type, title = "", first = null, second = null) {
    const question = {
      id: createId("question"),
      type,
      title: title || "",
      includeInReport: type !== "contact",
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
      options: Array.isArray(input?.options) ? input.options.map(normalizeItem) : [],
      rows: Array.isArray(input?.rows) ? input.rows.map(normalizeItem) : [],
      columns: Array.isArray(input?.columns) ? input.columns.map(normalizeItem) : [],
    };
    normalizeQuestionShape(question);
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

  function getReportConfig(survey) {
    return {
      overallQuestions: getReportableQuestions(survey),
      crossItems: getReportCrossItems(survey),
    };
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
    return getReportableQuestions(survey).filter((question) => question.id !== axisQuestionId && (question.type === "single" || question.type === "multiple"));
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

  function exportAnonymousCsv() {
    const survey = getCurrentSurvey();
    const responses = getCurrentResponses();
    if (!survey) return;
    const reportQuestions = survey.questions.filter((question) => question.type !== "contact");
    const rows = [
      ["回答番号", ...reportQuestions.map((question) => question.title)],
      ...responses.map((response, index) => [index + 1, ...reportQuestions.map((question) => formatAnswerForCsv(question, response.answers[question.id]))]),
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
    const rows = [
      ["回答番号", "名前", "住所", "電話番号"],
      ...state.contacts.filter((contact) => responseIds.has(contact.responseId) && hasContactValue(contact)).map((contact) => {
        const index = responses.findIndex((response) => response.id === contact.responseId);
        return [index >= 0 ? index + 1 : "", contact.name, contact.address, contact.phone];
      }),
    ];
    downloadCsv("contacts-internal.csv", rows);
  }

  function exportBackupJson() {
    try {
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

  function buildWordReportDocx(survey, responses, config = getReportConfig(survey)) {
    return createZip([
      { name: "[Content_Types].xml", data: wordContentTypesXml() },
      { name: "_rels/.rels", data: wordPackageRelsXml() },
      { name: "word/_rels/document.xml.rels", data: wordDocumentRelsXml() },
      { name: "word/styles.xml", data: wordStylesXml() },
      { name: "word/document.xml", data: wordDocumentXml(survey, responses, config) },
    ]);
  }

  function wordDocumentXml(survey, responses, config) {
    const body = [
      wordParagraph(survey.title || "集計レポート", { style: "Title" }),
      wordTable([
        ["実施者", survey.issuer || "-"],
        ["実施期間", wordPeriodText(survey)],
        ["配布数", survey.distributedCount ?? "-"],
        ["回答数", `${responses.length}件`],
        ["作成日", formatDate(new Date())],
      ], { header: false, widths: [1800, 7200] }),
      wordSpacer(),
      ...wordReportBlocks(config, responses),
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

  function wordReportBlocks(config, responses) {
    const blocks = [
      wordParagraph("全体集計", { style: "Heading1" }),
      ...(config.overallQuestions.length
        ? config.overallQuestions.map((question, index) => wordQuestionBlock(question, responses, index))
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
    const rows = [[
      "項目",
      ...groups.map((group) => `${group.label}\n${group.responses.length}件`),
    ]];
    question.options.forEach((option) => {
      rows.push([
        option.label,
        ...groups.map((group) => {
          const count = countChoiceAnswers(question, group.responses, option.id);
          const rate = group.responses.length ? (count / group.responses.length) * 100 : null;
          return `${count}件\n${formatRate(rate)}`;
        }),
      ]);
    });
    return wordParagraph(`${item.axisQuestion.title} × ${question.title}`, { bold: true }) + wordTable(rows, { widths: wordColumnWidths(rows[0].length, 2600) }) + wordSpacer();
  }

  function wordQuestionBlock(question, responses, index) {
    const heading = wordParagraph(`${index + 1}. ${question.title}`, { style: "Heading1" });
    if (question.type === "single" || question.type === "multiple") {
      const rows = [["項目", "件数", "割合", "グラフ"]];
      question.options.forEach((option) => {
        const count = responses.filter((response) => {
          const answer = response.answers[question.id];
          return question.type === "multiple" ? Array.isArray(answer) && answer.includes(option.id) : answer === option.id;
        }).length;
        const rate = responses.length ? (count / responses.length) * 100 : null;
        rows.push([option.label, `${count}件`, formatRate(rate), { type: "bar", rate }]);
      });
      return heading + wordTable(rows, { widths: [4200, 1100, 1100, 2600] }) + wordSpacer();
    }
    if (question.type === "matrix_single") {
      const rows = [["項目", ...question.columns.map((column) => column.label)]];
      question.rows.forEach((row) => {
        rows.push([
          row.label,
          ...question.columns.map((column) => `${responses.filter((response) => response.answers[question.id]?.[row.id] === column.id).length}件`),
        ]);
      });
      return heading + wordTable(rows, { widths: wordColumnWidths(rows[0].length, 2600) }) + wordSpacer();
    }
    if (question.type === "number_matrix") {
      const rows = [["項目", ...question.columns.map((column) => column.label), "合計"]];
      question.rows.forEach((row) => {
        let rowTotal = 0;
        const cells = question.columns.map((column) => {
          const total = responses.reduce((sum, response) => sum + safeInteger(response.answers[question.id]?.[row.id]?.[column.id]), 0);
          rowTotal += total;
          return total;
        });
        rows.push([row.label, ...cells, rowTotal]);
      });
      return heading + wordTable(rows, { widths: wordColumnWidths(rows[0].length, 2600) }) + wordSpacer();
    }
    const answers = responses.map((response) => String(response.answers[question.id] || "").trim()).filter(Boolean);
    const answerParagraphs = answers.length
      ? answers.map((answer) => wordParagraph(`・${answer}`)).join("")
      : wordParagraph("記入された回答はありません。");
    return heading + wordParagraph(`記入あり: ${answers.length}件`) + answerParagraphs + wordSpacer();
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
      : wordParagraph(String(value ?? ""), { bold: header, compact: true });
    return `<w:tc>${cellPr}${content}</w:tc>`;
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
    <w:tc><w:tcPr><w:tcW w:w="${filled}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="555555"/></w:tcPr>${wordParagraph(" ", { compact: true, after: 0 })}</w:tc>
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

  function wordContentTypesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
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

  function wordDocumentRelsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
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

  function formatAnswerForCsv(question, answer) {
    if (question.type === "single") return question.options.find((option) => option.id === answer)?.label || "";
    if (question.type === "multiple") return question.options.filter((option) => Array.isArray(answer) && answer.includes(option.id)).map((option) => option.label).join(" / ");
    if (question.type === "matrix_single") return question.rows.map((row) => `${row.label}:${question.columns.find((column) => column.id === answer?.[row.id])?.label || ""}`).join(" / ");
    if (question.type === "number_matrix") return question.rows.map((row) => `${row.label}:${question.columns.map((column) => `${column.label}=${answer?.[row.id]?.[column.id] ?? ""}`).join(";")}`).join(" / ");
    return String(answer || "");
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
    return `<div class="bar-graph" aria-hidden="true"><span style="width:${width}%"></span></div>`;
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
