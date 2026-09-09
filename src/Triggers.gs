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
    if (handlerName === 'handleChange' || handlerName === 'handleEdit') {
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
    
  Logger.log('✅ Installable triggers have been successfully setup!');
  SpreadsheetApp.getUi().alert('הטריגרים הותקנו בהצלחה!\nמעתה פונקציות העריכה ירוצו תחת ההרשאות שלך.');
}
