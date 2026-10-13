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

function inspectBackupsAndHotels() {
  const result = {
    backups: [],
    backupJlmHotel: null,
    backupTlvHotel: null,
    prodJlmHotel: null,
    prodTlvHotel: null,
    sandboxJlmHotel: null,
    error: null
  };

  try {
    try {
      const parentFolderId = "1Rk6Ahmjxch_zOMvif_Ey9V7UvadYrWZz";
      const parentFolder = DriveApp.getFolderById(parentFolderId);
      let backupFolder = null;
      const folders = parentFolder.getFoldersByName('IMSF 2026 Backups');
      if (folders.hasNext()) {
        backupFolder = folders.next();
        const files = backupFolder.getFiles();
        while (files.hasNext()) {
          const file = files.next();
          result.backups.push({
            id: file.getId(),
            name: file.getName(),
            dateCreated: file.getDateCreated(),
            lastUpdated: file.getLastUpdated()
          });
        }
      }
    } catch(e) {
      result.driveError = e.toString();
    }



    // Sort backups newest first
    result.backups.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());

    // Inspect latest master backup
    const latestMasterBackup = result.backups.find(b => b.name.startsWith("BACKUP_MASTER_"));
    if (latestMasterBackup) {
      result.latestMasterBackupId = latestMasterBackup.id;
      result.latestMasterBackupName = latestMasterBackup.name;
      const bSs = SpreadsheetApp.openById(latestMasterBackup.id);
      
      const bJlm = bSs.getSheetByName("מלונות ירושלים");
      if (bJlm) {
        const lastRow = bJlm.getLastRow();
        const lastCol = bJlm.getLastColumn();
        result.backupJlmHotel = {
          lastRow: lastRow,
          lastCol: lastCol,
          sampleValues: lastRow > 0 && lastCol > 0 ? bJlm.getRange(1, 1, Math.min(10, lastRow), lastCol).getValues() : [],
          sampleFormulas: lastRow > 0 && lastCol > 0 ? bJlm.getRange(1, 1, Math.min(10, lastRow), lastCol).getFormulas() : []
        };
      }

      const bTlv = bSs.getSheetByName("מלונות תל אביב");
      if (bTlv) {
        const lastRow = bTlv.getLastRow();
        const lastCol = bTlv.getLastColumn();
        result.backupTlvHotel = {
          lastRow: lastRow,
          lastCol: lastCol,
          sampleValues: lastRow > 0 && lastCol > 0 ? bTlv.getRange(1, 1, Math.min(10, lastRow), lastCol).getValues() : []
        };
      }
    }

    // Inspect Prod master
    try {
      const prodSs = SpreadsheetApp.openById("17R6e27QsISFr0jmwOYje857sVRLoxNrePZVa0CTeMos");
      const pJlm = prodSs.getSheetByName("מלונות ירושלים");
      if (pJlm) {
        const lastRow = pJlm.getLastRow();
        const lastCol = pJlm.getLastColumn();
        result.prodJlmHotel = {
          lastRow: lastRow,
          lastCol: lastCol,
          sampleValues: lastRow > 0 && lastCol > 0 ? pJlm.getRange(1, 1, Math.min(10, lastRow), lastCol).getValues() : []
        };
      }
      const pTlv = prodSs.getSheetByName("מלונות תל אביב");
      if (pTlv) {
        const lastRow = pTlv.getLastRow();
        const lastCol = pTlv.getLastColumn();
        result.prodTlvHotel = {
          lastRow: lastRow,
          lastCol: lastCol,
          sampleValues: lastRow > 0 && lastCol > 0 ? pTlv.getRange(1, 1, Math.min(10, lastRow), lastCol).getValues() : []
        };
      }
    } catch (e) {
      result.prodError = e.toString();
    }

    // Inspect Sandbox master
    try {
      const sSs = SpreadsheetApp.getActiveSpreadsheet();
      const sJlm = sSs.getSheetByName("מלונות ירושלים");
      if (sJlm) {
        const lastRow = sJlm.getLastRow();
        const lastCol = sJlm.getLastColumn();
        result.sandboxJlmHotel = {
          lastRow: lastRow,
          lastCol: lastCol,
          sampleValues: lastRow > 0 && lastCol > 0 ? sJlm.getRange(1, 1, Math.min(50, lastRow), lastCol).getValues() : [],
          sampleFormulas: lastRow > 0 && lastCol > 0 ? sJlm.getRange(1, 1, Math.min(50, lastRow), lastCol).getFormulas() : []
        };
      }
    } catch (e) {
      result.sandboxError = e.toString();
    }

    try {
      const prodSs = SpreadsheetApp.openById("17R6e27QsISFr0jmwOYje857sVRLoxNrePZVa0CTeMos");
      const pJlm = prodSs.getSheetByName("מלונות ירושלים");
      if (pJlm) {
        const lastRow = pJlm.getLastRow();
        const lastCol = pJlm.getLastColumn();
        result.prodJlmHotel = {
          lastRow: lastRow,
          lastCol: lastCol,
          allValues: lastRow > 0 && lastCol > 0 ? pJlm.getRange(1, 1, lastRow, lastCol).getValues() : [],
          allFormulas: lastRow > 0 && lastCol > 0 ? pJlm.getRange(1, 1, lastRow, lastCol).getFormulas() : []
        };
      }
    } catch(e) {
      result.prodError = e.toString();
    }



  } catch (err) {
    result.error = err.toString();
  }

  return result;
}

