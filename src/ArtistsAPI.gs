function getArtistsData(forceRefresh) {
  try {
    const ssId = CONFIG.ARTISTS_SPREADSHEET_ID;
    if (!ssId) return { success: false, message: "Artists spreadsheet not configured." };

    const cache = CacheService.getScriptCache();
    const cacheKey = 'global_artists_data_v2_' + ssId;
    
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return { success: true, artists: JSON.parse(cached) };
      }
    }
    
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName("בשיקוף! - מידע אומנים") || 
                  ss.getSheetByName("שיקוף! - מידע אומנים") || 
                  (CONFIG.ARTISTS_SHEET_NAME && ss.getSheetByName(CONFIG.ARTISTS_SHEET_NAME)) || 
                  ss.getSheetByName("מידע אומנים") || 
                  ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    if (data.length < 2) return { success: true, artists: [] };
    
    const headers = data[0].map(h => String(h).trim());
    
    const idxNameEn = headers.indexOf("שם האמן באנגלית");
    const idxBioEn = headers.indexOf("קומוניקט באנגלית");
    const idxMembersEn = headers.indexOf("חברי ההרכב באנגלית (Name – Role/Instrument)");
    const idxImage = headers.indexOf("תמונת יח״צ");
    const idxSpotify = headers.indexOf("Spotify");
    const idxFacebook = headers.indexOf("Facebook");
    const idxInstagram = headers.indexOf("Instagram");
    const idxYoutube1 = headers.indexOf("קישור YouTube 1");
    const idxYoutube2 = headers.indexOf("קישור YouTube 2");
    const idxGenre = headers.findIndex(h => h === "ז'אנר" || h === "ז׳אנר" || h.includes("ז'אנר") || h.includes("ז׳אנר") || h.toLowerCase() === "genre");
    let idxContactName = headers.indexOf("איש/אשת קשר באנגלית");
    if (idxContactName < 0) {
      idxContactName = headers.findIndex(h => h.includes("איש/אשת קשר באנגלית") || (h.toLowerCase().includes("contact") && !h.toLowerCase().includes("email")));
    }
    if (idxContactName < 0) {
      idxContactName = headers.findIndex(h => h.includes("איש/אשת קשר") || h.includes("איש קשר"));
    }
    const idxContactEmail = headers.findIndex(h => h === "דוא״ל" || h === "דוא\"ל" || h === "דוא'ל" || h.includes("דוא") || h.toLowerCase() === "email" || h.toLowerCase().includes("email"));
    
    const artists = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const name = idxNameEn >= 0 ? String(row[idxNameEn]).trim() : "";
      if (!name) continue;
      
      let imageUrl = idxImage >= 0 ? String(row[idxImage]).trim() : "";
      if (imageUrl.includes("drive.google.com")) {
        const match = imageUrl.match(/[-\w]{25,}/);
        if (match) {
          imageUrl = "https://drive.google.com/thumbnail?id=" + match[0] + "&sz=w800";
        }
      }

      const artist = {
        id: "artist_" + i,
        name: name,
        genre: idxGenre >= 0 ? String(row[idxGenre]).trim() : "",
        contactName: idxContactName >= 0 ? String(row[idxContactName]).trim() : "",
        contactEmail: idxContactEmail >= 0 ? String(row[idxContactEmail]).trim() : "",
        image: imageUrl,
        bio: idxBioEn >= 0 ? String(row[idxBioEn]).trim() : "",
        members: idxMembersEn >= 0 ? String(row[idxMembersEn]).trim() : "",
        socialLinks: []
      };
      
      const spotify = idxSpotify >= 0 ? String(row[idxSpotify]).trim() : "";
      const fb = idxFacebook >= 0 ? String(row[idxFacebook]).trim() : "";
      const ig = idxInstagram >= 0 ? String(row[idxInstagram]).trim() : "";
      const yt1 = idxYoutube1 >= 0 ? String(row[idxYoutube1]).trim() : "";
      const yt2 = idxYoutube2 >= 0 ? String(row[idxYoutube2]).trim() : "";
      
      if (spotify) artist.socialLinks.push({ label: "Spotify", url: spotify });
      if (ig) artist.socialLinks.push({ label: "Instagram", url: ig });
      if (fb) artist.socialLinks.push({ label: "Facebook", url: fb });
      if (yt1) artist.socialLinks.push({ label: "YouTube 1", url: yt1 });
      if (yt2) artist.socialLinks.push({ label: "YouTube 2", url: yt2 });
      
      artists.push(artist);
    }
    
    try {
      // Store in cache for 5 minutes (300 seconds)
      cache.put(cacheKey, JSON.stringify(artists), 300);
    } catch (e) {
      // Ignore cache limit errors if data is too large
    }
    
    return { success: true, artists: artists };
  } catch (err) {
    return { success: false, message: "Error fetching artists: " + err.toString() };
  }
}

/**
 * Retrieve guest profile info from Master Sheet ('אורחים')
 */
function getGuestDetailsFromMaster(email) {
  const result = { fullName: "", country: "", companyBio: "", role: "", companyName: "" };
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = ss.getSheetByName(CONFIG.MASTER_SHEET || "אורחים");
    if (!masterSheet) return result;

    const data = masterSheet.getDataRange().getValues();
    if (data.length < 2) return result;

    const headers = data[0].map(h => String(h).trim().toLowerCase());
    const emailIdx = headers.indexOf((CONFIG.EMAIL_COL || "מייל אורח").toLowerCase());
    const firstIdx = headers.indexOf("שם פרטי");
    const lastIdx = headers.indexOf("שם משפחה");
    const countryIdx = headers.indexOf("מדינה");
    const roleIdx = headers.indexOf("תפקיד");
    const companyIdx = headers.indexOf("שם חברה");
    const bioIdx = headers.indexOf("ביוגרפיה אנגלית");

    const cleanEmail = email.toLowerCase().trim();
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (row[emailIdx] && String(row[emailIdx]).trim().toLowerCase() === cleanEmail) {
        const first = firstIdx >= 0 ? String(row[firstIdx]).trim() : "";
        const last = lastIdx >= 0 ? String(row[lastIdx]).trim() : "";
        result.fullName = (first + " " + last).trim();
        result.country = countryIdx >= 0 ? String(row[countryIdx]).trim() : "";
        result.role = roleIdx >= 0 ? String(row[roleIdx]).trim() : "";
        result.companyName = companyIdx >= 0 ? String(row[companyIdx]).trim() : "";
        result.companyBio = bioIdx >= 0 ? String(row[bioIdx]).trim() : result.companyName;
        break;
      }
    }
  } catch (err) {
    console.error("Error in getGuestDetailsFromMaster:", err);
  }
  return result;
}

/**
 * Save Guest Feedback (Favorites, Notes, and Quick Intent Tags)
 */
