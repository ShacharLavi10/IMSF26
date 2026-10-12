function debugGetFlightsInfo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets().map(s => s.getName());
  
  let anatSheets = [];
  if (CONFIG.ANAT_SPREADSHEET_ID) {
    try {
      const anatSs = SpreadsheetApp.openById(CONFIG.ANAT_SPREADSHEET_ID);
      anatSheets = anatSs.getSheets().map(s => s.getName());
    } catch(e) {
      anatSheets = ["Error opening Anat SS: " + e.toString()];
    }
  }

  const result = {
    masterSheets: sheets,
    anatSheets: anatSheets,
    masterShuttleRows: [],
    anatShuttleRows: []
  };

  const fSheet = findSheetFuzzy(ss, ["טבלת טיסות - שיקוף", CONFIG.FLIGHTS_SHEET, "טבלת טיסות"]);
  if (fSheet) {
    const data = fSheet.getDataRange().getValues();
    const displayData = fSheet.getDataRange().getDisplayValues();
    result.totalRows = data.length;
    result.allRowsPreview = [];
    for (let r = 0; r < Math.min(25, data.length); r++) {
      result.allRowsPreview.push({
        row: r + 1,
        email: data[r][0],
        name: (data[r][2] || "") + " " + (data[r][1] || ""),
        rawShuttleCol: data[r][11],
        dispShuttleCol: displayData[r][11]
      });
    }
  }

  const prodSsId = "17R6e27QsISFr0jmwOYje857sVRLoxNrePZVa0CTeMos";
  const prodAnatId = "1UDzPjGWdvjJ1yOQHmORY-itX0yr52BMOkSrdac3t95M";
  result.prodMasterShuttleRows = [];
  result.prodAnatShuttleRows = [];

  try {
    const prodSs = SpreadsheetApp.openById(prodSsId);
    const pSheet = findSheetFuzzy(prodSs, ["טבלת טיסות - שיקוף", "טבלת טיסות"]);
    if (pSheet) {
      const pData = pSheet.getDataRange().getValues();
      const pDisp = pSheet.getDataRange().getDisplayValues();
      result.prodMasterHeaders = pData[0];
      const pCol = pData[0].findIndex(h => String(h).includes("שאטל"));
      for (let r = 1; r < pData.length; r++) {
        const val = pCol !== -1 ? String(pDisp[r][pCol] || pData[r][pCol] || "").trim() : "";
        if (val !== "") {
          result.prodMasterShuttleRows.push({
            row: r + 1,
            email: pData[r][0],
            name: (pData[r][2] || "") + " " + (pData[r][1] || ""),
            shuttle: val
          });
        }
      }
    }
  } catch(e) {
    result.prodMasterError = e.toString();
  }

  try {
    const prodAnatSs = SpreadsheetApp.openById(prodAnatId);
    const paSheet = findSheetFuzzy(prodAnatSs, ["טבלת טיסות", "טבלת טיסות - שיקוף"]);
    if (paSheet) {
      const paData = paSheet.getDataRange().getValues();
      const paDisp = paSheet.getDataRange().getDisplayValues();
      result.prodAnatHeaders = paData[0];
      const paCol = paData[0].findIndex(h => String(h).includes("שאטל"));
      for (let r = 1; r < paData.length; r++) {
        const val = paCol !== -1 ? String(paDisp[r][paCol] || paData[r][paCol] || "").trim() : "";
        if (val !== "") {
          result.prodAnatShuttleRows.push({
            row: r + 1,
            email: paData[r][0],
            name: (paData[r][2] || "") + " " + (paData[r][1] || ""),
            shuttle: val
          });
        }
      }
    }
  } catch(e) {
    result.prodAnatError = e.toString();
  }

  return result;
}

