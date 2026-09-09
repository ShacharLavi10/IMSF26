/**
 * One-time setup script to create the necessary sheets for the Daily Schedule and Live Updates.
 * This should be run manually from the Apps Script editor.
 */
function setupScheduleAndUpdatesSheets() {
  const ssId = CONFIG.MASTER_SHEET_ID_SANDBOX || "1Er377KhxxmpnagJY_7t0q4K3wfNxS4dKYWxAPHOmYNE";
  const ss = SpreadsheetApp.openById(ssId);
  
  // 1. Create Schedule Sheet
  let scheduleSheet = ss.getSheetByName('לו"ז פסטיבל');
  if (!scheduleSheet) {
    scheduleSheet = ss.insertSheet('לו"ז פסטיבל');
    scheduleSheet.appendRow(['תאריך', 'שעת התחלה', 'שעת סיום', 'כותרת', 'תיאור', 'מיקום']);
    scheduleSheet.getRange("A1:F1").setFontWeight("bold").setBackground("#e0e0e0");
    scheduleSheet.setFrozenRows(1);
    
    // Populate with sample data from the Word document
    const sampleSchedule = [
      ['2026-11-19', '09:00', '16:00', 'Jerusalem Day 1', 'Arrival and check in to Jerusalem hotel', 'Jerusalem Hotel'],
      ['2026-11-19', '18:00', '19:00', 'Registration and Welcome Drink', 'Collect your badges', 'Tower of David'],
      ['2026-11-19', '19:00', '20:30', 'Opening Dinner', 'Opening remarks and welcome dinner', 'Tower of David'],
      ['2026-11-19', '21:00', '23:30', 'Showcases: Yellow Submarine', 'Performances by local artists', 'Yellow Submarine'],
      ['2026-11-20', '09:30', '10:15', 'Networking Breakfast', 'Morning networking', 'Jerusalem Hotel'],
      ['2026-11-20', '10:30', '13:00', 'Jerusalem City Tour', 'Guided tour of the Old City', 'Old City'],
      ['2026-11-20', '14:00', '17:00', 'Showcases: Afternoon', 'Afternoon performances', 'Yellow Submarine'],
    ];
    
    scheduleSheet.getRange(2, 1, sampleSchedule.length, sampleSchedule[0].length).setValues(sampleSchedule);
  }
  
  // Global updates column in 'מידע כללי' sheet
  let infoSheet = ss.getSheetByName('מידע כללי');
  if (infoSheet) {
    const data = infoSheet.getDataRange().getValues();
    if (data.length > 0) {
      const headers = data[0].map(h => String(h).trim());
      if (headers.indexOf('הודעה לכולם') === -1) {
        infoSheet.getRange(1, headers.length + 1).setValue('הודעה לכולם');
      }
    }
  }
  
  Logger.log("Setup complete! Sheets created successfully.");
}