function restoreJerusalemHotelsAndSync(targetSsId) {
  try {
    const ss = targetSsId ? SpreadsheetApp.openById(targetSsId) : SpreadsheetApp.getActiveSpreadsheet();
    const jlmSheet = ss.getSheetByName(CONFIG.JERUSALEM_SHEET);
    if (!jlmSheet) return { success: false, error: "Jerusalem sheet not found" };

    const knownGuestEmails = [
      "benson@chaptertwoent.com",
      "bv@asphalt-festival.de",
      "carlos@mcmxvi.com",
      "eventi.alexanderplatz@gmail.com",
      "buihuytuan@gmail.com",
      "isaac.green@warnerrecords.com",
      "johannes.graesser@jlgt.org",
      "jon@ba-concerts.com",
      "joshblakkmusic@gmail.com",
      "karanbajaj@gaah.in",
      "kira.triumph@gmail.com",
      "booking@festteam.bg",
      "laurence@lolaziza.com",
      "marcusgora@pm.me",
      "mark.kass@enterprise4good.org",
      "matt@crazyplanetrecords.com",
      "direction@festivaldechaillol.com",
      "michele@francerocks.com",
      "peter@futureechoes.se",
      "svidal@ducdeslombards.com",
      "shunsuke.asakawa@me.com",
      "y.trakhman@afisha.ru",
      "shacharlavi10@gmail.com",
      "exposubmarine@gmail.com",
      "shacharlavi888@gmail.com",
      "shlomo@citywinery.com"
    ];

    // 1. Set Title in A1
    jlmSheet.getRange(1, 1).setValue("ירושלים");

    // 2. Set Headers in row 2: A2, B2, C2
    jlmSheet.getRange(2, 1).setValue(CONFIG.EMAIL_COL);      // "מייל אורח"
    jlmSheet.getRange(2, 2).setValue(CONFIG.FIRST_NAME_COL); // "שם פרטי"
    jlmSheet.getRange(2, 3).setValue(CONFIG.LAST_NAME_COL);  // "שם משפחה"

    // If restoring Sandbox, ensure columns D..N (booking data) are populated from Prod
    if (!targetSsId) {
      try {
        const prodSs = SpreadsheetApp.openById("17R6e27QsISFr0jmwOYje857sVRLoxNrePZVa0CTeMos");
        const prodJlm = prodSs.getSheetByName(CONFIG.JERUSALEM_SHEET);
        if (prodJlm) {
          const pVals = prodJlm.getRange(2, 4, 32, 11).getValues();
          const pForms = prodJlm.getRange(2, 4, 32, 11).getFormulas();
          const combinedD_N = pVals.map((row, rIdx) => row.map((cell, cIdx) => {
            return (pForms[rIdx] && pForms[rIdx][cIdx]) ? pForms[rIdx][cIdx] : cell;
          }));
          jlmSheet.getRange(2, 4, 32, 11).setValues(combinedD_N);
        }
      } catch(e) {
        Logger.log("Could not copy D..N from prod: " + e.toString());
      }
    }

    // 3. For rows 3 to 28, set the email values in Column A
    const emailValues = knownGuestEmails.map(em => [em]);
    jlmSheet.getRange(3, 1, emailValues.length, 1).setValues(emailValues);

    // 4. For rows 3 to 28, set formulas for First Name (col B) and Last Name (col C)
    // In 'אורחים': Email is K ($K:$K), First Name is C ($C:$C), Last Name is B ($B:$B)
    const nameFormulas = [];
    for (let i = 0; i < knownGuestEmails.length; i++) {
      const rowNum = i + 3;
      nameFormulas.push([
        `=IF(ISBLANK(A${rowNum}), "", XLOOKUP(A${rowNum}, 'אורחים'!$K:$K, 'אורחים'!$C:$C, ""))`,
        `=IF(ISBLANK(A${rowNum}), "", XLOOKUP(A${rowNum}, 'אורחים'!$K:$K, 'אורחים'!$B:$B, ""))`
      ]);
    }
    jlmSheet.getRange(3, 2, nameFormulas.length, 2).setValues(nameFormulas);

    // 5. Run syncAllSheets(ss) to align all sheets and ensure full data integrity
    syncAllSheets(ss);

    // Inspect result after restoration
    const finalLastRow = jlmSheet.getLastRow();
    const finalSample = jlmSheet.getRange(1, 1, Math.min(10, finalLastRow), 5).getValues();

    return {
      success: true,
      message: "Jerusalem hotel restored and synchronized successfully",
      targetId: ss.getId(),
      finalLastRow: finalLastRow,
      finalSample: finalSample
    };

  } catch (err) {
    return { success: false, error: err.toString(), stack: err.stack };
  }
}