function syncSandboxFlightsFromProd() {
  const prodSsId = "17R6e27QsISFr0jmwOYje857sVRLoxNrePZVa0CTeMos";
  const prodAnatId = "1UDzPjGWdvjJ1yOQHmORY-itX0yr52BMOkSrdac3t95M";
  const sandboxSs = SpreadsheetApp.getActiveSpreadsheet();

  let syncedMaster = false;
  let syncedAnat = false;

  try {
    const prodSs = SpreadsheetApp.openById(prodSsId);
    const pSheet = findSheetFuzzy(prodSs, ["טבלת טיסות - שיקוף", "טבלת טיסות"]);
    let sSheet = findSheetFuzzy(sandboxSs, ["טבלת טיסות - שיקוף", CONFIG.FLIGHTS_SHEET, "טבלת טיסות"]);
    if (!sSheet) {
      sSheet = sandboxSs.insertSheet("טבלת טיסות - שיקוף");
    }

    if (pSheet && sSheet) {
      const pRange = pSheet.getDataRange();
      const pValues = pRange.getValues();
      const pFormulas = pRange.getFormulas();
      
      sSheet.clearContents();
      const numRows = pValues.length;
      const numCols = pValues[0].length;
      
      const targetRange = sSheet.getRange(1, 1, numRows, numCols);
      targetRange.setValues(pValues);
      
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          if (pFormulas[r][c] && pFormulas[r][c] !== "") {
            try {
              sSheet.getRange(r + 1, c + 1).setFormula(pFormulas[r][c]);
            } catch(e) {}
          }
        }
      }
      if (numRows > 1 && numCols >= 12) {
        sSheet.getRange(2, 12, numRows - 1, 1).setNumberFormat("HH:mm");
      }
      syncedMaster = true;
    }
  } catch(e) {
    return { success: false, error: "Error syncing master: " + e.toString() };
  }

  try {
    if (CONFIG.ANAT_SPREADSHEET_ID) {
      const prodAnatSs = SpreadsheetApp.openById(prodAnatId);
      const paSheet = findSheetFuzzy(prodAnatSs, ["טבלת טיסות", "טבלת טיסות - שיקוף"]);
      const sandboxAnatSs = SpreadsheetApp.openById(CONFIG.ANAT_SPREADSHEET_ID);
      let saSheet = findSheetFuzzy(sandboxAnatSs, ["טבלת טיסות", "טבלת טיסות - שיקוף"]);
      if (!saSheet) {
        saSheet = sandboxAnatSs.insertSheet("טבלת טיסות");
      }

      if (paSheet && saSheet) {
        const paRange = paSheet.getDataRange();
        const paValues = paRange.getValues();
        const paFormulas = paRange.getFormulas();
        
        saSheet.clearContents();
        const numRows = paValues.length;
        const numCols = paValues[0].length;
        
        const targetRange = saSheet.getRange(1, 1, numRows, numCols);
        targetRange.setValues(paValues);
        
        for (let r = 0; r < numRows; r++) {
          for (let c = 0; c < numCols; c++) {
            if (paFormulas[r][c] && paFormulas[r][c] !== "") {
              try {
                saSheet.getRange(r + 1, c + 1).setFormula(paFormulas[r][c]);
              } catch(e) {}
            }
          }
        }
        if (numRows > 1 && numCols >= 12) {
          saSheet.getRange(2, 12, numRows - 1, 1).setNumberFormat("HH:mm");
        }
        syncedAnat = true;
      }
    }
  } catch(e) {
    return { success: false, error: "Error syncing anat: " + e.toString() };
  }

  return { success: true, syncedMaster: syncedMaster, syncedAnat: syncedAnat };
}

function fixFlightsNumberFormat() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sSheet = findSheetFuzzy(ss, ["טבלת טיסות - שיקוף", CONFIG.FLIGHTS_SHEET, "טבלת טיסות"]);
  let masterFixed = false;
  if (sSheet) {
    const lastRow = sSheet.getLastRow();
    if (lastRow > 1) {
      sSheet.getRange(2, 12, lastRow - 1, 1).setNumberFormat("HH:mm");
      masterFixed = true;
    }
  }

  let anatFixed = false;
  if (CONFIG.ANAT_SPREADSHEET_ID) {
    try {
      const anatSs = SpreadsheetApp.openById(CONFIG.ANAT_SPREADSHEET_ID);
      const aSheet = findSheetFuzzy(anatSs, ["טבלת טיסות", "טבלת טיסות - שיקוף"]);
      if (aSheet) {
        const lastRow = aSheet.getLastRow();
        if (lastRow > 1) {
          aSheet.getRange(2, 12, lastRow - 1, 1).setNumberFormat("HH:mm");
          anatFixed = true;
        }
      }
    } catch(e) {}
  }

  return { success: true, masterFixed: masterFixed, anatFixed: anatFixed };
}

