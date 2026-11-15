const code = `
  (() => {
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=' + apiKey;
    const payload = {
      contents: [{ parts: [{ text: 'Say hello to IMSF Production team in 5 words in Hebrew.' }] }]
    };
    const res = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    return { status: res.getResponseCode(), text: res.getContentText() };
  })()
`;

async function main() {
  const res = await fetch('https://script.google.com/macros/s/AKfycbzK3tyvdqCU1UDLvYqC-6IvH2zFoLsOvEGGwXslGQQK0f7cuYgCb0U4MbISSuldV3RM/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ method: 'eval', args: [code] })
  });
  const json = await res.json();
  console.log('Gemini 3.8 flash test:', json.data.status, json.data.text);
}

main().catch(console.error);
