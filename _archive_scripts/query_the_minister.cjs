const code = `
  (() => {
    const prodSs = SpreadsheetApp.openById('13YI3oIHCt2OfIC3K3HyS54u_RrJ-Hii3NZedM3OtqvQ');
    
    // 1. Check 'לידים והזדמנויות אומנים'
    const leadsSheet = prodSs.getSheetByName('לידים והזדמנויות אומנים');
    let leadsData = [];
    if (leadsSheet) {
      const vals = leadsSheet.getDataRange().getValues();
      const disp = leadsSheet.getDataRange().getDisplayValues();
      if (vals.length > 1) {
        const headers = vals[0].map(h => String(h).trim());
        const artistCol = headers.findIndex(h => h.includes('שם האמן') || h.includes('אמן'));
        const likedCol = headers.findIndex(h => h.includes('אורחים שעשו לייקים') || h.includes('לייקים') || h.includes('❤️'));
        const bookingCol = headers.findIndex(h => h.includes('בוקרים') || h.includes('Booking'));
        const connectCol = headers.findIndex(h => h.includes('Connect') || h.includes('קשר'));
        const pressCol = headers.findIndex(h => h.includes('Press') || h.includes('עיתונות'));
        const notesCol = headers.findIndex(h => h.includes('הערות'));
        const rawCol = headers.findIndex(h => h.includes('Raw Data'));
        
        for (let r = 1; r < vals.length; r++) {
          const artistName = String(disp[r][artistCol] || vals[r][artistCol] || '').trim();
          if (artistName.toLowerCase().includes('minister')) {
            leadsData.push({
              row: r + 1,
              artistName: artistName,
              totalLikes: disp[r][headers.findIndex(h => h.includes('סה"כ לייקים'))] || '',
              likedGuests: likedCol !== -1 ? disp[r][likedCol] : '',
              booking: bookingCol !== -1 ? disp[r][bookingCol] : '',
              connect: connectCol !== -1 ? disp[r][connectCol] : '',
              press: pressCol !== -1 ? disp[r][pressCol] : '',
              notes: notesCol !== -1 ? disp[r][notesCol] : '',
              raw: rawCol !== -1 ? disp[r][rawCol] : ''
            });
          }
        }
      }
    }

    // 2. Also check 'העדפות אורחים'
    const prefsSheet = prodSs.getSheetByName('העדפות אורחים');
    let prefsData = [];
    if (prefsSheet) {
      const vals = prefsSheet.getDataRange().getValues();
      const disp = prefsSheet.getDataRange().getDisplayValues();
      if (vals.length > 1) {
        const headers = vals[0].map(h => String(h).trim());
        const emailCol = headers.findIndex(h => h.includes('מייל'));
        const nameCol = headers.findIndex(h => h.includes('שם מלא') || h.includes('שם'));
        const countryCol = headers.findIndex(h => h.includes('מדינה'));
        const compCol = headers.findIndex(h => h.includes('חברה'));
        const likedCol = headers.findIndex(h => h.includes('אומנים שאהב') || h.includes('❤️'));
        const bookingCol = headers.findIndex(h => h.includes('Booking') || h.includes('הזמנות'));
        const connectCol = headers.findIndex(h => h.includes('Connect') || h.includes('קשר'));
        const notesCol = headers.findIndex(h => h.includes('הערות'));
        
        for (let r = 1; r < vals.length; r++) {
          const likedStr = likedCol !== -1 ? String(disp[r][likedCol] || '') : '';
          const bookingStr = bookingCol !== -1 ? String(disp[r][bookingCol] || '') : '';
          const connectStr = connectCol !== -1 ? String(disp[r][connectCol] || '') : '';
          const notesStr = notesCol !== -1 ? String(disp[r][notesCol] || '') : '';
          
          if (likedStr.toLowerCase().includes('minister') || 
              bookingStr.toLowerCase().includes('minister') || 
              connectStr.toLowerCase().includes('minister') ||
              notesStr.toLowerCase().includes('minister')) {
            prefsData.push({
              row: r + 1,
              email: emailCol !== -1 ? disp[r][emailCol] : '',
              name: nameCol !== -1 ? disp[r][nameCol] : '',
              country: countryCol !== -1 ? disp[r][countryCol] : '',
              company: compCol !== -1 ? disp[r][compCol] : '',
              liked: likedStr,
              booking: bookingStr,
              connect: connectStr,
              notes: notesStr
            });
          }
        }
      }
    }

    return { leads: leadsData, prefs: prefsData };
  })()
`;

async function main() {
  const res = await fetch('https://script.google.com/macros/s/AKfycbyGjswDALICsGxU5wXzeeTLV8NfIA71-K1Z1tCUmS94IbTPqxjos5BACqcB3ezVw1fg5A/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ method: 'eval', args: [code] })
  });
  const json = await res.json();
  console.log(JSON.stringify(json.data, null, 2));
}

main().catch(console.error);