function testFormatShuttle() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const fSheet = findSheetFuzzy(ss, ["טבלת טיסות - שיקוף", CONFIG.FLIGHTS_SHEET, "טבלת טיסות"]);
  if (!fSheet) return { error: "No sheet" };
  const data = fSheet.getDataRange().getValues();
  const disp = fSheet.getDataRange().getDisplayValues();
  const row24Raw = data[23][11];
  const row24Disp = disp[23][11];
  
  let formatted = "";
  if (row24Raw instanceof Date) {
    formatted = Utilities.formatDate(row24Raw, tz, "HH:mm");
  }
  
  return {
    tz: tz,
    raw: String(row24Raw),
    isDate: (row24Raw instanceof Date),
    formatted: formatted,
    disp: row24Disp
  };
}

function testFetchMappedData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cleanEmail = "shacharlavi10@gmail.com";
  let masterFlightsSheet1 = findSheetFuzzy(ss, ["טיסות - שיקוף", "עדכוני טיסות", "טיסות"]);
  let masterFlightsSheet2 = findSheetFuzzy(ss, ["טבלת טיסות - שיקוף", CONFIG.FLIGHTS_SHEET, "טבלת טיסות"]);
  let anatFlightsSheet1 = null;
  let anatFlightsSheet2 = null;

  if (CONFIG.ANAT_SPREADSHEET_ID) {
    try {
      const anatSs = SpreadsheetApp.openById(CONFIG.ANAT_SPREADSHEET_ID);
      anatFlightsSheet1 = findSheetFuzzy(anatSs, [CONFIG.ANAT_SHEET_NAME, "עדכוני טיסות", "טיסות - שיקוף", "טיסות"]);
      anatFlightsSheet2 = findSheetFuzzy(anatSs, ["טבלת טיסות", "טבלת טיסות - שיקוף", CONFIG.FLIGHTS_SHEET]);
    } catch(errAnat) {}
  }

  const masterData1 = masterFlightsSheet1 ? fetchMappedData(masterFlightsSheet1, cleanEmail, MAPPINGS.FLIGHTS) : [];
  const masterData2 = masterFlightsSheet2 ? fetchMappedData(masterFlightsSheet2, cleanEmail, MAPPINGS.FLIGHTS) : [];
  const anatData1 = anatFlightsSheet1 ? fetchMappedData(anatFlightsSheet1, cleanEmail, MAPPINGS.FLIGHTS) : [];
  const anatData2 = anatFlightsSheet2 ? fetchMappedData(anatFlightsSheet2, cleanEmail, MAPPINGS.FLIGHTS) : [];

  let flightsDataMap = {};
  [masterData1, masterData2].forEach(arr => {
    arr.forEach(item => {
      if (item && item.value && String(item.value).trim() !== "") {
        flightsDataMap[item.label] = item.value;
      }
    });
  });
  [anatData1, anatData2].forEach(arr => {
    arr.forEach(item => {
      if (item && item.value && String(item.value).trim() !== "") {
        flightsDataMap[item.label] = item.value;
      }
    });
  });

  return Object.keys(flightsDataMap).map(label => ({ label: label, value: flightsDataMap[label] }));
}

function logFlightsHeaders() {
  return debugGetFlightsInfo();
}

