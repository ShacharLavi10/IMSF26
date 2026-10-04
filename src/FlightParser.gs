/**
 * Exposure Festival 2026 - Flight PDF Parser using Gemini AI
 */

function processAllTicketsBulk() {
  let ui;
  try { ui = SpreadsheetApp.getUi(); } catch(e) {}
  
  const showAlert = (title, msg) => {
    Logger.log(title + ": " + msg);
    if (ui) ui.alert(title, msg, ui.ButtonSet.OK);
  };

  const anatId = CONFIG.ANAT_SPREADSHEET_ID;
  if (!anatId) return showAlert("שגיאה", "ANAT_SPREADSHEET_ID לא מוגדר.");
  
  const anatSs = SpreadsheetApp.openById(anatId);
  const sourceSheet = anatSs.getSheetByName("עדכוני טיסות");
  const targetSheet = anatSs.getSheetByName("טבלת טיסות");
  
  if (!sourceSheet || !targetSheet) {
    return showAlert("שגיאה", "חסר אחד הגיליונות - 'עדכוני טיסות' או 'טבלת טיסות'.");
  }
  
  const sourceData = sourceSheet.getDataRange().getValues();
  const targetData = targetSheet.getDataRange().getValues();
  if (sourceData.length < 2 || targetData.length < 2) return;
  
  const sourceHeaders = sourceData[0];
  const targetHeaders = targetData[0];
  
  const getColIdx = (headers, names) => headers.findIndex(h => names.some(n => String(h).trim() === n));
  
  const linkColIdx = getColIdx(sourceHeaders, ["לינק כרטיס סופי", "לינק כרטיס", "לינק לכרטיס סופי"]);
  const sourceEmailColIdx = getColIdx(sourceHeaders, ["מייל אורח", "מייל", "Email"]);
  const targetEmailColIdx = getColIdx(targetHeaders, ["מייל אורח", "מייל", "Email"]);
  
  if (linkColIdx === -1) return showAlert("שגיאה", "לא נמצאה עמודת לינק ב'עדכוני טיסות'.");
  if (sourceEmailColIdx === -1) return showAlert("שגיאה", "לא נמצאה עמודת 'מייל אורח' ב'עדכוני טיסות'.");
  if (targetEmailColIdx === -1) return showAlert("שגיאה", "לא נמצאה עמודת 'מייל אורח' ב'טבלת טיסות'.");
  
  // Find target columns dynamically
  const colTarget = {
    arrDate: getColIdx(targetHeaders, ["תאריך נחיתה", "הגעה לישראל"]) + 1,
    arrTime: getColIdx(targetHeaders, ["שעת נחיתה", "שעת נחיתה בנתבג", "שעת נחיתה בנתב\"ג"]) + 1,
    arrFlight: getColIdx(targetHeaders, ["מספר טיסה נחיתה", "מספר טיסת נחיתה"]) + 1,
    arrAirline: getColIdx(targetHeaders, ["חברת תעופה נחיתה"]) + 1,
    depDate: getColIdx(targetHeaders, ["תאריך המראה", "תאריך יציאה", "חזרה מישראל"]) + 1,
    depTime: getColIdx(targetHeaders, ["שעת המראה", "שעת המראה מנתבג", "שעת המראה מנתב\"ג"]) + 1,
    depFlight: getColIdx(targetHeaders, ["מספר טיסה המראה", "מספר טיסת המראה"]) + 1,
    depAirline: getColIdx(targetHeaders, ["חברת תעופה המראה"]) + 1,
    notes: getColIdx(targetHeaders, ["הערות סריקה", "סטטוס", "הערות"]) + 1 || 14
  };
  
  let processedCount = 0;
  
  for (let i = 1; i < sourceData.length; i++) {
    const link = String(sourceData[i][linkColIdx]).trim();
    const email = String(sourceData[i][sourceEmailColIdx]).trim();
    
    if (link.includes("drive.google.com") && email) {
      // Find matching row in target
      const targetRowIdx = targetData.findIndex((row, idx) => idx > 0 && String(row[targetEmailColIdx]).trim() === email);
      
      if (targetRowIdx !== -1) {
        const targetRow = targetRowIdx + 1;
        const existingDate = String(targetData[targetRowIdx][colTarget.arrDate - 1] || "").trim();
        
        if (!existingDate) {
          try {
            const fileId = extractDriveId(link);
            if (fileId) {
              const file = DriveApp.getFileById(fileId);
              const extractedData = callGeminiAPI(Utilities.base64Encode(file.getBlob().getBytes()), file.getMimeType());
              
              if (extractedData && !extractedData.error) {
                if (colTarget.arrDate > 0) targetSheet.getRange(targetRow, colTarget.arrDate).setValue(extractedData.arrivalDate || "");
                if (colTarget.arrTime > 0) targetSheet.getRange(targetRow, colTarget.arrTime).setValue(extractedData.arrivalTime || "");
                if (colTarget.arrFlight > 0) targetSheet.getRange(targetRow, colTarget.arrFlight).setValue(extractedData.arrivalFlight || "");
                if (colTarget.arrAirline > 0) targetSheet.getRange(targetRow, colTarget.arrAirline).setValue(extractedData.arrivalAirline || "");
                if (colTarget.depDate > 0) targetSheet.getRange(targetRow, colTarget.depDate).setValue(extractedData.departureDate || "");
                if (colTarget.depTime > 0) targetSheet.getRange(targetRow, colTarget.depTime).setValue(extractedData.departureTime || "");
                if (colTarget.depFlight > 0) targetSheet.getRange(targetRow, colTarget.depFlight).setValue(extractedData.departureFlight || "");
                if (colTarget.depAirline > 0) targetSheet.getRange(targetRow, colTarget.depAirline).setValue(extractedData.departureAirline || "");
                targetSheet.getRange(targetRow, colTarget.notes).setValue("פוענח בהצלחה ✅");
                processedCount++;
                Utilities.sleep(5000); // Respect 15 RPM
              }
            }
          } catch (e) {
            targetSheet.getRange(targetRow, colTarget.notes).setValue("שגיאה בסריקה: " + e.message);
          }
        }
      }
    }
  }
  showAlert("סיום", `הסריקה הושלמה. עודכנו ${processedCount} שורות.`);
}

