/**
 * Exposure Festival 2026 - Flight PDF Parser using Gemini AI
 */

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

function triggerFlightParsing(e) {
  // This will be called from onEdit
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "טבלת טיסות") return;
  
  const range = e.range;
  const col = range.getColumn();
  const row = range.getRow();
  
  // Let's assume column O (15) is the Checkbox for "פענוח אוטומטי"
  const PARSE_CHECKBOX_COL = 15; // O
  const TICKET_LINK_COL = 13; // M
  
  if (col === PARSE_CHECKBOX_COL && range.getValue() === true) {
    const ticketLink = sheet.getRange(row, TICKET_LINK_COL).getValue();
    
    if (!ticketLink) {
      SpreadsheetApp.getActiveSpreadsheet().toast("חסר לינק לכרטיס הטיסה", "שגיאה", 5);
      range.setValue(false);
      return;
    }
    
    SpreadsheetApp.getActiveSpreadsheet().toast("מתחיל לפענח את הכרטיס בעזרת AI...", "פענוח טיסות", 5);
    
    try {
      const fileId = extractDriveId(ticketLink);
      if (!fileId) throw new Error("לא זוהה לינק תקין של Google Drive");
      
      const file = DriveApp.getFileById(fileId);
      const mimeType = file.getMimeType();
      
      let base64Data = "";
      if (mimeType === MimeType.PDF || mimeType.startsWith("image/")) {
        base64Data = Utilities.base64Encode(file.getBlob().getBytes());
      } else {
        throw new Error("הקובץ חייב להיות PDF או תמונה");
      }
      
      const extractedData = callGeminiAPI(base64Data, mimeType);
      
      if (extractedData && !extractedData.error) {
        // D, E, F, G (4, 5, 6, 7) = Arrival (Date, Time, Flight, Airline)
        // H, I, J, K (8, 9, 10, 11) = Departure (Date, Time, Flight, Airline)
        
        sheet.getRange(row, 4).setValue(extractedData.arrivalDate || "");
        sheet.getRange(row, 5).setValue(extractedData.arrivalTime || "");
        sheet.getRange(row, 6).setValue(extractedData.arrivalFlight || "");
        sheet.getRange(row, 7).setValue(extractedData.arrivalAirline || "");
        
        sheet.getRange(row, 8).setValue(extractedData.departureDate || "");
        sheet.getRange(row, 9).setValue(extractedData.departureTime || "");
        sheet.getRange(row, 10).setValue(extractedData.departureFlight || "");
        sheet.getRange(row, 11).setValue(extractedData.departureAirline || "");
        
        SpreadsheetApp.getActiveSpreadsheet().toast("הפענוח הושלם בהצלחה!", "הצלחה", 5);
        range.setValue(false); // Uncheck the box
      } else {
        throw new Error("לא הצלחתי לזהות נתונים בכרטיס");
      }
      
    } catch (err) {
      SpreadsheetApp.getActiveSpreadsheet().toast(err.message, "שגיאה בפענוח", 8);
      range.setValue(false);
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
