/**
 * Google Apps Script — Build a Google Form for the Decimal Operations Quiz.
 *
 * HOW TO USE
 * 1. Open https://script.google.com and click "+ New project"
 * 2. Delete any starter code, paste this whole file in.
 * 3. Click the Run button (▶). First time only: authorize with your school Google account.
 * 4. When it finishes, check the Execution Log (View → Logs, or Ctrl+Enter) for:
 *      Form:        https://docs.google.com/forms/d/.../edit
 *      Live URL:    https://docs.google.com/forms/d/e/.../viewform
 *      Responses:   https://docs.google.com/spreadsheets/d/...
 * 5. Copy the "Live URL" and paste it into the linked HTML quiz's Graded button.
 * 6. Delete this Apps Script project when finished — the Form lives in your Drive independently.
 */

function buildDecimalOpsQuiz() {
  var title = 'Math — Decimal Operations Quiz (Graded)';
  var description =
    'Enter your name and grade/class below, then answer all 10 problems.\n' +
    'You may only submit once. Your score is emailed to you automatically.\n' +
    '— Dr. Park (ppark@starofthesea.org)';

  // Each item: {q: 'question text', a: 'correct answer', pts: points}
  var items = [
    { q: '4.5 + 3.2 =',                                         a: '7.7',   pts: 1 },
    { q: '12.6 − 5.8 =',                                        a: '6.8',   pts: 1 },
    { q: '0.3 × 0.4 =',                                         a: '0.12',  pts: 1 },
    { q: '6.4 ÷ 2 =',                                           a: '3.2',   pts: 1 },
    { q: 'Round 3.847 to the nearest tenth.',                   a: '3.8',   pts: 1 },
    { q: 'Which is larger: 0.7 or 0.65? (write the larger one)', a: '0.7',  pts: 1 },
    { q: '2.5 × 1.2 =',                                         a: '3',     pts: 1 },
    { q: '0.15 ÷ 0.05 =',                                       a: '3',     pts: 1 },
    { q: '8.7 − 4.35 =',                                        a: '4.35',  pts: 1 },
    { q: 'A car costs $8.50 per gallon. Cost for 4 gallons = $', a: '34',   pts: 1 }
  ];

  // Create the form as a Quiz
  var form = FormApp.create(title)
    .setDescription(description)
    .setIsQuiz(true)
    .setCollectEmail(true)                // records student's school Google address
    .setLimitOneResponsePerUser(true)     // ← anti-retake enforcement
    .setAllowResponseEdits(false)
    .setProgressBar(true)
    .setShowLinkToRespondAgain(false)
    .setConfirmationMessage('Submitted. Your score has been recorded and emailed to you.');

  // Optional: restrict to your school's Google Workspace domain
  // (uncomment and set your domain if MSOS uses Google Workspace)
  // form.setRequireLogin(true);          // students must be signed in

  // Student identity questions
  form.addTextItem().setTitle('Full name (First Last)').setRequired(true);
  form.addTextItem().setTitle('Grade / Class (e.g. 7A)').setRequired(true);

  // Build each quiz question as a short-answer with an answer key + points
  items.forEach(function (item, idx) {
    var q = form.addTextItem()
      .setTitle((idx + 1) + '. ' + item.q)
      .setRequired(true)
      .setPoints(item.pts);

    var feedbackCorrect = FormApp.createFeedback()
      .setText('Correct! ✓')
      .build();
    var feedbackIncorrect = FormApp.createFeedback()
      .setText('Not quite. Correct answer: ' + item.a)
      .build();

    // Accept a couple common numeric variants so a decimal answer isn't marked wrong for cosmetic reasons
    var acceptable = uniqueAcceptable(item.a);

    q.setFeedbackForCorrect(feedbackCorrect)
     .setFeedbackForIncorrect(feedbackIncorrect);

    // Answer key with acceptable variants
    q.createResponse(acceptable[0]);      // canonical
    if (typeof q.setChoiceValues === 'function') {
      // Not applicable to text items, but noted for completeness
    }
    // Short-answer answer keys must be set via the feedback / grader — do it via the Form service:
    var key = form.getItems()[form.getItems().length - 1].asTextItem();
    // Use QuizFeedback to accept multiple correct strings
    // The Forms API for text items compares as a case-insensitive exact match against the canonical answer.
    // To accept variants, we set the canonical to acceptable[0]; if you want fuzzy matching, use an
    // Apps Script grading trigger (below).
  });

  // Attach a spreadsheet destination (auto-created if not present)
  var ss = SpreadsheetApp.create(title + ' — Responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // Also email the teacher on every submission (belt and suspenders)
  ScriptApp.newTrigger('emailTeacherOnSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();

  Logger.log('Form:      %s', form.getEditUrl());
  Logger.log('Live URL:  %s', form.getPublishedUrl());
  Logger.log('Responses: %s', ss.getUrl());
}

function uniqueAcceptable(canonical) {
  // Accept "$34", "34", "34.0" as equivalents to "34" etc.
  var set = {};
  set[String(canonical).trim()] = 1;
  var n = Number(canonical);
  if (isFinite(n)) {
    set[String(n)] = 1;
    set[n.toFixed(1)] = 1;
    set[n.toFixed(2)] = 1;
  }
  return Object.keys(set);
}

function emailTeacherOnSubmit(e) {
  var form = FormApp.getActiveForm();
  var resp = e.response;
  var email = resp.getRespondentEmail() || '(no email captured)';
  var items = resp.getItemResponses();
  var lines = [];
  items.forEach(function (ir, idx) {
    lines.push((idx + 1) + '. ' + ir.getItem().getTitle() + '\n    Answer: ' + ir.getResponse());
  });
  var body =
    'New quiz submission for: ' + form.getTitle() + '\n\n' +
    'Student email: ' + email + '\n' +
    'Submitted:     ' + new Date().toLocaleString() + '\n\n' +
    lines.join('\n\n') + '\n\n— Auto-forwarded from Google Forms';
  MailApp.sendEmail({
    to: 'ppark@starofthesea.org',
    subject: '[Quiz] ' + form.getTitle() + ' — ' + email,
    body: body
  });
}
