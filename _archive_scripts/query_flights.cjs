const code = `
  (() => {
    const prodSs = SpreadsheetApp.openById('17R6e27QsISFr0jmwOYje857sVRLoxNrePZVa0CTeMos');
    const fSheet = prodSs.getSheetByName('טבלת טיסות - שיקוף') || prodSs.getSheetByName('טבלת טיסות');
    const mSheet = prodSs.getSheetByName('אורחים');
    
    // Master guests mapping
    const mData = mSheet.getDataRange().getValues();
    const mHeaders = mData[0].map(h => String(h).trim().toLowerCase());
    const mEmailIdx = mHeaders.indexOf('מייל אורח');
    const mCountryIdx = mHeaders.indexOf('מדינה');
    const mCompanyIdx = mHeaders.indexOf('שם חברה');
    const mRoleIdx = mHeaders.indexOf('תפקיד');
    
    const guestMap = {};
    for (let i = 1; i < mData.length; i++) {
      const em = String(mData[i][mEmailIdx] || '').trim().toLowerCase();
      if (em) {
        guestMap[em] = {
          country: mData[i][mCountryIdx] || '',
          company: mData[i][mCompanyIdx] || '',
          role: mData[i][mRoleIdx] || ''
        };
      }
    }

    // Flights data
    const fData = fSheet.getDataRange().getValues();
    const fDisp = fSheet.getDataRange().getDisplayValues();
    const rows = [];
    for (let i = 1; i < fData.length; i++) {
      const email = String(fDisp[i][0] || fData[i][0] || '').trim();
      const meta = guestMap[email.toLowerCase()] || {};
      rows.push({
        email: email,
        lastName: String(fDisp[i][1] || fData[i][1] || '').trim(),
        firstName: String(fDisp[i][2] || fData[i][2] || '').trim(),
        country: meta.country || '',
        company: meta.company || '',
        arrDate: String(fDisp[i][3] || fData[i][3] || '').trim(),
        arrTime: String(fDisp[i][4] || fData[i][4] || '').trim(),
        depDate: String(fDisp[i][7] || fData[i][7] || '').trim(),
        depTime: String(fDisp[i][8] || fData[i][8] || '').trim(),
        depFlight: String(fDisp[i][9] || fData[i][9] || '').trim(),
        depAirline: String(fDisp[i][10] || fData[i][10] || '').trim(),
        shuttle: String(fDisp[i][11] || fData[i][11] || '').trim(),
        togetherWith: String(fDisp[i][12] || fData[i][12] || '').trim()
      });
    }
    return rows;
  })()
`;

async function main() {
  const res = await fetch('https://script.google.com/macros/s/AKfycbyGjswDALICsGxU5wXzeeTLV8NfIA71-K1Z1tCUmS94IbTPqxjos5BACqcB3ezVw1fg5A/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ method: 'eval', args: [code] })
  });
  const json = await res.json();
  const allRows = json.data;
  
  // Filter for 23/11 departures
  const nov23 = allRows.filter(r => r.depDate.includes('23/11') || r.depDate.includes('2026-11-23'));

  // Sort by time: convert "HH:mm" to minutes
  function timeToMin(t) {
    if (!t) return 9999;
    const parts = t.replace(/[^0-9:]/g, '').split(':');
    if (parts.length < 2) return 9999;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  nov23.sort((a, b) => timeToMin(a.depTime) - timeToMin(b.depTime));

  console.log('Total departures on 23/11:', nov23.length);
  console.log(JSON.stringify(nov23, null, 2));
}

main().catch(console.error);
