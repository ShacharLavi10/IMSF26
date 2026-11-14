/**
 * Exposure Festival 2026 - Production Operations AI Assistant API
 */

function askProductionAssistant(userPrompt, conversationHistory) {
  try {
    if (!userPrompt || typeof userPrompt !== 'string' || !userPrompt.trim()) {
      return { success: false, answer: "נא לכתוב שאלה כדי שאוכל לעזור." };
    }

    const cleanPrompt = userPrompt.trim();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Gather all live operational datasets
    const opsData = getOpsDataSummary(ss);

    // 2. Fast deterministic matches for common urgent field queries
    const fastAnswer = checkFastDeterministicAnswer(cleanPrompt, opsData);
    if (fastAnswer) {
      return { success: true, answer: fastAnswer, source: "fast_cache" };
    }

    // 3. Call Gemini AI with full context
    const aiAnswer = callOpsGemini(cleanPrompt, conversationHistory, opsData);
    return { success: true, answer: aiAnswer, source: "gemini_ai" };

  } catch (err) {
    console.error("Error in askProductionAssistant:", err);
    return { 
      success: false, 
      answer: "התרחשה שגיאה בעיבוד השאלה: " + err.toString() 
    };
  }
}

/**
 * Gather live operational data from Google Sheets
 */
function getOpsDataSummary(ss) {
  const summary = {
    guests: [],
    flights: [],
    hotelJlm: [],
    hotelTlv: [],
    productionSchedule: [],
    festivalSchedule: []
  };

  // 1. Master Guests
  const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET || "אורחים");
  if (masterSheet) {
    const data = masterSheet.getDataRange().getValues();
    const disp = masterSheet.getDataRange().getDisplayValues();
    if (data.length > 1) {
      const h = data[0].map(c => String(c).trim().toLowerCase());
      const getVal = (r, name) => {
        const idx = h.indexOf(name.toLowerCase());
        return idx !== -1 ? String(disp[r][idx] || data[r][idx] || "").trim() : "";
      };
      for (let r = 1; r < data.length; r++) {
        const email = getVal(r, "מייל אורח");
        if (email) {
          summary.guests.push({
            name: `${getVal(r, "שם פרטי")} ${getVal(r, "שם משפחה")}`.trim(),
            email: email,
            country: getVal(r, "מדינה"),
            company: getVal(r, "שם חברה"),
            role: getVal(r, "תפקיד"),
            phone: getVal(r, "טלפון"),
            genre: getVal(r, "ז'אנר"),
            notes: getVal(r, "הערות")
          });
        }
      }
    }
  }

  // 2. Flights
  const flightsSheet = findSheetFuzzy(ss, ["טבלת טיסות - שיקוף", "טבלת טיסות", CONFIG.FLIGHTS_SHEET]);
  if (flightsSheet) {
    const data = flightsSheet.getDataRange().getValues();
    const disp = flightsSheet.getDataRange().getDisplayValues();
    if (data.length > 1) {
      for (let r = 1; r < data.length; r++) {
        const email = String(disp[r][0] || data[r][0] || "").trim();
        if (email && email !== "מייל אורח") {
          summary.flights.push({
            name: `${disp[r][2] || data[r][2] || ""} ${disp[r][1] || data[r][1] || ""}`.trim(),
            email: email,
            arrDate: String(disp[r][3] || data[r][3] || "").trim(),
            arrTime: String(disp[r][4] || data[r][4] || "").trim(),
            arrFlight: String(disp[r][5] || data[r][5] || "").trim(),
            arrAirline: String(disp[r][6] || data[r][6] || "").trim(),
            depDate: String(disp[r][7] || data[r][7] || "").trim(),
            depTime: String(disp[r][8] || data[r][8] || "").trim(),
            depFlight: String(disp[r][9] || data[r][9] || "").trim(),
            depAirline: String(disp[r][10] || data[r][10] || "").trim(),
            shuttle: String(disp[r][11] || data[r][11] || "").trim(),
            togetherWith: String(disp[r][12] || data[r][12] || "").trim(),
            ticketLink: String(disp[r][13] || data[r][13] || "").trim()
          });
        }
      }
    }
  }

  // 3. Hotels
  const parseHotel = (sheetName, cityLabel) => {
    const s = ss.getSheetByName(sheetName);
    if (!s) return [];
    const data = s.getDataRange().getValues();
    const disp = s.getDataRange().getDisplayValues();
    if (data.length < 3) return [];
    const h = data[1].map(c => String(c).trim());
    const emailIdx = h.findIndex(c => c.includes("מייל"));
    const fnIdx = h.findIndex(c => c.includes("פרטי"));
    const lnIdx = h.findIndex(c => c.includes("משפחה"));
    const nightsIdx = h.findIndex(c => c.includes("כמות לילות"));
    const arrDateIdx = h.findIndex(c => c.includes("תאריך הגעה"));
    const depDateIdx = h.findIndex(c => c.includes("תאריך יציאה"));
    const roomIdx = h.findIndex(c => c.includes("סוג חדר"));
    const extraNightsIdx = h.findIndex(c => c.includes("לילות על חשבון האורח"));
    const extraPayIdx = h.findIndex(c => c.includes("על חשבון האורח") && (c.includes("סכום") || c.includes("סה")));
    const notesIdx = h.findIndex(c => c.includes("הערות"));

    const list = [];
    for (let r = 2; r < data.length; r++) {
      const email = emailIdx !== -1 ? String(disp[r][emailIdx] || "").trim() : "";
      if (email && email.includes("@")) {
        const extraPayStr = extraPayIdx !== -1 ? String(disp[r][extraPayIdx] || data[r][extraPayIdx] || "").trim() : "";
        const numPay = parseFloat(extraPayStr.replace(/[^0-9.-]/g, "")) || 0;
        list.push({
          city: cityLabel,
          name: `${fnIdx !== -1 ? disp[r][fnIdx] : ""} ${lnIdx !== -1 ? disp[r][lnIdx] : ""}`.trim(),
          email: email,
          arrDate: arrDateIdx !== -1 ? String(disp[r][arrDateIdx] || "").trim() : "",
          depDate: depDateIdx !== -1 ? String(disp[r][depDateIdx] || "").trim() : "",
          roomType: roomIdx !== -1 ? String(disp[r][roomIdx] || "").trim() : "",
          totalNights: nightsIdx !== -1 ? String(disp[r][nightsIdx] || "").trim() : "",
          extraNights: extraNightsIdx !== -1 ? String(disp[r][extraNightsIdx] || "").trim() : "",
          extraPaymentDue: numPay > 0 ? `${numPay} ₪` : "0 ₪",
          notes: notesIdx !== -1 ? String(disp[r][notesIdx] || "").trim() : ""
        });
      }
    }
    return list;
  };

  summary.hotelJlm = parseHotel(CONFIG.JERUSALEM_SHEET || "מלונות ירושלים", "ירושלים (ארתור)");
  summary.hotelTlv = parseHotel(CONFIG.TELAVIV_SHEET || "מלונות תל אביב", "תל אביב (סינמה)");

  // 4. Production Schedule
  const prodSchedSheet = ss.getSheetByName("לוז הפקה") || ss.getSheetByName('לו"ז הפקה');
  if (prodSchedSheet) {
    const data = prodSchedSheet.getDataRange().getValues();
    const disp = prodSchedSheet.getDataRange().getDisplayValues();
    for (let r = 1; r < data.length; r++) {
      if (disp[r][3] || data[r][3]) {
        summary.productionSchedule.push({
          day: disp[r][0] || data[r][0] || "",
          date: disp[r][1] || data[r][1] || "",
          time: disp[r][2] || data[r][2] || "",
          task: disp[r][3] || data[r][3] || "",
          location: disp[r][4] || data[r][4] || "",
          contact: disp[r][5] || data[r][5] || "",
          notes: disp[r][6] || data[r][6] || "",
          category: disp[r][7] || data[r][7] || ""
        });
      }
    }
  }

  return summary;
}

