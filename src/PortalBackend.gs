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
    return { success: false, message: "Server Error: " + err.toString() };
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
      approvalArtists: Boolean(getColVal(CONFIG.CHECKBOXES.APPROVAL_ARTISTS) || getColVal("אישור אומנים") || getColVal("אישור אמנים") || getColVal("אישור הצגת לשונית אומנים"))
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
    const firstName = String(getColVal(CONFIG.FIRST_NAME_COL) || "");
    const lastName = String(getColVal(CONFIG.LAST_NAME_COL) || "");
    const bioText = String(getColVal("ביוגרפיה אנגלית") || "");
    const personalMsg = String(getColVal("הודעה אישית בפורטל") || "");
    
    const flightsData = fetchMappedData(ss.getSheetByName(CONFIG.FLIGHTS_SHEET), cleanEmail, MAPPINGS.FLIGHTS);
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
    
    return {
      success: true,
      guestInfo: { 
        email: cleanEmail, 
        firstName: firstName, 
        lastName: lastName, 
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
      allGuestsDirectory: allGuestsDirectory,
      scheduleData: scheduleData
    };
  } catch (err) {
    return { success: false, message: "Server Error: " + err.toString() };
  }
}

function fetchMappedData(sheet, email, mappingArray) {
  if (!sheet) return [];
  try {
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, data.length); r++) {
      if (data[r].some(cell => {
        const val = String(cell).trim().toLowerCase();
        return val === CONFIG.EMAIL_COL.toLowerCase() || val === 'מייל' || val === 'email' || val === 'מייל אורח';
      })) {
        headerRowIdx = r;
        break;
      }
    }
    if (headerRowIdx === -1) headerRowIdx = 0;
    
    const headers = data[headerRowIdx].map(h => String(h).trim().toLowerCase());
    let emailIdx = headers.indexOf(CONFIG.EMAIL_COL.toLowerCase());
    if (emailIdx === -1) emailIdx = headers.indexOf('מייל');
    if (emailIdx === -1) emailIdx = headers.indexOf('email');
    if (emailIdx === -1) emailIdx = 0;
    
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const currentEmail = String(data[i][emailIdx] || "").trim().toLowerCase();
      if (currentEmail === email.toLowerCase()) {
        const resultList = [];
        mappingArray.forEach(item => {
          let cIdx = -1;
          const searchKeys = item.altKeys || [item.key];
          
          for (let key of searchKeys) {
            const foundIdx = headers.indexOf(key.trim().toLowerCase());
            if (foundIdx !== -1) { cIdx = foundIdx; break; }
          }
          let val = cIdx !== -1 ? data[i][cIdx] : "";
          if (val instanceof Date) {
            val = Utilities.formatDate(val, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "yyyy-MM-dd HH:mm");
          }
          if (val !== undefined && val !== null && String(val).trim() !== "") {
            resultList.push({ label: item.label, value: String(val) });
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
      if (guestObj["Role / Title"] !== "הפקה חשיפה" && (guestObj["First Name"] || guestObj["Last Name"])) guestsList.push(guestObj);
    }
    return guestsList;
  } catch (e) {
    return [];
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
    let sheet = ss.getSheetByName('לו"ז פסטיבל');
    if (!sheet) return { success: false, message: 'Schedule sheet not found' };
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, schedule: {} };
    
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, data.length); r++) {
      const rowStr = data[r].map(h => String(h).trim().toLowerCase());
      if (rowStr.includes('תאריך') || rowStr.includes('date')) {
        headerRowIdx = r;
        break;
      }
    }
    
    if (headerRowIdx === -1) return { success: false, message: 'Headers not found in Schedule sheet' };
    
    const headers = data[headerRowIdx].map(h => String(h).trim().toLowerCase());
    const scheduleByDate = {};
    
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      
      let dateRaw = row[headers.indexOf('תאריך')] || row[headers.indexOf('date')];
      if (!dateRaw) continue;
      
      let dateStr = "";
      if (dateRaw instanceof Date) {
        dateStr = Utilities.formatDate(dateRaw, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
      } else {
        dateStr = String(dateRaw).trim();
      }
      
      let stIdx = headers.indexOf('שעת התחלה');
      if (stIdx === -1) stIdx = headers.indexOf('start time');
      if (stIdx === -1) stIdx = headers.indexOf('start');
      let stRaw = stIdx !== -1 ? row[stIdx] : "";
      
      let etIdx = headers.indexOf('שעת סיום');
      if (etIdx === -1) etIdx = headers.indexOf('end time');
      if (etIdx === -1) etIdx = headers.indexOf('end');
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
      
      let titleIdx = headers.indexOf('כותרת');
      if (titleIdx === -1) titleIdx = headers.indexOf('title');
      if (titleIdx === -1) titleIdx = headers.indexOf('event');
      
      let descIdx = headers.indexOf('תיאור');
      if (descIdx === -1) descIdx = headers.indexOf('description');
      if (descIdx === -1) descIdx = headers.indexOf('details');
      
      let locIdx = headers.indexOf('מיקום');
      if (locIdx === -1) locIdx = headers.indexOf('location');
      if (locIdx === -1) locIdx = headers.indexOf('venue');
      
      const event = {
        startTime: stStr,
        endTime: etStr,
        title: titleIdx !== -1 ? String(row[titleIdx] || "").trim() : "",
        description: descIdx !== -1 ? String(row[descIdx] || "").trim() : "",
        location: locIdx !== -1 ? String(row[locIdx] || "").trim() : ""
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
              let personalMsg = String(data[i][msgIdx] || "").trim();
              if (personalMsg) {
                const parts = personalMsg.split(',');
                parts.forEach((part, pIdx) => {
                  let trimmed = part.trim();
                  if (trimmed) {
                    try {
                      trimmed = LanguageApp.translate(trimmed, '', 'en');
                    } catch(e) {}
                    
                    updates.push({
                      type: 'personal',
                      message: trimmed,
                      timestamp: new Date().getTime() + pIdx,
                      timestampStr: "Just now"
                    });
                  }
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
              const parts = msg.split(',');
              parts.forEach((part, pIdx) => {
                let trimmed = part.trim();
                  if (trimmed) {
                    try {
                      trimmed = LanguageApp.translate(trimmed, '', 'en');
                    } catch(e) {}
                    
                    updates.push({
                    type: 'global',
                    message: trimmed,
                    timestamp: new Date().getTime() - (data.length - i) - (pIdx * 0.1),
                    timestampStr: "Announcement"
                  });
                }
              });
            }
          }
        }
      }
    }
    
    // Sort updates (personal first, then global by order)
    const globalUpdates = updates.filter(u => u.type === 'global').reverse(); // Newest first
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
    const getSheetData = (sheetName) => {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return null;
      const data = sheet.getDataRange().getValues();
      return data.map(row => row.map(cell => (cell instanceof Date) ? Utilities.formatDate(cell, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm') : cell));
    };
    
    return {
      success: true,
      guests: getSheetData(CONFIG.MASTER_SHEET),
      flights: getSheetData(CONFIG.FLIGHTS_SHEET),
      hotelJlm: getSheetData(CONFIG.JERUSALEM_SHEET),
      hotelTlv: getSheetData(CONFIG.TELAVIV_SHEET),
      infoSheet: getSheetData('מידע כללי'),
      dashboardStats: getSheetData('דשבורד הפקה')
    };
  } catch (err) {
    return { success: false, message: 'Server Error: ' + err.toString() };
  }
}

/**
 * Update personal message for a guest (Admin Only)
 */
function updatePersonalMessage(sessionToken, guestEmail, message) {
  try {
    const sessionRes = validateSession(sessionToken);
    if (!sessionRes.success) return sessionRes;
    
    const cleanAdminEmail = sessionRes.email;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    if (!masterSheet) return { success: false, message: 'Master sheet not found.' };
    
    const data = masterSheet.getDataRange().getValues();
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
    
    if (headerRowIdx === -1) return { success: false, message: 'Header not found.' };
    const roleIdx = headers.indexOf("תפקיד");
    const msgIdx = headers.indexOf("הודעה אישית בפורטל");
    
    if (msgIdx === -1) return { success: false, message: 'Column "הודעה אישית בפורטל" not found.' };
    
    let isAdmin = false;
    let guestRow = -1;
    
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const email = String(data[i][emailIdx] || "").trim().toLowerCase();
      if (email === cleanAdminEmail) {
        if (roleIdx !== -1 && String(data[i][roleIdx]).trim() === "הפקה חשיפה") {
          isAdmin = true;
        }
      }
      if (email === String(guestEmail).trim().toLowerCase()) {
        guestRow = i + 1; // 1-indexed for SpreadsheetApp
      }
    }
    
    if (!isAdmin) return { success: false, message: 'Unauthorized. Admins only.' };
    if (guestRow === -1) return { success: false, message: 'Guest not found.' };
    
    masterSheet.getRange(guestRow, msgIdx + 1).setValue(message);
    return { success: true, message: 'Message updated successfully.' };
  } catch (err) {
    return { success: false, message: 'Server Error: ' + err.toString() };
  }
}

