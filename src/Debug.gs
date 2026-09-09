function logFlightsHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.FLIGHTS_SHEET);
  const data = sheet.getDataRange().getValues();
  if(data.length > 0) {
    console.log("Row 0: " + data[0].join(", "));
    if(data.length > 1) console.log("Row 1: " + data[1].join(", "));
    if(data.length > 2) console.log("Row 2: " + data[2].join(", "));
  } else {
    console.log("Sheet empty or missing");
  }
}
