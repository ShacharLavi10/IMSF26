/**
 * Setup function for Installable Triggers
 * Run this function ONCE from the Google Apps Script Editor
 * to install triggers that will run under your (the owner's) permissions.
 */
function setupInstallableTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Delete existing triggers to avoid duplicates
  const existingTriggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < existingTriggers.length; i++) {
    const handlerName = existingTriggers[i].getHandlerFunction();
    if (handlerName === 'handleChange' || handlerName === 'handleEdit' || handlerName === 'createDailyBackup') {
      ScriptApp.deleteTrigger(existingTriggers[i]);
    }
  }
  
  // 2. Create an installable onChange trigger
  ScriptApp.newTrigger('handleChange')
    .forSpreadsheet(ss)
    .onChange()
    .create();
    
  // 3. Create an installable onEdit trigger
  ScriptApp.newTrigger('handleEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
    
  // 4. Create daily backup trigger (runs between 3 AM and 4 AM)
  ScriptApp.newTrigger('createDailyBackup')
    .timeBased()
    .atHour(3)
    .everyDays(1)
    .create();

  // 5. Create installable triggers for the Artists / Lineup spreadsheet
  setupArtistsSpreadsheetTriggers();
    
  Logger.log('✅ Installable triggers have been successfully setup!');
  try {
    SpreadsheetApp.getUi().alert('הטריגרים הותקנו בהצלחה!\nמעתה פונקציות העריכה והסנכרון האוטומטי ירוצו תחת ההרשאות שלך.');
  } catch(e) {}
}

/**
 * Setup installable triggers specifically for the Artists / Lineup spreadsheet
 */
function setupArtistsSpreadsheetTriggers() {
  const ssId = CONFIG.LINEUP_SPREADSHEET_ID || "13YI3oIHCt2OfIC3K3HyS54u_RrJ-Hii3NZedM3OtqvQ";
  try {
    const ss = SpreadsheetApp.openById(ssId);
    const existingTriggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < existingTriggers.length; i++) {
      const handlerName = existingTriggers[i].getHandlerFunction();
      if (handlerName === 'handleArtistsSheetChange') {
        ScriptApp.deleteTrigger(existingTriggers[i]);
      }
    }
    
    ScriptApp.newTrigger('handleArtistsSheetChange')
      .forSpreadsheet(ss)
      .onChange()
      .create();

    ScriptApp.newTrigger('handleArtistsSheetChange')
      .forSpreadsheet(ss)
      .onEdit()
      .create();

    Logger.log('✅ Artists & Lineup triggers installed successfully for spreadsheet: ' + ssId);
    return { success: true, spreadsheetId: ssId };
  } catch (err) {
    Logger.log('Could not setup Artists spreadsheet trigger: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}
