const code = `
  (() => {
    const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    return { hasKey: !!key, prefix: key ? key.slice(0, 6) + '...' : null };
  })()
`;

async function main() {
  const res = await fetch('https://script.google.com/macros/s/AKfycbzK3tyvdqCU1UDLvYqC-6IvH2zFoLsOvEGGwXslGQQK0f7cuYgCb0U4MbISSuldV3RM/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ method: 'eval', args: [code] })
  });
  const json = await res.json();
  console.log('Sandbox Key Result:', json);
}

main().catch(console.error);
