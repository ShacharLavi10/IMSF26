/**
 * Exposure Festival 2026 - Master Synchronization Engine
 */

function handleChange(e) { 
  const ss = e ? e.source : SpreadsheetApp.getActiveSpreadsheet();
  syncAllSheets(ss); 
  syncAnatSheetWithMasterOrder();
}

function handleEdit(e) { 
  if (e && e.source.getActiveSheet().getName() === CONFIG.MASTER_SHEET) {
    syncAllSheets(e.source); 
    syncAnatSheetWithMasterOrder();
  }
}

/**
 * Helper to convert 0-based column index to A1 column letter (0 -> "A", 10 -> "K", etc.)
 */
function colToLetter(colIndex) {
  let temp = colIndex + 1;
  let letter = '';
  while (temp > 0) {
    let rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
}

function syncAllSheets(spreadsheet) {
  if (!spreadsheet) spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    Logger.log("syncAllSheets: Could not obtain lock, sync already in progress.");
    return;
  }
  
  try {
    const masterSheet = spreadsheet.getSheetByName(CONFIG.MASTER_SHEET);
    if (!masterSheet) return;
    
    const masterData = masterSheet.getDataRange().getValues();
    if (masterData.length < 2) return;
    
    // Locate header row in master sheet ('אורחים')
    let masterHeaderRowIdx = -1;
    let emailColIndex = -1;
    let firstNameColIndex = -1;
    let lastNameColIndex = -1;
    
    for (let r = 0; r < Math.min(5, masterData.length); r++) {
      for (let c = 0; c < masterData[r].length; c++) {
        const val = String(masterData[r][c]).trim().toLowerCase();
        if (val === CONFIG.EMAIL_COL.trim().toLowerCase() || val === "מייל" || val === "email") {
          masterHeaderRowIdx = r;
          emailColIndex = c;
        }
      }
      if (masterHeaderRowIdx !== -1) {
        for (let c = 0; c < masterData[masterHeaderRowIdx].length; c++) {
          const val = String(masterData[masterHeaderRowIdx][c]).trim().toLowerCase();
          if (val === CONFIG.FIRST_NAME_COL.trim().toLowerCase() || val === "שם פרטי") {
            firstNameColIndex = c;
          } else if (val === CONFIG.LAST_NAME_COL.trim().toLowerCase() || val === "שם משפחה") {
            lastNameColIndex = c;
          }
        }
        break;
      }
    }
    
    if (masterHeaderRowIdx === -1 || emailColIndex === -1) return;
    
    // Master email order
    const masterEmailOrder = [];
    for (let i = masterHeaderRowIdx + 1; i < masterData.length; i++) {
      const email = masterData[i][emailColIndex];
      if (email && email.toString().trim() !== "") {
        const cleanEmail = email.toString().trim().toLowerCase();
        if (!masterEmailOrder.includes(cleanEmail)) {
          masterEmailOrder.push(cleanEmail);
        }
      }
    }
    
    const masterCols = {
      emailColLetter: colToLetter(emailColIndex),
      firstNameColLetter: firstNameColIndex !== -1 ? colToLetter(firstNameColIndex) : "C",
      lastNameColLetter: lastNameColIndex !== -1 ? colToLetter(lastNameColIndex) : "B"
    };
    
    [CONFIG.JERUSALEM_SHEET, CONFIG.TELAVIV_SHEET].forEach(sName => {
      const tSheet = spreadsheet.getSheetByName(sName);
      if (tSheet) sortTargetSheetByMasterOrder(tSheet, masterEmailOrder, masterCols, sName);
    });
  } catch (err) {
    Logger.log("Error in syncAllSheets: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

function sortTargetSheetByMasterOrder(targetSheet, masterEmailOrder, masterCols, sheetName) {
  const lastRow = targetSheet.getLastRow();
  const lastCol = targetSheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return;
  
  const range = targetSheet.getRange(1, 1, lastRow, lastCol);
  const values = range.getValues();
  const formulas = range.getFormulas();
  
  // Locate header row in target sheet
  let headerRowIdx = -1;
  let emailColIndex = -1;
  for (let r = 0; r < Math.min(5, values.length); r++) {
    for (let c = 0; c < values[r].length; c++) {
      const cellVal = String(values[r][c]).trim().toLowerCase();
      if (cellVal === CONFIG.EMAIL_COL.trim().toLowerCase() || cellVal === "מייל" || cellVal === "email") {
        headerRowIdx = r;
        emailColIndex = c;
        break;
      }
    }
    if (headerRowIdx !== -1) break;
  }
  
  // Self-heal: If header row not found by email, search for characteristic headers
  if (headerRowIdx === -1) {
    for (let r = 0; r < Math.min(4, values.length); r++) {
      if (values[r].some(cell => String(cell).includes("לילות") || String(cell).includes("הגעה"))) {
        headerRowIdx = r;
        emailColIndex = 0;
        if (!values[headerRowIdx][0] || String(values[headerRowIdx][0]).trim() === "") {
          values[headerRowIdx][0] = CONFIG.EMAIL_COL;
        }
        if (!values[headerRowIdx][1] || String(values[headerRowIdx][1]).trim() === "") {
          values[headerRowIdx][1] = CONFIG.FIRST_NAME_COL;
        }
        if (!values[headerRowIdx][2] || String(values[headerRowIdx][2]).trim() === "") {
          values[headerRowIdx][2] = CONFIG.LAST_NAME_COL;
        }
        break;
      }
    }
  }
  
  if (headerRowIdx === -1) return;
  
  // Self-heal: Ensure row 1 title is present
  if (headerRowIdx > 0 && (!values[0][0] || String(values[0][0]).trim() === "")) {
    if (sheetName && sheetName.includes("ירושלים")) {
      values[0][0] = "ירושלים";
    } else if (sheetName && sheetName.includes("תל אביב")) {
      values[0][0] = "תל אביב";
    }
  }
  
  const startDataRowIdx = headerRowIdx + 1;
  
  const combinedRows = [];
  for (let r = startDataRowIdx; r < values.length; r++) {
    const emailVal = values[r][emailColIndex] ? values[r][emailColIndex].toString().trim().toLowerCase() : "";
    
    // Check if entire row is empty
    const isRowEmpty = values[r].every(v => v === "" || v === null) && formulas[r].every(f => f === "");
    if (isRowEmpty && emailVal === "") continue;

    const isDeleted = (emailVal !== "" && !masterEmailOrder.includes(emailVal));

    const rowObj = [];
    for (let c = 0; c < lastCol; c++) {
      rowObj.push({ val: values[r][c], form: formulas[r][c], oldRow: r + 1 });
    }
    rowObj.email = emailVal;
    rowObj.isDeleted = isDeleted;
    combinedRows.push(rowObj);
  }
  
  const existingTargetEmails = combinedRows
    .map(row => row.email)
    .filter(em => em !== "");
    
  const masterEmailCol = (masterCols && masterCols.emailColLetter) ? masterCols.emailColLetter : "K";
  const masterFirstNameCol = (masterCols && masterCols.firstNameColLetter) ? masterCols.firstNameColLetter : "C";
  const masterLastNameCol = (masterCols && masterCols.lastNameColLetter) ? masterCols.lastNameColLetter : "B";

  const col1Header = String(values[headerRowIdx][1] || "").trim();
  const col1IsFirstName = col1Header.includes("פרטי") || !col1Header.includes("משפחה");
  const col1TargetCol = col1IsFirstName ? masterFirstNameCol : masterLastNameCol;
  const col2TargetCol = col1IsFirstName ? masterLastNameCol : masterFirstNameCol;

  // Add missing guests from master
  masterEmailOrder.forEach(masterEmail => {
    if (!existingTargetEmails.includes(masterEmail)) {
      const newRow = new Array(lastCol).fill(null).map(() => ({ val: "", form: "" }));
      newRow[emailColIndex] = { val: masterEmail, form: "" };
      newRow[1] = { val: "", form: "XLOOKUP_COL1" };
      newRow[2] = { val: "", form: "XLOOKUP_COL2" };
      newRow.email = masterEmail;
      newRow.isDeleted = false;
      combinedRows.push(newRow);
    }
  });
  
  // Sort rows strictly by master email order
  combinedRows.sort((a, b) => {
    let indexA = a.email ? masterEmailOrder.indexOf(a.email) : -1;
    let indexB = b.email ? masterEmailOrder.indexOf(b.email) : -1;
    if (indexA === -1) indexA = 9999;
    if (indexB === -1) indexB = 9999;
    return indexA - indexB;
  });
  
  const finalValues = values.slice(0, startDataRowIdx).map(row => row.slice());
  const finalFormulas = formulas.slice(0, startDataRowIdx).map(row => row.slice());
  const emailBackgrounds = [];
  const emailColLetter = colToLetter(emailColIndex);

  combinedRows.forEach((row, idx) => {
    emailBackgrounds.push([row.isDeleted ? "#ffcccc" : null]);
    const rowVal = []; 
    const rowForm = [];
    const currentRowNum = idx + startDataRowIdx + 1;

    row.forEach((cell, cIdx) => {
      let fStr = cell.form || "";
      let cellVal = cell.val !== undefined && cell.val !== null ? cell.val : "";

      if (cIdx === emailColIndex) {
        fStr = "";
        cellVal = row.email || cellVal;
      } else if (fStr === "XLOOKUP_COL1" || (cIdx === 1 && fStr.includes("XLOOKUP") && fStr.includes("אורחים"))) {
        fStr = `=IF(ISBLANK(${emailColLetter}${currentRowNum}), "", XLOOKUP(${emailColLetter}${currentRowNum}, 'אורחים'!$${masterEmailCol}:$${masterEmailCol}, 'אורחים'!$${col1TargetCol}:$${col1TargetCol}, ""))`;
      } else if (fStr === "XLOOKUP_COL2" || (cIdx === 2 && fStr.includes("XLOOKUP") && fStr.includes("אורחים"))) {
        fStr = `=IF(ISBLANK(${emailColLetter}${currentRowNum}), "", XLOOKUP(${emailColLetter}${currentRowNum}, 'אורחים'!$${masterEmailCol}:$${masterEmailCol}, 'אורחים'!$${col2TargetCol}:$${col2TargetCol}, ""))`;
      } else if (fStr) {
        const oldRow = cell.oldRow;
        if (oldRow && oldRow !== currentRowNum) {
          // Safe regex: only shift cell coordinates (e.g. A2, I2, H2) without touching function names like TIME(...)
          const refRegex = new RegExp(`(?<![A-Za-z0-9_'\"])(\\$?[A-Za-z]{1,2}\\$?)(${oldRow})(?![0-9])`, 'g');
          fStr = fStr.replace(refRegex, `$1${currentRowNum}`);
        }
      }

      if (fStr !== "") { 
        rowForm.push(fStr); 
        rowVal.push(""); 
      } else { 
        rowForm.push(""); 
        rowVal.push(cellVal); 
      }
    });
    finalValues.push(rowVal); 
    finalFormulas.push(rowForm);
  });
  
  const numRows = finalValues.length;
  const numCols = Math.max(lastCol, finalValues[0] ? finalValues[0].length : 1);
  
  if (lastRow > numRows) {
    targetSheet.getRange(numRows + 1, 1, lastRow - numRows, lastCol).clearContent().setBackground(null);
  }
  
  // Set all values atomically
  targetSheet.getRange(1, 1, numRows, numCols).setValues(finalValues);
  
  // Set all formulas atomically in one single call
  targetSheet.getRange(1, 1, numRows, numCols).setFormulas(finalFormulas);

  if (emailBackgrounds.length > 0) {
    targetSheet.getRange(startDataRowIdx + 1, emailColIndex + 1, emailBackgrounds.length, 1).setBackgrounds(emailBackgrounds);
  }
}

function syncAnatSheetWithMasterOrder() {
  if (!CONFIG.ANAT_SPREADSHEET_ID || CONFIG.ANAT_SPREADSHEET_ID === "YOUR_ANAT_SPREADSHEET_ID_HERE") return;

  const masterSS = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = masterSS.getSheetByName(CONFIG.MASTER_SHEET);
  if (!masterSheet) return;

  const masterData = masterSheet.getDataRange().getValues();
  if (masterData.length < 2) return;

  let masterHeaderRowIdx = -1;
  let emailColIndex = -1;
  let firstNameColIndex = -1;
  let lastNameColIndex = -1;

  for (let r = 0; r < Math.min(5, masterData.length); r++) {
    for (let c = 0; c < masterData[r].length; c++) {
      const val = String(masterData[r][c]).trim().toLowerCase();
      if (val === CONFIG.EMAIL_COL.trim().toLowerCase() || val === "מייל" || val === "email") {
        masterHeaderRowIdx = r;
        emailColIndex = c;
      }
    }
    if (masterHeaderRowIdx !== -1) {
      for (let c = 0; c < masterData[masterHeaderRowIdx].length; c++) {
        const val = String(masterData[masterHeaderRowIdx][c]).trim().toLowerCase();
        if (val === CONFIG.FIRST_NAME_COL.trim().toLowerCase() || val === "שם פרטי") {
          firstNameColIndex = c;
        } else if (val === CONFIG.LAST_NAME_COL.trim().toLowerCase() || val === "שם משפחה") {
          lastNameColIndex = c;
        }
      }
      break;
    }
  }
  if (masterHeaderRowIdx === -1 || emailColIndex === -1) return;

  const masterEmailOrder = [];
  for (let i = masterHeaderRowIdx + 1; i < masterData.length; i++) {
    const email = masterData[i][emailColIndex];
    if (email && email.toString().trim() !== "") {
      const cleanEmail = email.toString().trim().toLowerCase();
      if (!masterEmailOrder.includes(cleanEmail)) {
        masterEmailOrder.push(cleanEmail);
      }
    }
  }

  const masterEmailCol = colToLetter(emailColIndex);
  const masterFirstNameCol = firstNameColIndex !== -1 ? colToLetter(firstNameColIndex) : "C";
  const masterLastNameCol = lastNameColIndex !== -1 ? colToLetter(lastNameColIndex) : "B";

  try {
    const targetSS = SpreadsheetApp.openById(CONFIG.ANAT_SPREADSHEET_ID);
    const sheetsToSync = [CONFIG.ANAT_SHEET_NAME, "טבלת טיסות"];
    
    sheetsToSync.forEach(sheetName => {
      const targetSheet = targetSS.getSheetByName(sheetName);
      if (!targetSheet) return;
      
      const lastRow = targetSheet.getLastRow();
      const lastCol = targetSheet.getLastColumn();
      if (lastRow < 1 || lastCol < 1) return;

      const range = targetSheet.getRange(1, 1, lastRow, lastCol);
      const values = range.getValues();
      const formulas = range.getFormulas();

      let headerRowIdx = -1;
      let targetEmailColIdx = -1;
      for (let r = 0; r < Math.min(5, values.length); r++) {
        for (let c = 0; c < values[r].length; c++) {
          const val = String(values[r][c]).trim().toLowerCase();
          if (val === CONFIG.EMAIL_COL.trim().toLowerCase() || val === "מייל" || val === "email") {
            headerRowIdx = r;
            targetEmailColIdx = c;
            break;
          }
        }
        if (headerRowIdx !== -1) break;
      }
      if (headerRowIdx === -1) return;
      const startDataRowIdx = headerRowIdx + 1;

      const combinedRows = [];
      for (let r = startDataRowIdx; r < values.length; r++) {
        const emailVal = values[r][targetEmailColIdx] ? values[r][targetEmailColIdx].toString().trim().toLowerCase() : "";
        const isRowEmpty = values[r].every(v => v === "" || v === null) && formulas[r].every(f => f === "");
        if (isRowEmpty && emailVal === "") continue;

        const isDeleted = (emailVal !== "" && !masterEmailOrder.includes(emailVal));

        const rowObj = [];
        for (let c = 0; c < lastCol; c++) {
          rowObj.push({ val: values[r][c], form: formulas[r][c], oldRow: r + 1 });
        }
        rowObj.email = emailVal;
        rowObj.isDeleted = isDeleted;
        combinedRows.push(rowObj);
      }

      const existingTargetEmails = combinedRows
        .map(row => row.email)
        .filter(em => em !== "");

      const masterID = masterSS.getId();
      masterEmailOrder.forEach(masterEmail => {
        if (!existingTargetEmails.includes(masterEmail)) {
          const newRow = new Array(lastCol).fill(null).map(() => ({ val: "", form: "" }));
          newRow[targetEmailColIdx] = { val: masterEmail, form: "" };
          newRow[1] = { val: "", form: "XLOOKUP_ANAT_COL1" };
          newRow[2] = { val: "", form: "XLOOKUP_ANAT_COL2" };
          newRow.email = masterEmail;
          newRow.isDeleted = false;
          combinedRows.push(newRow);
        }
      });

      combinedRows.sort((a, b) => {
        let indexA = a.email ? masterEmailOrder.indexOf(a.email) : -1;
        let indexB = b.email ? masterEmailOrder.indexOf(b.email) : -1;
        if (indexA === -1) indexA = 9999;
        if (indexB === -1) indexB = 9999;
        return indexA - indexB;
      });

      const finalValues = values.slice(0, startDataRowIdx).map(row => row.slice());
      const finalFormulas = formulas.slice(0, startDataRowIdx).map(row => row.slice());
      const emailBackgrounds = [];
      const targetEmailColLetter = colToLetter(targetEmailColIdx);

      // Check Anat target column 1 and 2 headers (usually B=שם משפחה, C=שם פרטי)
      const col1Header = String(values[headerRowIdx][1] || "").trim();
      const col1IsFirstName = col1Header.includes("פרטי") || !col1Header.includes("משפחה");
      const col1MasterCol = col1IsFirstName ? masterFirstNameCol : masterLastNameCol;
      const col2MasterCol = col1IsFirstName ? masterLastNameCol : masterFirstNameCol;

      combinedRows.forEach((row, idx) => {
        emailBackgrounds.push([row.isDeleted ? "#ffcccc" : null]);
        const rowVal = []; 
        const rowForm = [];
        const currentRowNum = idx + startDataRowIdx + 1;

        row.forEach((cell, cIdx) => {
          let fStr = cell.form || "";
          let cellVal = cell.val !== undefined && cell.val !== null ? cell.val : "";

          if (cIdx === targetEmailColIdx) {
            fStr = "";
            cellVal = row.email || cellVal;
          } else if (fStr === "XLOOKUP_ANAT_COL1" || (cIdx === 1 && fStr.includes("XLOOKUP") && fStr.includes("IMPORTRANGE"))) {
            fStr = `=IF(ISBLANK(${targetEmailColLetter}${currentRowNum}), "", XLOOKUP(${targetEmailColLetter}${currentRowNum}, IMPORTRANGE("${masterID}", "'אורחים'!$${masterEmailCol}:$${masterEmailCol}"), IMPORTRANGE("${masterID}", "'אורחים'!$${col1MasterCol}:$${col1MasterCol}"), ""))`;
          } else if (fStr === "XLOOKUP_ANAT_COL2" || (cIdx === 2 && fStr.includes("XLOOKUP") && fStr.includes("IMPORTRANGE"))) {
            fStr = `=IF(ISBLANK(${targetEmailColLetter}${currentRowNum}), "", XLOOKUP(${targetEmailColLetter}${currentRowNum}, IMPORTRANGE("${masterID}", "'אורחים'!$${masterEmailCol}:$${masterEmailCol}"), IMPORTRANGE("${masterID}", "'אורחים'!$${col2MasterCol}:$${col2MasterCol}"), ""))`;
          } else if (fStr) {
            const oldRow = cell.oldRow;
            if (oldRow && oldRow !== currentRowNum) {
              const refRegex = new RegExp(`(?<![A-Za-z0-9_'\"])(\\$?[A-Za-z]{1,2}\\$?)(${oldRow})(?![0-9])`, 'g');
              fStr = fStr.replace(refRegex, `$1${currentRowNum}`);
            }
          }

          if (fStr !== "") { 
            rowForm.push(fStr); 
            rowVal.push(""); 
          } else { 
            rowForm.push(""); 
            rowVal.push(cellVal); 
          }
        });
        finalValues.push(rowVal); 
        finalFormulas.push(rowForm);
      });

      const numRows = finalValues.length;
      const numCols = Math.max(lastCol, finalValues[0] ? finalValues[0].length : 1);

      if (lastRow > numRows) {
        targetSheet.getRange(numRows + 1, 1, lastRow - numRows, lastCol).clearContent().setBackground(null);
      }

      targetSheet.getRange(1, 1, numRows, numCols).setValues(finalValues);
      targetSheet.getRange(1, 1, numRows, numCols).setFormulas(finalFormulas);

      if (emailBackgrounds.length > 0) {
        targetSheet.getRange(startDataRowIdx + 1, targetEmailColIdx + 1, emailBackgrounds.length, 1).setBackgrounds(emailBackgrounds);
      }
    });
  } catch (err) {
    Logger.log("Error syncing Anat sheet order: " + err.toString());
  }
}
