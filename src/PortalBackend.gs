/**
 * Exposure Festival 2026 - Web App Backend Endpoints
 */


function generateOTP(email) {
  try {
    if (!email) return { success: false, message: "Email is required." };
    const cleanEmail = email.toString().trim().toLowerCase();
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    if (!masterSheet) return { success: false, message: `Sheet '${CONFIG.MASTER_SHEET}' not found.` };
    
    const masterData = masterSheet.getDataRange().getValues();
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, masterData.length); r++) {
      if (masterData[r].some(cell => String(cell).trim().toLowerCase() === CONFIG.EMAIL_COL.toLowerCase())) {
        headerRowIdx = r;
        break;
      }
    }
    if (headerRowIdx === -1) return { success: false, message: `Header '${CONFIG.EMAIL_COL}' not found.` };
    
    const headers = masterData[headerRowIdx].map(h => String(h).trim().toLowerCase());
    const emailIdx = headers.indexOf(CONFIG.EMAIL_COL.toLowerCase());
    
    let found = false;
    for (let i = headerRowIdx + 1; i < masterData.length; i++) {
      if (masterData[i][emailIdx] && String(masterData[i][emailIdx]).trim().toLowerCase() === cleanEmail) {
        found = true;
        break;
      }
    }
    
    if (!found) return { success: false, notFound: true, message: "Email not found in our guest list." };
    
    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in Cache for 15 minutes
    CacheService.getScriptCache().put('OTP_' + cleanEmail, otpCode, 900);
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>IMSF 2026 Portal</h2>
        <p>Your one-time login code is:</p>
        <h1 style="font-size: 36px; letter-spacing: 5px; color: #333; background: #f4f4f4; padding: 10px; border-radius: 5px; display: inline-block;">${otpCode}</h1>
        <p>This code will expire in 15 minutes.</p>
        <br><br>
        <p style="font-size: 12px; color: #888;">Israel Music Showcase Festival 2026</p>
      </div>
    `;
    
    GmailApp.sendEmail(cleanEmail, "IMSF 2026 Portal Code is here", "", {
      htmlBody: htmlBody,
      from: "imsfhost@gmail.com",
      name: "Israel Music Showcase Festival 2026"
    });
    
    return { success: true, message: "OTP sent successfully." };
  } catch (err) {
    console.error("Error in generateOTP:", err);
    return { success: false, message: "We encountered an issue sending the verification code. Please try again or contact production." };
  }
}

function getOrCreateAuthSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let authSheet = ss.getSheetByName('Auth_Sessions');
  if (!authSheet) {
    authSheet = ss.insertSheet('Auth_Sessions');
    authSheet.hideSheet();
    authSheet.appendRow(['Email', 'SessionToken', 'LastActiveMs', 'CreatedAt']);
    authSheet.setFrozenRows(1);
  }
  return authSheet;
}

function verifyOTP(email, code) {
  try {
    if (!email || !code) return { success: false, message: "Email and code are required." };
    const cleanEmail = email.toString().trim().toLowerCase();
    const cleanCode = code.toString().trim();
    
    const storedCode = CacheService.getScriptCache().get('OTP_' + cleanEmail);
    if (!storedCode) return { success: false, message: "Code has expired or is invalid. Please request a new one." };
    if (storedCode !== cleanCode) return { success: false, message: "Incorrect code." };
    
    // Remove the OTP so it cannot be reused
    CacheService.getScriptCache().remove('OTP_' + cleanEmail);
    
    // Generate Session Token
    const sessionToken = Utilities.getUuid();
    const now = new Date().getTime();
    
    // Save to Sheet instead of PropertiesService
    const authSheet = getOrCreateAuthSheet();
    authSheet.appendRow([cleanEmail, sessionToken, now, new Date().toLocaleString()]);
    
    return { success: true, token: sessionToken };
  } catch (err) {
    return { success: false, message: "Server Error: " + err.toString() };
  }
}

function validateSession(sessionToken) {
  if (!sessionToken) return { success: false, sessionExpired: true, message: "Session token is required." };
  
  const authSheet = getOrCreateAuthSheet();
  const authData = authSheet.getDataRange().getValues();
  
  let tokenRowIdx = -1;
  let sessionData = null;
  
  for (let i = 1; i < authData.length; i++) {
    if (authData[i][1] === sessionToken) {
      tokenRowIdx = i;
      sessionData = {
        email: authData[i][0],
        lastActive: parseInt(authData[i][2], 10)
      };
      break;
    }
  }
  
  if (!sessionData) return { success: false, sessionExpired: true, message: "Invalid or expired session." };
  
  const now = new Date().getTime();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  
  if (now - sessionData.lastActive > SEVEN_DAYS_MS) {
    authSheet.deleteRow(tokenRowIdx + 1);
    return { success: false, sessionExpired: true, message: "Session expired. Please log in again." };
  }
  
  // Extend session (Update LastActive)
  authSheet.getRange(tokenRowIdx + 1, 3).setValue(now);
  
  return { success: true, email: sessionData.email };
}

function getGuestPortalData(sessionToken) {
  try {
    const sessionRes = validateSession(sessionToken);
    if (!sessionRes.success) return sessionRes;
    
    const cleanEmail = sessionRes.email;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    
    if (!masterSheet) return { success: false, message: `Sheet '${CONFIG.MASTER_SHEET}' not found.` };
    
    const masterData = masterSheet.getDataRange().getValues();
    if (masterData.length < 2) return { success: false, message: "Master sheet is empty." };

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, masterData.length); r++) {
      if (masterData[r].some(cell => String(cell).trim().toLowerCase() === CONFIG.EMAIL_COL.toLowerCase())) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) return { success: false, message: `Header '${CONFIG.EMAIL_COL}' not found.` };
    
    const headers = masterData[headerRowIdx].map(h => String(h).trim().toLowerCase());
    const emailIdx = headers.indexOf(CONFIG.EMAIL_COL.toLowerCase());
    
    let guestRow = null;
    let rowIndex = -1;
    
    for (let i = headerRowIdx + 1; i < masterData.length; i++) {
      if (masterData[i][emailIdx] && String(masterData[i][emailIdx]).trim().toLowerCase() === cleanEmail) {
        guestRow = masterData[i];
        rowIndex = i + 1;
        break;
      }
    }
    
    if (!guestRow) return { success: false, notFound: true, message: "Email not found." };
    
    const getColVal = (headerName) => {
      const idx = headers.indexOf(String(headerName).trim().toLowerCase());
      return idx !== -1 ? guestRow[idx] : false;
    };
    
    const checklist = {
      welcomeEmail: Boolean(getColVal(CONFIG.CHECKBOXES.WELCOME_EMAIL)),
      hasFlightForm: Boolean(getColVal(CONFIG.CHECKBOXES.FORM_FLIGHTS)),
      hasHotelForm: Boolean(getColVal(CONFIG.CHECKBOXES.FORM_HOTEL)),
      hasBio: Boolean(getColVal(CONFIG.CHECKBOXES.BIO)),
      hasPassport: Boolean(getColVal(CONFIG.CHECKBOXES.PASSPORT)),
      hasPhoto: Boolean(getColVal(CONFIG.CHECKBOXES.PHOTO)),
      generalMissing: Boolean(getColVal(CONFIG.CHECKBOXES.GENERAL_MISSING)),
      approvalFlights: Boolean(getColVal(CONFIG.CHECKBOXES.APPROVAL_FLIGHTS)),
      approvalHotels: Boolean(getColVal(CONFIG.CHECKBOXES.APPROVAL_HOTELS)),
      approvalDirectory: Boolean(getColVal(CONFIG.CHECKBOXES.APPROVAL_DIRECTORY)),
      approvalSchedule: Boolean(getColVal(CONFIG.CHECKBOXES.APPROVAL_SCHEDULE) || getColVal("אישור לו\"ז") || getColVal("אישור לוז")),
      approvalArtists: Boolean(getColVal(CONFIG.CHECKBOXES.APPROVAL_ARTISTS) || getColVal("אישור אומנים") || getColVal("אישור אמנים") || getColVal("אישור הצגת לשונית אומנים")),
      approvalGuide: Boolean(getColVal(CONFIG.CHECKBOXES.APPROVAL_GUIDE) || getColVal("אישור כללי") || getColVal("אישור מדריך") || getColVal("אישור guide"))
    };
    
    let rawMissingText = String(getColVal(CONFIG.GENERAL_MISSING_TEXT_COL) || "");
    let missingItemsArray = [];
    if (checklist.generalMissing && rawMissingText.trim() !== "") {
      try {
        let translated = LanguageApp.translate(rawMissingText, 'he', 'en');
        missingItemsArray = translated.split(',').map(item => item.trim()).filter(item => item.length > 0);
      } catch(e) {
        missingItemsArray = rawMissingText.split(',').map(item => item.trim()).filter(item => item.length > 0);
      }
    }
    checklist.generalMissingItems = missingItemsArray;
    
    const isComplete = checklist.hasFlightForm && 
                       checklist.hasHotelForm && 
                       checklist.hasBio && 
                       checklist.hasPassport && 
                       checklist.hasPhoto && 
                       !checklist.generalMissing;
                       
    const isAdmin = String(getColVal("תפקיד") || "").trim() === "הפקה חשיפה";
    if (isAdmin) {
      checklist.approvalSchedule = true;
    }
    const firstName = String(getColVal(CONFIG.FIRST_NAME_COL) || "");
    const lastName = String(getColVal(CONFIG.LAST_NAME_COL) || "");
    const bioText = String(getColVal("ביוגרפיה אנגלית") || "");
    const personalMsg = String(getColVal("הודעה אישית בפורטל") || "");
    
    let masterFlightsSheet1 = findSheetFuzzy(ss, ["טיסות - שיקוף", "עדכוני טיסות", "טיסות"]);
    let masterFlightsSheet2 = findSheetFuzzy(ss, ["טבלת טיסות - שיקוף", CONFIG.FLIGHTS_SHEET, "טבלת טיסות"]);
    let anatFlightsSheet1 = null;
    let anatFlightsSheet2 = null;

    if (CONFIG.ANAT_SPREADSHEET_ID) {
      try {
        const anatSs = SpreadsheetApp.openById(CONFIG.ANAT_SPREADSHEET_ID);
        anatFlightsSheet1 = findSheetFuzzy(anatSs, [CONFIG.ANAT_SHEET_NAME, "עדכוני טיסות", "טיסות - שיקוף", "טיסות"]);
        anatFlightsSheet2 = findSheetFuzzy(anatSs, ["טבלת טיסות", "טבלת טיסות - שיקוף", CONFIG.FLIGHTS_SHEET]);
      } catch(errAnat) {
        console.error("Could not access Anat spreadsheet:", errAnat.toString());
      }
    }

    const masterData1 = masterFlightsSheet1 ? fetchMappedData(masterFlightsSheet1, cleanEmail, MAPPINGS.FLIGHTS) : [];
    const masterData2 = masterFlightsSheet2 ? fetchMappedData(masterFlightsSheet2, cleanEmail, MAPPINGS.FLIGHTS) : [];
    const anatData1 = anatFlightsSheet1 ? fetchMappedData(anatFlightsSheet1, cleanEmail, MAPPINGS.FLIGHTS) : [];
    const anatData2 = anatFlightsSheet2 ? fetchMappedData(anatFlightsSheet2, cleanEmail, MAPPINGS.FLIGHTS) : [];

    let flightsDataMap = {};
    const countUrls = (str) => (String(str || "").match(/https?:\/\/[^\s"',;<>]+/gi) || []).length;

    const assignFlightItem = (item) => {
      if (!item || item.value === undefined || item.value === null) return;
      const valStr = String(item.value).trim();
      if (valStr === "") return;

      if (item.label === "Final Ticket Link") {
        const existingVal = flightsDataMap[item.label];
        if (existingVal) {
          const existingCount = countUrls(existingVal);
          const newCount = countUrls(valStr);
          // If existing already has 2 or more links and new has fewer, preserve multiple links!
          if (existingCount >= 2 && newCount < 2) {
            return;
          }
        }
      }
      flightsDataMap[item.label] = valStr;
    };

    // Base layer: Master spreadsheet mirror (masterData1: 'טיסות - שיקוף', masterData2: 'טבלת טיסות - שיקוף')
    [masterData1, masterData2].forEach(arr => arr.forEach(assignFlightItem));
    // Priority layer: Anat's live spreadsheet (anatData1: 'עדכוני טיסות', anatData2: 'טבלת טיסות')
    [anatData1, anatData2].forEach(arr => arr.forEach(assignFlightItem));

    const flightsData = Object.keys(flightsDataMap).map(label => ({ label: label, value: flightsDataMap[label] }));
    const hotelJerusalemData = fetchMappedData(ss.getSheetByName(CONFIG.JERUSALEM_SHEET), cleanEmail, MAPPINGS.HOTELS);
    const hotelTelAvivData = fetchMappedData(ss.getSheetByName(CONFIG.TELAVIV_SHEET), cleanEmail, MAPPINGS.HOTELS);
    let allGuestsDirectory = null;
    const dirCacheKey = 'global_guests_directory';
    const cachedDir = CacheService.getScriptCache().get(dirCacheKey);
    
    if (cachedDir && !isAdmin) {
      allGuestsDirectory = JSON.parse(cachedDir);
    } else {
      allGuestsDirectory = fetchAllGuestsDirectory(masterData, MAPPINGS.GUESTS_DIRECTORY);
      try {
        CacheService.getScriptCache().put(dirCacheKey, JSON.stringify(allGuestsDirectory), 300);
      } catch(e) {}
    }
    
    const scheduleRes = getScheduleData(isAdmin);
    const scheduleData = scheduleRes.success ? scheduleRes.schedule : null;
    const guideRes = getGuideData(isAdmin);
    const guideData = guideRes.success ? guideRes.guide : null;

    let hotelLinks = {
      jerusalem: "https://www.google.com/maps/search/?api=1&query=Arthur+Hotel+Jerusalem",
      telAviv: "https://www.google.com/maps/search/?api=1&query=Cinema+Hotel+Tel+Aviv"
    };
    if (guideData && guideData.items) {
      guideData.items.forEach(it => {
        const cat = String(it.category || "").toLowerCase();
        const city = String(it.city || "").toLowerCase();
        const name = String(it.name || "").toLowerCase();
        const link = String(it.link || "").trim();
        if ((cat.includes('מלון') || cat.includes('hotel') || name.includes('arthur') || name.includes('cinema')) && link) {
          if (city.includes('ירושלים') || city.includes('jerusalem') || name.includes('arthur')) {
            hotelLinks.jerusalem = link;
          }
          if (city.includes('תל אביב') || city.includes('tel aviv') || name.includes('cinema')) {
            hotelLinks.telAviv = link;
          }
        }
      });
    }
    
    return {
      success: true,
      guestInfo: { 
        email: cleanEmail, 
        firstName: firstName, 
        lastName: lastName, 
        role: String(getColVal("תפקיד") || "").trim(),
        rowIndex: rowIndex, 
        bio: bioText, 
        isAdmin: isAdmin,
        personalMessage: personalMsg 
      },
      checklist: checklist,
      forms: CONFIG.FORMS,
      isComplete: isComplete,
      flightsData: flightsData,
      hotelJerusalemData: hotelJerusalemData,
      hotelTelAvivData: hotelTelAvivData,
      hotelLinks: hotelLinks,
      allGuestsDirectory: allGuestsDirectory,
      scheduleData: scheduleData,
      guideData: guideData
    };
  } catch (err) {
    return { success: false, message: "Server Error: " + err.toString() };
  }
}

function findSheetFuzzy(spreadsheet, candidateNames) {
  if (!spreadsheet) return null;
  try {
    const sheets = spreadsheet.getSheets();
    for (const name of candidateNames) {
      if (!name) continue;
      const target = String(name).trim().toLowerCase().replace(/\s+/g, ' ');
      let found = sheets.find(s => s.getName().trim().toLowerCase().replace(/\s+/g, ' ') === target);
      if (found) return found;
    }
    for (const name of candidateNames) {
      if (!name) continue;
      const target = String(name).trim().toLowerCase().replace(/\s+/g, ' ');
      let found = sheets.find(s => {
        const sName = s.getName().trim().toLowerCase().replace(/\s+/g, ' ');
        return sName.includes(target) || target.includes(sName);
      });
      if (found) return found;
    }
  } catch(e) {}
  return null;
}

function fetchMappedData(sheet, email, mappingArray) {
  if (!sheet) return [];
  try {
    const range = sheet.getDataRange();
    const data = range.getValues();
    const displayData = range.getDisplayValues();
    if (data.length < 2) return [];
    
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, data.length); r++) {
      if (data[r].some(cell => {
        const val = String(cell).trim().toLowerCase().replace(/\s+/g, ' ');
        return val === CONFIG.EMAIL_COL.toLowerCase() || 
               val === 'מייל' || 
               val === 'מייל אורח' || 
               val === 'email' || 
               val.includes('מייל') || 
               val.includes('email');
      })) {
        headerRowIdx = r;
        break;
      }
    }
    if (headerRowIdx === -1) headerRowIdx = 0;
    
    const headers = data[headerRowIdx].map(h => String(h).trim().toLowerCase().replace(/\s+/g, ' '));
    let emailIdx = headers.findIndex(h => {
      return h === CONFIG.EMAIL_COL.toLowerCase() || 
             h === 'מייל' || 
             h === 'מייל אורח' || 
             h === 'email' || 
             h.includes('מייל') || 
             h.includes('email');
    });
    if (emailIdx === -1) emailIdx = 0;
    
    const targetEmail = String(email || "").trim().toLowerCase();
    
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const currentEmail = String(data[i][emailIdx] || "").trim().toLowerCase();
      if (currentEmail === targetEmail) {
        const resultList = [];
        const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
        
        mappingArray.forEach(item => {
          let cIdx = -1;
          const searchKeys = item.altKeys || [item.key];
          
          for (let key of searchKeys) {
            const cleanKey = key.trim().toLowerCase().replace(/\s+/g, ' ');
            let foundIdx = headers.findIndex(h => h === cleanKey);
            if (foundIdx === -1) {
              foundIdx = headers.findIndex(h => h && h.length > 1 && (h.includes(cleanKey) || (cleanKey.length > 1 && cleanKey.includes(h))));
            }
            if (foundIdx !== -1) { cIdx = foundIdx; break; }
          }
          
          let rawVal = cIdx !== -1 ? data[i][cIdx] : "";
          let dispVal = (displayData && displayData[i] && cIdx !== -1) ? String(displayData[i][cIdx] || "").trim() : "";
          
          // Filter out formula errors (#N/A, #VALUE!, etc.) or uncalculated formula text (=...)
          if (dispVal.startsWith("#") || dispVal.startsWith("=")) {
            dispVal = "";
          }
          if (typeof rawVal === "string" && (rawVal.startsWith("#") || rawVal.startsWith("="))) {
            rawVal = "";
          }

          let finalVal = rawVal;

          if ((item.label === "Final Ticket Link" || item.label === "Airport Invitation Link") && cIdx !== -1) {
            try {
              const cellRange = sheet.getRange(i + 1, cIdx + 1);
              const cellFormula = cellRange.getFormula();
              if (cellFormula && cellFormula.toUpperCase().includes("HYPERLINK")) {
                const match = cellFormula.match(/HYPERLINK\(\s*["']([^"']+)["']/i);
                if (match && match[1]) {
                  dispVal = match[1].trim();
                  rawVal = dispVal;
                  finalVal = dispVal;
                }
              }
              const rt = cellRange.getRichTextValue();
              if (rt) {
                const runs = rt.getRuns();
                const runLinks = [];
                runs.forEach(r => {
                  const url = r.getLinkUrl();
                  if (url && !runLinks.includes(url)) runLinks.push(url);
                });
                if (runLinks.length > 0) {
                  dispVal = runLinks.join("\n");
                  rawVal = dispVal;
                  finalVal = dispVal;
                }
              }
            } catch(rtErr) {}
          }

          if (item.label === "Shuttle") {
            // If rawVal is a Date object, always format as HH:mm
            if (rawVal instanceof Date) {
              finalVal = Utilities.formatDate(rawVal, tz, "HH:mm");
            } else if (dispVal && dispVal.includes(":")) {
              finalVal = dispVal;
            } else if (rawVal && String(rawVal).includes(":")) {
              finalVal = String(rawVal).trim();
            } else if (typeof rawVal === "number" && rawVal > 0 && rawVal < 1) {
              const totalMins = Math.round(rawVal * 24 * 60);
              const hh = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
              const mm = String(totalMins % 60).padStart(2, '0');
              finalVal = hh + ":" + mm;
            } else if (dispVal && !dispVal.includes("/")) {
              finalVal = dispVal;
            } else {
              finalVal = "";
            }

            // Safety guard: reject any date formats or 1899 epoch artifacts
            if (String(finalVal).includes("1899") || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(finalVal))) {
              finalVal = "";
            }
          } else if (item.label.toLowerCase().includes("time")) {
            if (rawVal instanceof Date) {
              finalVal = Utilities.formatDate(rawVal, tz, "HH:mm");
            } else if (dispVal && dispVal.includes(":")) {
              finalVal = dispVal;
            } else {
              finalVal = dispVal || rawVal;
            }
          } else if (rawVal instanceof Date) {
            finalVal = Utilities.formatDate(rawVal, tz, "yyyy-MM-dd HH:mm");
          } else if ((finalVal === "" || finalVal === null || finalVal === undefined) && dispVal) {
            finalVal = dispVal;
          }

          const strVal = String(finalVal !== undefined && finalVal !== null ? finalVal : "").trim();
          if (strVal !== "" && !strVal.startsWith("#") && !strVal.startsWith("=")) {
            resultList.push({ label: item.label, value: strVal });
          }
        });
        return resultList;
      }
    }
  } catch (e) {
    return [];
  }
  return [];
}

function fetchAllGuestsDirectory(masterData, mappingArray) {
  if (!masterData || masterData.length < 2) return [];
  try {
    const data = masterData;
    if (data.length < 2) return [];

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, data.length); r++) {
      if (data[r].some(cell => String(cell).trim().toLowerCase() === CONFIG.EMAIL_COL.toLowerCase())) {
        headerRowIdx = r;
        break;
      }
    }
    if (headerRowIdx === -1) return [];

    const headers = data[headerRowIdx].map(h => String(h).trim().toLowerCase());
    const guestsList = [];

    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const guestObj = {};
      mappingArray.forEach(item => {
        let cIdx = -1;
        const searchKeys = item.altKeys || [item.key];
        for (let key of searchKeys) {
          const foundIdx = headers.indexOf(key.trim().toLowerCase());
          if (foundIdx !== -1) { cIdx = foundIdx; break; }
        }
        let val = cIdx !== -1 ? data[i][cIdx] : "";
        if (val instanceof Date) {
          val = Utilities.formatDate(val, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "yyyy-MM-dd");
        }
        guestObj[item.label] = String(val !== undefined && val !== null ? val : "");
      });

      const guestEmail = String(guestObj["Email"] || "").trim();
      const guestRole = String(guestObj["Role / Title"] || "").trim();

      // חובה שיהיה מייל אורח; אם לא רשום מייל - לא מציגים בשום מצב. לאחר מכן נבדק התפקיד ושם
      if (guestEmail && guestRole !== "הפקה חשיפה" && ((guestObj["First Name"] || "").trim() || (guestObj["Last Name"] || "").trim())) {
        guestsList.push(guestObj);
      }
    }
    return guestsList;
  } catch (e) {
    return [];
  }
}

/**
 * Look up a guest profile by passenger name or email
 * Used when clicking a fellow shuttle passenger badge
 */
function getGuestByPassengerName(nameQuery) {
  try {
    if (!nameQuery) return { success: false, message: "Empty name query" };
    const cleanQuery = String(nameQuery).trim().toLowerCase().replace(/\s+/g, ' ');
    if (cleanQuery.length < 2) return { success: false, message: "Query too short" };

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    if (!masterSheet) return { success: false, message: "Master sheet not found" };

    const mData = masterSheet.getDataRange().getValues();
    if (mData.length < 2) return { success: false, message: "No data in master sheet" };

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, mData.length); r++) {
      if (mData[r].some(cell => String(cell).trim().toLowerCase() === CONFIG.EMAIL_COL.toLowerCase())) {
        headerRowIdx = r;
        break;
      }
    }
    if (headerRowIdx === -1) headerRowIdx = 0;

    const headers = mData[headerRowIdx].map(h => String(h).trim().toLowerCase());
    const emailIdx = headers.indexOf(CONFIG.EMAIL_COL.toLowerCase());
    const fnIdx = headers.indexOf(CONFIG.FIRST_NAME_COL.toLowerCase());
    const lnIdx = headers.indexOf(CONFIG.LAST_NAME_COL.toLowerCase());

    let matchedRow = -1;
    let matchedEmail = "";

    // 1. First, search Master sheet for exact full name or email
    for (let i = headerRowIdx + 1; i < mData.length; i++) {
      const fn = fnIdx !== -1 ? String(mData[i][fnIdx] || "").trim().toLowerCase() : "";
      const ln = lnIdx !== -1 ? String(mData[i][lnIdx] || "").trim().toLowerCase() : "";
      const email = emailIdx !== -1 ? String(mData[i][emailIdx] || "").trim().toLowerCase() : "";
      const fullName = `${fn} ${ln}`.trim();
      const reverseName = `${ln} ${fn}`.trim();

      if (email === cleanQuery || (fullName && fullName === cleanQuery) || (reverseName && reverseName === cleanQuery)) {
        matchedRow = i;
        matchedEmail = email;
        break;
      }
    }

    // 2. If not matched, search Flights sheets (Anat external spreadsheet and Master mirror) to map name to email
    if (matchedRow === -1) {
      const flightSheetsToSearch = [];
      if (CONFIG.ANAT_SPREADSHEET_ID) {
        try {
          const anatSs = SpreadsheetApp.openById(CONFIG.ANAT_SPREADSHEET_ID);
          const anF1 = findSheetFuzzy(anatSs, ["טבלת טיסות", "טבלת טיסות - שיקוף", CONFIG.FLIGHTS_SHEET]);
          if (anF1) flightSheetsToSearch.push(anF1);
          const anF2 = findSheetFuzzy(anatSs, [CONFIG.ANAT_SHEET_NAME, "עדכוני טיסות"]);
          if (anF2) flightSheetsToSearch.push(anF2);
        } catch(e) {}
      }
      const mF = findSheetFuzzy(ss, ["טבלת טיסות - שיקוף", CONFIG.FLIGHTS_SHEET, "טבלת טיסות"]);
      if (mF) flightSheetsToSearch.push(mF);

      for (let fSheet of flightSheetsToSearch) {
        const fData = fSheet.getDataRange().getValues();
        if (fData.length > 1) {
          for (let r = 1; r < fData.length; r++) {
            const fEmail = String(fData[r][0] || "").trim().toLowerCase();
            const fLn = String(fData[r][1] || "").trim().toLowerCase();
            const fFn = String(fData[r][2] || "").trim().toLowerCase();
            const fFullName = `${fFn} ${fLn}`.trim();
            const fReverse = `${fLn} ${fFn}`.trim();

            if (fEmail === cleanQuery || fFullName === cleanQuery || fReverse === cleanQuery || fFn === cleanQuery ||
                (fFullName && (fFullName.includes(cleanQuery) || cleanQuery.includes(fFullName)))) {
              matchedEmail = fEmail;
              break;
            }
          }
        }
        if (matchedEmail) break;
      }

      if (matchedEmail) {
        for (let i = headerRowIdx + 1; i < mData.length; i++) {
          const email = emailIdx !== -1 ? String(mData[i][emailIdx] || "").trim().toLowerCase() : "";
          if (email === matchedEmail) {
            matchedRow = i;
            break;
          }
        }
      }
    }

    // 3. If still not matched, try first name or substring search in Master sheet
    if (matchedRow === -1) {
      for (let i = headerRowIdx + 1; i < mData.length; i++) {
        const fn = fnIdx !== -1 ? String(mData[i][fnIdx] || "").trim().toLowerCase() : "";
        const ln = lnIdx !== -1 ? String(mData[i][lnIdx] || "").trim().toLowerCase() : "";
        const email = emailIdx !== -1 ? String(mData[i][emailIdx] || "").trim().toLowerCase() : "";
        const fullName = `${fn} ${ln}`.trim();

        if (fn === cleanQuery || (fullName && (fullName.includes(cleanQuery) || cleanQuery.includes(fullName)))) {
          matchedRow = i;
          matchedEmail = email;
          break;
        }
      }
    }

    if (matchedRow === -1) {
      return { success: false, notFound: true, message: "Passenger profile not found" };
    }

    // Build guest object using GUESTS_DIRECTORY mapping
    const guestObj = {};
    MAPPINGS.GUESTS_DIRECTORY.forEach(item => {
      let cIdx = -1;
      const searchKeys = item.altKeys || [item.key];
      for (let key of searchKeys) {
        const foundIdx = headers.indexOf(key.trim().toLowerCase());
        if (foundIdx !== -1) { cIdx = foundIdx; break; }
      }
      let val = (cIdx !== -1 && matchedRow !== -1) ? mData[matchedRow][cIdx] : "";
      if (val instanceof Date) {
        val = Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
      }
      guestObj[item.label] = String(val !== undefined && val !== null ? val : "");
    });

    if (matchedEmail && !guestObj["Email"]) {
      guestObj["Email"] = matchedEmail;
    }

    return { success: true, guest: guestObj };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Fetch and group the Daily Schedule
 */
function getScheduleData(forceRefresh) {
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = 'global_schedule_data';
    
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return { success: true, schedule: JSON.parse(cached) };
      }
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('לו"ז פסטיבל') || ss.getSheetByName('לוז פסטיבל');
    if (!sheet) return { success: false, message: 'Schedule sheet not found' };
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, schedule: {} };
    
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, data.length); r++) {
      const rowStr = data[r].map(h => String(h).trim().toLowerCase());
      if (rowStr.some(col => col.includes('תאריך') || col.includes('date'))) {
        headerRowIdx = r;
        break;
      }
    }
    
    if (headerRowIdx === -1) return { success: false, message: 'Headers not found in Schedule sheet' };
    
    const headers = data[headerRowIdx].map(h => String(h).trim().toLowerCase());
    const scheduleByDate = {};
    
    const dateIdx = headers.findIndex(h => h.includes('תאריך') || h.includes('date'));
    const stIdx = headers.findIndex(h => h.includes('שעת התחלה') || h.includes('start'));
    const etIdx = headers.findIndex(h => h.includes('שעת סיום') || h.includes('end'));
    const titleIdx = headers.findIndex(h => h.includes('כותרת') || h.includes('title') || h.includes('event'));
    const descIdx = headers.findIndex(h => h.includes('תיאור') || h.includes('description') || h.includes('details'));
    const locIdx = headers.findIndex(h => h.includes('מיקום') || h.includes('location') || h.includes('venue'));
    const catIdx = headers.findIndex(h => h.includes('קטגוריה') || h.includes('category') || h.includes('tag'));
    
    const formulas = sheet.getDataRange().getFormulas();
    
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      
      let dateRaw = dateIdx !== -1 ? row[dateIdx] : null;
      if (!dateRaw) continue;
      
      let dateStr = "";
      if (dateRaw instanceof Date) {
        dateStr = Utilities.formatDate(dateRaw, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
      } else {
        dateStr = String(dateRaw).trim();
      }
      
      let stRaw = stIdx !== -1 ? row[stIdx] : "";
      let etRaw = etIdx !== -1 ? row[etIdx] : "";
      
      let stStr = "";
      if (stRaw instanceof Date) {
        stStr = Utilities.formatDate(stRaw, ss.getSpreadsheetTimeZone(), "HH:mm");
      } else if (stRaw) {
        stStr = String(stRaw).trim();
      }
      
      let etStr = "";
      if (etRaw instanceof Date) {
        etStr = Utilities.formatDate(etRaw, ss.getSpreadsheetTimeZone(), "HH:mm");
      } else if (etRaw) {
        etStr = String(etRaw).trim();
      }
      
      let locVal = locIdx !== -1 ? String(row[locIdx] || "").trim() : "";
      let locLink = "";
      let locFormula = (locIdx !== -1 && formulas[i]) ? String(formulas[i][locIdx] || "") : "";
      if (locFormula) {
        const match = locFormula.match(/HYPERLINK\(\s*"([^"]+)"/i);
        if (match && match[1]) {
          locLink = match[1];
        }
      }
      if (!locLink && (locVal.startsWith('http://') || locVal.startsWith('https://'))) {
        locLink = locVal;
      }
      
      let catVal = catIdx !== -1 ? String(row[catIdx] || "").trim() : "";
      
      const event = {
        startTime: stStr,
        endTime: etStr,
        title: titleIdx !== -1 ? String(row[titleIdx] || "").trim() : "",
        description: descIdx !== -1 ? String(row[descIdx] || "").trim() : "",
        location: locVal,
        locationLink: locLink,
        category: catVal
      };
      
      if (!scheduleByDate[dateStr]) {
        scheduleByDate[dateStr] = [];
      }
      scheduleByDate[dateStr].push(event);
    }
    
    try {
      // Store in cache for 1 minute (60 seconds)
      cache.put(cacheKey, JSON.stringify(scheduleByDate), 60);
    } catch (e) {
      // Ignore cache limit errors
    }
    
    return { success: true, schedule: scheduleByDate };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Fetch and group Guide Data (Venues, Bars, Food, Apps, FAQ, etc.) from 'מידע כללי' sheet
 */
function getGuideData(forceRefresh) {
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = 'global_guide_data';
    
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return { success: true, guide: JSON.parse(cached) };
      }
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = findSheetFuzzy(ss, ['מידע כללי', 'מידע כללי והמלצות', 'General Info', 'Guide']);
    if (!sheet) return { success: false, message: 'Guide / Info sheet not found' };
    
    const range = sheet.getDataRange();
    const data = range.getValues();
    if (data.length < 2) return { success: true, guide: { jerusalem: [], telAviv: [], essentials: [], items: [] } };
    
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, data.length); r++) {
      const rowStr = data[r].map(h => String(h).trim().toLowerCase());
      if (rowStr.some(col => col.includes('עיר') || col.includes('city') || col.includes('שם המקום') || col.includes('venue') || col.includes('קטגוריה'))) {
        headerRowIdx = r;
        break;
      }
    }
    
    if (headerRowIdx === -1) return { success: false, message: 'Headers not found in Info sheet' };
    
    const headers = data[headerRowIdx].map(h => String(h).trim().toLowerCase());
    
    const cityIdx = headers.findIndex(h => h.includes('עיר') || h.includes('city'));
    const catIdx = headers.findIndex(h => h.includes('קטגוריה') || h.includes('category'));
    const nameIdx = headers.findIndex(h => h.includes('שם המקום') || h.includes('name') || h.includes('title') || h.includes('שם'));
    const addrIdx = headers.findIndex(h => h.includes('כתובת') || h.includes('address') || h.includes('location'));
    const descIdx = headers.findIndex(h => h.includes('תיאור') || h.includes('desc'));
    const linkIdx = headers.findIndex(h => h.includes('לינק') || h.includes('קישור') || h.includes('link') || h.includes('url'));
    const tagIdx = headers.findIndex(h => h.includes('תגית') || h.includes('tag') || h.includes('badge'));

    const formulas = range.getFormulas();
    let richTexts = null;
    try {
      richTexts = range.getRichTextValues();
    } catch (e) {
      Logger.log("getRichTextValues note: " + e);
    }
    
    const items = [];
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      const name = nameIdx !== -1 ? String(row[nameIdx] || "").trim() : "";
      if (!name) continue;
      
      const city = cityIdx !== -1 ? String(row[cityIdx] || "").trim() : "";
      const category = catIdx !== -1 ? String(row[catIdx] || "").trim() : "";
      const address = addrIdx !== -1 ? String(row[addrIdx] || "").trim() : "";
      const description = descIdx !== -1 ? String(row[descIdx] || "").trim() : "";
      const tag = tagIdx !== -1 ? String(row[tagIdx] || "").trim() : "";
      
      let cellLink = "";
      let cellLabel = "";
      
      if (linkIdx !== -1) {
        const rawVal = String(row[linkIdx] || "").trim();
        const formula = (formulas && formulas[i]) ? String(formulas[i][linkIdx] || "").trim() : "";
        const rt = (richTexts && richTexts[i]) ? richTexts[i][linkIdx] : null;

        // 1. Check Formula: =HYPERLINK("https://...", "Label")
        if (formula && formula.toUpperCase().includes("HYPERLINK")) {
          const match = formula.match(/HYPERLINK\(\s*["']([^"']+)["'](?:\s*[,;]\s*["']([^"']+)["'])?/i);
          if (match) {
            cellLink = match[1].trim();
            if (match[2]) {
              cellLabel = match[2].trim();
            } else if (rawVal && rawVal !== cellLink) {
              cellLabel = rawVal;
            }
          }
        }

        // 2. Check RichTextValue (Ctrl+K or inserted link in text)
        if (!cellLink && rt) {
          try {
            const rtUrl = rt.getLinkUrl();
            const rtText = (rt.getText ? rt.getText() : "").trim();
            if (rtUrl) {
              cellLink = rtUrl.trim();
              cellLabel = rtText;
            } else if (rt.getRuns) {
              const runs = rt.getRuns();
              for (let r = 0; r < runs.length; r++) {
                const u = runs[r].getLinkUrl();
                if (u) {
                  cellLink = u.trim();
                  cellLabel = (runs[r].getText ? runs[r].getText() : "").trim() || rtText;
                  break;
                }
              }
            }
          } catch (rtErr) {}
        }

        // 3. Fallback to raw string parsing (Markdown [Text](URL), HTML <a href="...">, or "Text https://...")
        if (!cellLink && rawVal) {
          const mdMatch = rawVal.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
          if (mdMatch) {
            cellLabel = mdMatch[1].trim();
            cellLink = mdMatch[2].trim();
          } else {
            const htmlMatch = rawVal.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/i);
            if (htmlMatch) {
              cellLink = htmlMatch[1].trim();
              cellLabel = htmlMatch[2].replace(/<[^>]+>/g, '').trim();
            } else {
              const urlMatch = rawVal.match(/(https?:\/\/[^\s]+)/i);
              if (urlMatch) {
                cellLink = urlMatch[1].trim();
                const remainder = rawVal.replace(cellLink, '').replace(/^[-–—:\s()]+|[-–—:\s()]+$/g, '').trim();
                if (remainder) {
                  cellLabel = remainder;
                }
              } else {
                cellLink = rawVal;
              }
            }
          }
        }

        // Clean up cellLabel if it's identical to the link or just a URL
        if (cellLabel) {
          const lLower = cellLabel.toLowerCase();
          if (cellLabel === cellLink || lLower.startsWith('http://') || lLower.startsWith('https://') || lLower.startsWith('www.')) {
            cellLabel = "";
          }
        }
      }
      
      items.push({
        city: city,
        category: category,
        name: name,
        address: address,
        description: description,
        link: cellLink,
        linkLabel: cellLabel,
        tag: tag
      });
    }
    
    const guideGrouped = {
      jerusalem: [],
      telAviv: [],
      essentials: [],
      items: items
    };
    
    items.forEach(item => {
      const cityNorm = item.city.toLowerCase();
      const catNorm = item.category.toLowerCase();
      
      if (cityNorm.includes('ירושלים') || cityNorm.includes('jerusalem') || cityNorm.includes('jlm')) {
        guideGrouped.jerusalem.push(item);
      } else if (cityNorm.includes('תל אביב') || cityNorm.includes('tel aviv') || cityNorm.includes('tlv')) {
        guideGrouped.telAviv.push(item);
      } else {
        guideGrouped.essentials.push(item);
      }
    });
    
    try {
      cache.put(cacheKey, JSON.stringify(guideGrouped), 120);
    } catch(e) {}
    
    return { success: true, guide: guideGrouped };
  } catch(err) {
    return { success: false, message: "Error fetching guide data: " + err.toString() };
  }
}

/**
 * Fetch Live Updates (Global + Personal)
 */
function getLiveUpdates(sessionToken) {
  try {
    const sessionRes = validateSession(sessionToken);
    if (!sessionRes.success) return sessionRes;
    const cleanEmail = sessionRes.email;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    const updates = [];
    
    // 1. Fetch personal message
    const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    if (masterSheet) {
      const data = masterSheet.getDataRange().getValues();
      let headerRowIdx = -1;
      for (let r = 0; r < Math.min(10, data.length); r++) {
        if (data[r].some(cell => String(cell).trim().toLowerCase() === CONFIG.EMAIL_COL.toLowerCase())) {
          headerRowIdx = r;
          break;
        }
      }
      if (headerRowIdx !== -1) {
        const headers = data[headerRowIdx].map(h => String(h).trim().toLowerCase());
        const emailIdx = headers.indexOf(CONFIG.EMAIL_COL.toLowerCase());
        const msgIdx = headers.indexOf('הודעה אישית בפורטל');
        
        if (emailIdx !== -1 && msgIdx !== -1) {
          for (let i = headerRowIdx + 1; i < data.length; i++) {
            if (String(data[i][emailIdx]).trim().toLowerCase() === cleanEmail) {
              let rawPersonal = String(data[i][msgIdx] || "").trim();
              if (rawPersonal) {
                const msgs = parsePersonalMessages(rawPersonal);
                msgs.forEach((pm, pIdx) => {
                  let translated = pm.text;
                  try {
                    translated = LanguageApp.translate(pm.text, '', 'en');
                  } catch(e) {}
                  
                  updates.push({
                    id: 'personal_' + cleanEmail + '_' + (pm.id || ('m' + pIdx)),
                    messageId: pm.id || ('m' + pIdx),
                    type: 'personal',
                    message: translated,
                    rawMessage: pm.text,
                    timestamp: pm.timestamp || (new Date().getTime() - (msgs.length - pIdx)),
                    timestampStr: pm.timestampStr || "Private Message"
                  });
                });
              }
              break;
            }
          }
        }
      }
    }
    
    // 2. Fetch global messages from 'מידע כללי' sheet, column 'הודעה לכולם'
    const infoSheet = ss.getSheetByName('מידע כללי');
    if (infoSheet) {
      const data = infoSheet.getDataRange().getValues();
      if (data.length > 0) {
        const headers = data[0].map(h => String(h).trim());
        const msgIdx = headers.indexOf('הודעה לכולם');
        
        if (msgIdx !== -1) {
          for (let i = 1; i < data.length; i++) {
            let msg = String(data[i][msgIdx] || "").trim();
            if (msg) {
              let translated = msg;
              try {
                translated = LanguageApp.translate(msg, '', 'en');
              } catch(e) {}
              
              let hash = 0;
              for (let c = 0; c < msg.length; c++) {
                hash = ((hash << 5) - hash) + msg.charCodeAt(c);
                hash |= 0;
              }
              
              updates.push({
                id: 'global_' + (i + 1) + '_' + Math.abs(hash),
                rowIndex: i + 1,
                type: 'global',
                message: translated,
                rawMessage: msg,
                timestamp: new Date().getTime() - (data.length - i),
                timestampStr: "Announcement"
              });
            }
          }
        }
      }
    }
    
    // Sort updates (personal first, then global newest first)
    const globalUpdates = updates.filter(u => u.type === 'global').reverse();
    const personalUpdates = updates.filter(u => u.type === 'personal');
    
    return { success: true, updates: [...personalUpdates, ...globalUpdates] };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function getDebugChecklist(email) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
  const data = masterSheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const emailIdx = headers.indexOf(CONFIG.EMAIL_COL.toLowerCase());
  let row = data.find(r => String(r[emailIdx]).trim().toLowerCase() === email.toLowerCase());
  if (!row) return { error: "Not found" };
  const getColVal = h => {
    const i = headers.indexOf(h.toLowerCase());
    return i !== -1 ? row[i] : false;
  };
  return {
    approvalFlights: getColVal("אישור טיסות"),
    approvalSchedule: getColVal(CONFIG.CHECKBOXES.APPROVAL_SCHEDULE),
    fallbackSchedule1: getColVal("אישור לו\"ז"),
    fallbackSchedule2: getColVal("אישור לוז")
  };
}

function getAdminDashboardData(sessionToken) {
  try {
    const sessionRes = validateSession(sessionToken);
    if (!sessionRes.success) return sessionRes;
    
    const cleanEmail = sessionRes.email;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    if (!masterSheet) return { success: false, message: 'Master sheet not found.' };
    
    const masterData = masterSheet.getDataRange().getValues();
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, masterData.length); r++) {
      if (masterData[r].some(cell => String(cell).trim().toLowerCase() === CONFIG.EMAIL_COL.toLowerCase())) {
        headerRowIdx = r;
        break;
      }
    }
    if (headerRowIdx === -1) return { success: false, message: 'Header not found.' };
    
    const headers = masterData[headerRowIdx].map(h => String(h).trim().toLowerCase());
    const emailIdx = headers.indexOf(CONFIG.EMAIL_COL.toLowerCase());
    const roleIdx = headers.indexOf("תפקיד");
    
    let isAdmin = false;
    for (let i = headerRowIdx + 1; i < masterData.length; i++) {
      if (masterData[i][emailIdx] && String(masterData[i][emailIdx]).trim().toLowerCase() === cleanEmail) {
        if (roleIdx !== -1 && String(masterData[i][roleIdx]).trim() === "הפקה חשיפה") {
          isAdmin = true;
        }
        break;
      }
    }
    
    if (!isAdmin) return { success: false, message: 'Unauthorized. Admins only.' };
    
    // Fetch full data for admin
    const tz = ss.getSpreadsheetTimeZone();
    const getSheetData = (sheetName) => {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return null;
      const data = sheet.getDataRange().getValues();
      return data.map((row) => row.map((cell) => {
        if (typeof cell === "string") {
          const trimmed = cell.trim();
          if (trimmed.startsWith("#") || trimmed.startsWith("=")) {
            return "";
          }
          return cell;
        }
        if (cell instanceof Date) {
          if (isNaN(cell.getTime())) return "";
          return Utilities.formatDate(cell, tz, 'yyyy-MM-dd HH:mm');
        }
        return cell;
      }));
    };
    
    return {
      success: true,
      guests: getSheetData(CONFIG.MASTER_SHEET),
      flights: getSheetData(CONFIG.FLIGHTS_SHEET),
      flightsUpdates: getSheetData("טיסות - שיקוף") || getSheetData(CONFIG.ANAT_SHEET_NAME),
      hotelJlm: getSheetData(CONFIG.JERUSALEM_SHEET),
      hotelTlv: getSheetData(CONFIG.TELAVIV_SHEET),
      announcements: getAdminAnnouncementsList(ss)
    };
  } catch (err) {
    console.error("Error in getAdminDashboardData:", err);
    return { success: false, message: 'Server Error: ' + err.toString() };
  }
}

/**
 * Check if a user has admin role (הפקה חשיפה)
 */
function checkIsAdminUser(ss, userEmail) {
  try {
    const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    if (!masterSheet) return false;
    const data = masterSheet.getDataRange().getValues();
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, data.length); r++) {
      if (data[r].some(cell => String(cell).trim().toLowerCase() === CONFIG.EMAIL_COL.toLowerCase())) {
        headerRowIdx = r;
        break;
      }
    }
    if (headerRowIdx === -1) return false;
    const headers = data[headerRowIdx].map(h => String(h).trim().toLowerCase());
    const emailIdx = headers.indexOf(CONFIG.EMAIL_COL.toLowerCase());
    const roleIdx = headers.indexOf("תפקיד");
    if (emailIdx === -1 || roleIdx === -1) return false;
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      if (String(data[i][emailIdx]).trim().toLowerCase() === String(userEmail).trim().toLowerCase()) {
        return String(data[i][roleIdx]).trim() === "הפקה חשיפה";
      }
    }
    return false;
  } catch(e) {
    return false;
  }
}

/**
 * Helper: Read all announcements from 'מידע כללי' sheet
 */
function getAdminAnnouncementsList(ss) {
  try {
    const infoSheet = ss.getSheetByName('מידע כללי');
    if (!infoSheet) return [];
    const data = infoSheet.getDataRange().getValues();
    if (data.length < 2) return [];
    const headers = data[0].map(h => String(h).trim());
    const msgIdx = headers.indexOf('הודעה לכולם');
    if (msgIdx === -1) return [];
    
    const announcements = [];
    for (let i = 1; i < data.length; i++) {
      const msg = String(data[i][msgIdx] || "").trim();
      if (msg) {
        announcements.push({
          row: i + 1,
          message: msg
        });
      }
    }
    return announcements;
  } catch(e) {
    console.error("Error in getAdminAnnouncementsList:", e);
    return [];
  }
}

/**
 * Fetch all announcements for admin
 */
function getAdminAnnouncements(sessionToken) {
  try {
    const sessionRes = validateSession(sessionToken);
    if (!sessionRes.success) return sessionRes;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!checkIsAdminUser(ss, sessionRes.email)) {
      return { success: false, message: "Unauthorized. Admin only." };
    }
    return { success: true, announcements: getAdminAnnouncementsList(ss) };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * Helper to parse multiple personal messages from cell value
 */
function parsePersonalMessages(cellValue) {
  if (!cellValue) return [];
  const str = String(cellValue).trim();
  if (!str) return [];
  
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.map((m, idx) => {
          if (typeof m === 'string') {
            return { id: 'm_' + idx, text: m, timestamp: Date.now(), timestampStr: 'Personal Message' };
          }
          return {
            id: m.id || ('m_' + idx),
            text: m.text || m.message || '',
            timestamp: m.timestamp || Date.now(),
            timestampStr: m.timestampStr || 'Personal Message'
          };
        }).filter(m => m.text && m.text.trim());
      }
    } catch(e) {}
  }
  
  if (str.includes('\n---\n')) {
    return str.split('\n---\n').map((part, idx) => ({
      id: 'm_' + idx,
      text: part.trim(),
      timestamp: Date.now(),
      timestampStr: 'Personal Message'
    })).filter(m => m.text);
  }
  
  return [{
    id: 'm_1',
    text: str,
    timestamp: Date.now(),
    timestampStr: 'Personal Message'
  }];
}

/**
 * Fetch all personal messages for a guest (Admin Only)
 */
function getPersonalMessages(sessionToken, guestEmail) {
  try {
    const sessionRes = validateSession(sessionToken);
    if (!sessionRes.success) return sessionRes;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!checkIsAdminUser(ss, sessionRes.email)) {
      return { success: false, message: "Unauthorized. Admins only." };
    }
    
    const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    if (!masterSheet) return { success: false, message: "Master sheet not found." };
    const data = masterSheet.getDataRange().getValues();
    
    let headerRowIdx = -1;
    let emailIdx = -1;
    for (let r = 0; r < Math.min(10, data.length); r++) {
      const rowStrings = data[r].map(c => String(c).trim().toLowerCase());
      let idx = rowStrings.indexOf(CONFIG.EMAIL_COL.toLowerCase());
      if (idx === -1) idx = rowStrings.findIndex(col => col.includes("מייל") || col.includes("email"));
      if (idx !== -1) {
        headerRowIdx = r;
        emailIdx = idx;
        break;
      }
    }
    if (headerRowIdx === -1) return { success: false, message: "Header not found." };
    const headers = data[headerRowIdx].map(c => String(c).trim().toLowerCase());
    const msgIdx = headers.indexOf("הודעה אישית בפורטל");
    if (msgIdx === -1) return { success: false, message: 'Column not found.' };
    
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      if (String(data[i][emailIdx] || "").trim().toLowerCase() === String(guestEmail).trim().toLowerCase()) {
        const raw = String(data[i][msgIdx] || "").trim();
        return { success: true, messages: parsePersonalMessages(raw), rawValue: raw };
      }
    }
    return { success: false, message: "Guest not found." };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Add a new personal message to a guest (Admin Only) - doesn't overwrite existing
 */
function addPersonalMessage(sessionToken, guestEmail, messageText) {
  try {
    const sessionRes = validateSession(sessionToken);
    if (!sessionRes.success) return sessionRes;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!checkIsAdminUser(ss, sessionRes.email)) {
      return { success: false, message: "Unauthorized. Admins only." };
    }
    
    const cleanText = String(messageText || "").trim();
    if (!cleanText) return { success: false, message: "Message text cannot be empty." };
    
    const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    if (!masterSheet) return { success: false, message: "Master sheet not found." };
    const data = masterSheet.getDataRange().getValues();
    
    let headerRowIdx = -1;
    let emailIdx = -1;
    for (let r = 0; r < Math.min(10, data.length); r++) {
      const rowStrings = data[r].map(c => String(c).trim().toLowerCase());
      let idx = rowStrings.indexOf(CONFIG.EMAIL_COL.toLowerCase());
      if (idx === -1) idx = rowStrings.findIndex(col => col.includes("מייל") || col.includes("email"));
      if (idx !== -1) {
        headerRowIdx = r;
        emailIdx = idx;
        break;
      }
    }
    if (headerRowIdx === -1) return { success: false, message: "Header not found." };
    const headers = data[headerRowIdx].map(c => String(c).trim().toLowerCase());
    const msgIdx = headers.indexOf("הודעה אישית בפורטל");
    if (msgIdx === -1) return { success: false, message: 'Column not found.' };
    
    let guestRow = -1;
    let existingRaw = "";
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      if (String(data[i][emailIdx] || "").trim().toLowerCase() === String(guestEmail).trim().toLowerCase()) {
        guestRow = i + 1;
        existingRaw = String(data[i][msgIdx] || "").trim();
        break;
      }
    }
    if (guestRow === -1) return { success: false, message: "Guest not found." };
    
    const messages = parsePersonalMessages(existingRaw);
    const tz = ss.getSpreadsheetTimeZone() || "Asia/Jerusalem";
    const newId = 'm_' + new Date().getTime();
    const dateStr = Utilities.formatDate(new Date(), tz, "MMM dd, HH:mm");
    
    messages.push({
      id: newId,
      text: cleanText,
      timestamp: new Date().getTime(),
      timestampStr: dateStr
    });
    
    const newRaw = JSON.stringify(messages);
    masterSheet.getRange(guestRow, msgIdx + 1).setValue(newRaw);
    return { success: true, message: "Personal message added.", messages: messages, rawValue: newRaw };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Update an existing personal message item by ID (Admin Only)
 */
function updatePersonalMessageItem(sessionToken, guestEmail, messageId, newText) {
  try {
    const sessionRes = validateSession(sessionToken);
    if (!sessionRes.success) return sessionRes;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!checkIsAdminUser(ss, sessionRes.email)) {
      return { success: false, message: "Unauthorized. Admins only." };
    }
    
    const cleanText = String(newText || "").trim();
    if (!cleanText) return { success: false, message: "Message text cannot be empty." };
    
    const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    if (!masterSheet) return { success: false, message: "Master sheet not found." };
    const data = masterSheet.getDataRange().getValues();
    
    let headerRowIdx = -1;
    let emailIdx = -1;
    for (let r = 0; r < Math.min(10, data.length); r++) {
      const rowStrings = data[r].map(c => String(c).trim().toLowerCase());
      let idx = rowStrings.indexOf(CONFIG.EMAIL_COL.toLowerCase());
      if (idx === -1) idx = rowStrings.findIndex(col => col.includes("מייל") || col.includes("email"));
      if (idx !== -1) {
        headerRowIdx = r;
        emailIdx = idx;
        break;
      }
    }
    if (headerRowIdx === -1) return { success: false, message: "Header not found." };
    const headers = data[headerRowIdx].map(c => String(c).trim().toLowerCase());
    const msgIdx = headers.indexOf("הודעה אישית בפורטל");
    if (msgIdx === -1) return { success: false, message: 'Column not found.' };
    
    let guestRow = -1;
    let existingRaw = "";
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      if (String(data[i][emailIdx] || "").trim().toLowerCase() === String(guestEmail).trim().toLowerCase()) {
        guestRow = i + 1;
        existingRaw = String(data[i][msgIdx] || "").trim();
        break;
      }
    }
    if (guestRow === -1) return { success: false, message: "Guest not found." };
    
    const messages = parsePersonalMessages(existingRaw);
    let found = false;
    messages.forEach(m => {
      if (m.id === messageId) {
        m.text = cleanText;
        m.timestamp = new Date().getTime();
        found = true;
      }
    });
    if (!found) return { success: false, message: "Message item not found." };
    
    const newRaw = JSON.stringify(messages);
    masterSheet.getRange(guestRow, msgIdx + 1).setValue(newRaw);
    return { success: true, message: "Personal message updated.", messages: messages, rawValue: newRaw };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Delete a specific personal message item by ID (Admin Only)
 */
function deletePersonalMessageItem(sessionToken, guestEmail, messageId) {
  try {
    const sessionRes = validateSession(sessionToken);
    if (!sessionRes.success) return sessionRes;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!checkIsAdminUser(ss, sessionRes.email)) {
      return { success: false, message: "Unauthorized. Admins only." };
    }
    
    const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    if (!masterSheet) return { success: false, message: "Master sheet not found." };
    const data = masterSheet.getDataRange().getValues();
    
    let headerRowIdx = -1;
    let emailIdx = -1;
    for (let r = 0; r < Math.min(10, data.length); r++) {
      const rowStrings = data[r].map(c => String(c).trim().toLowerCase());
      let idx = rowStrings.indexOf(CONFIG.EMAIL_COL.toLowerCase());
      if (idx === -1) idx = rowStrings.findIndex(col => col.includes("מייל") || col.includes("email"));
      if (idx !== -1) {
        headerRowIdx = r;
        emailIdx = idx;
        break;
      }
    }
    if (headerRowIdx === -1) return { success: false, message: "Header not found." };
    const headers = data[headerRowIdx].map(c => String(c).trim().toLowerCase());
    const msgIdx = headers.indexOf("הודעה אישית בפורטל");
    if (msgIdx === -1) return { success: false, message: 'Column not found.' };
    
    let guestRow = -1;
    let existingRaw = "";
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      if (String(data[i][emailIdx] || "").trim().toLowerCase() === String(guestEmail).trim().toLowerCase()) {
        guestRow = i + 1;
        existingRaw = String(data[i][msgIdx] || "").trim();
        break;
      }
    }
    if (guestRow === -1) return { success: false, message: "Guest not found." };
    
    const messages = parsePersonalMessages(existingRaw);
    const remaining = messages.filter(m => m.id !== messageId);
    const newRaw = remaining.length > 0 ? JSON.stringify(remaining) : "";
    
    masterSheet.getRange(guestRow, msgIdx + 1).setValue(newRaw);
    return { success: true, message: "Personal message deleted.", messages: remaining, rawValue: newRaw };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Update personal message for a guest (Admin Only) - clears or appends
 */
function updatePersonalMessage(sessionToken, guestEmail, message) {
  if (!message || !String(message).trim()) {
    try {
      const sessionRes = validateSession(sessionToken);
      if (!sessionRes.success) return sessionRes;
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!checkIsAdminUser(ss, sessionRes.email)) return { success: false, message: "Unauthorized. Admins only." };
      const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
      const data = masterSheet.getDataRange().getValues();
      let headerRowIdx = -1, emailIdx = -1;
      for (let r = 0; r < Math.min(10, data.length); r++) {
        let idx = data[r].map(c => String(c).trim().toLowerCase()).indexOf(CONFIG.EMAIL_COL.toLowerCase());
        if (idx !== -1) { headerRowIdx = r; emailIdx = idx; break; }
      }
      const msgIdx = data[headerRowIdx].map(c => String(c).trim().toLowerCase()).indexOf("הודעה אישית בפורטל");
      for (let i = headerRowIdx + 1; i < data.length; i++) {
        if (String(data[i][emailIdx]).trim().toLowerCase() === String(guestEmail).trim().toLowerCase()) {
          masterSheet.getRange(i + 1, msgIdx + 1).setValue("");
          return { success: true, message: "Messages cleared.", messages: [], rawValue: "" };
        }
      }
    } catch(e) { return { success: false, message: e.toString() }; }
  }
  return addPersonalMessage(sessionToken, guestEmail, message);
}

/**
 * Send a global alert (Admin Only)
 */
function sendAdminAlert(sessionToken, message) {
  try {
    const sessionRes = validateSession(sessionToken);
    if (!sessionRes.success) return sessionRes;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!checkIsAdminUser(ss, sessionRes.email)) {
      return { success: false, message: "Unauthorized. Admin only." };
    }
    
    const cleanMsg = String(message || "").trim();
    if (!cleanMsg) return { success: false, message: "Message cannot be empty." };
    
    const infoSheet = ss.getSheetByName('מידע כללי');
    if (!infoSheet) return { success: false, message: "'מידע כללי' sheet missing." };
    
    const infoData = infoSheet.getDataRange().getValues();
    const infoHeaders = infoData[0].map(h => String(h).trim());
    const msgIdx = infoHeaders.indexOf('הודעה לכולם');
    if (msgIdx === -1) return { success: false, message: "Column 'הודעה לכולם' not found." };
    
    let targetRow = infoData.length + 1;
    for (let i = 1; i < infoData.length; i++) {
      if (!String(infoData[i][msgIdx] || "").trim()) {
        targetRow = i + 1;
        break;
      }
    }
    
    infoSheet.getRange(targetRow, msgIdx + 1).setValue(cleanMsg);
    return { success: true, row: targetRow, announcements: getAdminAnnouncementsList(ss) };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * Update a global alert by row index (Admin Only)
 */
function updateAdminAlert(sessionToken, row, message) {
  try {
    const sessionRes = validateSession(sessionToken);
    if (!sessionRes.success) return sessionRes;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!checkIsAdminUser(ss, sessionRes.email)) {
      return { success: false, message: "Unauthorized. Admin only." };
    }
    
    const cleanMsg = String(message || "").trim();
    if (!cleanMsg) return { success: false, message: "Message cannot be empty." };
    
    const infoSheet = ss.getSheetByName('מידע כללי');
    if (!infoSheet) return { success: false, message: "'מידע כללי' sheet missing." };
    
    const infoHeaders = infoSheet.getRange(1, 1, 1, infoSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    const msgIdx = infoHeaders.indexOf('הודעה לכולם');
    if (msgIdx === -1) return { success: false, message: "Column 'הודעה לכולם' not found." };
    
    const targetRow = parseInt(row, 10);
    if (!targetRow || targetRow < 2) return { success: false, message: "Invalid row number." };
    
    infoSheet.getRange(targetRow, msgIdx + 1).setValue(cleanMsg);
    return { success: true, row: targetRow, announcements: getAdminAnnouncementsList(ss) };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * Delete a global alert by row index (Admin Only)
 */
function deleteAdminAlert(sessionToken, row) {
  try {
    const sessionRes = validateSession(sessionToken);
    if (!sessionRes.success) return sessionRes;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!checkIsAdminUser(ss, sessionRes.email)) {
      return { success: false, message: "Unauthorized. Admin only." };
    }
    
    const infoSheet = ss.getSheetByName('מידע כללי');
    if (!infoSheet) return { success: false, message: "'מידע כללי' sheet missing." };
    
    const infoHeaders = infoSheet.getRange(1, 1, 1, infoSheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
    const msgIdx = infoHeaders.indexOf('הודעה לכולם');
    if (msgIdx === -1) return { success: false, message: "Column 'הודעה לכולם' not found." };
    
    const targetRow = parseInt(row, 10);
    if (!targetRow || targetRow < 2) return { success: false, message: "Invalid row number." };
    
    infoSheet.getRange(targetRow, msgIdx + 1).setValue("");
    return { success: true, row: targetRow, announcements: getAdminAnnouncementsList(ss) };
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}


/**
 * Impersonate Guest (Admin Only)
 */
function impersonateGuest(sessionToken, targetEmail) {
  try {
    const sessionRes = validateSession(sessionToken);
    if (!sessionRes.success) return sessionRes;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const guestsSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    const data = guestsSheet.getDataRange().getValues();
    
    let headerRowIdx = -1;
    let emailIdx = -1;
    let headers = [];
    
    for (let r = 0; r < Math.min(10, data.length); r++) {
      const rowStrings = data[r].map(c => String(c).trim().toLowerCase());
      let idx = rowStrings.indexOf(CONFIG.EMAIL_COL.toLowerCase());
      if (idx === -1) idx = rowStrings.findIndex(col => col.includes("מייל") || col.includes("email"));
      if (idx !== -1) {
        headerRowIdx = r;
        emailIdx = idx;
        headers = rowStrings;
        break;
      }
    }
    
    if (headerRowIdx === -1) return { success: false, message: "Headers not found" };
    
    const roleIdx = headers.indexOf("תפקיד");
    
    let isAdmin = false;
    let targetExists = false;
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const rowEmail = String(data[i][emailIdx]).trim().toLowerCase();
      if (rowEmail === sessionRes.email) {
        if (roleIdx !== -1 && String(data[i][roleIdx]).trim() === "הפקה חשיפה") isAdmin = true;
      }
      if (rowEmail === targetEmail.trim().toLowerCase()) {
        targetExists = true;
      }
    }
    
    if (!isAdmin) return { success: false, message: "Unauthorized. Admin only." };
    if (!targetExists) return { success: false, message: "Guest not found." };
    
    // Generate a valid token for targetEmail
    const fakeToken = Utilities.base64Encode(targetEmail.trim().toLowerCase() + "|||" + new Date().getTime());
    
    // Save to Auth_Sessions sheet so validateSession works
    const authSheet = getOrCreateAuthSheet();
    authSheet.appendRow([targetEmail.trim().toLowerCase(), fakeToken, new Date().getTime(), new Date().toLocaleString()]);
    
    return { success: true, token: fakeToken };
    
  } catch(e) {
    return { success: false, message: e.toString() };
  }
}

/**
 * Purge server-side caches (Admins only)
 */
function clearAppCache(sessionToken) {
  try {
    const sessionRes = validateSession(sessionToken);
    if (!sessionRes.success) return sessionRes;
    
    const cleanEmail = sessionRes.email;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    if (!masterSheet) return { success: false, message: 'Master sheet not found.' };
    
    const masterData = masterSheet.getDataRange().getValues();
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, masterData.length); r++) {
      if (masterData[r].some(cell => String(cell).trim().toLowerCase() === CONFIG.EMAIL_COL.toLowerCase())) {
        headerRowIdx = r;
        break;
      }
    }
    if (headerRowIdx === -1) return { success: false, message: 'Header not found.' };
    
    const headers = masterData[headerRowIdx].map(h => String(h).trim().toLowerCase());
    const emailIdx = headers.indexOf(CONFIG.EMAIL_COL.toLowerCase());
    const roleIdx = headers.indexOf("תפקיד");
    
    let isAdmin = false;
    for (let i = headerRowIdx + 1; i < masterData.length; i++) {
      if (masterData[i][emailIdx] && String(masterData[i][emailIdx]).trim().toLowerCase() === cleanEmail) {
        if (roleIdx !== -1 && String(masterData[i][roleIdx]).trim() === "הפקה חשיפה") {
          isAdmin = true;
        }
        break;
      }
    }
    
    if (!isAdmin) return { success: false, message: 'Unauthorized. Admin role required.' };
    
    const cache = CacheService.getScriptCache();
    cache.removeAll([
      'global_guests_directory',
      'global_schedule_data',
      'global_artists_data_v2',
      'global_artists_data',
      'global_guide_data'
    ]);
    
    if (typeof clearTimetableCache === 'function') {
      try { clearTimetableCache(); } catch(e) {}
    }

    return { success: true, message: 'Server cache purged successfully.' };
  } catch (err) {
    return { success: false, message: 'Error clearing cache: ' + err.toString() };
  }
}
