/**
 * Exposure Festival 2026 - Drive File Uploads & Bio Services
 */
function uploadGuestFile(dataObj) {
  try {
    const { email, fileData, fileName, fileType, uploadType } = dataObj;
    const folderId = uploadType === 'passport' ? CONFIG.PASSPORT_FOLDER_ID : CONFIG.PHOTO_FOLDER_ID;
    
    let folder = (folderId && folderId !== "") ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    const data = sheet.getDataRange().getValues();
    
    let headerRowIdx = data[0].indexOf(CONFIG.EMAIL_COL) !== -1 ? 0 : (data[1] && data[1].indexOf(CONFIG.EMAIL_COL) !== -1 ? 1 : -1);
    if (headerRowIdx === -1) return { success: false, error: "Header not found" };

    const headers = data[headerRowIdx].map(h => String(h).trim());
    const emailIdx = headers.indexOf(CONFIG.EMAIL_COL);
    
    let firstName = "Guest";
    let lastName = "";
    let rowIndex = -1;
    
    if (emailIdx !== -1) {
      for (let i = headerRowIdx + 1; i < data.length; i++) {
        if (data[i][emailIdx] && data[i][emailIdx].toString().trim().toLowerCase() === email.toLowerCase()) {
          rowIndex = i;
          firstName = data[i][headers.indexOf(CONFIG.FIRST_NAME_COL)] || firstName;
          lastName = data[i][headers.indexOf(CONFIG.LAST_NAME_COL)] || lastName;
          break;
        }
      }
    }
    
    // File Naming: FirstName LastName - Passport/Photo.ext
    const extMatch = fileName.match(/\.[0-9a-z]+$/i);
    const ext = extMatch ? extMatch[0] : "";
    const cleanFirstName = firstName.toString().trim();
    const cleanLastName = lastName.toString().trim();
    const friendlyName = `${cleanFirstName} ${cleanLastName}${ext}`.trim();
    
    const blob = Utilities.newBlob(Utilities.base64Decode(fileData.split(',')[1]), fileType, friendlyName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    if (rowIndex !== -1) {
      const targetCheckboxHeader = uploadType === 'passport' ? CONFIG.CHECKBOXES.PASSPORT : CONFIG.CHECKBOXES.PHOTO;
      const targetColIdx = headers.indexOf(targetCheckboxHeader);
      if (targetColIdx !== -1) {
        sheet.getRange(rowIndex + 1, targetColIdx + 1).setValue(true);
      }
    }
    return { success: true, fileUrl: file.getUrl() };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function saveGuestBio(email, bioText) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    const data = sheet.getDataRange().getValues();

    let headerRowIdx = data[0].indexOf(CONFIG.EMAIL_COL) !== -1 ? 0 : (data[1] && data[1].indexOf(CONFIG.EMAIL_COL) !== -1 ? 1 : -1);
    if (headerRowIdx === -1) return { success: false, message: "Header not found" };
    const headers = data[headerRowIdx].map(h => String(h).trim());
    const emailIdx = headers.indexOf(CONFIG.EMAIL_COL);
    
    let draftColIdx = headers.indexOf(CONFIG.BIO_DRAFT_COL);
    if (draftColIdx === -1) {
      draftColIdx = headers.length;
      sheet.getRange(headerRowIdx + 1, draftColIdx + 1).setValue(CONFIG.BIO_DRAFT_COL);
    }
    
    const bioCheckColIdx = headers.indexOf(CONFIG.CHECKBOXES.BIO);

    if (emailIdx !== -1) {
      for (let i = headerRowIdx + 1; i < data.length; i++) {
        if (data[i][emailIdx] && data[i][emailIdx].toString().trim().toLowerCase() === email.toLowerCase()) {
          sheet.getRange(i + 1, draftColIdx + 1).setValue(bioText);
          if (bioCheckColIdx !== -1) sheet.getRange(i + 1, bioCheckColIdx + 1).setValue(true);
          return { success: true };
        }
      }
    }
    return { success: false, message: "Email not found" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function submitGeneralMissingInfo(email, text) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    const data = sheet.getDataRange().getValues();

    let headerRowIdx = data[0].indexOf(CONFIG.EMAIL_COL) !== -1 ? 0 : (data[1] && data[1].indexOf(CONFIG.EMAIL_COL) !== -1 ? 1 : -1);
    if (headerRowIdx === -1) return { success: false, message: "Header not found" };
    const headers = data[headerRowIdx].map(h => String(h).trim());
    const emailIdx = headers.indexOf(CONFIG.EMAIL_COL);
    
    let answersColIdx = headers.indexOf(CONFIG.GENERAL_MISSING_ANSWERS_COL);
    if (answersColIdx === -1) {
      answersColIdx = headers.length;
      sheet.getRange(headerRowIdx + 1, answersColIdx + 1).setValue(CONFIG.GENERAL_MISSING_ANSWERS_COL);
    }
    
    const missingCheckboxIdx = headers.indexOf(CONFIG.CHECKBOXES.GENERAL_MISSING);

    if (emailIdx !== -1) {
      for (let i = headerRowIdx + 1; i < data.length; i++) {
        if (data[i][emailIdx] && data[i][emailIdx].toString().trim().toLowerCase() === email.toLowerCase()) {
          let existingText = sheet.getRange(i + 1, answersColIdx + 1).getValue();
          let newText = text;
          if (existingText) newText = existingText + "\n---\n" + text;
          sheet.getRange(i + 1, answersColIdx + 1).setValue(newText);
          // Auto uncheck the general missing box so it's completed
          if (missingCheckboxIdx !== -1) sheet.getRange(i + 1, missingCheckboxIdx + 1).setValue(false);
          return { success: true };
        }
      }
    }
    return { success: false, message: "Email not found" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function notifyTeamUnregistered(failedEmail) {
  try {
    const adminEmail = Session.getActiveUser().getEmail();
    MailApp.sendEmail(adminEmail, `Exposure 2026: Login Attempt Alert - ${failedEmail}`, `A guest tried to log in with email: ${failedEmail}, but was not found in the sheet.`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