/**
 * Fast deterministic regex checks for instant exact responses
 */
function checkFastDeterministicAnswer(prompt, data) {
  const p = prompt.toLowerCase();

  // Check 1: Extra hotel payments ("חובות למלון", "אקסטרה למלון", "צריך לשלם")
  if ((p.includes("אקסטרה") || p.includes("חוב") || p.includes("לשלם")) && (p.includes("מלון") || p.includes("מלונות"))) {
    const jlmOwing = data.hotelJlm.filter(h => h.extraPaymentDue !== "0 ₪");
    const tlvOwing = data.hotelTlv.filter(h => h.extraPaymentDue !== "0 ₪");

    if (jlmOwing.length === 0 && tlvOwing.length === 0) {
      return "✅ לפי רישומי המלונות, אין כרגע אורחים שחייבים תשלום אקסטרה.";
    }

    let out = "### 🏨 רשימת אורחים עם תשלום אקסטרה למלון:\n\n";
    if (jlmOwing.length > 0) {
      out += "**📍 מלון ארתור (ירושלים):**\n";
      jlmOwing.forEach(g => {
        out += `* **${g.name}** (${g.email}): **${g.extraPaymentDue}** (חדר: ${g.roomType || 'יחיד'}${g.extraNights ? `, ${g.extraNights} לילות אקסטרה` : ''})\n`;
      });
      out += "\n";
    }
    if (tlvOwing.length > 0) {
      out += "**📍 מלון סינמה (תל אביב):**\n";
      tlvOwing.forEach(g => {
        out += `* **${g.name}** (${g.email}): **${g.extraPaymentDue}** (חדר: ${g.roomType || 'יחיד'}${g.extraNights ? `, ${g.extraNights} לילות אקסטרה` : ''})\n`;
      });
    }
    return out;
  }

  return null;
}