function saveGuestArtistFeedback(email, feedbackPayload) {
  try {
    if (!email) return { success: false, message: "Email is required." };
    const cleanEmail = email.toString().trim().toLowerCase();

    const ssId = CONFIG.ARTISTS_SPREADSHEET_ID;
    if (!ssId) return { success: false, message: "Artists spreadsheet not configured." };
    const ss = SpreadsheetApp.openById(ssId);

    // 1. Locate or create 'העדפות אורחים' sheet
    const prefSheetName = CONFIG.GUEST_PREFERENCES_SHEET || "העדפות אורחים";
    let prefSheet = ss.getSheetByName(prefSheetName) || ss.getSheetByName("הערות אורחים");
    const defaultHeaders = [
      "מייל אורח", "שם מלא", "מדינה", "מה החברה עושה", "תפקיד",
      "סטטוס פעילות", "אומנים שאהב (❤️)", "הזמנות להופעה (🎯 Booking)",
      "בקשות לקשר (🤝 Connect)", "עיתונות וסיקור (📰 Press)", "כללי (General)", "סה\"כ לייקים (❤️)",
      "הערות אורח", "Raw Data"
    ];

    if (!prefSheet) {
      prefSheet = ss.insertSheet(prefSheetName);
      prefSheet.appendRow(defaultHeaders);
      prefSheet.setFrozenRows(1);
    }

    // 2. Locate or create 'לידים והזדמנויות אומנים' sheet
    const leadsSheetName = CONFIG.ARTIST_LEADS_SHEET || "לידים והזדמנויות אומנים";
    let leadsSheet = ss.getSheetByName(leadsSheetName);
    if (!leadsSheet) {
      leadsSheet = ss.insertSheet(leadsSheetName);
      leadsSheet.appendRow([
        "שם האמן", "ז'אנר", "פוטנציאל סיבוב הופעות (Tour Match)",
        "מדינות מתעניינות", "בוקרים להופעה (🎯 Booking)",
        "בקשות לקשר (🤝 Connect)", "עיתונות וסיקור (📰 Press)", "כללי (General)",
        "סה\"כ לייקים (❤️)", "הערות אורחים", "Raw Data"
      ]);
      leadsSheet.setFrozenRows(1);
    }

    // Get guest details from master sheet
    const guestInfo = getGuestDetailsFromMaster(cleanEmail);

    // Build artists map
    const artistsRes = getArtistsData(false);
    const artistsList = (artistsRes && artistsRes.artists) ? artistsRes.artists : [];
    const artistMap = {};
    artistsList.forEach(a => { artistMap[a.id] = a; });

    // Parse payload
    const payload = (typeof feedbackPayload === "string") ? JSON.parse(feedbackPayload) : (feedbackPayload || {});
    const favorites = payload.favorites || {};
    const notes = payload.notes || {};
    const tags = payload.tags || {};

    const favNames = [];
    const bookingNames = [];
    const connectNames = [];
    const pressNames = [];
    const generalNames = [];
    const notesList = [];

    Object.keys(favorites).forEach(aId => {
      if (favorites[aId]) {
        const a = artistMap[aId] || { name: aId };
        favNames.push(a.name);
      }
    });

    Object.keys(tags).forEach(aId => {
      const tList = tags[aId] || [];
      const a = artistMap[aId] || { name: aId };
      if (tList.includes("Booking")) bookingNames.push(a.name);
      if (tList.includes("Connect")) connectNames.push(a.name);
      if (tList.includes("Press")) pressNames.push(a.name);
      if (tList.includes("General")) generalNames.push(a.name);
    });

    Object.keys(notes).forEach(aId => {
      const noteText = (notes[aId] || "").trim();
      if (noteText) {
        const a = artistMap[aId] || { name: aId };
        notesList.push(`[${a.name}]: ${noteText}`);
      }
    });

    const totalLiked = favNames.length;
    const activityStatus = totalLiked > 0 ? `🟢 פעיל (${totalLiked} אומנים)` : `🔴 טרם סימן אומנים`;

    const rawJson = JSON.stringify({
      favorites: favorites,
      notes: notes,
      tags: tags,
      updatedAt: new Date().toISOString()
    });

    // Inspect existing headers dynamically
    let headers = prefSheet.getRange(1, 1, 1, Math.max(prefSheet.getLastColumn(), defaultHeaders.length)).getValues()[0];
    if (!headers[0]) {
      prefSheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
      headers = defaultHeaders;
    }

    const colMap = {};
    headers.forEach((h, idx) => {
      const headerStr = String(h).trim().toLowerCase();
      if (headerStr.includes("מייל")) colMap.email = idx;
      else if (headerStr.includes("שם מלא")) colMap.fullName = idx;
      else if (headerStr.includes("מדינה")) colMap.country = idx;
      else if (headerStr.includes("חברה") || headerStr.includes("עושה")) colMap.companyBio = idx;
      else if (headerStr.includes("תפקיד")) colMap.role = idx;
      else if (headerStr.includes("סטטוס")) colMap.status = idx;
      else if (headerStr.includes("אומנים שאהב") || (headerStr.includes("אהב") && headerStr.includes("❤️"))) colMap.favs = idx;
      else if (headerStr.includes("booking") || headerStr.includes("הזמנות להופעה")) colMap.booking = idx;
      else if (headerStr.includes("connect") || headerStr.includes("בקשות לקשר")) colMap.connect = idx;
      else if (headerStr.includes("press") || headerStr.includes("עיתונות")) colMap.press = idx;
      else if (headerStr.includes("general") || headerStr.includes("כללי")) colMap.general = idx;
      else if ((headerStr.includes("סה\"כ") || headerStr.includes("סה״כ")) && headerStr.includes("לייקים")) colMap.totalLikes = idx;
      else if (headerStr.includes("הערות")) colMap.notes = idx;
      else if (headerStr.includes("raw")) colMap.raw = idx;
    });

    // If sheet had old 11 columns and is missing the new ones, update headers row to defaultHeaders
    if (colMap.press === undefined || colMap.totalLikes === undefined) {
      prefSheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
      headers = defaultHeaders;
      defaultHeaders.forEach((h, idx) => {
        const headerStr = String(h).trim().toLowerCase();
        if (headerStr.includes("מייל")) colMap.email = idx;
        else if (headerStr.includes("שם מלא")) colMap.fullName = idx;
        else if (headerStr.includes("מדינה")) colMap.country = idx;
        else if (headerStr.includes("חברה") || headerStr.includes("עושה")) colMap.companyBio = idx;
        else if (headerStr.includes("תפקיד")) colMap.role = idx;
        else if (headerStr.includes("סטטוס")) colMap.status = idx;
        else if (headerStr.includes("אומנים שאהב") || (headerStr.includes("אהב") && headerStr.includes("❤️"))) colMap.favs = idx;
        else if (headerStr.includes("booking") || headerStr.includes("הזמנות להופעה")) colMap.booking = idx;
        else if (headerStr.includes("connect") || headerStr.includes("בקשות לקשר")) colMap.connect = idx;
        else if (headerStr.includes("press") || headerStr.includes("עיתונות")) colMap.press = idx;
        else if (headerStr.includes("general") || headerStr.includes("כללי")) colMap.general = idx;
        else if ((headerStr.includes("סה\"כ") || headerStr.includes("סה״כ")) && headerStr.includes("לייקים")) colMap.totalLikes = idx;
        else if (headerStr.includes("הערות")) colMap.notes = idx;
        else if (headerStr.includes("raw")) colMap.raw = idx;
      });
    }

    // Build row values strictly matching column layout
    const rowValues = new Array(headers.length).fill("");
    if (colMap.email !== undefined) rowValues[colMap.email] = cleanEmail;
    if (colMap.fullName !== undefined) rowValues[colMap.fullName] = guestInfo.fullName;
    if (colMap.country !== undefined) rowValues[colMap.country] = guestInfo.country;
    if (colMap.companyBio !== undefined) rowValues[colMap.companyBio] = guestInfo.companyBio;
    if (colMap.role !== undefined) rowValues[colMap.role] = guestInfo.role;
    if (colMap.status !== undefined) rowValues[colMap.status] = activityStatus;
    if (colMap.favs !== undefined) rowValues[colMap.favs] = favNames.join(", ");
    if (colMap.booking !== undefined) rowValues[colMap.booking] = bookingNames.join(", ");
    if (colMap.connect !== undefined) rowValues[colMap.connect] = connectNames.join(", ");
    if (colMap.press !== undefined) rowValues[colMap.press] = pressNames.join(", ");
    if (colMap.general !== undefined) rowValues[colMap.general] = generalNames.join(", ");
    if (colMap.totalLikes !== undefined) rowValues[colMap.totalLikes] = totalLiked;
    if (colMap.notes !== undefined) rowValues[colMap.notes] = notesList.join("\n\n");
    if (colMap.raw !== undefined) rowValues[colMap.raw] = rawJson;

    // Write / Update row in prefSheet
    const prefData = prefSheet.getDataRange().getValues();
    let guestRowIdx = -1;
    const emailColIdx = (colMap.email !== undefined) ? colMap.email : 0;
    for (let r = 1; r < prefData.length; r++) {
      if (String(prefData[r][emailColIdx]).trim().toLowerCase() === cleanEmail) {
        guestRowIdx = r + 1;
        break;
      }
    }

    if (guestRowIdx > 0) {
      prefSheet.getRange(guestRowIdx, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      prefSheet.appendRow(rowValues);
    }

    // Synchronize the Artist Leads sheet
    syncArtistLeadsSheet(ss, prefSheet, leadsSheet, artistsList);

    return { success: true, message: "Feedback saved successfully." };
  } catch (err) {
    console.error("Error in saveGuestArtistFeedback:", err);
    return { success: false, message: "Error saving feedback: " + err.toString() };
  }
}

/**
 * Retrieve saved feedback for a specific guest
 */
function getGuestArtistFeedback(email) {
  try {
    if (!email) return { success: false, message: "Email required." };
    const cleanEmail = email.toString().trim().toLowerCase();

    const ssId = CONFIG.ARTISTS_SPREADSHEET_ID;
    if (!ssId) return { success: false, message: "Artists spreadsheet not configured." };
    const ss = SpreadsheetApp.openById(ssId);

    const prefSheetName = CONFIG.GUEST_PREFERENCES_SHEET || "העדפות אורחים";
    const prefSheet = ss.getSheetByName(prefSheetName) || ss.getSheetByName("הערות אורחים");
    if (!prefSheet) {
      return { success: true, feedback: { favorites: {}, notes: {}, tags: {} } };
    }

    const data = prefSheet.getDataRange().getValues();
    if (data.length < 2) {
      return { success: true, feedback: { favorites: {}, notes: {}, tags: {} } };
    }

    const headers = data[0];
    let rawJsonIdx = headers.findIndex(h => String(h).trim().toLowerCase().includes("raw"));
    if (rawJsonIdx === -1) rawJsonIdx = headers.length - 1;

    let emailIdx = headers.findIndex(h => String(h).trim().toLowerCase().includes("מייל"));
    if (emailIdx === -1) emailIdx = 0;

    for (let r = 1; r < data.length; r++) {
      if (String(data[r][emailIdx]).trim().toLowerCase() === cleanEmail) {
        const rawJsonCol = data[r][rawJsonIdx];
        if (rawJsonCol) {
          try {
            const parsed = JSON.parse(rawJsonCol);
            return { success: true, feedback: parsed };
          } catch (e) {}
        }
        break;
      }
    }
    return { success: true, feedback: { favorites: {}, notes: {}, tags: {} } };
  } catch (err) {
    console.error("Error in getGuestArtistFeedback:", err);
    return { success: false, message: err.toString() };
  }
}

/**
 * Recalculate and update the 'לידים והזדמנויות אומנים' sheet
 */
function syncArtistLeadsSheet(ss, prefSheet, leadsSheet, artistsList) {
  try {
    const prefData = (prefSheet && prefSheet.getLastRow() > 0) ? prefSheet.getDataRange().getValues() : [];
    const hasPreferences = prefData.length > 1;

    // Aggregates per artistId
    // artistId -> { likes: 0, countries: {}, booking: [], connect: [], press: [], notes: [] }
    const agg = {};
    artistsList.forEach(a => {
      agg[a.id] = {
        name: a.name,
        genre: a.genre || "",
        likes: 0,
        countries: {},
        booking: [],
        connect: [],
        press: [],
        general: [],
        notes: []
      };
    });

    if (hasPreferences) {
      const headers = prefData[0];
      let rawJsonIdx = headers.findIndex(h => String(h).trim().toLowerCase().includes("raw"));
      if (rawJsonIdx === -1) rawJsonIdx = headers.length - 1;

      let emailIdx = headers.findIndex(h => String(h).trim().toLowerCase().includes("מייל"));
      if (emailIdx === -1) emailIdx = 0;

      let nameIdx = headers.findIndex(h => String(h).trim().includes("שם מלא"));
      if (nameIdx === -1) nameIdx = 1;

      let countryIdx = headers.findIndex(h => String(h).trim().includes("מדינה"));
      if (countryIdx === -1) countryIdx = 2;

      let roleIdx = headers.findIndex(h => String(h).trim().includes("תפקיד"));
      let companyIdx = headers.findIndex(h => String(h).trim().includes("חברה") || String(h).trim().includes("עושה"));

      for (let r = 1; r < prefData.length; r++) {
        const row = prefData[r];
        const cleanEmail = String(row[emailIdx] || "").trim();
        const guestName = String(row[nameIdx] || "").trim();
        const country = String(row[countryIdx] || "").trim();
        const company = String((roleIdx >= 0 && row[roleIdx]) || (companyIdx >= 0 && row[companyIdx]) || "").trim();
        const rawJson = row[rawJsonIdx];
        if (!rawJson) continue;

        let payload = null;
        try { payload = JSON.parse(rawJson); } catch (e) { continue; }

        const favs = payload.favorites || {};
        const notes = payload.notes || {};
        const tags = payload.tags || {};

        const displayName = guestName || cleanEmail;
        const delegateLabel = country 
          ? `${displayName} (${country}${company ? " - " + company : ""})` 
          : `${displayName}${company ? " (" + company + ")" : ""}`;

        Object.keys(favs).forEach(aId => {
          if (favs[aId] && agg[aId]) {
            agg[aId].likes++;
            if (country) {
              agg[aId].countries[country] = (agg[aId].countries[country] || 0) + 1;
            }
          }
        });

        Object.keys(tags).forEach(aId => {
          if (!agg[aId]) return;
          const tList = tags[aId] || [];
          if (tList.includes("Booking")) agg[aId].booking.push(delegateLabel);
          if (tList.includes("Connect")) agg[aId].connect.push(delegateLabel);
          if (tList.includes("Press")) agg[aId].press.push(delegateLabel);
          if (tList.includes("General")) agg[aId].general.push(delegateLabel);
        });

        Object.keys(notes).forEach(aId => {
          if (!agg[aId]) return;
          const text = (notes[aId] || "").trim();
          if (text) {
            agg[aId].notes.push(`[${delegateLabel}]: ${text}`);
          }
        });
      }
    }

    // Inspect existing leads headers dynamically
    const leadsLastCol = leadsSheet.getLastColumn();
    let leadsHeaders = (leadsLastCol > 0)
      ? leadsSheet.getRange(1, 1, 1, leadsLastCol).getValues()[0]
      : [];

    const lColMap = {};
    leadsHeaders.forEach((h, idx) => {
      const s = String(h).trim().toLowerCase();
      if (s.includes("שם") && s.includes("אמן")) lColMap.name = idx;
      else if (s.includes("ז'אנר") || s.includes("זאנר")) lColMap.genre = idx;
      else if (s.includes("טור") || s.includes("סיבוב") || s.includes("match")) lColMap.tour = idx;
      else if (s.includes("מדינות")) lColMap.countries = idx;
      else if (s.includes("booking") || s.includes("בוקרים") || s.includes("הזמנות")) lColMap.booking = idx;
      else if (s.includes("connect") || s.includes("קשר")) lColMap.connect = idx;
      else if (s.includes("press") || s.includes("עיתונות")) lColMap.press = idx;
      else if (s.includes("general") || s.includes("כללי")) lColMap.general = idx;
      else if (s.includes("לייקים") || s.includes("סה\"כ") || s.includes("סה״כ")) lColMap.likes = idx;
      else if (s.includes("הערות")) lColMap.notes = idx;
      else if (s.includes("raw")) lColMap.raw = idx;
    });

    const rowsToWrite = [];
    artistsList.forEach(a => {
      const data = agg[a.id];
      const countryKeys = Object.keys(data.countries);
      const countryBreakdown = countryKeys.map(c => `${c} (${data.countries[c]})`).join(", ");

      let tourPotential = "⚪ ללא עניין בינתיים";
      if (countryKeys.length >= 2) {
        tourPotential = `🟢 חם: ${countryKeys.join(", ")}`;
      } else if (countryKeys.length === 1) {
        tourPotential = `🟡 עניין מקומי: ${countryKeys[0]}`;
      }

      if (leadsHeaders.length > 0 && Object.keys(lColMap).length >= 4) {
        const row = new Array(leadsHeaders.length).fill("");
        if (lColMap.name !== undefined) row[lColMap.name] = data.name;
        if (lColMap.genre !== undefined) row[lColMap.genre] = data.genre;
        if (lColMap.tour !== undefined) row[lColMap.tour] = tourPotential;
        if (lColMap.countries !== undefined) row[lColMap.countries] = countryBreakdown;
        if (lColMap.booking !== undefined) row[lColMap.booking] = data.booking.join("\n");
        if (lColMap.connect !== undefined) row[lColMap.connect] = data.connect.join("\n");
        if (lColMap.press !== undefined) row[lColMap.press] = data.press.join("\n");
        if (lColMap.general !== undefined) row[lColMap.general] = data.general.join("\n");
        if (lColMap.likes !== undefined) row[lColMap.likes] = data.likes;
        if (lColMap.notes !== undefined) row[lColMap.notes] = data.notes.join("\n\n");
        if (lColMap.raw !== undefined) row[lColMap.raw] = JSON.stringify({ likes: data.likes, countries: data.countries, bookingCount: data.booking.length });
        rowsToWrite.push(row);
      } else {
        rowsToWrite.push([
          data.name,
          data.genre,
          tourPotential,
          countryBreakdown,
          data.booking.join("\n"),
          data.connect.join("\n"),
          data.press.join("\n"),
          data.general.join("\n"),
          data.likes,
          data.notes.join("\n\n"),
          JSON.stringify({ likes: data.likes, countries: data.countries, bookingCount: data.booking.length })
        ]);
      }
    });

    if (rowsToWrite.length > 0) {
      // Clear previous rows starting from row 2
      const maxRows = leadsSheet.getMaxRows();
      const maxCols = leadsSheet.getMaxColumns();
      if (maxRows > 1) {
        leadsSheet.getRange(2, 1, maxRows - 1, maxCols).clearContent();
      }
      leadsSheet.getRange(2, 1, rowsToWrite.length, rowsToWrite[0].length).setValues(rowsToWrite);
    }
  } catch (err) {
    console.error("Error in syncArtistLeadsSheet:", err);
  }
}

/**
 * Endpoint for the Admin Production Dashboard
 */
function getAdminArtistsNetworkingData() {
  try {
    const ssId = CONFIG.ARTISTS_SPREADSHEET_ID;
    if (!ssId) return { success: false, message: "Artists spreadsheet not configured." };
    const ss = SpreadsheetApp.openById(ssId);

    const leadsSheetName = CONFIG.ARTIST_LEADS_SHEET || "לידים והזדמנויות אומנים";
    let leadsSheet = ss.getSheetByName(leadsSheetName);
    const prefSheetName = CONFIG.GUEST_PREFERENCES_SHEET || "העדפות אורחים";
    const prefSheet = ss.getSheetByName(prefSheetName) || ss.getSheetByName("הערות אורחים");

    let artistsLeads = [];
    if (leadsSheet && leadsSheet.getLastRow() > 1) {
      const data = leadsSheet.getDataRange().getValues();
      const lHeaders = data[0];
      const lMap = {};
      lHeaders.forEach((h, idx) => {
        const s = String(h).trim().toLowerCase();
        if (s.includes("שם") && s.includes("אמן")) lMap.name = idx;
        else if (s.includes("ז'אנר") || s.includes("זאנר")) lMap.genre = idx;
        else if (s.includes("טור") || s.includes("סיבוב") || s.includes("match")) lMap.tour = idx;
        else if (s.includes("מדינות")) lMap.countries = idx;
        else if (s.includes("booking") || s.includes("בוקרים") || s.includes("הזמנות")) lMap.booking = idx;
        else if (s.includes("connect") || s.includes("קשר")) lMap.connect = idx;
        else if (s.includes("press") || s.includes("עיתונות")) lMap.press = idx;
        else if (s.includes("general") || s.includes("כללי")) lMap.general = idx;
        else if (s.includes("לייקים") || s.includes("סה\"כ") || s.includes("סה״כ")) lMap.likes = idx;
        else if (s.includes("הערות")) lMap.notes = idx;
      });

      for (let r = 1; r < data.length; r++) {
        const row = data[r];
        if (!row[0]) continue;
        artistsLeads.push({
          name: String((lMap.name !== undefined ? row[lMap.name] : row[0]) || "").trim(),
          genre: String((lMap.genre !== undefined ? row[lMap.genre] : row[1]) || "").trim(),
          tourPotential: String((lMap.tour !== undefined ? row[lMap.tour] : row[2]) || "").trim(),
          countries: String((lMap.countries !== undefined ? row[lMap.countries] : row[3]) || "").trim(),
          bookingLeads: String((lMap.booking !== undefined ? row[lMap.booking] : row[4]) || "").trim(),
          connectLeads: String((lMap.connect !== undefined ? row[lMap.connect] : row[5]) || "").trim(),
          pressLeads: String((lMap.press !== undefined ? row[lMap.press] : row[6]) || "").trim(),
          generalLeads: String((lMap.general !== undefined ? row[lMap.general] : "") || "").trim(),
          likesCount: Number((lMap.likes !== undefined ? row[lMap.likes] : row[7]) || 0),
          notes: String((lMap.notes !== undefined ? row[lMap.notes] : row[8]) || "").trim()
        });
      }
    }

    // Auto-populate if leads sheet is empty
    if (artistsLeads.length === 0) {
      syncAllArtistsAndLeads();
      leadsSheet = ss.getSheetByName(leadsSheetName);
      if (leadsSheet && leadsSheet.getLastRow() > 1) {
        const data = leadsSheet.getDataRange().getValues();
        const lHeaders = data[0];
        const lMap = {};
        lHeaders.forEach((h, idx) => {
          const s = String(h).trim().toLowerCase();
          if (s.includes("שם") && s.includes("אמן")) lMap.name = idx;
          else if (s.includes("ז'אנר") || s.includes("זאנר")) lMap.genre = idx;
          else if (s.includes("טור") || s.includes("סיבוב") || s.includes("match")) lMap.tour = idx;
          else if (s.includes("מדינות")) lMap.countries = idx;
          else if (s.includes("booking") || s.includes("בוקרים") || s.includes("הזמנות")) lMap.booking = idx;
          else if (s.includes("connect") || s.includes("קשר")) lMap.connect = idx;
          else if (s.includes("press") || s.includes("עיתונות")) lMap.press = idx;
          else if (s.includes("general") || s.includes("כללי")) lMap.general = idx;
          else if (s.includes("לייקים") || s.includes("סה\"כ") || s.includes("סה״כ")) lMap.likes = idx;
          else if (s.includes("הערות")) lMap.notes = idx;
        });

        for (let r = 1; r < data.length; r++) {
          const row = data[r];
          if (!row[0]) continue;
          artistsLeads.push({
            name: String((lMap.name !== undefined ? row[lMap.name] : row[0]) || "").trim(),
            genre: String((lMap.genre !== undefined ? row[lMap.genre] : row[1]) || "").trim(),
            tourPotential: String((lMap.tour !== undefined ? row[lMap.tour] : row[2]) || "").trim(),
            countries: String((lMap.countries !== undefined ? row[lMap.countries] : row[3]) || "").trim(),
            bookingLeads: String((lMap.booking !== undefined ? row[lMap.booking] : row[4]) || "").trim(),
            connectLeads: String((lMap.connect !== undefined ? row[lMap.connect] : row[5]) || "").trim(),
            pressLeads: String((lMap.press !== undefined ? row[lMap.press] : row[6]) || "").trim(),
            generalLeads: String((lMap.general !== undefined ? row[lMap.general] : "") || "").trim(),
            likesCount: Number((lMap.likes !== undefined ? row[lMap.likes] : row[7]) || 0),
            notes: String((lMap.notes !== undefined ? row[lMap.notes] : row[8]) || "").trim()
          });
        }
      }
    }

    const guestsPreferences = [];
    const inactiveGuests = [];
    if (prefSheet && prefSheet.getLastRow() > 1) {
      const pData = prefSheet.getDataRange().getValues();
      const headers = pData[0];
      const colMap = {};
      headers.forEach((h, idx) => {
        const s = String(h).trim().toLowerCase();
        if (s.includes("מייל")) colMap.email = idx;
        else if (s.includes("שם מלא")) colMap.fullName = idx;
        else if (s.includes("מדינה")) colMap.country = idx;
        else if (s.includes("חברה") || s.includes("עושה")) colMap.company = idx;
        else if (s.includes("תפקיד")) colMap.role = idx;
        else if (s.includes("סטטוס")) colMap.status = idx;
        else if (s.includes("אהב") || s.includes("❤️")) colMap.favs = idx;
        else if (s.includes("booking") || s.includes("הזמנות")) colMap.booking = idx;
        else if (s.includes("connect") || s.includes("קשר")) colMap.connect = idx;
        else if (s.includes("press") || s.includes("עיתונות")) colMap.press = idx;
        else if (s.includes("general") || s.includes("כללי")) colMap.general = idx;
        else if (s.includes("לייקים")) colMap.totalLikes = idx;
        else if (s.includes("הערות")) colMap.notes = idx;
      });

      for (let r = 1; r < pData.length; r++) {
        const row = pData[r];
        const email = String((colMap.email !== undefined ? row[colMap.email] : row[0]) || "").trim();
        const fullName = String((colMap.fullName !== undefined ? row[colMap.fullName] : row[1]) || "").trim();
        if (!email && !fullName) continue;

        const status = String((colMap.status !== undefined ? row[colMap.status] : row[5]) || "").trim();
        const guestObj = {
          email: email,
          name: fullName || email,
          country: String((colMap.country !== undefined ? row[colMap.country] : row[2]) || "").trim(),
          company: String((colMap.company !== undefined ? row[colMap.company] : row[3]) || "").trim(),
          role: String((colMap.role !== undefined ? row[colMap.role] : row[4]) || "").trim(),
          status: status,
          favs: String((colMap.favs !== undefined ? row[colMap.favs] : row[6]) || "").trim(),
          booking: String((colMap.booking !== undefined ? row[colMap.booking] : row[7]) || "").trim(),
          connect: String((colMap.connect !== undefined ? row[colMap.connect] : row[8]) || "").trim(),
          press: String((colMap.press !== undefined ? row[colMap.press] : row[9]) || "").trim(),
          general: String((colMap.general !== undefined ? row[colMap.general] : "") || "").trim(),
          totalLikes: Number((colMap.totalLikes !== undefined ? row[colMap.totalLikes] : row[10]) || 0),
          notes: String((colMap.notes !== undefined ? row[colMap.notes] : row[11]) || "").trim()
        };

        guestsPreferences.push(guestObj);

        if (status.includes("טרם סימן")) {
          inactiveGuests.push({
            email: email,
            name: fullName,
            country: guestObj.country,
            company: guestObj.company,
            role: guestObj.role
          });
        }
      }
    }

    return {
      success: true,
      artistsLeads: artistsLeads,
      guestsPreferences: guestsPreferences,
      inactiveGuests: inactiveGuests
    };
  } catch (err) {
    console.error("Error in getAdminArtistsNetworkingData:", err);
    return { success: false, message: err.toString() };
  }
}

/**
 * Run a full recalculation and sync of all artist leads from guest preferences.
 * Can be called manually from Apps Script or from the Production Dashboard.
 */
function syncAllArtistsAndLeads() {
  try {
    const ssId = CONFIG.ARTISTS_SPREADSHEET_ID;
    if (!ssId) return { success: false, message: "Artists spreadsheet not configured." };

    // 1. Clear server-side artists cache
    CacheService.getScriptCache().remove('global_artists_data_' + ssId);
    CacheService.getScriptCache().remove('global_artists_data_v2');

    const ss = SpreadsheetApp.openById(ssId);

    const prefSheetName = CONFIG.GUEST_PREFERENCES_SHEET || "העדפות אורחים";
    let prefSheet = ss.getSheetByName(prefSheetName) || ss.getSheetByName("הערות אורחים");
    
    // Check active spreadsheet fallback
    if (!prefSheet) {
      try {
        const activeSs = SpreadsheetApp.getActiveSpreadsheet();
        if (activeSs && activeSs.getId() !== ss.getId()) {
          prefSheet = activeSs.getSheetByName(prefSheetName) || activeSs.getSheetByName("הערות אורחים");
        }
      } catch (e) {}
    }

    const leadsSheetName = CONFIG.ARTIST_LEADS_SHEET || "לידים והזדמנויות אומנים";
    let leadsSheet = ss.getSheetByName(leadsSheetName);
    if (!leadsSheet) {
      try {
        const activeSs = SpreadsheetApp.getActiveSpreadsheet();
        if (activeSs && activeSs.getId() !== ss.getId()) {
          leadsSheet = activeSs.getSheetByName(leadsSheetName);
        }
      } catch (e) {}
    }

    if (!leadsSheet) {
      leadsSheet = ss.insertSheet(leadsSheetName);
      leadsSheet.appendRow([
        "שם האמן", "ז'אנר", "פוטנציאל סיבוב הופעות (Tour Match)",
        "מדינות מתעניינות", "בוקרים להופעה (🎯 Booking)",
        "בקשות לקשר (🤝 Connect)", "עיתונות וסיקור (📰 Press)",
        "סה\"כ לייקים (❤️)", "הערות אורחים", "Raw Data"
      ]);
      leadsSheet.setFrozenRows(1);
    }

    const artistsRes = getArtistsData(true);
    const artistsList = (artistsRes && artistsRes.artists) ? artistsRes.artists : [];

    if (prefSheet && leadsSheet) {
      // Backfill any missing columns in prefSheet if headers exist
      if (prefSheet.getLastRow() > 1) {
        const pData = prefSheet.getDataRange().getValues();
        const headers = pData[0];
        const colMap = {};
        headers.forEach((h, idx) => {
          const headerStr = String(h).trim().toLowerCase();
          if (headerStr.includes("מייל")) colMap.email = idx;
          else if (headerStr.includes("press") || headerStr.includes("עיתונות")) colMap.press = idx;
          else if (headerStr.includes("general") || headerStr.includes("כללי")) colMap.general = idx;
          else if ((headerStr.includes("סה\"כ") || headerStr.includes("סה״כ")) && headerStr.includes("לייקים")) colMap.totalLikes = idx;
          else if (headerStr.includes("raw")) colMap.raw = idx;
        });

        if (colMap.raw !== undefined && (colMap.press !== undefined || colMap.general !== undefined || colMap.totalLikes !== undefined)) {
          const artistMap = {};
          artistsList.forEach(a => { artistMap[a.id] = a; });
          for (let r = 1; r < pData.length; r++) {
            const rawJson = pData[r][colMap.raw];
            if (!rawJson) continue;
            try {
              const parsed = JSON.parse(rawJson);
              const favs = parsed.favorites || {};
              const tags = parsed.tags || {};
              
              const totalLiked = Object.keys(favs).filter(k => !!favs[k]).length;
              const pressNames = [];
              const generalNames = [];
              Object.keys(tags).forEach(aId => {
                const tList = tags[aId] || [];
                if (tList.includes("Press")) {
                  const a = artistMap[aId] || { name: aId };
                  pressNames.push(a.name);
                }
                if (tList.includes("General")) {
                  const a = artistMap[aId] || { name: aId };
                  generalNames.push(a.name);
                }
              });

              if (colMap.press !== undefined) {
                prefSheet.getRange(r + 1, colMap.press + 1).setValue(pressNames.join(", "));
              }
              if (colMap.general !== undefined) {
                prefSheet.getRange(r + 1, colMap.general + 1).setValue(generalNames.join(", "));
              }
              if (colMap.totalLikes !== undefined) {
                prefSheet.getRange(r + 1, colMap.totalLikes + 1).setValue(totalLiked);
              }
            } catch(e) {}
          }
        }
      }

      syncArtistLeadsSheet(ss, prefSheet, leadsSheet, artistsList);
    }

    return { 
      success: true, 
      message: "Sync complete! All artist leads and preferences have been recalculated.",
      artistsCount: artistsList.length
    };
  } catch (err) {
    console.error("Error in syncAllArtistsAndLeads:", err);
    return { success: false, message: err.toString() };
  }
}

/**
 * Dynamic parser for the Shows Timetable directly from 'שיקוף! - מבנה ליינאפ'
 */
function getFestivalTimetableSchedule(forceRefresh) {
  try {
    const ssId = CONFIG.LINEUP_SPREADSHEET_ID || CONFIG.ARTISTS_SPREADSHEET_ID || "13YI3oIHCt2OfIC3K3HyS54u_RrJ-Hii3NZedM3OtqvQ";
    if (!ssId) return { success: false, message: "Lineup spreadsheet not configured." };

    const cache = CacheService.getScriptCache();
    const cacheKey = 'festival_timetable_schedule_v8_' + ssId;
    if (forceRefresh) {
      try { 
        cache.remove(cacheKey);
        cache.remove('festival_timetable_schedule_v7_' + ssId);
        cache.remove('festival_timetable_schedule_latest');
      } catch(e) {}
    } else {
      const cached = cache.get(cacheKey);
      if (cached) {
        return { success: true, schedule: JSON.parse(cached) };
      }
    }

    // Force fresh data reading from Google Sheets
    try {
      SpreadsheetApp.flush();
    } catch(e) {}

    const ss = SpreadsheetApp.openById(ssId);
    let lineupSheet = ss.getSheetByName("שיקוף! - מבנה ליינאפ") || 
                      ss.getSheetByName("מבנה ליינאפ") ||
                      ss.getSheets().find(s => s.getName().includes("ליינאפ") || s.getName().includes("מבנה"));

    if (!lineupSheet) {
      return { success: false, message: "Lineup sheet not found." };
    }

    const grid = lineupSheet.getDataRange().getDisplayValues();
    const artistsRes = getArtistsData(false);
    const artistsList = (artistsRes && artistsRes.success && Array.isArray(artistsRes.artists)) ? artistsRes.artists : [];
    const parsedSchedule = parseLineupGrid(grid, artistsList);

    try {
      cache.put(cacheKey, JSON.stringify(parsedSchedule), 60); // 60 seconds cache for rapid live synchronization
    } catch(e) {}

    return { 
      success: true, 
      schedule: parsedSchedule,
      updatedAt: new Date().toISOString(),
      sourceSheetId: ssId
    };
  } catch(err) {
    console.error("Error in getFestivalTimetableSchedule:", err);
    return { success: false, message: "Error parsing timetable: " + err.toString() };
  }
}

/**
 * Inspection function to diagnose raw cells and parsing
 */
function getLineupInspection() {
  try {
    const ssId = CONFIG.LINEUP_SPREADSHEET_ID || "13YI3oIHCt2OfIC3K3HyS54u_RrJ-Hii3NZedM3OtqvQ";
    const ss = SpreadsheetApp.openById(ssId);
    let sheet = ss.getSheetByName("שיקוף! - מבנה ליינאפ") || ss.getSheetByName("מבנה ליינאפ");
    if (!sheet) return { success: false, message: "Sheet not found" };
    const grid = sheet.getDataRange().getDisplayValues();
    const artistsRes = getArtistsData(false);
    const artistsList = (artistsRes && artistsRes.artists) ? artistsRes.artists : [];
    
    // Check all cells where any text exists
    const dayConfigs = [
      { day: 'Tue', date: '2026-11-17', colArtist: 0, colTime: 1 },
      { day: 'Wed', date: '2026-11-18', colArtist: 3, colTime: 4 },
      { day: 'Thu', date: '2026-11-19', colArtist: 6, colTime: 7 },
      { day: 'Fri', date: '2026-11-20', colArtist: 9, colTime: 10 },
      { day: 'Sat', date: '2026-11-21', colArtist: 12, colTime: 13 },
      { day: 'Sun', date: '2026-11-22', colArtist: 15, colTime: 16 }
    ];

    const rawDayRows = [];
    dayConfigs.forEach(cfg => {
      const items = [];
      for (let r = 0; r < grid.length; r++) {
        const row = grid[r] || [];
        const artistCell = (cfg.colArtist < row.length) ? String(row[cfg.colArtist] || '').trim() : '';
        const timeCell = (cfg.colTime < row.length) ? String(row[cfg.colTime] || '').trim() : '';
        if (artistCell || timeCell) {
          items.push({ row: r + 1, artist: artistCell, time: timeCell });
        }
      }
      rawDayRows.push({ day: cfg.day, date: cfg.date, items: items });
    });

    const parsed = parseLineupGrid(grid, artistsList);

    return {
      success: true,
      gridRows: grid.length,
      gridCols: grid[0] ? grid[0].length : 0,
      rawDayRows: rawDayRows,
      parsedCount: parsed.length,
      parsed: parsed
    };
  } catch(err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Cache invalidation for real-time timetable updates
 */
function clearTimetableCache() {
  try {
    const cache = CacheService.getScriptCache();
    const ids = [
      CONFIG.ARTISTS_SPREADSHEET_ID,
      CONFIG.LINEUP_SPREADSHEET_ID,
      "13YI3oIHCt2OfIC3K3HyS54u_RrJ-Hii3NZedM3OtqvQ",
      "11X8f1o6f5PWVYcNfwEHuvYr2l_-OPEx44riEz3HjbVo"
    ];
    ids.forEach(id => {
      if (id) {
        try {
          cache.remove('festival_timetable_schedule_v8_' + id);
          cache.remove('festival_timetable_schedule_v7_' + id);
          cache.remove('global_artists_data_v2_' + id);
        } catch(e) {}
      }
    });
    cache.remove('festival_timetable_schedule_latest');
    PropertiesService.getScriptProperties().setProperty('LINEUP_LAST_MODIFIED', String(Date.now()));
    Logger.log("✅ Timetable cache cleared successfully");
    return { success: true, message: "Timetable cache cleared." };
  } catch(e) {
    Logger.log("Error clearing timetable cache: " + e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Event listener triggered on edit or change in the Artists / Lineup spreadsheet
 */
function handleArtistsSheetChange(e) {
  Logger.log("⚡ handleArtistsSheetChange triggered");
  clearTimetableCache();
  try {
    // If running in sandbox and lineup is edited in prod, sync to sandbox sheet too
    if (CONFIG.ARTISTS_SPREADSHEET_ID && CONFIG.LINEUP_SPREADSHEET_ID && CONFIG.ARTISTS_SPREADSHEET_ID !== CONFIG.LINEUP_SPREADSHEET_ID) {
      syncLineupToSandboxSheet();
    }
  } catch(err) {
    Logger.log("Error in auto-sync to sandbox: " + err);
  }
}

/**
 * Copies the live lineup sheet from the main Artists 26 spreadsheet into the Sandbox mock sheet
 */
function syncLineupToSandboxSheet() {
  try {
    const mainSsId = CONFIG.LINEUP_SPREADSHEET_ID || "13YI3oIHCt2OfIC3K3HyS54u_RrJ-Hii3NZedM3OtqvQ";
    const sandboxSsId = CONFIG.ARTISTS_SPREADSHEET_ID || "11X8f1o6f5PWVYcNfwEHuvYr2l_-OPEx44riEz3HjbVo";
    if (mainSsId === sandboxSsId) return { success: true, message: "Same spreadsheet, no sync needed." };

    const sourceSs = SpreadsheetApp.openById(mainSsId);
    const targetSs = SpreadsheetApp.openById(sandboxSsId);
    const sourceSheet = sourceSs.getSheetByName("שיקוף! - מבנה ליינאפ");
    if (!sourceSheet) return { success: false, message: "Source lineup sheet not found." };

    let targetSheet = targetSs.getSheetByName("שיקוף! - מבנה ליינאפ");
    if (!targetSheet) {
      targetSheet = targetSs.insertSheet("שיקוף! - מבנה ליינאפ");
    }

    const data = sourceSheet.getDataRange().getValues();
    if (data && data.length > 0) {
      targetSheet.clear();
      targetSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
      Logger.log("✅ Successfully synced 'שיקוף! - מבנה ליינאפ' from Prod to Sandbox sheet!");
    }
    return { success: true, rows: data.length };
  } catch(e) {
    Logger.log("syncLineupToSandboxSheet error: " + e.toString());
    return { success: false, error: e.toString() };
  }
}

function parseLineupTime(str) {
  if (!str) return { start: '', end: '' };
  const s = String(str).trim();
  const matchRange = s.match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/);
  if (matchRange) {
    return { start: matchRange[1].padStart(5, '0'), end: matchRange[2].padStart(5, '0') };
  }
  const matchSingle = s.match(/(\d{1,2}:\d{2})/);
  if (matchSingle) {
    return { start: matchSingle[1].padStart(5, '0'), end: '' };
  }
  return { start: '', end: '' };
}

function getTimetableSortMinutes(timeStr) {
  if (!timeStr) return 9999;
  const match = String(timeStr).match(/(\d{1,2}):(\d{2})/);
  if (!match) return 9999;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 6) {
    h += 24;
  }
  return h * 60 + m;
}

const ARTIST_NAME_ALIASES_DICT = {
  'דניאל זמיר וזהר פרסקו': 'Daniel Zamir & Zohar Fresco',
  'יונתן אבישי אנסמבל': 'Yonathan Avishai Ensemble',
  'האחים קדוש': 'The Kadosh Brothers',
  'מארק אליהו': 'Mark Eliyahu',
  'קדמון': 'KADMON',
  'אמיתי אריכא ופרויקט ה-d-one': 'Amitai Aricha @ The D-ONE Project',
  'אמיתי אריכא': 'Amitai Aricha @ The D-ONE Project',
  'קרן אילן': 'Keren Ilan',
  'יעל דקלבאום': 'Yael Deckelbaum',
  'יונתן טגר': 'Yonatan Tagger',
  'יונתן תגר': 'Yonatan Tagger',
  'שלישיית אלון ניר': 'Alon Near Trio',
  'אלון ניר': 'Alon Near Trio',
  'תזמורת הגאז הישראלית': 'The Israel Jazz Orchestra',
  'הזאבות': "HAZE'EVOT",
  'הדזאבות': "HAZE'EVOT",
  'ביטפוט': 'BĘÃTFÓØT',
  'beatfoot': 'BĘÃTFÓØT',
  'שן': 'SHEN',
  'שירן ובקל': 'SHIRAN&BAKAL',
  'מאגי': 'MAGI',
  'דה פריטי פליז': 'The Pretty Please',
  'בוגי בלגן': 'Boogie Balagan',
  'פורטמן טי': 'Portman-T',
  'שי חזן': 'Shay Hazan - DAWA',
  'dawa': 'Shay Hazan - DAWA',
  'שלוש': 'SHALOSH',
  'תמר שאוקי': 'Tamar Shawki',
  'שלישיית אריאל ברט': 'Ariel Bart Trio',
  'אריאל ברט': 'Ariel Bart Trio',
  'איל נצר': 'Eyal Netzer & Strings',
  'אייל נצר': 'Eyal Netzer & Strings',
  'סנדיה': 'Sandia',
  'כבשים מרחפות': 'Floating Sheep',
  'מיתריי': 'Meitarai',
  'מאיה בלזיצמן ומתן אפרת': 'Maya Belsitzman & Matan Ephrat',
  'מאיה בלזיצמן': 'Maya Belsitzman & Matan Ephrat',
  'תמיר גרינברג': 'Tamir Grinberg',
  'שיר שני': 'Shir Shani',
  'אבירם': 'AVIRAM',
  'אלן טיון': 'Allan Tune',
  'יוז': 'YUZ',
  'טאפש': 'TAPASH',
  'אדיס קן': 'The Addis Ken Project',
  'פרויקט אדיס קן': 'The Addis Ken Project',
  'רביעיית ניגון': 'Nigun Quartet',
  'איתמר דוארי': 'Itamar Doari',
  'דסווה': 'Deswa',
  'deswa': 'Deswa',
  "ג'וזף אי שיין": 'Joseph E-Shine',
  'joseph e shine': 'Joseph E-Shine',
  'בילטיז': 'BILTEEZ\n(Ester Rada, Daniel Zamir, & Michael Meital)',
  'bilteez': 'BILTEEZ\n(Ester Rada, Daniel Zamir, & Michael Meital)',
  'עדן דרסו': 'Eden Derso',
  'eden derso': 'Eden Derso',
  'אנסמבל פיל ביית': 'FeelBeat Ensemble',
  'אנסמבל פיל בית': 'FeelBeat Ensemble',
  'פיל בית': 'FeelBeat Ensemble',
  'פילבט': 'FeelBeat Ensemble',
  'feelbeat': 'FeelBeat Ensemble',
  'feelbeat ensemble': 'FeelBeat Ensemble',
  'רם מלכה': 'DJ Ram Malca',
  'dj ram malca': 'DJ Ram Malca',
  'fortuna records': 'Fortuna Records',
  'פורטונה רקורדס': 'Fortuna Records',
  'פורטונה': 'Fortuna Records',
  'שאמן שאמן': 'Shaman Shaman Ensemble',
  'shaman shaman': 'Shaman Shaman Ensemble',
  'שיווה ביווה': 'SHIWABIWA B2B ISC',
  'shiwabiwa': 'SHIWABIWA B2B ISC',
  'דיגיי עדי ברקת': 'DJ Adi Bareket',
  'עדי ברקת': 'DJ Adi Bareket',
  'dj adi bareket': 'DJ Adi Bareket',
  'הפיראטיות': 'Las Piratas Piratas',
  'פיראטיות': 'Las Piratas Piratas',
  'אפטר בנוקטורנו הפיראטיות': 'Las Piratas Piratas',
  'אפטר בנוקטורנו': 'Las Piratas Piratas',
  'las piratas piratas': 'Las Piratas Piratas',
  'piratas': 'Las Piratas Piratas'
};

function normalizeArtistString(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[ę]/g, 'e').replace(/[ãáàâä]/g, 'a').replace(/[óòôö]/g, 'o').replace(/[øö]/g, 'o')
    .replace(/['"״׳`]/g, '')
    .replace(/[\-–—@&(),.\n\r]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findMatchedArtistBackend(artistName, artistsList) {
  if (!artistName) return null;
  const queries = [artistName];

  for (const q of queries) {
    const normQ = normalizeArtistString(q);
    if (ARTIST_NAME_ALIASES_DICT[normQ]) {
      const targetName = normalizeArtistString(ARTIST_NAME_ALIASES_DICT[normQ]);
      if (artistsList && artistsList.length > 0) {
        const match = artistsList.find(a => normalizeArtistString(a.name) === targetName);
        if (match) return match;
      }
    }
    for (const [key, val] of Object.entries(ARTIST_NAME_ALIASES_DICT)) {
      if (normQ.includes(key) || key.includes(normQ)) {
        const targetName = normalizeArtistString(val);
        if (artistsList && artistsList.length > 0) {
          const match = artistsList.find(a => normalizeArtistString(a.name) === targetName);
          if (match) return match;
        }
      }
    }
  }

  if (artistsList && artistsList.length > 0) {
    const cleanQueries = queries.map(q => normalizeArtistString(q));
    for (const a of artistsList) {
      const normA = normalizeArtistString(a.name);
      for (const q of cleanQueries) {
        if (!q) continue;
        if (normA === q) return a;
        if (q.length >= 4 && (normA.includes(q) || q.includes(normA))) {
          return a;
        }
      }
    }
  }
  return null;
}

function isNamedDJ(rawName, matchedArtist) {
  if (!rawName) return false;
  const s = String(rawName).trim();
  const lower = s.toLowerCase();

  // Exclude generic placeholders or notes
  if (/^[\s?؟!\-–—.,/\\|]+$/.test(s)) return false;
  if (lower === 'dj' || lower === 'dj?' || lower === 'dj ?' || lower === "דיג'יי" || lower === "דיגיי" || lower === "דיג'ייס" || lower === "תקלוט") {
    return false;
  }
  if (s === 'נועם הלפר' || s === 'רמזי' || s === 'מור' || s === 'אליענה') {
    return false;
  }

  // 1. If matched artist has 'dj' in name (e.g. 'DJ Adi Bareket')
  if (matchedArtist && matchedArtist.name && matchedArtist.name.toLowerCase().includes('dj')) {
    return true;
  }

  // 2. If alias dictionary maps to a name with DJ (e.g. 'DJ Ram Malca')
  const norm = normalizeArtistString(s);
  if (ARTIST_NAME_ALIASES_DICT[norm] && ARTIST_NAME_ALIASES_DICT[norm].toLowerCase().includes('dj')) {
    return true;
  }
  for (const [key, val] of Object.entries(ARTIST_NAME_ALIASES_DICT)) {
    if (val.toLowerCase().includes('dj') && (norm.includes(key) || key.includes(norm))) {
      return true;
    }
  }

  // 3. If string explicitly starts with DJ / דיג'יי / דיגיי followed by a name
  const djNameMatch = s.match(/^(?:dj|דיג['׳]?[יי]?)\s+([A-Za-z\u0590-\u05FF]{2,})/i);
  if (djNameMatch) {
    const after = djNameMatch[1].trim().toLowerCase();
    if (after !== 'set' && after !== '?' && after !== 'יס' && after !== 'סט') {
      return true;
    }
  }

  return false;
}

function shouldKeepTimetableItem(show, artistsList) {
  if (!show || !show.artistName) return false;

  const raw = String(show.artistName).trim();
  const lower = raw.toLowerCase();

  const matched = findMatchedArtistBackend(raw, artistsList);
  const namedDJ = isNamedDJ(raw, matched);

  // If no start time: ONLY keep if it is a specific named DJ (e.g. DJ Adi Bareket, DJ Ram Malca)
  if (!show.startTime) {
    return namedDJ;
  }

  // 1. If it matches an artist, always keep!
  if (matched) return true;

  const normRaw = normalizeArtistString(raw);
  if (ARTIST_NAME_ALIASES_DICT[normRaw]) return true;
  for (const [key, val] of Object.entries(ARTIST_NAME_ALIASES_DICT)) {
    if (normRaw === normalizeArtistString(val) || normRaw.includes(key) || key.includes(normRaw)) {
      return true;
    }
  }

  // 2. Reject pure question marks or symbols: '?', '???', '?', etc.
  if (/^[\s?؟!\-–—.,/\\|]+$/.test(raw)) return false;

  // 3. Reject notes, random stages, or place comments
  if (
    raw.includes('מסתובבים') ||
    raw.includes('אפטרים') ||
    raw.includes('מזקקה') ||
    raw.includes('נוקטורנו') ||
    raw.includes('Besarabia') ||
    raw.includes('פרגמון') ||
    raw.includes('ש"ח') ||
    raw.includes('כרטיס משולב') ||
    raw.includes('כניסה חופשית') ||
    raw.includes('מופע ראשון') ||
    raw.includes('כחלק מפסטיבל') ||
    raw.includes('לדחות מופע') ||
    raw === "דיג'ייס" ||
    raw === 'נועם הלפר' || raw === 'רמזי' || raw === 'מור' || raw === 'אליענה'
  ) {
    return false;
  }

  // 4. Allowed general items with valid times:
  // - Doors opening: "דלתות", "פתיחת דלתות", "Doors"
  if (raw.includes('דלתות') || lower.includes('doors')) return true;

  // - DJ set: "DJ", "DJ?", "דיג'יי", "דיגיי", "תקלוט"
  if (
    raw.includes('DJ') || lower.includes('dj') ||
    raw.includes("דיג'יי") || raw.includes('דיגיי') || raw.includes('תקלוט')
  ) {
    return true;
  }

  // - Official reception / networking events / talks:
  if (
    raw.includes('קבלת פנים') ||
    raw.includes('נטוורקינג') ||
    raw.includes('הרצאה') ||
    raw.includes('מפגש') ||
    raw.includes('מופע ראשון') ||
    raw.includes('אירוע נעילה') ||
    raw.includes('הפסקה') ||
    raw.includes('Trade Fair') ||
    lower.includes('networking') ||
    lower.includes('reception') ||
    lower.includes('closing')
  ) {
    return true;
  }

  return false;
}

function parseLineupGrid(grid, artistsList) {
  if (!grid || grid.length < 5) return [];

  const dayConfigs = [
    { date: '2026-11-17', colArtist: 0, colTime: 1, defaultVenue: 'צוללת צהובה & חניון רח\' הרכבים' },
    { date: '2026-11-18', colArtist: 3, colTime: 4, defaultVenue: 'מוזיאון מגדל דוד & צוללת צהובה' },
    { date: '2026-11-19', colArtist: 6, colTime: 7, defaultVenue: 'מוזיאון הסובלנות | ירושלים' },
    { date: '2026-11-20', colArtist: 9, colTime: 10, defaultVenue: 'תדר | תל אביב' },
    { date: '2026-11-21', colArtist: 12, colTime: 13, defaultVenue: 'רדיקל & המרץ 2 | תל אביב' },
    { date: '2026-11-22', colArtist: 15, colTime: 16, defaultVenue: 'בית המכולות נמל יפו' }
  ];

  const stageMap = {
    'שוק דגים': 'Fish Market',
    'B2 - מרכזי': 'B2 Main Stage',
    'B2 מרכזי': 'B2 Main Stage',
    'גראנד הול 1': 'Grand Hall 1',
    'גראנד הול 2': 'Grand Hall 2',
    'גראנד הול מלא': 'Grand Hall Full',
    'חדר תפילה': 'Prayer Room',
    'אודיטוריום 400': 'Auditorium 400',
    'פלאזה': 'Plaza Stage',
    'אמפי': 'Amphi',
    'רחבה מרכזית': 'Main Plaza',
    'חואניטה': 'Juanita',
    'קיסה': 'Kissa',
    'מטמון': 'Matmon',
    'אולם גדול': 'Grand Hall',
    'קלאב': 'The Club',
    'חצר פסלים': 'Sculpture Yard',
    'חצר קדמית': 'Front Yard',
    'המרץ2': 'Hameretz 2',
    'המרץ 2': 'Hameretz 2',
    'חניון': 'Parking Lot',
    'אפטר': 'Aftershow',
    'מגדל דוד': 'Tower of David',
    'צוללת': 'Submarine Hall',
    'בית המכולות': 'Container House',
    'נוקטורנו': 'Nocturno Club'
  };

  const allShows = [];
  let showIndex = 1;

  dayConfigs.forEach(cfg => {
    let currentStage = 'Main Stage';
    let currentVenue = cfg.defaultVenue;

    for (let r = 3; r < grid.length; r++) {
      const row = grid[r] || [];
      const cellArtist = String(row[cfg.colArtist] || '').trim();
      
      // Determine time column safely
      let timeColIdx = cfg.colTime;
      if (timeColIdx >= row.length) {
        timeColIdx = cfg.colArtist + 1;
      }
      let cellTime = (timeColIdx < row.length) ? String(row[timeColIdx] || '').trim() : '';

      if (!cellArtist && !cellTime) continue;

      // Skip DJs list at bottom of Tuesday
      if (cfg.date === '2026-11-17' && r >= 43) continue;

      // Venue headers
      if (cellArtist.includes('|') && (cellArtist.includes('ירושלים') || cellArtist.includes('תל-אביב') || cellArtist.includes('תל אביב') || cellArtist.includes('יפו'))) {
        currentVenue = cellArtist;
        if (cellArtist.includes('חניון')) currentStage = 'Parking Lot';
        else if (cellArtist.includes('אפטר')) currentStage = 'Aftershow';
        else if (cellArtist.includes('מגדל דוד')) currentStage = 'Tower of David';
        else if (cellArtist.includes('צוללת')) currentStage = 'Submarine Hall';
        else if (cellArtist.includes('המרץ')) currentStage = 'Hameretz 2';
        else if (cellArtist.includes('מכולות')) currentStage = 'Container House';
        continue;
      }

      // Prices / info notes
      if (cellArtist.includes('ש"ח כניסה') || cellArtist.includes('כרטיס משולב') || cellArtist.includes('כניסה חופשית בהרשמה') || cellArtist.includes('כחלק מפסטיבל הג\'אז')) {
        continue;
      }

      // Stage headers (e.g. שוק דגים, B2 מרכזי, אולם גדול, קלאב...)
      let isStageHeader = false;
      for (const [sKey, sVal] of Object.entries(stageMap)) {
        if (cellArtist.includes(sKey) && !parseLineupTime(cellTime).start && !cellArtist.includes('&') && !cellArtist.includes('–')) {
          currentStage = sVal;
          isStageHeader = true;
          break;
        }
      }
      if (isStageHeader) continue;

      // Sunday special text block on row 5: Delegation Networking
      if (cfg.date === '2026-11-22' && cellArtist.includes('נטוורקינג:')) {
        allShows.push({
          id: 'show_' + cfg.date + '_' + (showIndex++),
          date: cfg.date,
          stage: 'Container House',
          startTime: '14:00',
          endTime: '16:00',
          artistName: 'Official Delegation Networking Event',
          format: 'Beit HaMecholot, Jaffa Port',
          isGeneralEvent: true
        });
        continue;
      }

      const timeObj = parseLineupTime(cellTime);
      
      // If no start time found in time column, check if time was accidentally inside cellArtist
      if (!timeObj.start) {
        const fallbackTime = parseLineupTime(cellArtist);
        if (fallbackTime.start) {
          timeObj.start = fallbackTime.start;
          timeObj.end = fallbackTime.end;
        }
      }

      let isGeneral = false;
      if (
        cellArtist.includes('דלתות') ||
        cellArtist.includes('קבלת פנים') ||
        cellArtist.includes('הפסקה') ||
        cellArtist.includes('מפגש') ||
        cellArtist.includes('הרצאה') ||
        cellArtist === 'DJ' || cellArtist === 'DJ?' || cellArtist.startsWith('DJ ') ||
        cellArtist.includes('תקלוט')
      ) {
        isGeneral = true;
      }

      const candidateShow = {
        id: 'show_' + cfg.date + '_' + (showIndex++),
        date: cfg.date,
        stage: currentStage,
        startTime: timeObj.start,
        endTime: timeObj.end,
        artistName: cellArtist,
        isGeneralEvent: isGeneral
      };

      if (cellArtist.includes('נוקטורנו') && (cellArtist.includes('פיראטי') || cellArtist.includes('הפיראטיות'))) {
        candidateShow.stage = 'Nocturno Club';
        candidateShow.artistName = 'Las Piratas Piratas';
      }

      if (shouldKeepTimetableItem(candidateShow, artistsList)) {
        // Translate to clean English (NO HEBREW)
        const matchedArtist = findMatchedArtistBackend(candidateShow.artistName, artistsList);
        if (matchedArtist) {
          candidateShow.artistName = matchedArtist.name;
          candidateShow.artistId = matchedArtist.id;
          candidateShow.matchedArtist = {
            id: matchedArtist.id,
            name: matchedArtist.name,
            image: matchedArtist.image,
            genre: matchedArtist.genre
          };
        } else {
          const norm = normalizeArtistString(candidateShow.artistName);
          if (ARTIST_NAME_ALIASES_DICT[norm]) {
            candidateShow.artistName = ARTIST_NAME_ALIASES_DICT[norm];
            const aliasMatch = artistsList.find(a => normalizeArtistString(a.name) === normalizeArtistString(candidateShow.artistName));
            if (aliasMatch) {
              candidateShow.artistId = aliasMatch.id;
              candidateShow.matchedArtist = {
                id: aliasMatch.id,
                name: aliasMatch.name,
                image: aliasMatch.image,
                genre: aliasMatch.genre
              };
            }
          } else {
            const lowerName = candidateShow.artistName.toLowerCase();
            if (candidateShow.artistName.includes('דלתות') || lowerName.includes('doors')) {
              candidateShow.artistName = 'Doors Opening';
              candidateShow.isGeneralEvent = true;
            } else if (candidateShow.artistName.includes('קבלת פנים')) {
              candidateShow.artistName = 'Welcome Reception';
              candidateShow.isGeneralEvent = true;
            } else if (candidateShow.artistName.includes('הפסקה')) {
              candidateShow.artistName = 'Intermission';
              candidateShow.isGeneralEvent = true;
            } else if (candidateShow.artistName.includes('מפגש') || candidateShow.artistName.includes('הרצאה')) {
              candidateShow.artistName = 'Panel & Talk Session';
              candidateShow.isGeneralEvent = true;
            } else if (candidateShow.artistName.includes('מופע ראשון')) {
              candidateShow.artistName = 'Opening Showcase';
              candidateShow.isGeneralEvent = true;
            } else if (candidateShow.artistName.includes('אירוע נעילה')) {
              candidateShow.artistName = 'Closing Event';
              candidateShow.isGeneralEvent = true;
            } else if (candidateShow.artistName.includes('נטוורקינג')) {
              candidateShow.artistName = 'Official Delegation Networking Event';
              candidateShow.isGeneralEvent = true;
            } else if (candidateShow.artistName.includes('תקלוט') || candidateShow.artistName === 'DJ' || candidateShow.artistName === 'DJ?') {
              candidateShow.artistName = 'DJ Set';
              candidateShow.isGeneralEvent = true;
            }
          }
        }

        candidateShow.aliases = [cellArtist, candidateShow.artistName];
        allShows.push(candidateShow);
      }
    }
  });

  allShows.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const timeA = getTimetableSortMinutes(a.startTime);
    const timeB = getTimetableSortMinutes(b.startTime);
    if (timeA !== timeB) return timeA - timeB;
    return (a.stage || '').localeCompare(b.stage || '');
  });

  return allShows;
}

/**
 * ==========================================================================
 * DELEGATE BRIEFCASE PDF & EMAIL GENERATION ENGINE
 * ==========================================================================
 */

function escapeBriefcaseHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Constructs the HTML document for the Briefcase PDF
 */
function buildBriefcasePdfHtml(guestName, guestEmail, exportArtists) {
  const noteCount = exportArtists.filter(e => !!e.note).length;
  const favCount = exportArtists.filter(e => e.isFav).length;
  const nowStr = Utilities.formatDate(new Date(), "GMT+2", "dd/MM/yyyy HH:mm");

  let cardsHtml = "";
  exportArtists.forEach((item, idx) => {
    const a = item.artist;
    const isFav = item.isFav;
    const note = item.note;
    const tags = item.tags || [];

    // Social Links buttons
    let linksHtml = "";
    if (a.socialLinks && a.socialLinks.length > 0) {
      linksHtml = a.socialLinks.map(link => {
        return `<a href="${escapeBriefcaseHtml(link.url)}" style="display: inline-block; background-color: #f1f5f9; border: 1.5px solid #0f172a; border-radius: 4px; padding: 3px 8px; margin: 2px 4px 2px 0; font-size: 11px; font-weight: bold; color: #0f172a; text-decoration: none;">${escapeBriefcaseHtml(link.label)} &rarr;</a>`;
      }).join(" ");
    }

    // Intent Tags pills
    let tagsHtml = "";
    if (tags.length > 0) {
      tagsHtml = tags.map(tag => {
        let tagIcon = "🔖";
        let tagBg = "#e0f2fe";
        let tagBorder = "#0284c7";
        let tagText = "#0369a1";
        if (tag === "Booking") { tagIcon = "🎯"; tagBg = "#ffe4e6"; tagBorder = "#e11d48"; tagText = "#9f1239"; }
        else if (tag === "Connect") { tagIcon = "🤝"; tagBg = "#dcfce7"; tagBorder = "#16a34a"; tagText = "#166534"; }
        else if (tag === "Press") { tagIcon = "📰"; tagBg = "#fef3c7"; tagBorder = "#d97706"; tagText = "#92400e"; }
        else if (tag === "General Note" || tag === "Scouting") { tagIcon = "🔍"; tagBg = "#f3e8ff"; tagBorder = "#9333ea"; tagText = "#6b21a8"; }
        return `<span style="display: inline-block; background-color: ${tagBg}; border: 1.5px solid ${tagBorder}; border-radius: 4px; padding: 2px 7px; margin: 2px 4px 2px 0; font-size: 11px; font-weight: bold; color: ${tagText};">${tagIcon} ${escapeBriefcaseHtml(tag)}</span>`;
      }).join(" ");
    }

    // Private Note container
    let noteContainerHtml = "";
    if (note) {
      noteContainerHtml = `
        <div style="background-color: #fffbeb; border: 1.5px solid #d97706; border-left: 5px solid #b45309; border-radius: 4px; padding: 10px 14px; margin: 10px 0; font-size: 13px; color: #78350f;">
          <div style="font-weight: bold; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">📝 Your Private Note:</div>
          <div style="white-space: pre-wrap; line-height: 1.45;">${escapeBriefcaseHtml(note)}</div>
        </div>
      `;
    }

    // Thumbnail / Avatar
    let avatarHtml = `<div style="width: 75px; height: 75px; background-color: #f1f5f9; border: 2px solid #0f172a; border-radius: 6px; text-align: center; line-height: 75px; font-size: 26px;">🎸</div>`;
    if (a.image) {
      avatarHtml = `<img src="${escapeBriefcaseHtml(a.image)}" width="75" height="75" style="object-fit: cover; border-radius: 6px; border: 2px solid #0f172a; display: block;" alt="${escapeBriefcaseHtml(a.name)}" />`;
    }

    // Single Artist Card
    cardsHtml += `
      <div class="artist-card" style="border: 2px solid #0f172a; border-radius: 6px; background-color: #ffffff; padding: 14px 16px; margin-bottom: 16px; page-break-inside: avoid;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="88" valign="top">
              ${avatarHtml}
            </td>
            <td valign="top" style="padding-left: 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="top">
                    <div style="font-size: 17px; font-weight: bold; color: #0f172a; line-height: 1.2;">
                      ${escapeBriefcaseHtml(a.name)}
                      ${isFav ? '<span style="color: #ef4444; font-size: 15px; margin-left: 4px;" title="Favorited">❤️</span>' : ''}
                    </div>
                    ${a.genre ? `<div style="display: inline-block; margin-top: 4px; background-color: #f8fafc; border: 1.5px solid #0f172a; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: bold; color: #0f172a;">${escapeBriefcaseHtml(a.genre)}</div>` : ''}
                  </td>
                  <td width="70" align="right" valign="top">
                    <span style="font-size: 11px; font-weight: bold; color: #94a3b8;">#${idx + 1}</span>
                  </td>
                </tr>
              </table>

              ${tagsHtml ? `<div style="margin-top: 8px;">${tagsHtml}</div>` : ''}
            </td>
          </tr>
        </table>

        ${noteContainerHtml}

        <!-- Contact & Management details -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 12px; margin-top: 8px; font-size: 12px; color: #334155;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <strong>Contact / Booking:</strong> ${escapeBriefcaseHtml(a.contactName || "Management")}
                ${a.contactEmail ? ` &bull; <a href="mailto:${escapeBriefcaseHtml(a.contactEmail)}" style="color: #0284c7; font-weight: bold; text-decoration: underline;">${escapeBriefcaseHtml(a.contactEmail)}</a>` : ""}
              </td>
            </tr>
          </table>
        </div>

        ${linksHtml ? `<div style="margin-top: 8px;">${linksHtml}</div>` : ''}

        ${a.members ? `<div style="font-size: 11px; color: #64748b; margin-top: 8px; line-height: 1.35;"><strong>Band Members:</strong> ${escapeBriefcaseHtml(a.members)}</div>` : ''}
        ${a.bio ? `<div style="font-size: 11px; color: #475569; margin-top: 6px; line-height: 1.4;">${escapeBriefcaseHtml(a.bio.length > 320 ? a.bio.substring(0, 320) + "..." : a.bio)}</div>` : ''}
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>IMSF 2026 - Personal Briefcase</title>
      <style>
        @page {
          size: A4;
          margin: 14mm 12mm 14mm 12mm;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #0f172a;
          background-color: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 13px;
        }
        .header-box {
          background-color: #0a1626;
          border: 2px solid #000000;
          border-radius: 6px;
          padding: 18px 20px;
          color: #ffffff;
          margin-bottom: 20px;
        }
        .header-title {
          font-size: 21px;
          font-weight: bold;
          margin: 0;
          color: #ffffff;
          letter-spacing: 0.5px;
        }
        .header-subtitle {
          font-size: 14px;
          font-weight: bold;
          color: #F1A9A0;
          margin: 6px 0 0 0;
        }
        .header-desc {
          font-size: 12px;
          color: #94a3b8;
          margin: 6px 0 0 0;
          line-height: 1.4;
        }
        .summary-bar {
          background-color: #f1f5f9;
          border: 1.5px solid #0f172a;
          border-radius: 4px;
          padding: 8px 12px;
          margin-bottom: 20px;
          font-size: 12px;
          font-weight: bold;
          color: #1e293b;
        }
        .footer-box {
          border-top: 2px solid #e2e8f0;
          padding-top: 14px;
          margin-top: 24px;
          font-size: 11px;
          color: #64748b;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <!-- FESTIVAL HEADER -->
      <div class="header-box">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="middle">
              <div class="header-title">Israel Music Showcase Festival 2026</div>
              <div class="header-subtitle">Personal Lineup &amp; Notes Briefcase for ${escapeBriefcaseHtml(guestName)}</div>
              <div class="header-desc">Here is the summary of all the artists you liked, noted, and discovered at the festival.</div>
            </td>
            <td width="90" align="right" valign="middle">
              <div style="background-color: #F1A9A0; color: #0a1626; font-weight: bold; font-size: 11px; border: 1.5px solid #000; border-radius: 4px; padding: 6px 8px; text-align: center; text-transform: uppercase;">
                IMSF 2026<br><span style="font-size: 9px; opacity: 0.85;">DELEGATE</span>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- SUMMARY BAR -->
      <div class="summary-bar">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <span>⭐ <strong>${exportArtists.length}</strong> Total Artists</span>
              &nbsp;&bull;&nbsp;
              <span>❤️ <strong>${favCount}</strong> Favorites</span>
              &nbsp;&bull;&nbsp;
              <span>📝 <strong>${noteCount}</strong> Private Notes</span>
            </td>
            <td align="right" style="font-size: 11px; color: #64748b;">
              Exported on ${nowStr}
            </td>
          </tr>
        </table>
      </div>

      <!-- ARTIST CARDS -->
      ${cardsHtml}

      <!-- FOOTER -->
      <div class="footer-box">
        <strong>Exposure Festival 2026 / Yellow Submarine, Jerusalem</strong><br>
        For inquiries, partnerships and booking introductions: <a href="mailto:imsfhost@gmail.com" style="color: #0284c7; text-decoration: underline;">imsfhost@gmail.com</a> &bull; <a href="https://yellowsubmarine.org.il" style="color: #0284c7; text-decoration: underline;">yellowsubmarine.org.il</a>
      </div>
    </body>
    </html>
  `;
}

/**
 * Main Controller: Generates the Briefcase PDF and sends it via GmailApp
 */
function generateAndSendBriefcasePdf(email, clientPayload, options) {
  try {
    if (!email) {
      return { success: false, message: "Email is required." };
    }
    const cleanEmail = email.toString().trim().toLowerCase();
    options = options || {};
    const shouldSendEmail = (options.sendEmail !== false);
    const returnBase64 = (options.returnBase64 !== false);

    // Get guest name from master sheet
    const guestDetails = getGuestDetailsFromMaster(cleanEmail);
    const guestName = (options.guestName || guestDetails.fullName || cleanEmail).trim();

    // Get artists list
    const artistsRes = getArtistsData(false);
    const allArtists = (artistsRes && artistsRes.artists) ? artistsRes.artists : [];

    // Parse payload
    const payload = (typeof clientPayload === "string") ? JSON.parse(clientPayload) : (clientPayload || {});
    const favorites = payload.favorites || {};
    const notes = payload.notes || {};
    const tags = payload.tags || {};

    // Filter artists: has fav OR note OR tags
    const exportArtists = [];
    allArtists.forEach(artist => {
      const isFav = !!favorites[artist.id];
      const note = (notes[artist.id] || "").trim();
      const aTags = Array.isArray(tags[artist.id]) ? tags[artist.id] : [];
      if (isFav || note || aTags.length > 0) {
        exportArtists.push({
          artist: artist,
          isFav: isFav,
          note: note,
          tags: aTags
        });
      }
    });

    if (exportArtists.length === 0) {
      return { success: false, message: "No favorites or notes found to export." };
    }

    // Build the PDF HTML
    const pdfHtml = buildBriefcasePdfHtml(guestName, cleanEmail, exportArtists);
    const pdfOutput = HtmlService.createHtmlOutput(pdfHtml);
    const safeGuestName = guestName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_') || 'Guest';
    const pdfFileName = 'IMSF26_Briefcase_' + safeGuestName + '.pdf';
    const pdfBlob = pdfOutput.getAs('application/pdf').setName(pdfFileName);

    let emailSent = false;
    if (shouldSendEmail) {
      const emailSubject = "Your IMSF 2026 Artist Briefcase is Here";
      const emailBodyHtml = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 620px; margin: 0 auto; background-color: #f8fafc; padding: 24px;">
          <div style="background-color: #0a1626; border-radius: 8px 8px 0 0; padding: 28px 24px; text-align: center; border-bottom: 4px solid #F1A9A0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;">Israel Music Showcase Festival 2026</h1>
            <p style="color: #F1A9A0; margin: 8px 0 0; font-size: 14px; font-weight: 600;">Personal Delegate Briefcase &amp; Networking Digest</p>
          </div>
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 28px 24px; color: #1e293b; line-height: 1.6;">
            <p style="font-size: 15px; margin-top: 0;">Hi <strong>${escapeBriefcaseHtml(guestName)}</strong>,</p>
            <p style="font-size: 14px;">Thank you for attending <strong>IMSF 2026</strong>! We hope you enjoyed the performances and connected with incredible talent.</p>
            <p style="font-size: 14px;">Attached to this email is your <strong>Personal Artist Briefcase (PDF)</strong> containing all the artists you liked, the private notes you wrote during the showcase, collaboration intent tags, and full contact details for easy follow-up.</p>
            
            <div style="background-color: #fff5f5; border: 1.5px solid #F1A9A0; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
              <strong style="color: #9b2c2c; font-size: 14px;">Briefcase Summary:</strong>
              <ul style="margin: 8px 0 0; padding-left: 20px; font-size: 13px; color: #4a5568;">
                <li>Total Artists: <strong>${exportArtists.length}</strong></li>
                <li>Private Notes: <strong>${exportArtists.filter(e => !!e.note).length}</strong></li>
              </ul>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-bottom: 24px;">
              All links inside the attached PDF (Spotify, YouTube, Instagram, and booking emails) are fully clickable.
            </p>

            <div style="border-top: 1px solid #edf2f7; padding-top: 18px; font-size: 13px; color: #718096;">
              Warm regards,<br>
              <strong>The IMSF 2026 Production Team</strong><br>
              Yellow Submarine, Jerusalem
            </div>
          </div>
        </div>
      `;

      GmailApp.sendEmail(cleanEmail, emailSubject, "", {
        htmlBody: emailBodyHtml,
        from: "imsfhost@gmail.com",
        name: "Israel Music Showcase Festival 2026",
        bcc: "imsfhost@gmail.com",
        attachments: [pdfBlob]
      });
      emailSent = true;
    }

    let base64 = "";
    if (returnBase64) {
      base64 = Utilities.base64Encode(pdfBlob.getBytes());
    }

    return {
      success: true,
      emailSent: emailSent,
      filename: pdfFileName,
      count: exportArtists.length,
      pdfBase64: base64
    };
  } catch (err) {
    console.error("Error in generateAndSendBriefcasePdf:", err);
    return { success: false, message: "Error generating briefcase: " + err.toString() };
  }
}

/**
 * Sends a calendar invite (.ics) with favorited showcase performances to the guest's email.
 * Includes automatic 5-minute reminder alarms and clean festival formatting.
 */
function sendCalendarInviteEmail(email, icsString, options) {
  try {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: "Missing email address." };
    }
    if (!icsString) {
      return { success: false, message: "Missing calendar invite data." };
    }

    options = options || {};
    const guestName = options.guestName || "Festival Guest";
    const count = options.count || 0;
    const isCancel = !!options.isCancel;

    const icsFileName = isCancel ? "IMSF_2026_Cancel_Shows.ics" : "IMSF_2026_My_Shows.ics";
    const icsBlob = Utilities.newBlob(icsString, "text/calendar; charset=UTF-8; method=" + (isCancel ? "CANCEL" : "REQUEST"), icsFileName);

    const emailSubject = isCancel 
      ? "IMSF 2026 - Calendar Update: Shows Removed" 
      : "IMSF 2026 - Your Personalized Festival Schedule (.ics Invite)";

    const emailBodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; padding: 30px 15px;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 2px solid #111827; border-radius: 8px; box-shadow: 4px 4px 0px #111827; overflow: hidden;">
          <div style="background-color: #0a1626; padding: 24px 20px; text-align: center; border-bottom: 2px solid #111827;">
            <h1 style="color: #F1A9A0; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px;">ISRAEL MUSIC SHOWCASE FESTIVAL 2026</h1>
            <p style="color: #cbd5e1; margin: 6px 0 0 0; font-size: 13px;">${isCancel ? 'Calendar Shows Cancellation' : 'Personalized Shows Calendar Sync'}</p>
          </div>
          <div style="padding: 24px 20px;">
            <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Dear <strong>${guestName}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              ${isCancel 
                ? 'Attached is the cancellation file to remove your previously exported festival shows from your calendar.'
                : 'Attached is your official festival calendar invite with <strong>' + count + ' showcase performances</strong> that you favorited!'}
            </p>
            ${!isCancel ? `
              <div style="background-color: #f8fafc; border-left: 4px solid #F1A9A0; padding: 12px 14px; margin: 18px 0; font-size: 13px; color: #334155; line-height: 1.5;">
                <strong>🔔 Automatic 5-Minute Alerts:</strong> Each show includes a built-in alarm 5 minutes before stage time, so you won't miss your favorite artists.<br><br>
                <strong>📱 How to add:</strong> Click the attached <code>.ics</code> file or tap "Add to Calendar" in your email app to import all events directly.
              </div>
            ` : ''}
            <div style="border-top: 1px solid #edf2f7; padding-top: 18px; font-size: 13px; color: #718096;">
              Warm regards,<br>
              <strong>The IMSF 2026 Production Team</strong><br>
              Yellow Submarine, Jerusalem
            </div>
          </div>
        </div>
      </div>
    `;

    GmailApp.sendEmail(cleanEmail, emailSubject, "", {
      htmlBody: emailBodyHtml,
      from: "imsfhost@gmail.com",
      name: "Israel Music Showcase Festival 2026",
      bcc: "imsfhost@gmail.com",
      attachments: [icsBlob]
    });

    return {
      success: true,
      emailSent: true,
      count: count
    };
  } catch (err) {
    console.error("Error in sendCalendarInviteEmail:", err);
    return {
      success: false,
      message: err.message || err.toString()
    };
  }
}





