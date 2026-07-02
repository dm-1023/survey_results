(() => {
  "use strict";

  const DB_NAME = "town_survey_response_registry";
  const DB_VERSION = 2;
  const SURVEY_STORE = "surveys";
  const RESPONSE_STORE = "responses";
  const CONTACT_STORE = "contacts";
  const APP_NAME = "town_survey_response_registry";
  const SCHEMA_VERSION = 1;

  const AGE_BANDS = [
    ["age_0_9", "0〜9歳"],
    ["age_10s", "10代"],
    ["age_20s", "20代"],
    ["age_30s", "30代"],
    ["age_40s", "40代"],
    ["age_50s", "50代"],
    ["age_60s", "60代"],
    ["age_70s", "70代"],
    ["age_80s", "80代"],
    ["age_90s", "90代"],
  ];

  const RESIDENCE_OPTIONS = [
    ["under_1", "1年未満"],
    ["1_5", "1〜5年"],
    ["5_10", "5〜10年"],
    ["10_15", "10〜15年"],
    ["15_20", "15〜20年"],
    ["20_plus", "20年以上"],
  ];

  const NO_PARTICIPATION_REASONS = [
    ["no_info", "いつどのようなことが行われているか知らない"],
    ["no_time", "地域活動に取り組む時間がない"],
    ["personal_priority", "自分の時間、用事を優先したい"],
    ["no_invitation", "参加のきっかけがない"],
    ["alone_hesitation", "一人では参加しづらい"],
    ["not_fit_family", "内容や世代や家庭環境と合わない"],
    ["physical_burden", "身体的負担が大きい"],
    ["no_merit", "参加のメリットを感じない"],
    ["relationship_burden", "地域の人との付き合いがわずらわしい"],
    ["not_interested", "町内会には関心がない"],
    ["other", "その他"],
  ];

  const ACTIVITIES = [
    ["general_meeting", "総会"],
    ["year_end_new_year", "忘年会・新年会"],
    ["cleaning", "町内・公園清掃"],
    ["extinguisher_training", "消火器訓練"],
    ["park_meal", "公園での食事会"],
    ["winter_event", "冬のイベント・ゆきあかり"],
    ["radio_exercise", "ラジオ体操"],
  ];

  const ACTIVITY_EVALUATIONS = [
    ["participated", "参加したことがある"],
    ["not_participated", "参加したことがない"],
    ["continue", "今後も継続してほしい"],
    ["discontinue", "今後継続の必要はない"],
    ["unknown", "わからない"],
  ];

  const DESIRED_EVENTS = [
    ["cooking", "料理教室・お菓子作り教室・コーヒー教室"],
    ["tea", "お茶会"],
    ["local_dining", "飲食店とタイアップした地域食堂"],
    ["walking", "まち歩きスタンプラリー"],
    ["child_event", "子育てサロン、子ども向けイベント"],
    ["disaster_health", "防災の勉強会、健康づくり教室"],
    ["smartphone", "スマートフォン・SNSの使い方講座"],
    ["other", "その他"],
  ];

  const BULLETIN_OPTIONS = [
    ["always", "毎回しっかり見ている"],
    ["mostly", "しっかりではないが内容はだいたい見ている"],
    ["rarely", "ほとんど見ていない・読んでいない"],
    ["never", "まったく見ていない"],
    ["burden", "まったく見ないし、回覧板を回すのもめんどう"],
    ["unknown", "わからない"],
  ];

  const COMMUNICATION_OPTIONS = [
    ["bulletin_board", "回覧板"],
    ["mail", "メール"],
    ["homepage", "ホームページ"],
    ["line_sns", "LINE・SNSなど"],
    ["garbage_station", "ゴミステーションに掲示板"],
    ["not_needed", "町内会は必要ない"],
    ["unknown", "わからない"],
    ["other", "その他"],
  ];

  const SUPPORT_OPTIONS = [
    ["difficult", "体調や時間的制限などにより参加は難しい"],
    ["seasonal", "時期・季節によっては町内会活動を行うことができる"],
    ["watch_only", "見守り活動のサポートぐらいは協力できる"],
    ["participate_no_support", "活動には参加するが、運営のサポートはできない"],
    ["prep_support", "事前にわかっていれば企画や準備をサポートできる"],
    ["day_support", "事前にわかっていれば当日のサポート・手伝いならできる"],
    ["pr_support", "回覧やお知らせ、広報などを作る程度ならできる"],
    ["sns_support", "SNSでの町内会情報の発信ぐらいならできる"],
    ["officer", "役員をやってもよい"],
    ["not_needed", "町内会は必要ない"],
    ["other", "その他"],
  ];

  const OPERATION_WISHES = [
    ["reduce_work", "役員の仕事の縮小や分担がされ、負担が軽減されていく"],
    ["prioritize_life", "仕事や家庭を優先することができる"],
    ["fair_rotation", "役員の回り番制による任期が必ず守られる"],
    ["same_people", "同世代の人が役員の中心にいる"],
    ["accept_ideas", "意見や提案が受け入れられる"],
    ["not_needed", "町内会を必要と思わない"],
    ["lower_fee", "町内会費を安くしてほしい"],
    ["other", "その他"],
  ];

  const QUESTION_TEXT_DEFAULTS = {
    q1: "家族構成・回答者世代",
    q2: "居住年数は何年ですか？",
    q3a: "ここ5年以内に、町内会の活動や行事に参加したことはありますか？",
    q3b: "参加できない理由",
    q4: "既存活動・行事について",
    q5: "どのような企画・テーマであれば参加したいですか？",
    q6: "回覧板をどのくらいご覧になっていますか？",
    q7: "活動状況を広く伝える方法として便利だと思うもの",
    q8: "活動参加・サポートの可能性",
    q9: "連絡先",
    q10: "町内会の運営に関して、今後どのようなあり方を望みますか？",
    q11: "自由意見",
  };

  const OPTION_GROUPS = [
    ["residenceOptions", "問2 居住年数", RESIDENCE_OPTIONS],
    ["participatedOptions", "問3-A 参加経験", [["yes", "ある"], ["no", "ない"]]],
    ["noParticipationReasons", "問3-B 参加できない理由", NO_PARTICIPATION_REASONS],
    ["activities", "問4 活動・行事名", ACTIVITIES],
    ["activityEvaluations", "問4 評価欄", ACTIVITY_EVALUATIONS],
    ["desiredEvents", "問5 参加したい企画", DESIRED_EVENTS],
    ["bulletinOptions", "問6 回覧板", BULLETIN_OPTIONS],
    ["communicationMethods", "問7 情報伝達方法", COMMUNICATION_OPTIONS],
    ["supportOptions", "問8 サポート可能性", SUPPORT_OPTIONS],
    ["operationWishes", "問10 運営への希望", OPERATION_WISHES],
  ];

  let root = null;
  let dbCache = null;

  const state = {
    view: "home",
    surveys: [],
    currentSurveyId: "",
    currentSurvey: null,
    surveyDraft: null,
    responses: [],
    contacts: [],
    currentResponse: null,
    currentContact: null,
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

    if (!("indexedDB" in window)) {
      state.flash = "お使いのブラウザではデータ保存機能を利用できません。別のブラウザでお試しください。";
      render();
      return;
    }

    await refreshData();
    await ensureSurveyBootstrap();
    render();
  }

  async function handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    event.preventDefault();

    try {
      const action = button.dataset.action;
      if (action === "home") return showHome();
      if (action === "select-survey") return selectSurvey(button.dataset.id);
      if (action === "new-survey") return openSurveyEditor();
      if (action === "edit-survey") return openSurveyEditor(button.dataset.id);
      if (action === "save-survey") return saveSurveyDraft();
      if (action === "delete-survey") return deleteSurvey(button.dataset.id);
      if (action === "new") return openNewResponse();
      if (action === "list") return show("list");
      if (action === "report") return show("report");
      if (action === "contacts") return show("contacts");
      if (action === "edit") return openExistingResponse(button.dataset.id);
      if (action === "save") return saveCurrentResponse();
      if (action === "delete") return deleteResponse(button.dataset.id);
      if (action === "duplicate") return duplicateResponse(button.dataset.id);
      if (action === "export-anonymous-csv") return exportAnonymousResponsesCsv();
      if (action === "export-aggregate-csv") return exportAggregateCsv();
      if (action === "export-contact-csv") return exportContactsCsv();
      if (action === "export-backup-json") return exportBackupJson();
      if (action === "import-click") return document.getElementById("import-file")?.click();
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

    if (target.matches("[data-survey-question]")) {
      if (!state.surveyDraft) return;
      state.surveyDraft.questionTexts ||= createQuestionTextDefaults();
      state.surveyDraft.questionTexts[target.dataset.surveyQuestion] = target.value;
      return;
    }

    if (target.matches("[data-survey-option]")) {
      if (!state.surveyDraft) return;
      const group = target.dataset.optionGroup;
      const optionId = target.dataset.optionId;
      state.surveyDraft.optionLabels ||= createOptionLabelDefaults();
      state.surveyDraft.optionLabels[group] ||= {};
      state.surveyDraft.optionLabels[group][optionId] = target.value;
      return;
    }

    if (!state.currentResponse) return;

    if (target.matches("[data-response-field]")) {
      state.currentResponse[target.dataset.responseField] = readControlValue(target);
      return;
    }

    if (target.matches("[data-household]")) {
      state.currentResponse.household[target.dataset.age][target.dataset.gender] = readOptionalInteger(target.value);
      return;
    }

    if (target.matches("[data-checkbox-group]")) {
      updateCheckboxGroup(target.dataset.checkboxGroup, target.value, target.checked);
      return;
    }

    if (target.matches("[data-activity]")) {
      state.currentResponse.activityEvaluations[target.dataset.activity] = target.value;
      return;
    }

    if (target.matches("[data-contact-field]")) {
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
      edit: "回答入力",
      report: "集計レポート",
      contacts: "連絡先管理",
    }[state.view] || "アンケート一覧";
    return `
      <header class="app-header no-print">
        <div>
          <p class="app-kicker">Town Association Survey</p>
          <h1>町内会アンケート集計</h1>
        </div>
        <p class="app-header__subtitle">${escapeHtml(title)}</p>
      </header>
    `;
  }

  function renderFlash() {
    const flash = state.flash ? `<div class="flash no-print" role="status">${escapeHtml(state.flash)}</div>` : "";
    const messages = state.messages.length ? `
      <section class="messages no-print">
        <div class="message-group message-error">
          <h2>確認してください</h2>
          <ul>${state.messages.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}</ul>
        </div>
      </section>
    ` : "";
    return `${flash}${messages}`;
  }

  function renderView() {
    if (state.view === "home") return renderHomePage();
    if (state.view === "survey-edit") return renderSurveyEditPage();
    if (state.view === "edit") return renderEditPage();
    if (state.view === "report") return renderReportPage();
    if (state.view === "contacts") return renderContactsPage();
    return renderListPage();
  }

  function renderHomePage() {
    const cards = state.surveys.length
      ? state.surveys.map(renderSurveyCard).join("")
      : `<div class="empty-state">アンケートがありません。</div>`;

    return `
      <section class="toolbar no-print">
        <button class="button button-primary" type="button" data-action="new-survey">新しいアンケートを作成</button>
      </section>
      <section class="panel">
        <div class="section-heading">
          <h2>アンケート一覧</h2>
          <p class="count-label">${state.surveys.length}件</p>
        </div>
        <div class="list-grid">${cards}</div>
      </section>
    `;
  }

  function renderSurveyCard(survey) {
    const responseCount = state.responses.filter((response) => response.surveyId === survey.id).length;
    return `
      <article class="survey-card">
        <div class="survey-card__main">
          <h2>${escapeHtml(survey.title || "無題のアンケート")}</h2>
          <dl class="meta-grid">
            <div><dt>実施者</dt><dd>${escapeHtml(survey.issuer || "-")}</dd></div>
            <div><dt>実施期間</dt><dd>${escapeHtml(survey.periodText || "-")}</dd></div>
            <div><dt>配布数</dt><dd>${survey.distributedCount ?? "-"}</dd></div>
            <div><dt>登録回答数</dt><dd>${responseCount}件</dd></div>
          </dl>
        </div>
        <div class="card-actions no-print">
          <button class="button button-primary" type="button" data-action="select-survey" data-id="${escapeAttr(survey.id)}">選択</button>
          <button class="button" type="button" data-action="edit-survey" data-id="${escapeAttr(survey.id)}">設定を編集</button>
          <button class="button button-danger" type="button" data-action="delete-survey" data-id="${escapeAttr(survey.id)}">削除</button>
        </div>
      </article>
    `;
  }

  function renderSurveyEditPage() {
    const survey = state.surveyDraft;
    if (!survey) return `<section class="panel"><p>アンケート設定が見つかりません。</p></section>`;

    return `
      <section class="toolbar no-print">
        <button class="button" type="button" data-action="home">アンケート一覧へ戻る</button>
        <button class="button button-primary" type="button" data-action="save-survey">保存</button>
      </section>
      <section class="panel">
        <div class="section-heading">
          <h2>アンケート設定</h2>
        </div>
        <div class="form-grid">
          <label class="field field-wide">
            <span>タイトル</span>
            <input type="text" value="${escapeAttr(survey.title || "")}" data-survey-field="title" />
          </label>
          <label class="field">
            <span>実施者</span>
            <input type="text" value="${escapeAttr(survey.issuer || "")}" data-survey-field="issuer" />
          </label>
          <label class="field">
            <span>実施期間</span>
            <input type="text" value="${escapeAttr(survey.periodText || "")}" data-survey-field="periodText" />
          </label>
          <label class="field">
            <span>配布数</span>
            <input type="number" min="0" step="1" value="${escapeAttr(survey.distributedCount ?? "")}" data-survey-field="distributedCount" />
          </label>
          <label class="field field-wide">
            <span>メモ</span>
            <textarea rows="3" data-survey-field="note">${escapeHtml(survey.note || "")}</textarea>
          </label>
        </div>
      </section>
      ${renderQuestionSettings(survey)}
    `;
  }

  function renderQuestionSettings(survey) {
    return `
      <section class="panel">
        <div class="section-heading">
          <h2>設問文</h2>
        </div>
        <div class="form-grid">
          ${Object.entries(QUESTION_TEXT_DEFAULTS).map(([key, label]) => `
            <label class="field field-wide">
              <span>${escapeHtml(key.toUpperCase())}</span>
              <input type="text" value="${escapeAttr(getSurveyQuestionText(survey, key) || label)}" data-survey-question="${escapeAttr(key)}" />
            </label>
          `).join("")}
        </div>
      </section>
      <section class="panel">
        <div class="section-heading">
          <h2>選択肢・行項目</h2>
        </div>
        <div class="settings-group-list">
          ${OPTION_GROUPS.map(([groupKey, title, defaults]) => `
            <div class="settings-group">
              <h3>${escapeHtml(title)}</h3>
              <div class="form-grid">
                ${defaults.map(([optionId, defaultLabel]) => `
                  <label class="field">
                    <span>${escapeHtml(optionId)}</span>
                    <input type="text" value="${escapeAttr(getSurveyOptionLabel(survey, groupKey, optionId) || defaultLabel)}" data-survey-option data-option-group="${escapeAttr(groupKey)}" data-option-id="${escapeAttr(optionId)}" />
                  </label>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderListPage() {
    const survey = getCurrentSurvey();
    return `
      <section class="toolbar no-print">
        <button class="button" type="button" data-action="home">アンケート一覧へ戻る</button>
        <button class="button button-primary" type="button" data-action="new">回答用紙を登録</button>
        <button class="button" type="button" data-action="report">集計レポート</button>
        <button class="button" type="button" data-action="contacts">連絡先管理</button>
        <button class="button" type="button" data-action="export-anonymous-csv">匿名回答CSV</button>
        <button class="button" type="button" data-action="export-aggregate-csv">集計CSV</button>
        <button class="button" type="button" data-action="export-backup-json">完全バックアップJSON</button>
        <button class="button" type="button" data-action="import-click">バックアップを読み込み</button>
        <input id="import-file" class="visually-hidden" type="file" accept="application/json,.json" />
      </section>
      ${renderPrivacyNotice()}
      <section class="panel">
        <div class="section-heading">
          <h2>${escapeHtml(survey?.title || "回答一覧")}</h2>
          <p class="count-label">${getCurrentResponses().length}件</p>
        </div>
        ${renderResponseList()}
      </section>
    `;
  }

  function renderResponseList() {
    const responses = getCurrentResponses();
    if (!responses.length) return `<div class="empty-state">登録済みの回答はありません。</div>`;
    return `
      <div class="table-wrap">
        <table class="report-table">
          <thead>
            <tr>
              <th>番号</th>
              <th>居住年数</th>
              <th>参加経験</th>
              <th>回答者世代</th>
              <th>連絡先</th>
              <th class="no-print">操作</th>
            </tr>
          </thead>
          <tbody>${responses.map(renderResponseRow).join("")}</tbody>
        </table>
      </div>
    `;
  }

  function renderResponseRow(response, index) {
    const hasContact = state.contacts.some((contact) => contact.responseId === response.id && hasContactValue(contact));
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(labelOf(getOptions("residenceOptions"), response.residenceYears))}</td>
        <td>${response.participated === "yes" ? "ある" : response.participated === "no" ? "ない" : "-"}</td>
        <td>${escapeHtml(labelOf(AGE_BANDS, response.respondentAgeBand))}</td>
        <td>${hasContact ? "あり" : "なし"}</td>
        <td class="no-print">
          <div class="button-row">
            <button class="button" type="button" data-action="edit" data-id="${escapeAttr(response.id)}">編集</button>
            <button class="button" type="button" data-action="duplicate" data-id="${escapeAttr(response.id)}">複製</button>
            <button class="button button-danger" type="button" data-action="delete" data-id="${escapeAttr(response.id)}">削除</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderEditPage() {
    const response = state.currentResponse;
    const contact = state.currentContact;
    if (!response || !contact) return renderMissingResponse();
    return `
      <section class="toolbar no-print">
        <button class="button" type="button" data-action="list">一覧へ戻る</button>
        <button class="button button-primary" type="button" data-action="save">保存</button>
      </section>
      ${renderPrivacyNotice()}
      ${renderQ1(response)}
      ${renderSingleQuestion("問2", getQuestionText("q2"), "residenceYears", getOptions("residenceOptions"), response.residenceYears)}
      ${renderParticipationQuestion(response)}
      ${renderActivityMatrix(response)}
      ${renderMultiQuestion("問5", getQuestionText("q5"), "desiredEvents", getOptions("desiredEvents"), response.desiredEvents)}
      ${renderSingleQuestion("問6", getQuestionText("q6"), "bulletinRead", getOptions("bulletinOptions"), response.bulletinRead)}
      ${renderMultiQuestion("問7", getQuestionText("q7"), "communicationMethods", getOptions("communicationMethods"), response.communicationMethods)}
      ${renderMultiQuestion("問8", getQuestionText("q8"), "supportOptions", getOptions("supportOptions"), response.supportOptions, "supportOtherText", response.supportOtherText)}
      ${renderContactSection(contact)}
      ${renderMultiQuestion("問10", getQuestionText("q10"), "operationWishes", getOptions("operationWishes"), response.operationWishes, "operationOtherText", response.operationOtherText)}
      ${renderFreeComment(response)}
    `;
  }

  function renderQ1(response) {
    return `
      <section class="panel">
        <div class="section-heading"><h2>問1 ${escapeHtml(getQuestionText("q1"))}</h2></div>
        <p class="muted-text">世帯内の人数を年代・性別ごとに入力し、回答者の世代を1つ選んでください。</p>
        <div class="table-wrap">
          <table class="report-table compact-table">
            <thead><tr><th>年代</th><th>男</th><th>女</th><th>回答者世代</th></tr></thead>
            <tbody>
              ${AGE_BANDS.map(([id, label]) => `
                <tr>
                  <th scope="row">${escapeHtml(label)}</th>
                  <td><input class="table-input" type="number" min="0" step="1" value="${escapeAttr(response.household[id].male ?? "")}" data-household data-age="${id}" data-gender="male" /></td>
                  <td><input class="table-input" type="number" min="0" step="1" value="${escapeAttr(response.household[id].female ?? "")}" data-household data-age="${id}" data-gender="female" /></td>
                  <td><input type="radio" name="respondentAgeBand" value="${id}" data-response-field="respondentAgeBand"${response.respondentAgeBand === id ? " checked" : ""} /></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderParticipationQuestion(response) {
    return `
      ${renderSingleQuestion("問3-A", getQuestionText("q3a"), "participated", getOptions("participatedOptions"), response.participated)}
      <section class="panel">
        <div class="section-heading"><h2>問3-B ${escapeHtml(getQuestionText("q3b"))}</h2></div>
        <p class="muted-text">問3-Aで「ない」の場合に入力します。複数選択できます。</p>
        ${renderCheckboxes("noParticipationReasons", getOptions("noParticipationReasons"), response.noParticipationReasons)}
        <label class="field field-wide other-field">
          <span>その他の内容</span>
          <textarea rows="2" data-response-field="noParticipationOtherText">${escapeHtml(response.noParticipationOtherText || "")}</textarea>
        </label>
      </section>
    `;
  }

  function renderSingleQuestion(number, title, field, options, value) {
    return `
      <section class="panel">
        <div class="section-heading"><h2>${escapeHtml(number)} ${escapeHtml(title)}</h2></div>
        <div class="choice-grid">
          ${options.map(([id, label]) => `
            <label class="choice-item">
              <input type="radio" name="${escapeAttr(field)}" value="${escapeAttr(id)}" data-response-field="${escapeAttr(field)}"${value === id ? " checked" : ""} />
              <span>${escapeHtml(label)}</span>
            </label>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderMultiQuestion(number, title, group, options, values, otherField, otherValue) {
    return `
      <section class="panel">
        <div class="section-heading"><h2>${escapeHtml(number)} ${escapeHtml(title)}</h2></div>
        ${renderCheckboxes(group, options, values)}
        ${otherField ? `
          <label class="field field-wide other-field">
            <span>その他の内容</span>
            <textarea rows="2" data-response-field="${escapeAttr(otherField)}">${escapeHtml(otherValue || "")}</textarea>
          </label>
        ` : ""}
      </section>
    `;
  }

  function renderCheckboxes(group, options, values) {
    const selected = new Set(values || []);
    return `
      <div class="choice-grid">
        ${options.map(([id, label]) => `
          <label class="choice-item">
            <input type="checkbox" value="${escapeAttr(id)}" data-checkbox-group="${escapeAttr(group)}"${selected.has(id) ? " checked" : ""} />
            <span>${escapeHtml(label)}</span>
          </label>
        `).join("")}
      </div>
    `;
  }

  function renderActivityMatrix(response) {
    return `
      <section class="panel">
        <div class="section-heading"><h2>問4 ${escapeHtml(getQuestionText("q4"))}</h2></div>
        <div class="table-wrap">
          <table class="report-table compact-table">
            <thead>
              <tr><th>活動・行事</th>${getOptions("activityEvaluations").map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${getOptions("activities").map(([activityId, activityLabel]) => `
                <tr>
                  <th scope="row">${escapeHtml(activityLabel)}</th>
                  ${getOptions("activityEvaluations").map(([evaluationId]) => `
                    <td><input type="radio" name="activity_${escapeAttr(activityId)}" value="${escapeAttr(evaluationId)}" data-activity="${escapeAttr(activityId)}"${response.activityEvaluations[activityId] === evaluationId ? " checked" : ""} /></td>
                  `).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderContactSection(contact) {
    return `
      <section class="panel sensitive-panel">
        <div class="section-heading"><h2>問9 ${escapeHtml(getQuestionText("q9"))} 非公開</h2></div>
        <p class="notice-inline">氏名・住所・電話番号は運営内部用です。集計レポートや匿名CSVには含めません。</p>
        <div class="form-grid">
          <label class="field"><span>名前</span><input type="text" value="${escapeAttr(contact.name || "")}" data-contact-field="name" /></label>
          <label class="field"><span>電話番号</span><input type="text" value="${escapeAttr(contact.phone || "")}" data-contact-field="phone" /></label>
          <label class="field field-wide"><span>住所</span><input type="text" value="${escapeAttr(contact.address || "")}" data-contact-field="address" /></label>
        </div>
      </section>
    `;
  }

  function renderFreeComment(response) {
    return `
      <section class="panel">
        <div class="section-heading"><h2>問11 ${escapeHtml(getQuestionText("q11"))}</h2></div>
        <p class="notice-inline">自由記述には個人情報が含まれる可能性があります。配布資料に使う前に内容を確認してください。</p>
        <label class="field field-wide">
          <span>自由意見</span>
          <textarea rows="8" data-response-field="freeComment">${escapeHtml(response.freeComment || "")}</textarea>
        </label>
      </section>
    `;
  }

  function renderReportPage() {
    const survey = getCurrentSurvey();
    const responses = getCurrentResponses();
    const aggregate = buildAggregate(responses, survey);
    return `
      <section class="toolbar no-print">
        <button class="button" type="button" data-action="list">一覧へ戻る</button>
        <button class="button" type="button" data-action="contacts">連絡先管理</button>
        <button class="button" type="button" data-action="export-aggregate-csv">集計CSV</button>
        <button class="button button-primary" type="button" data-action="print">PDF出力・印刷</button>
      </section>
      <article class="report print-page">
        <header class="report-header">
          <h2>${escapeHtml(survey?.title || "アンケート集計レポート")}</h2>
          <dl class="report-summary">
            <div><dt>実施者</dt><dd>${escapeHtml(survey?.issuer || "-")}</dd></div>
            <div><dt>実施期間</dt><dd>${escapeHtml(survey?.periodText || "-")}</dd></div>
            <div><dt>配布数</dt><dd>${survey?.distributedCount ?? "-"}</dd></div>
            <div><dt>回答数</dt><dd>${aggregate.total}件</dd></div>
            <div><dt>自由記述あり</dt><dd>${aggregate.freeCommentCount}件</dd></div>
            <div><dt>作成日</dt><dd>${escapeHtml(formatDate(new Date()))}</dd></div>
          </dl>
          <p class="report-note no-print">このレポートには氏名・住所・電話番号などの連絡先情報を含めていません。自由記述の原文も個人情報保護のため初期表示では掲載していません。</p>
        </header>
        ${renderAggregateSection("回答者世代", aggregate.respondentAge)}
        ${renderHouseholdAggregate(aggregate.household)}
        ${renderAggregateSection(getQuestionText("q2"), aggregate.residenceYears)}
        ${renderAggregateSection(getQuestionText("q3a"), aggregate.participated)}
        ${renderAggregateSection(getQuestionText("q3b"), aggregate.noParticipationReasons, aggregate.noParticipantCount)}
        ${renderActivityAggregate(aggregate.activityEvaluations)}
        ${renderAggregateSection(getQuestionText("q5"), aggregate.desiredEvents)}
        ${renderAggregateSection(getQuestionText("q6"), aggregate.bulletinRead)}
        ${renderAggregateSection(getQuestionText("q7"), aggregate.communicationMethods)}
        ${renderAggregateSection(getQuestionText("q8"), aggregate.supportOptions)}
        ${renderAggregateSection(getQuestionText("q10"), aggregate.operationWishes)}
        <section class="question-block">
          <h3>${escapeHtml(getQuestionText("q11"))}</h3>
          <p>自由意見の記入あり: ${aggregate.freeCommentCount}件</p>
          <p class="question-note">原文を資料に使う場合は、個人名・住所・具体的な家庭事情などを伏せてから掲載してください。</p>
        </section>
      </article>
    `;
  }

  function renderAggregateSection(title, rows, denominator) {
    const total = denominator ?? getCurrentResponses().length;
    return `<section class="question-block"><h3>${escapeHtml(title)}</h3>${renderAggregateTable(rows, total)}</section>`;
  }

  function renderAggregateTable(rows, denominator) {
    return `
      <div class="table-wrap">
        <table class="report-table">
          <thead><tr><th>項目</th><th>件数</th><th>割合</th><th>グラフ</th></tr></thead>
          <tbody>
            ${rows.map((row) => {
              const rate = denominator > 0 ? (row.count / denominator) * 100 : null;
              return `<tr><th scope="row">${escapeHtml(row.label)}</th><td class="numeric">${row.count}件</td><td class="numeric">${formatRate(rate)}</td><td>${renderBar(rate)}</td></tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderHouseholdAggregate(rows) {
    return `
      <section class="question-block">
        <h3>世帯構成 年代・性別</h3>
        <div class="table-wrap">
          <table class="report-table">
            <thead><tr><th>年代</th><th>男</th><th>女</th><th>合計</th></tr></thead>
            <tbody>
              ${rows.map((row) => `<tr><th scope="row">${escapeHtml(row.label)}</th><td class="numeric">${row.male}名</td><td class="numeric">${row.female}名</td><td class="numeric">${row.total}名</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderActivityAggregate(matrix) {
    return `
      <section class="question-block">
        <h3>${escapeHtml(getQuestionText("q4"))}</h3>
        <div class="table-wrap">
          <table class="report-table">
            <thead><tr><th>活動・行事</th>${getOptions("activityEvaluations").map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}</tr></thead>
            <tbody>
              ${matrix.map((row) => `<tr><th scope="row">${escapeHtml(row.label)}</th>${getOptions("activityEvaluations").map(([id]) => `<td class="numeric">${row.counts[id] || 0}件</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderContactsPage() {
    const rows = getCurrentContacts().filter(hasContactValue);
    return `
      <section class="toolbar no-print">
        <button class="button" type="button" data-action="list">一覧へ戻る</button>
        <button class="button" type="button" data-action="report">集計レポート</button>
        <button class="button button-primary" type="button" data-action="export-contact-csv">連絡先CSV</button>
      </section>
      <section class="panel sensitive-panel">
        <div class="section-heading"><h2>連絡先管理</h2><p class="count-label">${rows.length}件</p></div>
        <p class="notice-inline">この画面は運営内部用です。配布用レポートには連絡先を載せないでください。</p>
        ${rows.length ? renderContactTable(rows) : `<div class="empty-state">連絡先の登録はありません。</div>`}
      </section>
    `;
  }

  function renderContactTable(rows) {
    return `
      <div class="table-wrap">
        <table class="report-table">
          <thead><tr><th>回答番号</th><th>名前</th><th>住所</th><th>電話番号</th></tr></thead>
          <tbody>
            ${rows.map((contact) => {
              const index = getCurrentResponses().findIndex((response) => response.id === contact.responseId);
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
        回答データと問9の連絡先は別々に保存します。集計レポートと匿名CSVには氏名・住所・電話番号を含めません。
        完全バックアップJSONには連絡先も含まれるため、運営内部で保管してください。
      </aside>
    `;
  }

  function renderMissingResponse() {
    return `<section class="panel"><p>対象の回答が見つかりません。</p><button class="button" type="button" data-action="list">一覧へ戻る</button></section>`;
  }

  async function openNewResponse() {
    if (!state.currentSurveyId) {
      state.flash = "先にアンケートを選択してください。";
      state.view = "home";
      render();
      return;
    }
    state.currentResponse = createResponse();
    state.currentContact = createContact(state.currentResponse.id);
    state.messages = [];
    state.flash = "";
    state.view = "edit";
    render();
  }

  async function openExistingResponse(id) {
    const response = getCurrentResponses().find((item) => item.id === id);
    if (!response) {
      state.flash = "対象の回答が見つかりません。";
      render();
      return;
    }
    state.currentResponse = clone(response);
    state.currentContact = clone(state.contacts.find((contact) => contact.responseId === id) || createContact(id));
    state.messages = [];
    state.flash = "";
    state.view = "edit";
    render();
  }

  async function saveCurrentResponse() {
    if (!state.currentResponse || !state.currentContact) return;
    const messages = validateResponse(state.currentResponse);
    state.messages = messages;
    if (messages.length) {
      state.flash = "保存前に入力内容を確認してください。";
      render();
      return;
    }

    const now = nowIsoString();
    state.currentResponse.surveyId = state.currentSurveyId;
    state.currentResponse.updatedAt = now;
    state.currentContact.responseId = state.currentResponse.id;
    state.currentContact.updatedAt = now;

    await putRecord(RESPONSE_STORE, normalizeResponse(state.currentResponse));
    if (hasContactValue(state.currentContact)) await putRecord(CONTACT_STORE, normalizeContact(state.currentContact));
    else await deleteRecord(CONTACT_STORE, state.currentContact.responseId);

    await refreshData();
    state.flash = "保存しました。";
    state.view = "list";
    state.currentResponse = null;
    state.currentContact = null;
    render();
  }

  async function deleteResponse(id) {
    if (!window.confirm("この回答を削除します。よろしいですか？")) return;
    await deleteRecord(RESPONSE_STORE, id);
    await deleteRecord(CONTACT_STORE, id);
    await refreshData();
    state.flash = "削除しました。";
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

  function show(view) {
    state.view = view;
    state.currentResponse = null;
    state.currentContact = null;
    state.messages = [];
    state.flash = "";
    render();
  }

  function showHome() {
    state.view = "home";
    state.currentSurveyId = "";
    state.currentSurvey = null;
    state.surveyDraft = null;
    state.currentResponse = null;
    state.currentContact = null;
    state.messages = [];
    state.flash = "";
    render();
  }

  function selectSurvey(id) {
    const survey = state.surveys.find((item) => item.id === id);
    if (!survey) {
      state.flash = "アンケートが見つかりません。";
      render();
      return;
    }
    state.currentSurveyId = id;
    state.currentSurvey = clone(survey);
    state.view = "list";
    state.flash = "";
    render();
  }

  function openSurveyEditor(id) {
    const survey = id ? state.surveys.find((item) => item.id === id) : null;
    state.surveyDraft = survey ? clone(survey) : createSurvey();
    state.view = "survey-edit";
    state.flash = "";
    render();
  }

  async function saveSurveyDraft() {
    if (!state.surveyDraft) return;
    if (!String(state.surveyDraft.title || "").trim()) {
      state.flash = "タイトルを入力してください。";
      render();
      return;
    }
    const survey = normalizeSurvey(state.surveyDraft);
    survey.updatedAt = nowIsoString();
    await putRecord(SURVEY_STORE, survey);
    await refreshData();
    state.currentSurveyId = survey.id;
    state.currentSurvey = clone(survey);
    state.surveyDraft = null;
    state.view = "list";
    state.flash = "アンケート設定を保存しました。";
    render();
  }

  async function deleteSurvey(id) {
    const survey = state.surveys.find((item) => item.id === id);
    if (!survey) return;
    const responses = state.responses.filter((response) => response.surveyId === id);
    if (!window.confirm(`「${survey.title || "無題のアンケート"}」と回答${responses.length}件を削除します。よろしいですか？`)) return;

    for (const response of responses) {
      await deleteRecord(RESPONSE_STORE, response.id);
      await deleteRecord(CONTACT_STORE, response.id);
    }
    await deleteRecord(SURVEY_STORE, id);
    await refreshData();
    state.currentSurveyId = "";
    state.currentSurvey = null;
    state.view = "home";
    state.flash = "アンケートを削除しました。";
    render();
  }

  function createResponse() {
    const now = nowIsoString();
    return {
      id: createId("response"),
      surveyId: state.currentSurveyId,
      household: Object.fromEntries(AGE_BANDS.map(([id]) => [id, { male: undefined, female: undefined }])),
      respondentAgeBand: "",
      residenceYears: "",
      participated: "",
      noParticipationReasons: [],
      noParticipationOtherText: "",
      activityEvaluations: Object.fromEntries(ACTIVITIES.map(([id]) => [id, ""])),
      desiredEvents: [],
      bulletinRead: "",
      communicationMethods: [],
      supportOptions: [],
      supportOtherText: "",
      operationWishes: [],
      operationOtherText: "",
      freeComment: "",
      createdAt: now,
      updatedAt: now,
    };
  }

  function createSurvey() {
    const now = nowIsoString();
    return {
      id: createId("survey"),
      title: "新川第2町内会 アンケート",
      issuer: "",
      periodText: "",
      distributedCount: undefined,
      note: "",
      questionTexts: createQuestionTextDefaults(),
      optionLabels: createOptionLabelDefaults(),
      createdAt: now,
      updatedAt: now,
    };
  }

  function createContact(responseId) {
    const now = nowIsoString();
    return { responseId, name: "", address: "", phone: "", createdAt: now, updatedAt: now };
  }

  function validateResponse(response) {
    const messages = [];
    if (!response.residenceYears) messages.push("問2の居住年数が未入力です。");
    if (!response.participated) messages.push("問3-Aの参加経験が未入力です。");
    return messages;
  }

  function updateCheckboxGroup(group, value, checked) {
    const current = new Set(state.currentResponse[group] || []);
    if (checked) current.add(value);
    else current.delete(value);
    state.currentResponse[group] = Array.from(current);
  }

  function readControlValue(target) {
    return target.type === "number" ? readOptionalInteger(target.value) : target.value;
  }

  function buildAggregate(responses, survey = getCurrentSurvey()) {
    const total = responses.length;
    const noParticipantCount = responses.filter((response) => response.participated === "no").length;
    return {
      total,
      noParticipantCount,
      freeCommentCount: responses.filter((response) => String(response.freeComment || "").trim()).length,
      respondentAge: countSingle(responses, "respondentAgeBand", AGE_BANDS),
      household: countHousehold(responses),
      residenceYears: countSingle(responses, "residenceYears", getOptionsForSurvey(survey, "residenceOptions")),
      participated: countSingle(responses, "participated", getOptionsForSurvey(survey, "participatedOptions")),
      noParticipationReasons: countMulti(responses.filter((response) => response.participated === "no"), "noParticipationReasons", getOptionsForSurvey(survey, "noParticipationReasons")),
      activityEvaluations: countActivityEvaluations(responses, survey),
      desiredEvents: countMulti(responses, "desiredEvents", getOptionsForSurvey(survey, "desiredEvents")),
      bulletinRead: countSingle(responses, "bulletinRead", getOptionsForSurvey(survey, "bulletinOptions")),
      communicationMethods: countMulti(responses, "communicationMethods", getOptionsForSurvey(survey, "communicationMethods")),
      supportOptions: countMulti(responses, "supportOptions", getOptionsForSurvey(survey, "supportOptions")),
      operationWishes: countMulti(responses, "operationWishes", getOptionsForSurvey(survey, "operationWishes")),
    };
  }

  function countSingle(responses, field, options) {
    return options.map(([id, label]) => ({ id, label, count: responses.filter((response) => response[field] === id).length }));
  }

  function countMulti(responses, field, options) {
    return options.map(([id, label]) => ({
      id,
      label,
      count: responses.filter((response) => Array.isArray(response[field]) && response[field].includes(id)).length,
    }));
  }

  function countHousehold(responses) {
    return AGE_BANDS.map(([id, label]) => {
      const male = responses.reduce((sum, response) => sum + safeInteger(response.household?.[id]?.male), 0);
      const female = responses.reduce((sum, response) => sum + safeInteger(response.household?.[id]?.female), 0);
      return { id, label, male, female, total: male + female };
    });
  }

  function countActivityEvaluations(responses, survey = getCurrentSurvey()) {
    const evaluations = getOptionsForSurvey(survey, "activityEvaluations");
    return getOptionsForSurvey(survey, "activities").map(([activityId, label]) => {
      const counts = Object.fromEntries(evaluations.map(([evaluationId]) => [evaluationId, 0]));
      responses.forEach((response) => {
        const selected = response.activityEvaluations?.[activityId];
        if (selected && Object.prototype.hasOwnProperty.call(counts, selected)) counts[selected] += 1;
      });
      return { id: activityId, label, counts };
    });
  }

  async function refreshData() {
    state.surveys = (await getAll(SURVEY_STORE)).map(normalizeSurvey).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    state.responses = (await getAll(RESPONSE_STORE)).map(normalizeResponse).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    state.contacts = (await getAll(CONTACT_STORE)).map(normalizeContact);
    if (state.currentSurveyId) {
      state.currentSurvey = state.surveys.find((survey) => survey.id === state.currentSurveyId) || null;
    }
  }

  async function ensureSurveyBootstrap() {
    let changed = false;
    if (!state.surveys.length && state.responses.length) {
      const survey = createSurvey();
      survey.title = "新川第2町内会 アンケート";
      await putRecord(SURVEY_STORE, survey);
      state.surveys.push(survey);
      changed = true;
    }

    const defaultSurveyId = state.surveys[0]?.id;
    if (defaultSurveyId) {
      for (const response of state.responses) {
        if (!response.surveyId) {
          response.surveyId = defaultSurveyId;
          await putRecord(RESPONSE_STORE, response);
          changed = true;
        }
      }
    }

    if (changed) await refreshData();
  }

  function getCurrentSurvey() {
    return state.currentSurvey || state.surveys.find((survey) => survey.id === state.currentSurveyId) || null;
  }

  function getCurrentResponses() {
    return state.responses.filter((response) => response.surveyId === state.currentSurveyId);
  }

  function getCurrentContacts() {
    const responseIds = new Set(getCurrentResponses().map((response) => response.id));
    return state.contacts.filter((contact) => responseIds.has(contact.responseId));
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

  function exportAnonymousResponsesCsv() {
    const responses = getCurrentResponses();
    const rows = [
      ["回答番号", "回答者世代", "居住年数", "参加経験", "参加できない理由", "希望企画", "回覧板", "情報伝達方法", "サポート可能性", "運営への希望", "自由意見"],
      ...responses.map((response, index) => [
        index + 1,
        labelOf(AGE_BANDS, response.respondentAgeBand),
        labelOf(getOptions("residenceOptions"), response.residenceYears),
        labelOf(getOptions("participatedOptions"), response.participated),
        labelsOf(getOptions("noParticipationReasons"), response.noParticipationReasons).join(" / "),
        labelsOf(getOptions("desiredEvents"), response.desiredEvents).join(" / "),
        labelOf(getOptions("bulletinOptions"), response.bulletinRead),
        labelsOf(getOptions("communicationMethods"), response.communicationMethods).join(" / "),
        labelsOf(getOptions("supportOptions"), response.supportOptions).join(" / "),
        labelsOf(getOptions("operationWishes"), response.operationWishes).join(" / "),
        response.freeComment || "",
      ]),
    ];
    downloadCsv("anonymous-responses.csv", rows);
  }

  function exportAggregateCsv() {
    const aggregate = buildAggregate(getCurrentResponses(), getCurrentSurvey());
    const rows = [["設問", "項目", "件数", "分母", "割合"]];
    pushAggregateRows(rows, "回答者世代", aggregate.respondentAge, aggregate.total);
    pushAggregateRows(rows, "居住年数", aggregate.residenceYears, aggregate.total);
    pushAggregateRows(rows, "参加経験", aggregate.participated, aggregate.total);
    pushAggregateRows(rows, "参加できない理由", aggregate.noParticipationReasons, aggregate.noParticipantCount);
    pushAggregateRows(rows, "希望企画", aggregate.desiredEvents, aggregate.total);
    pushAggregateRows(rows, "回覧板", aggregate.bulletinRead, aggregate.total);
    pushAggregateRows(rows, "情報伝達方法", aggregate.communicationMethods, aggregate.total);
    pushAggregateRows(rows, "サポート可能性", aggregate.supportOptions, aggregate.total);
    pushAggregateRows(rows, "運営への希望", aggregate.operationWishes, aggregate.total);
    aggregate.activityEvaluations.forEach((row) => {
      getOptions("activityEvaluations").forEach(([id, label]) => {
        const count = row.counts[id] || 0;
        rows.push(["既存活動・行事", `${row.label}: ${label}`, count, aggregate.total, formatRate(aggregate.total ? (count / aggregate.total) * 100 : null)]);
      });
    });
    downloadCsv("aggregate.csv", rows);
  }

  function pushAggregateRows(rows, question, items, denominator) {
    items.forEach((item) => rows.push([question, item.label, item.count, denominator, formatRate(denominator ? (item.count / denominator) * 100 : null)]));
  }

  function exportContactsCsv() {
    const responses = getCurrentResponses();
    const rows = [
      ["回答番号", "名前", "住所", "電話番号"],
      ...getCurrentContacts().filter(hasContactValue).map((contact) => {
        const index = responses.findIndex((response) => response.id === contact.responseId);
        return [index >= 0 ? index + 1 : "", contact.name || "", contact.address || "", contact.phone || ""];
      }),
    ];
    downloadCsv("contacts-internal.csv", rows);
  }

  function exportBackupJson() {
    const data = { appName: APP_NAME, schemaVersion: SCHEMA_VERSION, exportedAt: nowIsoString(), surveys: state.surveys, responses: state.responses, contacts: state.contacts };
    downloadBlob("complete-backup.json", JSON.stringify(data, null, 2), "application/json");
  }

  async function importBackupJson(file) {
    try {
      const data = JSON.parse(await file.text());
      if (!data || data.appName !== APP_NAME || data.schemaVersion !== SCHEMA_VERSION || !Array.isArray(data.responses) || !Array.isArray(data.contacts)) {
        throw new Error("Invalid backup file");
      }
      if (!window.confirm("バックアップを読み込みます。現在のデータに追加されます。よろしいですか？")) return;
      const surveyIdMap = new Map();
      const importedSurveys = Array.isArray(data.surveys) && data.surveys.length ? data.surveys : [createSurvey()];
      for (const survey of importedSurveys) {
        const normalized = normalizeSurvey(survey);
        const oldId = normalized.id;
        normalized.id = createId("survey");
        normalized.createdAt = nowIsoString();
        normalized.updatedAt = normalized.createdAt;
        surveyIdMap.set(oldId, normalized.id);
        await putRecord(SURVEY_STORE, normalized);
      }
      const fallbackSurveyId = Array.from(surveyIdMap.values())[0];
      const idMap = new Map();
      for (const response of data.responses) {
        const normalized = normalizeResponse(response);
        const newId = createId("response");
        idMap.set(normalized.id, newId);
        normalized.id = newId;
        normalized.surveyId = surveyIdMap.get(normalized.surveyId) || fallbackSurveyId;
        normalized.createdAt = nowIsoString();
        normalized.updatedAt = normalized.createdAt;
        await putRecord(RESPONSE_STORE, normalized);
      }
      for (const contact of data.contacts) {
        const newResponseId = idMap.get(contact.responseId);
        if (!newResponseId) continue;
        const normalized = normalizeContact({ ...contact, responseId: newResponseId });
        if (hasContactValue(normalized)) await putRecord(CONTACT_STORE, normalized);
      }
      await refreshData();
      state.flash = "バックアップを読み込みました。";
      render();
    } catch (error) {
      console.error(error);
      state.flash = "バックアップの読み込みに失敗しました。ファイル形式をご確認ください。";
      render();
    }
  }

  function downloadCsv(filename, rows) {
    const csv = rows.map((row) => row.map(formatCsvCell).join(",")).join("\r\n");
    downloadBlob(filename, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  }

  function formatCsvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function downloadBlob(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function normalizeResponse(input) {
    const base = createResponse();
    const response = { ...base, ...(input || {}) };
    response.household = base.household;
    AGE_BANDS.forEach(([id]) => {
      response.household[id] = {
        male: readOptionalInteger(input?.household?.[id]?.male),
        female: readOptionalInteger(input?.household?.[id]?.female),
      };
    });
    response.activityEvaluations = { ...base.activityEvaluations, ...(input?.activityEvaluations || {}) };
    response.noParticipationReasons = normalizeArray(input?.noParticipationReasons);
    response.desiredEvents = normalizeArray(input?.desiredEvents);
    response.communicationMethods = normalizeArray(input?.communicationMethods);
    response.supportOptions = normalizeArray(input?.supportOptions);
    response.operationWishes = normalizeArray(input?.operationWishes);
    response.id = input?.id || createId("response");
    response.surveyId = input?.surveyId || "";
    response.createdAt = input?.createdAt || nowIsoString();
    response.updatedAt = input?.updatedAt || response.createdAt;
    return response;
  }

  function normalizeSurvey(input) {
    const base = createSurvey();
    return {
      ...base,
      ...(input || {}),
      id: input?.id || base.id,
      title: String(input?.title || base.title),
      issuer: String(input?.issuer || ""),
      periodText: String(input?.periodText || ""),
      distributedCount: readOptionalInteger(input?.distributedCount),
      note: String(input?.note || ""),
      questionTexts: normalizeQuestionTexts(input?.questionTexts),
      optionLabels: normalizeOptionLabels(input?.optionLabels),
      createdAt: input?.createdAt || base.createdAt,
      updatedAt: input?.updatedAt || input?.createdAt || base.updatedAt,
    };
  }

  function createQuestionTextDefaults() {
    return { ...QUESTION_TEXT_DEFAULTS };
  }

  function createOptionLabelDefaults() {
    return Object.fromEntries(
      OPTION_GROUPS.map(([groupKey, , defaults]) => [
        groupKey,
        Object.fromEntries(defaults.map(([id, label]) => [id, label])),
      ])
    );
  }

  function normalizeQuestionTexts(input) {
    return { ...createQuestionTextDefaults(), ...(input || {}) };
  }

  function normalizeOptionLabels(input) {
    const defaults = createOptionLabelDefaults();
    for (const [groupKey] of OPTION_GROUPS) {
      defaults[groupKey] = { ...defaults[groupKey], ...((input || {})[groupKey] || {}) };
    }
    return defaults;
  }

  function normalizeContact(input) {
    const contact = createContact(input?.responseId || createId("response"));
    return { ...contact, ...(input || {}), name: input?.name || "", address: input?.address || "", phone: input?.phone || "" };
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value.map(String) : [];
  }

  function hasContactValue(contact) {
    return Boolean(String(contact?.name || "").trim() || String(contact?.address || "").trim() || String(contact?.phone || "").trim());
  }

  function getQuestionText(key) {
    return getSurveyQuestionText(getCurrentSurvey(), key);
  }

  function getSurveyQuestionText(survey, key) {
    return survey?.questionTexts?.[key] || QUESTION_TEXT_DEFAULTS[key] || "";
  }

  function getOptions(groupKey) {
    return getOptionsForSurvey(getCurrentSurvey(), groupKey);
  }

  function getOptionsForSurvey(survey, groupKey) {
    const group = OPTION_GROUPS.find(([key]) => key === groupKey);
    if (!group) return [];
    const labels = survey?.optionLabels?.[groupKey] || {};
    return group[2].map(([id, defaultLabel]) => [id, labels[id] || defaultLabel]);
  }

  function getSurveyOptionLabel(survey, groupKey, optionId) {
    const group = OPTION_GROUPS.find(([key]) => key === groupKey);
    const defaultLabel = group?.[2].find(([id]) => id === optionId)?.[1] || "";
    return survey?.optionLabels?.[groupKey]?.[optionId] || defaultLabel;
  }

  function labelOf(options, value) {
    return options.find(([id]) => id === value)?.[1] || "";
  }

  function labelsOf(options, values) {
    const selected = new Set(values || []);
    return options.filter(([id]) => selected.has(id)).map(([, label]) => label);
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

  function formatRate(rate) {
    if (rate === null || rate === undefined || Number.isNaN(rate)) return "-";
    return `${Number(rate).toFixed(1)}%`;
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
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
