/******************** CONFIG ********************/

/**
 * Slack Incoming Webhook URL
 * Replace with your own:
 * https://api.slack.com/messaging/webhooks
 */
const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK";

/**
 * Comma-separated email recipients
 */
const EMAIL_RECIPIENTS =
  "email1@yourcompany.com,email2@yourcompany.com";

/**
 * Google Docs template ID
 * (File → Share → Copy link → extract ID)
 */
const TEMPLATE_DOC_ID = "GOOGLE_DOC_TEMPLATE_ID";

/**
 * COLUMN INDEXES (1-based, must match your sheet)
 */
const COL_DATE_RANGE = 2;   // e.g. 20/1-26/1
const COL_TOPIC = 4;
const COL_SENT = 7;
const COL_DOC_LINK = 8;

const REMINDER_DAYS = [5, 3, 1];

/******************** MAIN ********************/

function runContentReminders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const today = startOfDay(new Date());

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const dateRange = String(row[COL_DATE_RANGE - 1] || "").trim();
    const topic = row[COL_TOPIC - 1];
    let sent = String(row[COL_SENT - 1] || "");
    let docLink = row[COL_DOC_LINK - 1];

    if (!dateRange || !topic) continue;

    const parsed = parseDateRangeSafe(dateRange);
    if (!parsed) continue;

    const { startDate, endDate } = parsed;
    const sentSet = new Set(sent.split(",").filter(Boolean));

    // If start date passed and no reminders sent → use end date
    const referenceDate =
      startDate < today && sentSet.size === 0 ? endDate : startDate;

    const daysToGo = Math.round(
      (referenceDate - today) / (1000 * 60 * 60 * 24)
    );

    if (!REMINDER_DAYS.includes(daysToGo)) continue;
    if (sentSet.has(String(daysToGo))) continue;

    // 5-day reminder → create content doc
    if (daysToGo === 5 && !docLink) {
      docLink = createContentDoc(dateRange, topic);
      sheet
        .getRange(i + 1, COL_DOC_LINK)
        .setFormula(`=HYPERLINK("${docLink}", "Content Doc")`);
    }

    sendEmail(daysToGo, topic, dateRange, docLink);
    sendSlack(daysToGo, topic, dateRange, docLink);

    sentSet.add(String(daysToGo));
    sheet.getRange(i + 1, COL_SENT).setValue([...sentSet].join(","));
  }
}

/******************** SAFE DATE PARSER ********************/

function parseDateRangeSafe(range) {
  // Accepts: 20/1-26/1 OR 20/1 - 26/1
  const match = range.match(
    /(\d{1,2})\s*\/\s*(\d{1,2})\s*-\s*(\d{1,2})\s*\/\s*(\d{1,2})/
  );

  if (!match) return null;

  const year = new Date().getFullYear();

  return {
    startDate: startOfDay(new Date(year, match[2] - 1, match[1])),
    endDate: startOfDay(new Date(year, match[4] - 1, match[3]))
  };
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/******************** GOOGLE DOC ********************/

function createContentDoc(dateRange, topic) {
  const title = `${dateRange} - ${topic} - Content Doc`;
  const copy = DriveApp.getFileById(TEMPLATE_DOC_ID).makeCopy(title);
  copy.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.EDIT
  );
  return copy.getUrl();
}

/******************** EMAIL ********************/

function sendEmail(days, topic, dateRange, docLink) {
  const subject = `Content Reminder – ${days} day(s) to go`;

  let body =
`Hi Team,

This is a ${days}-day reminder.

Topic: ${topic}
Date Range: ${dateRange}

Content Calendar:
<GOOGLE_SHEET_LINK>
`;

  if (docLink) body += `\nContent Doc:\n${docLink}\n`;

  body +=
`
Regards,
Your Name
(Automated with Google Apps Script)
`;

  MailApp.sendEmail(EMAIL_RECIPIENTS, subject, body);
}

/******************** SLACK ********************/

function sendSlack(days, topic, dateRange, docLink) {
  let text =
`📣 Content Reminder
⏳ ${days} day(s) to go
🧠 Topic: ${topic}
📅 Date Range: ${dateRange}
🔗 <GOOGLE_SHEET_LINK|Open Content Calendar>`;

  if (docLink) text += `\n📄 <${docLink}|Open Content Doc>`;

  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ text }),
    muteHttpExceptions: true
  });
}

/******************** SLACK TEST ********************/

function testSlack() {
  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      text: "Slack webhook test successful"
    }),
    muteHttpExceptions: true
  });
}
