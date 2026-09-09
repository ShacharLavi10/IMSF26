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

function syncAllSheets(spreadsheet) {
  if (!spreadsheet) spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = spreadsheet.getSheetByName(CONFIG.MASTER_SHEET);
  if (!masterSheet) return;
  
  const masterData = masterSheet.getDataRange().getValues();
  if (masterData.length < 2) return;
  
  let masterHeaderRowIdx = masterData[0].indexOf(CONFIG.EMAIL_COL) !== -1 ? 0 : (masterData[1] && masterData[1].indexOf(CONFIG.EMAIL_COL) !== -1 ? 1 : -1);
  if (masterHeaderRowIdx === -1) return;
  
  const emailColIndex = masterData[masterHeaderRowIdx].indexOf(CONFIG.EMAIL_COL);
  const masterEmailOrder = [];
  for (let i = masterHeaderRowIdx + 1; i < masterData.length; i++) {
    const email = masterData[i][emailColIndex];
    if (email && email.toString().trim() !== "") {
      masterEmailOrder.push(email.toString().trim().toLowerCase());
    }
  }
  
  [CONFIG.JERUSALEM_SHEET, CONFIG.TELAVIV_SHEET].forEach(sName => {
    const tSheet = spreadsheet.getSheetByName(sName);
    if (tSheet) sortTargetSheetByMasterOrder(tSheet, masterEmailOrder);
  });
}

function sortTargetSheetByMasterOrder(targetSheet, masterEmailOrder) {
  const lastRow = targetSheet.getLastRow();
  const lastCol = targetSheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return;
  
  const range = targetSheet.getRange(1, 1, lastRow, lastCol);
  const values = range.getValues();
  const formulas = range.getFormulas();
  
  let headerRowIdx = values[0].indexOf(CONFIG.EMAIL_COL) !== -1 ? 0 : (values[1] && values[1].indexOf(CONFIG.EMAIL_COL) !== -1 ? 1 : -1);
  if (headerRowIdx === -1) return;
  
  const emailColIndex = values[headerRowIdx].indexOf(CONFIG.EMAIL_COL);
  const startDataRowIdx = headerRowIdx + 1;
  
  const combinedRows = [];
  for (let r = startDataRowIdx; r < values.length; r++) {
    const emailVal = values[r][emailColIndex] ? values[r][emailColIndex].toString().trim().toLowerCase() : "";
    if (emailVal !== "" && !masterEmailOrder.includes(emailVal)) continue;

    const rowObj = [];
    for (let c = 0; c < lastCol; c++) {
      rowObj.push({ val: values[r][c], form: formulas[r][c] });
    }
    combinedRows.push(rowObj);
  }
  
  const existingTargetEmails = combinedRows.map(row => row[emailColIndex].val ? row[emailColIndex].val.toString().trim().toLowerCase() : "");
  
  masterEmailOrder.forEach(masterEmail => {
    if (!existingTargetEmails.includes(masterEmail)) {
      const newRow = new Array(lastCol).fill(null).map(() => ({ val: "", form: "" }));
      newRow[emailColIndex] = { val: masterEmail, form: "" };
      const targetRowIndex = combinedRows.length + startDataRowIdx + 1;
      newRow[1] = { val: "", form: `=IF(ISBLANK(A${targetRowIndex}), "", XLOOKUP(A${targetRowIndex}, 'אורחים'!J:J, 'אורחים'!A:A, ""))` };
      newRow[2] = { val: "", form: `=IF(ISBLANK(A${targetRowIndex}), "", XLOOKUP(A${targetRowIndex}, 'אורחים'!J:J, 'אורחים'!B:B, ""))` };
      combinedRows.push(newRow);
    }
  });
  
  combinedRows.sort((a, b) => {
    let indexA = masterEmailOrder.indexOf(a[emailColIndex].val ? a[emailColIndex].val.toString().trim().toLowerCase() : "");
    let indexB = masterEmailOrder.indexOf(b[emailColIndex].val ? b[emailColIndex].val.toString().trim().toLowerCase() : "");
    return (indexA === -1 ? 9999 : indexA) - (indexB === -1 ? 9999 : indexB);
  });
  
  const finalValues = values.slice(0, startDataRowIdx);
  const finalFormulas = formulas.slice(0, startDataRowIdx);
  
  combinedRows.forEach((row, idx) => {
    const rowVal = []; const rowForm = [];
    const currentRowNum = idx + startDataRowIdx + 1;
    row.forEach((cell, cIdx) => {
      let fStr = cell.form;
      if (fStr && (cIdx === 1 || cIdx === 2)) fStr = fStr.replace(/A\d+/g, `A${currentRowNum}`);
      if (fStr !== "") { rowForm.push(fStr); rowVal.push(""); } 
      else { rowForm.push(""); rowVal.push(cell.val); }
    });
    finalValues.push(rowVal); finalFormulas.push(rowForm);
  });
  
  targetSheet.clearContents();
  targetSheet.getRange(1, 1, finalValues.length, lastCol).setValues(finalValues);
  for (let r = startDataRowIdx; r < finalFormulas.length; r++) {
    for (let c = 0; c < lastCol; c++) {
      if (finalFormulas[r][c] !== "") targetSheet.getRange(r + 1, c + 1).setFormula(finalFormulas[r][c]);
    }
  }
}

