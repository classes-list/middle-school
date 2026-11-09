/**
 * Recommendation Request mailer for msos-recommendation-request.html
 *
 * Setup (once, signed in with ppark@starofthesea.org):
 *   1. Go to script.google.com > New project. Name it "Recommendation Request Mailer".
 *   2. Delete the sample code and paste this whole file. Click Save.
 *   3. Deploy > New deployment > type: Web app.
 *        Execute as: Me
 *        Who has access: Anyone
 *      Click Deploy, then Authorize access and allow it to send email as you.
 *   4. Copy the Web app URL (ends in /exec) and give it to Claude to add to the page.
 *
 * Each submission arrives as ONE email from yourself, subject
 * "Recommendation Request — <student name>".
 */

const TO = 'ppark@starofthesea.org';
const MAX_CHARS = 60000;      // a full profile is ~10,000–20,000 characters
const DAILY_LIMIT = 60;       // stops runaway or spam submissions

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const name = String(data.name || '').trim().slice(0, 80);
    const body = String(data.body || '');
    if (data.website) return reply_(true);                 // hidden spam trap field
    if (!name || body.length < 20) return reply_(false, 'Missing name or answers.');
    if (body.length > MAX_CHARS) return reply_(false, 'Submission is too long.');

    const props = PropertiesService.getScriptProperties();
    const today = Utilities.formatDate(new Date(), 'Pacific/Honolulu', 'yyyy-MM-dd');
    const key = 'count-' + today;
    const count = Number(props.getProperty(key) || 0);
    if (count >= DAILY_LIMIT) return reply_(false, 'Daily limit reached. Please try again tomorrow.');
    props.setProperty(key, String(count + 1));

    MailApp.sendEmail({
      to: TO,
      subject: 'Recommendation Request — ' + name,
      body: body,
      name: 'Recommendation Request Form'
    });
    return reply_(true);
  } catch (err) {
    return reply_(false, 'Server error: ' + err);
  }
}

function doGet() {
  return ContentService.createTextOutput('Recommendation Request mailer is running.');
}

function reply_(ok, error) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: ok, error: error || '' }))
    .setMimeType(ContentService.MimeType.JSON);
}
