function getArtistsData(forceRefresh) {
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = 'global_artists_data_v2';
    
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return { success: true, artists: JSON.parse(cached) };
      }
    }

    const ssId = CONFIG.ARTISTS_SPREADSHEET_ID;
    if (!ssId) return { success: false, message: "Artists spreadsheet not configured." };
    
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = (CONFIG.ARTISTS_SHEET_NAME && ss.getSheetByName(CONFIG.ARTISTS_SHEET_NAME)) || 
                  ss.getSheetByName("שיקוף! - מידע אומנים") || 
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
    if (!prefSheet) {
      prefSheet = ss.insertSheet(prefSheetName);
      prefSheet.appendRow([
        "מייל אורח", "שם מלא", "מדינה", "מה החברה עושה", "תפקיד",
        "סטטוס פעילות", "אומנים שאהב (❤️)", "הזמנות להופעה (🎯 Booking)",
        "בקשות לקשר (🤝 Connect)", "הערות אורח", "Raw Data"
      ]);
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
        "בקשות לקשר (🤝 Connect)", "עיתונות וסיקור (📰 Press)",
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

    // Write / Update row in prefSheet
    const prefData = prefSheet.getDataRange().getValues();
    let guestRowIdx = -1;
    for (let r = 1; r < prefData.length; r++) {
      if (String(prefData[r][0]).trim().toLowerCase() === cleanEmail) {
        guestRowIdx = r + 1;
        break;
      }
    }

    const rowValues = [
      cleanEmail,
      guestInfo.fullName,
      guestInfo.country,
      guestInfo.companyBio,
      guestInfo.role,
      activityStatus,
      favNames.join(", "),
      bookingNames.join(", "),
      connectNames.join(", "),
      notesList.join("\n\n"),
      rawJson
    ];

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
    for (let r = 1; r < data.length; r++) {
      if (String(data[r][0]).trim().toLowerCase() === cleanEmail) {
        const rawJsonCol = data[r][10]; // Column K
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
    const prefData = prefSheet.getDataRange().getValues();
    if (prefData.length < 2) return;

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
        notes: []
      };
    });

    for (let r = 1; r < prefData.length; r++) {
      const row = prefData[r];
      const guestName = String(row[1] || "").trim();
      const country = String(row[2] || "").trim();
      const company = String(row[4] || row[3] || "").trim(); // role or company
      const rawJson = row[10];
      if (!rawJson) continue;

      let payload = null;
      try { payload = JSON.parse(rawJson); } catch (e) { continue; }

      const favs = payload.favorites || {};
      const notes = payload.notes || {};
      const tags = payload.tags || {};

      const delegateLabel = country ? `${guestName} (${country}${company ? " - " + company : ""})` : `${guestName}${company ? " (" + company + ")" : ""}`;

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
      });

      Object.keys(notes).forEach(aId => {
        if (!agg[aId]) return;
        const text = (notes[aId] || "").trim();
        if (text) {
          agg[aId].notes.push(`[${delegateLabel}]: ${text}`);
        }
      });
    }

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

      rowsToWrite.push([
        data.name,
        data.genre,
        tourPotential,
        countryBreakdown,
        data.booking.join("\n"),
        data.connect.join("\n"),
        data.press.join("\n"),
        data.likes,
        data.notes.join("\n\n"),
        JSON.stringify({ likes: data.likes, countries: data.countries, bookingCount: data.booking.length })
      ]);
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
    const leadsSheet = ss.getSheetByName(leadsSheetName);
    const prefSheetName = CONFIG.GUEST_PREFERENCES_SHEET || "העדפות אורחים";
    const prefSheet = ss.getSheetByName(prefSheetName) || ss.getSheetByName("הערות אורחים");

    const artistsLeads = [];
    if (leadsSheet) {
      const data = leadsSheet.getDataRange().getValues();
      for (let r = 1; r < data.length; r++) {
        const row = data[r];
        if (!row[0]) continue;
        artistsLeads.push({
          name: String(row[0]).trim(),
          genre: String(row[1] || "").trim(),
          tourPotential: String(row[2] || "").trim(),
          countries: String(row[3] || "").trim(),
          bookingLeads: String(row[4] || "").trim(),
          connectLeads: String(row[5] || "").trim(),
          pressLeads: String(row[6] || "").trim(),
          likesCount: Number(row[7] || 0),
          notes: String(row[8] || "").trim()
        });
      }
    }

    const inactiveGuests = [];
    if (prefSheet) {
      const pData = prefSheet.getDataRange().getValues();
      for (let r = 1; r < pData.length; r++) {
        const row = pData[r];
        const status = String(row[5] || "");
        if (status.includes("טרם סימן")) {
          inactiveGuests.push({
            email: String(row[0] || "").trim(),
            name: String(row[1] || "").trim(),
            country: String(row[2] || "").trim(),
            company: String(row[3] || "").trim(),
            role: String(row[4] || "").trim()
          });
        }
      }
    }

    return {
      success: true,
      artistsLeads: artistsLeads,
      inactiveGuests: inactiveGuests
    };
  } catch (err) {
    console.error("Error in getAdminArtistsNetworkingData:", err);
    return { success: false, message: err.toString() };
  }
}

