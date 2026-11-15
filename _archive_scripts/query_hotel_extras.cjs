const code = `
  (() => {
    const prodSs = SpreadsheetApp.openById('17R6e27QsISFr0jmwOYje857sVRLoxNrePZVa0CTeMos');
    const jlmSheet = prodSs.getSheetByName('מלונות ירושלים');
    const tlvSheet = prodSs.getSheetByName('מלונות תל אביב');
    
    function parseSheet(sheet, city) {
      if (!sheet) return [];
      const data = sheet.getDataRange().getValues();
      const disp = sheet.getDataRange().getDisplayValues();
      if (data.length < 3) return [];
      const headers = data[1].map(h => String(h).trim());
      const emailIdx = headers.findIndex(h => h.includes('מייל'));
      const fnIdx = headers.findIndex(h => h.includes('פרטי'));
      const lnIdx = headers.findIndex(h => h.includes('משפחה'));
      const payIdx = headers.findIndex(h => h.includes('על חשבון האורח') && (h.includes('סכום') || h.includes('סה')));
      const nightsIdx = headers.findIndex(h => h.includes('לילות על חשבון האורח'));
      const roomIdx = headers.findIndex(h => h.includes('סוג חדר'));
      
      const res = [];
      for (let i = 2; i < data.length; i++) {
        const payVal = payIdx !== -1 ? (disp[i][payIdx] || data[i][payIdx]) : '';
        const numVal = parseFloat(String(payVal).replace(/[^0-9.-]/g, '')) || 0;
        if (numVal > 0) {
          res.push({
            city: city,
            email: emailIdx !== -1 ? disp[i][emailIdx] : '',
            name: ((fnIdx !== -1 ? disp[i][fnIdx] : '') + ' ' + (lnIdx !== -1 ? disp[i][lnIdx] : '')).trim(),
            roomType: roomIdx !== -1 ? disp[i][roomIdx] : '',
            extraNights: nightsIdx !== -1 ? disp[i][nightsIdx] : '',
            amountDue: numVal + ' ₪'
          });
        }
      }
      return res;
    }
    
    return {
      jlm: parseSheet(jlmSheet, 'ירושלים (ארתור)'),
      tlv: parseSheet(tlvSheet, 'תל אביב (סינמה)')
    };
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