function triggerFlightParsing(e, isManual = false) {
  if (!e || !e.source) return;
  const sheet = e.source.getActiveSheet();
  
  // Only listen to "עדכוני טיסות"
  if (!isManual && sheet.getName() !== "עדכוני טיסות") return;
  
  const range = e.range;
  const col = range.getColumn();
  const row = range.getRow();
  
  const getColIdx = (headers, names) => headers.findIndex(h => names.some(n => String(h).trim() === n));
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const ticketLinkCol = getColIdx(headers, ["לינק כרטיס סופי", "לינק כרטיס", "לינק לכרטיס סופי"]) + 1;
  const sourceEmailCol = getColIdx(headers, ["מייל אורח", "מייל", "Email"]) + 1;
  
  if (ticketLinkCol === 0 || sourceEmailCol === 0) return;
  
  const value = String(range.getValue()).trim();
  
  if (isManual || (col === ticketLinkCol && value.includes("http"))) {
    sheet.getParent().toast("מזהה לינק ב'עדכוני טיסות'! מתחיל לפענח...", "פענוח טיסות", 5);
    
    const email = String(sheet.getRange(row, sourceEmailCol).getValue()).trim();
    if (!email) {
      sheet.getParent().toast("לא נמצא מייל בשורה זו כדי לשייך לטבלת טיסות.", "שגיאה", 5);
      return;
    }
    
    try {
      const fileId = extractDriveId(value);
      if (!fileId) throw new Error("לא זוהה מזהה קובץ דרייב תקין");
      
      const file = DriveApp.getFileById(fileId);
      const extractedData = callGeminiAPI(Utilities.base64Encode(file.getBlob().getBytes()), file.getMimeType());
      
      if (extractedData && !extractedData.error) {
        // Find row in "טבלת טיסות"
        const targetSheet = sheet.getParent().getSheetByName("טבלת טיסות");
        if (!targetSheet) throw new Error("גיליון 'טבלת טיסות' לא קיים בקובץ.");
        
        const targetData = targetSheet.getDataRange().getValues();
        const targetHeaders = targetData[0];
        const targetEmailColIdx = getColIdx(targetHeaders, ["מייל אורח", "מייל", "Email"]);
        if (targetEmailColIdx === -1) throw new Error("לא נמצאה עמודת מייל בטבלת טיסות.");
        
        const targetRowIdx = targetData.findIndex((r, idx) => idx > 0 && String(r[targetEmailColIdx]).trim() === email);
        if (targetRowIdx === -1) throw new Error(`האורח עם המייל ${email} לא נמצא בטבלת טיסות.`);
        
        const targetRow = targetRowIdx + 1;
        
        const colTarget = {
          arrDate: getColIdx(targetHeaders, ["תאריך נחיתה", "הגעה לישראל"]) + 1,
          arrTime: getColIdx(targetHeaders, ["שעת נחיתה", "שעת נחיתה בנתבג", "שעת נחיתה בנתב\"ג"]) + 1,
          arrFlight: getColIdx(targetHeaders, ["מספר טיסה נחיתה", "מספר טיסת נחיתה"]) + 1,
          arrAirline: getColIdx(targetHeaders, ["חברת תעופה נחיתה"]) + 1,
          depDate: getColIdx(targetHeaders, ["תאריך המראה", "תאריך יציאה", "חזרה מישראל"]) + 1,
          depTime: getColIdx(targetHeaders, ["שעת המראה", "שעת המראה מנתבג", "שעת המראה מנתב\"ג"]) + 1,
          depFlight: getColIdx(targetHeaders, ["מספר טיסה המראה", "מספר טיסת המראה"]) + 1,
          depAirline: getColIdx(targetHeaders, ["חברת תעופה המראה"]) + 1,
          notes: getColIdx(targetHeaders, ["הערות סריקה", "סטטוס", "הערות"]) + 1 || 14
        };
        
        if (colTarget.arrDate > 0) targetSheet.getRange(targetRow, colTarget.arrDate).setValue(extractedData.arrivalDate || "");
        if (colTarget.arrTime > 0) targetSheet.getRange(targetRow, colTarget.arrTime).setValue(extractedData.arrivalTime || "");
        if (colTarget.arrFlight > 0) targetSheet.getRange(targetRow, colTarget.arrFlight).setValue(extractedData.arrivalFlight || "");
        if (colTarget.arrAirline > 0) targetSheet.getRange(targetRow, colTarget.arrAirline).setValue(extractedData.arrivalAirline || "");
        if (colTarget.depDate > 0) targetSheet.getRange(targetRow, colTarget.depDate).setValue(extractedData.departureDate || "");
        if (colTarget.depTime > 0) targetSheet.getRange(targetRow, colTarget.depTime).setValue(extractedData.departureTime || "");
        if (colTarget.depFlight > 0) targetSheet.getRange(targetRow, colTarget.depFlight).setValue(extractedData.departureFlight || "");
        if (colTarget.depAirline > 0) targetSheet.getRange(targetRow, colTarget.depAirline).setValue(extractedData.departureAirline || "");
        
        targetSheet.getRange(targetRow, colTarget.notes).setValue("פוענח בהצלחה ✅");
        sheet.getParent().toast("הפענוח הושלם בהצלחה והוזן לטבלת טיסות!", "הצלחה", 5);
        
      } else {
        throw new Error(extractedData.message || "ה-AI לא הצליח לזהות נתונים תקינים בכרטיס הטיסה");
      }
    } catch (err) {
      sheet.getParent().toast(err.message, "שגיאה בפענוח", 8);
    }
  }
}