function debugInspectTogetherWith() {
  const result = {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const fSheet = findSheetFuzzy(ss, ["טבלת טיסות - שיקוף", CONFIG.FLIGHTS_SHEET, "טבלת טיסות"]);
  if (fSheet) {
    const data = fSheet.getDataRange().getValues();
    const disp = fSheet.getDataRange().getDisplayValues();
    const formulas = fSheet.getDataRange().getFormulas();
    result.sandboxHeaders = data[0];
    result.sandboxRows = [];
    for (let r = 0; r < data.length; r++) {
      const email = String(data[r][0] || "");
      const shuttle = String(disp[r][11] || data[r][11] || "");
      const together = String(disp[r][12] || data[r][12] || "");
      const form = String(formulas[r][12] || "");
      if (shuttle !== "" || together !== "" || email.includes("shachar")) {
        result.sandboxRows.push({
          row: r + 1,
          email: email,
          name: (data[r][2] || "") + " " + (data[r][1] || ""),
          shuttle: shuttle,
          togetherRaw: data[r][12],
          togetherDisp: disp[r][12],
          togetherFormula: form
        });
      }
    }
  }

  // Also inspect PROD master
  try {
    const prodSs = SpreadsheetApp.openById("17R6e27QsISFr0jmwOYje857sVRLoxNrePZVa0CTeMos");
    const pSheet = findSheetFuzzy(prodSs, ["טבלת טיסות - שיקוף", "טבלת טיסות"]);
    if (pSheet) {
      const pData = pSheet.getDataRange().getValues();
      const pDisp = pSheet.getDataRange().getDisplayValues();
      const pForm = pSheet.getDataRange().getFormulas();
      result.prodHeaders = pData[0];
      result.prodRows = [];
      for (let r = 0; r < pData.length; r++) {
        const email = String(pData[r][0] || "");
        const shuttle = String(pDisp[r][11] || pData[r][11] || "");
        const together = String(pDisp[r][12] || pData[r][12] || "");
        const form = String(pForm[r][12] || "");
        if (shuttle !== "" || together !== "" || email.includes("shachar")) {
          result.prodRows.push({
            row: r + 1,
            email: email,
            name: (pData[r][2] || "") + " " + (pData[r][1] || ""),
            shuttle: shuttle,
            togetherRaw: pData[r][12],
            togetherDisp: pDisp[r][12],
            togetherFormula: form
          });
        }
      }
    }
  } catch(e) {
    result.prodError = e.toString();
  }

  return result;
}

function checkAllTogetherWithSources() {
  const targetEmail = "shacharlavi10@gmail.com";
  const results = {};

  const checkSs = (id, name) => {
    try {
      const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
      const sheets = ss.getSheets();
      const sheetReports = [];
      sheets.forEach(sheet => {
        const sName = sheet.getName();
        const data = sheet.getDataRange().getValues();
        const disp = sheet.getDataRange().getDisplayValues();
        if (data.length < 1) return;
        const headers = data[0].map(h => String(h).trim());
        const emailIdx = headers.findIndex(h => String(h).includes("מייל") || String(h).toLowerCase().includes("email"));
        const togetherIdx = headers.findIndex(h => String(h).includes("ביחד") || String(h).includes("נוסע") || String(h).toLowerCase().includes("together"));
        
        let foundRow = null;
        for (let r = 0; r < data.length; r++) {
          const rowEmail = emailIdx !== -1 ? String(data[r][emailIdx]).trim().toLowerCase() : "";
          if (rowEmail === targetEmail) {
            foundRow = {
              row: r + 1,
              togetherVal: togetherIdx !== -1 ? data[r][togetherIdx] : "no together col",
              togetherDisp: togetherIdx !== -1 ? disp[r][togetherIdx] : "no together col",
              fullRowDisp: disp[r]
            };
            break;
          }
        }
        sheetReports.push({ sheetName: sName, headers: headers, foundRow: foundRow });
      });
      results[name] = sheetReports;
    } catch(e) {
      results[name] = "Error: " + e.toString();
    }
  };

  checkSs(null, "activeSandboxMaster");
  checkSs(CONFIG.ANAT_SPREADSHEET_ID, "sandboxAnat");
  checkSs("17R6e27QsISFr0jmwOYje857sVRLoxNrePZVa0CTeMos", "prodMaster");
  checkSs("1UDzPjGWdvjJ1yOQHmORY-itX0yr52BMOkSrdac3t95M", "prodAnat");

  return results;
}