function populateSandboxSchedule() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('לוז פסטיבל') || ss.getSheetByName('לו"ז פסטיבל');
    if (!sheet) {
      sheet = ss.insertSheet('לוז פסטיבל');
    }
    
    // Clear sheet
    sheet.clear();
    
    const headers = [
      "תאריך",
      "שעת התחלה",
      "שעת סיום",
      "כותרת",
      "תיאור",
      "מיקום",
      "קטגוריה"
    ];
    
    const rows = [
      // Tuesday Nov 17
      ["2026-11-17", "17:30", "", "Bus Pickup to Yellow Submarine", "Bus pickup from the JLM hotels to Yellow Submarine Venue.", '=HYPERLINK("https://yellowsubmarine.org.il/en/", "Yellow Submarine")', "Shuttle"],
      ["2026-11-17", "18:00", "", "Welcome Drink & Delegation Meetup", "Welcome to the Israel Music Showcase Festival 2026. First drink and meeting the delegation.", '=HYPERLINK("https://yellowsubmarine.org.il/en/", "Yellow Submarine")', "Food & Drinks"],
      ["2026-11-17", "19:45", "", "Opening Concerts (7 shows)", "Opening showcases. Delegation-Designated Green Room with snacks and beverages available.", '=HYPERLINK("https://yellowsubmarine.org.il/en/", "Yellow Submarine")', "Concerts"],
      ["2026-11-17", "00:30", "", "Bus Pickup to Hotels", "Bus pickup from the venue back to the hotels.", "Arthur Hotel Jerusalem", "Shuttle"],
      
      // Wednesday Nov 18
      ["2026-11-18", "12:10", "", "Bus Pickup to Tower of David", "Bus pickup from the hotels to Tower of David.", '=HYPERLINK("https://www.tod.org.il/", "Tower of David")', "Shuttle"],
      ["2026-11-18", "13:00", "14:45", "Noon Concerts (3 shows)", "Showcases at Tower of David in the Old City.", '=HYPERLINK("https://www.tod.org.il/", "Tower of David")', "Concerts"],
      ["2026-11-18", "15:00", "", "Bus Pickup to Hotel", "Bus pickup to the hotel.", "Arthur Hotel Jerusalem", "Shuttle"],
      ["2026-11-18", "15:15", "19:15", "Free Time", "Free time to rest or explore Jerusalem.", "Jerusalem", "Free Time"],
      ["2026-11-18", "19:15", "", "Bus Pickup to Yellow Submarine", "Bus pickup from the hotel to Yellow Submarine.", '=HYPERLINK("https://yellowsubmarine.org.il/en/", "Yellow Submarine")', "Shuttle"],
      ["2026-11-18", "19:30", "00:00", "Night Concerts (6 shows)", "Night showcases at Yellow Submarine. Delegation-Designated Green Room with snacks and beverages available.", '=HYPERLINK("https://yellowsubmarine.org.il/en/", "Yellow Submarine")', "Concerts"],
      ["2026-11-18", "00:30", "", "Bus Pickup to Hotel", "Bus pickup from Yellow Submarine back to the hotel.", "Arthur Hotel Jerusalem", "Shuttle"],
      
      // Thursday Nov 19
      ["2026-11-19", "09:45", "", "Bus Pickup to Old City Tour (Optional)", "Bus pickup from hotel lobby to a guided tour in the Old City.", "Arthur Hotel Jerusalem", "Shuttle"],
      ["2026-11-19", "10:00", "13:30", "Guided Tour in the Old City (Optional)", "Guided tour in the Old City of Jerusalem.", "Old City Jerusalem", "Tour"],
      ["2026-11-19", "13:30", "14:30", "Lunch - Authentic Arab Food", "Authentic Arab food lunch together.", "Old City Jerusalem", "Food & Drinks"],
      ["2026-11-19", "14:30", "18:20", "Free Time in Old City Market", "Free time to explore and hang in the Old City Market.", '=HYPERLINK("https://maps.app.goo.gl/y2maW7VRxZmsfuLD6", "Old City Market")', "Free Time"],
      ["2026-11-19", "18:20", "", "Walk to Venues", "Gather at hotel lobby and walk together to the venues.", "Arthur Hotel Jerusalem", "Logistics"],
      ["2026-11-19", "19:00", "23:45", "BIG EVENT - Night Concerts (15 shows)", "15 shows, performances & surprises at Museum of Tolerance. Delegation-Designated Green Room with snacks and beverages available.", '=HYPERLINK("https://maps.google.com/?q=Museum+of+Tolerance+Jerusalem", "Museum of Tolerance")', "Concerts"],
      ["2026-11-19", "00:00", "02:00", "Late Night AfterParty & DJ Sets", "Mazkeka (Rock/Alt), Nocturno (Funky Jazz), Besarabia (Karaoke Rave), Pergamon (Drum&Bass). Walking independently to hotel.", '=HYPERLINK("https://mazkeka.com/en/", "Mazkeka / Nocturno / Besarabia / Pergamon")', "Party"],
      
      // Friday Nov 20
      ["2026-11-20", "11:00", "", "Checkout from Jerusalem Hotel", "Checkout from hotel in Jerusalem.", "Arthur Hotel Jerusalem", "Logistics"],
      ["2026-11-20", "11:15", "", "Bus Transfer: Jerusalem to Tel Aviv", "Bus pickup from Jerusalem hotel to Tel Aviv hotel.", "Arthur Hotel Jerusalem", "Shuttle"],
      ["2026-11-20", "12:30", "17:00", "Check-in & Free Time in Tel Aviv", "Check-in at Cinema Hotel and free time in Tel Aviv.", "Cinema Hotel Tel Aviv", "Free Time"],
      ["2026-11-20", "17:30", "", "Bus Pickup to TEDER", "Bus pickup to TEDER venue.", "Cinema Hotel Tel Aviv", "Shuttle"],
      ["2026-11-20", "18:00", "19:00", "TEDER Venue - Afternoon Shows (2 shows)", "Opening showcase sets at TEDER.", '=HYPERLINK("https://maps.google.com/?q=TEDER+Tel+Aviv", "TEDER")', "Concerts"],
      ["2026-11-20", "19:00", "20:15", "Dinner", "Dinner with the delegation (venue details coming soon).", "Tel Aviv", "Food & Drinks"],
      ["2026-11-20", "20:30", "01:30", "TEDER Venue - Night Shows (5 shows)", "Night showcases at TEDER. Delegation-Designated Green Room with snacks and beverages available.", '=HYPERLINK("https://maps.google.com/?q=TEDER+Tel+Aviv", "TEDER")', "Concerts"],
      ["2026-11-20", "01:30", "", "Bus Pickup to Hotel", "Bus pickup from TEDER back to Cinema Hotel.", "Cinema Hotel Tel Aviv", "Shuttle"],
      
      // Saturday Nov 21
      ["2026-11-21", "10:00", "13:45", "Free Time - Beach & City Exploration", "Go to the beach, travel and explore Tel Aviv.", "Tel Aviv Beach / City", "Free Time"],
      ["2026-11-21", "13:45", "", "Bus Pickup to The Radical", "Bus pickup from hotel to The Radical venue.", "Cinema Hotel Tel Aviv", "Shuttle"],
      ["2026-11-21", "14:00", "18:30", "Noon Concerts & Artist Sessions", "Noon concerts and artist sessions at The Radical.", '=HYPERLINK("https://maps.google.com/?q=The+Radical+Tel+Aviv", "The Radical")', "Concerts"],
      ["2026-11-21", "18:30", "19:15", "Dinner at Le Mala", "Dinner at Mexican eatery Le Mala.", '=HYPERLINK("https://ontopo.com/en/il/page/26731676", "Le Mala")', "Food & Drinks"],
      ["2026-11-21", "19:15", "", "Walk to Hameretz 2", "Walk from the restaurant to the Hameretz 2 venue.", '=HYPERLINK("https://www.instagram.com/hameretz2/?hl=he", "Hameretz 2")', "Logistics"],
      ["2026-11-21", "19:30", "23:30", "Closing Night Concerts (3 shows)", "Closing Night showcase concerts at Hameretz 2.", '=HYPERLINK("https://www.instagram.com/hameretz2/?hl=he", "Hameretz 2")', "Concerts"],
      ["2026-11-21", "00:00", "", "Bus Pickup to Hotel", "Bus pickup from Hameretz 2 back to the hotel.", "Cinema Hotel Tel Aviv", "Shuttle"],
      ["2026-11-21", "01:00", "", "AfterParty at Hotel Rooftop", "Late night celebration at the Cinema Hotel rooftop.", "Cinema Hotel Rooftop", "Party"],
      
      // Sunday Nov 22
      ["2026-11-22", "12:30", "", "Bus Pickup to Beit HaMecholot", "Bus pickup from hotel to Beit HaMecholot.", "Cinema Hotel Tel Aviv", "Shuttle"],
      ["2026-11-22", "14:00", "17:00", "Networking & Trade Fair Event", "Private trade fair event with International Showcase guests and musicians.", '=HYPERLINK("https://maps.google.com/?q=Beit+Hamecholot+Tel+Aviv", "Beit HaMecholot")', "Networking"],
      ["2026-11-22", "17:00", "19:00", "Industry Mingling & DJ Set", "Mingling event with the Israeli music industry + background DJ set.", '=HYPERLINK("https://maps.google.com/?q=Beit+Hamecholot+Tel+Aviv", "Beit HaMecholot")', "Networking"],
      ["2026-11-22", "19:00", "", "Bus Pickup to Hotel", "Bus pickup back to Cinema Hotel.", "Cinema Hotel Tel Aviv", "Shuttle"],
      
      // Monday Nov 23
      ["2026-11-23", "10:00", "", "Farewell Meeting", "Farewell meeting with International Showcase crew and Head of Music Department at Ministry of Foreign Affairs.", "Cinema Hotel Terrace", "Networking"],
      ["2026-11-23", "11:00", "", "Check-out & Airport Departures", "Check-out until 11:00. Guests depart independently to Ben Gurion Airport (TLV). Please arrive at airport at least 3 hours prior to flight.", "Cinema Hotel Tel Aviv / TLV Airport", "Logistics"]
    ];
    
    // Write headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
    
    // Write rows
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    
    // Format column A (Date) as yyyy-mm-dd
    sheet.getRange(2, 1, rows.length, 1).setNumberFormat("yyyy-mm-dd");
    
    // Format columns B & C as HH:mm or text
    sheet.getRange(2, 2, rows.length, 2).setNumberFormat("@");
    
    // Auto-fit column widths
    for (let c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c);
    }
    
    // Clear global schedule cache so fresh data is loaded immediately
    try {
      CacheService.getScriptCache().remove('global_schedule_data');
    } catch(e) {}
    
    return {
      success: true,
      sheetName: sheet.getName(),
      totalEvents: rows.length
    };
  } catch (err) {
    return { success: false, error: err.toString(), stack: err.stack };
  }
}