/**
 * Call Gemini AI with full operations data context
 */
function callOpsGemini(userPrompt, conversationHistory, opsData) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in Script Properties");
  }

  const systemInstruction = `
אתה העוזר הלוגיסטי והתפעולי הבכיר של פסטיבל חשיפה בינלאומית למוזיקה 2026 (Israel Music Showcase Festival - IMSF 2026).
אתה מדבר ישירות עם שחר לביא וצוות ההפקה של הפסטיבל.

תפקידך:
לענות לשאלות ההפקה בצורה מדויקת ב-100%, תמציתית, ברורה וקריאה מאוד בנייד (בעברית).

חוקי ברזל:
1. התבסס אך ורק על מאגר המידע התפעולי המצורף כאן למטה.
2. כששואלים על טיסות או אירועים ביום מסוים (למשל: "מי טס ב-23/11?"), מיין אותם כרונולוגית לפי שעה (מהבוקר ללילה). ציין: שעת טיסה, שם האורח, מדינה וחברה (אם יש), מספר טיסה, חברת תעופה, ושיוך לשאטל.
3. כששואלים על אדם ספציפי, ציין את כל פרטיו הלוגיסטיים: תפקיד, מדינה, חברה, מלונות בירושלים/ת"א, מועדי טיסות, וטלפון ליצירת קשר.
4. אם משהו לא מוגדר באקסלים (למשל שיוך לשאטל ריק), ציין במפורש "טרם שובץ".
5. השתמש בעיצוב Markdown נקי: כותרות קצרות, רשימות עם תבליטים (*), הדגשות (**שם**), ואימוג'ים מתאימים.

מאגר המידע התפעולי של הפסטיבל (Live Snapshot):
${JSON.stringify(opsData)}
`;

  const contents = [];
  
  // Previous turns if provided
  if (Array.isArray(conversationHistory)) {
    conversationHistory.slice(-4).forEach(msg => {
      if (msg && msg.role && msg.text) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(msg.text) }]
        });
      }
    });
  }

  // Current turn with user prompt
  contents.push({
    role: 'user',
    parts: [{ text: userPrompt }]
  });

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: contents,
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 2048
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  // Waterfall of active Gemini models
  const models = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash"];
  let lastErr = "";

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = UrlFetchApp.fetch(endpoint, options);
      const resCode = response.getResponseCode();
      const resJson = JSON.parse(response.getContentText());

      if (resCode === 200 && resJson.candidates && resJson.candidates[0] && resJson.candidates[0].content) {
        const textPart = resJson.candidates[0].content.parts[0].text;
        return textPart;
      } else {
        lastErr = resJson.error ? (resJson.error.message || JSON.stringify(resJson.error)) : `HTTP ${resCode}`;
        Logger.log(`Gemini ${model} failed: ${lastErr}`);
      }
    } catch (e) {
      lastErr = e.toString();
      Logger.log(`Gemini ${model} exception: ${lastErr}`);
    }
  }

  throw new Error("כל מודלי ה-AI נכשלו: " + lastErr);
}
