/**
 * Exposure Festival 2026 - Flight PDF Parser using Gemini AI
 */

function testParseActiveCell() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getActiveCell();
  
  const e = {
    source: SpreadsheetApp.getActiveSpreadsheet(),
    range: range
  };
  
  SpreadsheetApp.getActiveSpreadsheet().toast("מפעיל פענוח ידני על התא הנבחר...", "בדיקה", 5);
  triggerFlightParsing(e, true);
}

function setGeminiApiKey() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'הגדרת מפתח AI (Gemini)',
    'הזן כאן את ה-API Key שלך מ-Google AI Studio:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() == ui.Button.OK) {
    PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', response.getResponseText().trim());
    ui.alert('מצוין!', 'המפתח נשמר בהצלחה במערכת. כעת תוכל להשתמש בפענוח האוטומטי.', ui.ButtonSet.OK);
  }
}

function setupFlightParserTrigger() {
  const anatId = CONFIG.ANAT_SPREADSHEET_ID;
  if (!anatId || anatId === "YOUR_ANAT_SPREADSHEET_ID_HERE") return;
  
  // Delete existing to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'triggerFlightParsing') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  ScriptApp.newTrigger('triggerFlightParsing')
    .forSpreadsheet(anatId)
    .onEdit()
    .create();
    
  Logger.log('✅ Flight Parser trigger installed on Anat sheet.');
}

function triggerFlightParsing(e, isManual = false) {
  if (!e || !e.source) return;
  const sheet = e.source.getActiveSheet();
  
  if (!isManual && !sheet.getName().includes("טיסות")) return;
  
  const range = e.range;
  const col = range.getColumn();
  const row = range.getRow();
  
  const TICKET_LINK_COL = 13; // עמודה M - לינק כרטיס סופי
  const value = String(range.getValue()).trim();
  
  if (isManual) {
    sheet.getParent().toast(`בודק שורה ${row}, עמודה ${col}. ערך: ${value}`, "דיבאג");
  }

  // אם העריכה קרתה בעמודת הלינק ויש שם לינק (או אם הפעלנו ידנית)
  if (isManual || (col === TICKET_LINK_COL && value.includes("http"))) {
    
    sheet.getParent().toast("מזהה לינק! מתחיל לפענח את הכרטיס בעזרת AI...", "פענוח טיסות", 5);
    sheet.getRange(row, 14).setValue("מתחיל פענוח AI..."); // Write to notes column
    
    try {
      const fileId = extractDriveId(value);
      if (!fileId) throw new Error("לא זוהה מזהה קובץ תקין מתוך הלינק של גוגל דרייב");
      
      const file = DriveApp.getFileById(fileId);
      const mimeType = file.getMimeType();
      
      let base64Data = "";
      if (mimeType === MimeType.PDF || mimeType.startsWith("image/")) {
        base64Data = Utilities.base64Encode(file.getBlob().getBytes());
      } else {
        throw new Error("הקובץ חייב להיות מסוג PDF או תמונה");
      }
      
      const extractedData = callGeminiAPI(base64Data, mimeType);
      
      if (extractedData && !extractedData.error) {
        sheet.getRange(row, 4).setValue(extractedData.arrivalDate || "");
        sheet.getRange(row, 5).setValue(extractedData.arrivalTime || "");
        sheet.getRange(row, 6).setValue(extractedData.arrivalFlight || "");
        sheet.getRange(row, 7).setValue(extractedData.arrivalAirline || "");
        
        sheet.getRange(row, 8).setValue(extractedData.departureDate || "");
        sheet.getRange(row, 9).setValue(extractedData.departureTime || "");
        sheet.getRange(row, 10).setValue(extractedData.departureFlight || "");
        sheet.getRange(row, 11).setValue(extractedData.departureAirline || "");
        
        sheet.getParent().toast("הפענוח הושלם בהצלחה והשורה עודכנה!", "הצלחה", 5);
        sheet.getRange(row, 14).setValue("פוענח בהצלחה ✅"); // Clear notes or set success
      } else {
        throw new Error("ה-AI לא הצליח לזהות נתונים תקינים בכרטיס הטיסה");
      }
      
    } catch (err) {
      sheet.getParent().toast(err.message, "שגיאה בפענוח", 8);
      sheet.getRange(row, 14).setValue("שגיאת AI: " + err.message); // Write error to notes
    }
  }
}

function extractDriveId(url) {
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

function callGeminiAPI(base64File, mimeType) {
  // To set this up, run in Apps Script:
  // PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', 'your-key-here');
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error("מפתח API לא מוגדר במערכת. אנא הגדר GEMINI_API_KEY");
  
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
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
  
  const response = UrlFetchApp.fetch(endpoint, options);
  const result = JSON.parse(response.getContentText());
  
  if (result.error) {
    Logger.log(result.error);
    return { error: true };
  }
  
  try {
    const contentText = result.candidates[0].content.parts[0].text;
    const jsonParsed = JSON.parse(contentText);
    return jsonParsed;
  } catch (e) {
    Logger.log("Failed to parse Gemini response: " + e.toString());
    return { error: true };
  }
}
