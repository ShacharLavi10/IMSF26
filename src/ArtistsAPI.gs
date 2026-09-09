function getArtistsData() {
  try {
    const ssId = CONFIG.ARTISTS_SPREADSHEET_ID;
    if (!ssId) return { success: false, message: "Artists spreadsheet not configured." };
    
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheets()[0];
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
    const idxGenre = headers.indexOf("ז'אנר");
    
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
    
    return { success: true, artists: artists };
  } catch (err) {
    return { success: false, message: "Error fetching artists: " + err.toString() };
  }
}
