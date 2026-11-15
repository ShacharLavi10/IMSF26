async function main() {
  // 1. Get key from Prod
  const getCode = `PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')`;
  const prodRes = await fetch('https://script.google.com/macros/s/AKfycbyGjswDALICsGxU5wXzeeTLV8NfIA71-K1Z1tCUmS94IbTPqxjos5BACqcB3ezVw1fg5A/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ method: 'eval', args: [getCode] })
  });
  const prodJson = await prodRes.json();
  const apiKey = prodJson.data;
  console.log('Got key from Prod:', apiKey ? apiKey.slice(0, 8) + '...' : 'NONE');

  if (apiKey) {
    // 2. Set key in Sandbox
    const setCode = `PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', ${JSON.stringify(apiKey)})`;
    const sbRes = await fetch('https://script.google.com/macros/s/AKfycbzK3tyvdqCU1UDLvYqC-6IvH2zFoLsOvEGGwXslGQQK0f7cuYgCb0U4MbISSuldV3RM/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ method: 'eval', args: [setCode] })
    });
    const sbJson = await sbRes.json();
    console.log('Set key in Sandbox result:', sbJson);
  }
}

main().catch(console.error);