function extractDriveId(url) {
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

function callGeminiAPI(base64File, mimeType) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error("מפתח API לא מוגדר במערכת. אנא הגדר GEMINI_API_KEY");
  
  const promptText = `
You are a flight ticket parser. 
Analyze the attached ticket (it's for a passenger traveling to/from Israel).
Extract the following information:
1. Arrival flight TO Tel Aviv (TLV): Date (DD/MM/YYYY), Time (HH:MM), Flight Number, Airline Name.
2. Departure flight FROM Tel Aviv (TLV): Date (DD/MM/YYYY), Time (HH:MM), Flight Number, Airline Name.

IMPORTANT: Return ONLY a valid JSON object. No markdown, no comments.
If a field is missing, return an empty string.

Required JSON Structure:
{
  "arrivalDate": "",
  "arrivalTime": "",
  "arrivalFlight": "",
  "arrivalAirline": "",
  "departureDate": "",
  "departureTime": "",
  "departureFlight": "",
  "departureAirline": ""
}
  `;
  
  const payload = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64File
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  // Waterfall fallback logic: Try best models first, fallback to older ones if quota/demand fails
  const models = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash"];
  
  let response;
  let result;
  let lastErrorMsg = "";
  let overallSuccess = false;
  
  for (const model of models) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    let attempts = 0;
    const maxAttemptsPerModel = 2;
    let modelSuccess = false;
    
    while (attempts < maxAttemptsPerModel) {
      attempts++;
      response = UrlFetchApp.fetch(endpoint, options);
      result = JSON.parse(response.getContentText());
      
      if (result.error) {
        lastErrorMsg = result.error.message || result.error;
        Logger.log(`API Error on model ${model} (attempt ${attempts}): ${lastErrorMsg}`);
        
        const code = response.getResponseCode();
        // 429 = Quota Exceeded, 5xx = High Demand / Server Error
        if (code >= 500 || code === 429) {
          Utilities.sleep(Math.pow(2, attempts) * 1000); // 2s, 4s backoff before retrying same model
          continue; 
        }
        // For other errors (e.g. 400 bad request), break retry and try next model
        break;
      }
      
      modelSuccess = true;
      break;
    }
    
    if (modelSuccess) {
      overallSuccess = true;
      Logger.log(`Successfully processed ticket using model: ${model}`);
      break; 
    }
  }

  if (!overallSuccess || (result && result.error)) {
    return { error: true, message: lastErrorMsg || "כל המודלים נכשלו" };
  }
  
  try {
    const contentText = result.candidates[0].content.parts[0].text;
    const jsonParsed = JSON.parse(contentText);
    return jsonParsed;
  } catch (e) {
    Logger.log("Failed to parse Gemini response: " + e.toString());
    return { error: true, message: "Parsing failed" };
  }
}
