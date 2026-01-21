function syncContentCalendar() {

  const SHEET_NAME = "Content Calendar & Status";
  const EVENT_ID_COLUMN = 9; // Column I
  const REMINDER_MINUTES = 48 * 60; // 2 days

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const calendar = CalendarApp.getDefaultCalendar();
  const data = sheet.getDataRange().getValues();

  const currentYear = new Date().getFullYear();

  for (let i = 2; i < data.length; i++) {
    const datesText = data[i][1]; // Column B
    const broadTheme = data[i][2]; // Column C
    const topic = data[i][3]; // Column D
    const type = data[i][4]; // Column E
    const leadMagnet = data[i][5]; // Column F
    const copyLink = data[i][7]; // Column H
    const eventId = data[i][8]; // Column I

    if (!datesText || !topic || eventId) continue;

    // Extract start date (e.g., "20/1" from "20/1 - 26/1")
    const startDateText = datesText.toString().split("-")[0].trim();
    const [day, month] = startDateText.split("/").map(Number);

    if (!day || !month) continue;

    const eventDate = new Date(currentYear, month - 1, day);

    const eventTitle = topic;

    const description = `
Broad Theme: ${broadTheme}
Type: ${type}
Lead Magnet: ${leadMagnet || "—"}
Copy Link: ${copyLink || "—"}
    `.trim();

    const event = calendar.createAllDayEvent(
      eventTitle,
      eventDate,
      { description }
    );

    event.addPopupReminder(REMINDER_MINUTES);
    event.addEmailReminder(REMINDER_MINUTES);

    // Save event ID
    sheet.getRange(i + 1, EVENT_ID_COLUMN).setValue(event.getId());
  }
}