/**
 * Send a global alert (Admin Only)
 */
function sendAdminAlert(sessionToken, message) {
  try {
    const sessionRes = validateSession(sessionToken);
    if (!sessionRes.success) return sessionRes;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Verify Admin
    const guestsSheet = ss.getSheetByName(CONFIG.MASTER_SHEET);
    const data = guestsSheet.getDataRange().getValues();
    
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, data.length); r++) {
      if (data[r].some(cell => String(cell).trim().toLowerCase() === CONFIG.EMAIL_COL.toLowerCase())) {
        headerRowIdx = r;
        break;
      }
    }
    if (headerRowIdx === -1) return { success: false, message: "Headers not found" };
    
    const headers = data[headerRowIdx].map(h => String(h).trim().toLowerCase());
    const emailIdx = headers.indexOf(CONFIG.EMAIL_COL.toLowerCase());
    const roleIdx = headers.indexOf("תפקיד");
    
    let isAdmin = false;
    for (let i = headerRowIdx + 1; i < data.length; i++) {
      if (String(data[i][emailIdx]).trim().toLowerCase() === sessionRes.email) {
        if (roleIdx !== -1 && String(data[i][roleIdx]).trim() === "הפקה חשיפה") {
          isAdmin = true;
        }
        break;
      }
    }
    
    if (!isAdmin) return { success: false, message: "Unauthorized. Admin only." };
    
    // 2. Add message to 'מידע כללי' -> 'הודעה לכולם'
    const infoSheet = ss.getSheetByName('מידע כללי');
    if (!infoSheet) return { success: false, message: "'מידע כללי' sheet missing." };
    
    const infoData = infoSheet.getDataRange().getValues();
    const infoHeaders = infoData[0].map(h => String(h).trim());
    const msgIdx = infoHeaders.indexOf('הודעה לכולם');
    if (msgIdx === -1) return { success: false, message: "Column not found." };
    
    let targetRow = infoData.length + 1;
    for (let i = 1; i < infoData.length; i++) {
      if (!String(infoData[i][msgIdx]).trim()) {
        targetRow = i + 1;
        break;
      }
    }
    
    infoSheet.getRange(targetRow, msgIdx + 1).setValue(message);
    
    return { success: true };
    
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