function syncAnatSheetWithMasterOrder() {
  if (!CONFIG.ANAT_SPREADSHEET_ID || CONFIG.ANAT_SPREADSHEET_ID === "YOUR_ANAT_SPREADSHEET_ID_HERE") return;

  const masterSS = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = masterSS.getSheetByName(CONFIG.MASTER_SHEET);
  if (!masterSheet) return;

  const masterData = masterSheet.getDataRange().getValues();
  if (masterData.length < 2) return;

  let masterHeaderRowIdx = masterData[0].indexOf(CONFIG.EMAIL_COL) !== -1 ? 0 : (masterData[1] && masterData[1].indexOf(CONFIG.EMAIL_COL) !== -1 ? 1 : -1);
  if (masterHeaderRowIdx === -1) return;

  const emailColIndex = masterData[masterHeaderRowIdx].indexOf(CONFIG.EMAIL_COL);
  const masterEmailOrder = [];
  for (let i = masterHeaderRowIdx + 1; i < masterData.length; i++) {
    const email = masterData[i][emailColIndex];
    if (email && email.toString().trim() !== "") {
      masterEmailOrder.push(email.toString().trim().toLowerCase());
    }
  }

  try {
    const targetSS = SpreadsheetApp.openById(CONFIG.ANAT_SPREADSHEET_ID);
    const targetSheet = targetSS.getSheetByName(CONFIG.ANAT_SHEET_NAME) || targetSS.getSheets()[0];
    const lastRow = targetSheet.getLastRow();
    const lastCol = targetSheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) return;

    const range = targetSheet.getRange(1, 1, lastRow, lastCol);
    const values = range.getValues();
    const formulas = range.getFormulas();

    let headerRowIdx = values[0].indexOf(CONFIG.EMAIL_COL) !== -1 ? 0 : (values[1] && values[1].indexOf(CONFIG.EMAIL_COL) !== -1 ? 1 : -1);
    if (headerRowIdx === -1) return;

    const targetEmailColIdx = values[headerRowIdx].indexOf(CONFIG.EMAIL_COL);
    const startDataRowIdx = headerRowIdx + 1;

    const combinedRows = [];
    for (let r = startDataRowIdx; r < values.length; r++) {
      const emailVal = values[r][targetEmailColIdx] ? values[r][targetEmailColIdx].toString().trim().toLowerCase() : "";
      if (emailVal !== "" && !masterEmailOrder.includes(emailVal)) continue;

      const rowObj = [];
      for (let c = 0; c < lastCol; c++) {
        rowObj.push({ val: values[r][c], form: formulas[r][c] });
      }
      combinedRows.push(rowObj);
    }

    const existingTargetEmails = combinedRows.map(row => row[targetEmailColIdx].val ? row[targetEmailColIdx].val.toString().trim().toLowerCase() : "");

    const masterID = masterSS.getId();
    masterEmailOrder.forEach(masterEmail => {
      if (!existingTargetEmails.includes(masterEmail)) {
        const newRow = new Array(lastCol).fill(null).map(() => ({ val: "", form: "" }));
        newRow[targetEmailColIdx] = { val: masterEmail, form: "" };
        
        const targetRowIndex = combinedRows.length + startDataRowIdx + 1;
        newRow[1] = { val: "", form: `=IF(ISBLANK(A${targetRowIndex}), "", XLOOKUP(A${targetRowIndex}, IMPORTRANGE("${masterID}", "'אורחים'!J:J"), IMPORTRANGE("${masterID}", "'אורחים'!A:A"), ""))` };
        newRow[2] = { val: "", form: `=IF(ISBLANK(A${targetRowIndex}), "", XLOOKUP(A${targetRowIndex}, IMPORTRANGE("${masterID}", "'אורחים'!J:J"), IMPORTRANGE("${masterID}", "'אורחים'!B:B"), ""))` };
        
        combinedRows.push(newRow);
      }
    });

    combinedRows.sort((a, b) => {
      let indexA = masterEmailOrder.indexOf(a[targetEmailColIdx].val ? a[targetEmailColIdx].val.toString().trim().toLowerCase() : "");
      let indexB = masterEmailOrder.indexOf(b[targetEmailColIdx].val ? b[targetEmailColIdx].val.toString().trim().toLowerCase() : "");
      return (indexA === -1 ? 9999 : indexA) - (indexB === -1 ? 9999 : indexB);
    });

    const finalValues = values.slice(0, startDataRowIdx);
    const finalFormulas = formulas.slice(0, startDataRowIdx);

    combinedRows.forEach((row, idx) => {
      const rowVal = []; const rowForm = [];
      const currentRowNum = idx + startDataRowIdx + 1;
      row.forEach((cell, cIdx) => {
        let fStr = cell.form;
        if (fStr && (cIdx === 1 || cIdx === 2)) fStr = fStr.replace(/A\d+/g, `A${currentRowNum}`);
        if (fStr !== "") { rowForm.push(fStr); rowVal.push(""); } 
        else { rowForm.push(""); rowVal.push(cell.val); }
      });
      finalValues.push(rowVal); finalFormulas.push(rowForm);
    });

    targetSheet.clearContents();
    targetSheet.getRange(1, 1, finalValues.length, lastCol).setValues(finalValues);
    for (let r = startDataRowIdx; r < finalFormulas.length; r++) {
      for (let c = 0; c < lastCol; c++) {
        if (finalFormulas[r][c] !== "") targetSheet.getRange(r + 1, c + 1).setFormula(finalFormulas[r][c]);
      }
    }
  } catch (err) {
    Logger.log("Error syncing Anat sheet order: " + err.toString());
  }
}
