const fs = require('fs');
let c = fs.readFileSync('src/Config.gs', 'utf8');
const lines = c.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('label: "Arrival Time"')) {
    lines[i] = '    { key: "שעת נחיתה", altKeys: ["שעת נחיתה", "שעת הגעה", "שעת נחיתה משוערת", "שעת נחיתה בנתב\\"ג", "שעת נחיתה בנתבג"], label: "Arrival Time" },';
  }
  if (lines[i].includes('label: "Departure Time"')) {
    lines[i] = '    { key: "שעת המראה", altKeys: ["שעת המראה", "שעת עזיבה", "שעת יציאה", "שעת המראה משוערת", "שעת המראה מנתב\\"ג"], label: "Departure Time" },';
  }
  if (lines[i].includes('label: "Arrival Flight"')) {
    lines[i] = '    { key: "מספר טיסה נחיתה", altKeys: ["מספר טיסה נחיתה", "מספר טיסת נחיתה", "מספר טיסת הגעה", "מספר טיסה הגעה", "טיסת נחיתה"], label: "Arrival Flight" },';
  }
  if (lines[i].includes('label: "Departure Flight"')) {
    lines[i] = '    { key: "מספר טיסה המראה", altKeys: ["מספר טיסה המראה", "מספר טיסת המראה", "מספר טיסת עזיבה", "טיסת המראה"], label: "Departure Flight" },';
  }
  if (lines[i].includes('label: "Shuttle"')) {
    lines[i] = '    { key: "שיוך לשאטל", altKeys: ["שיוך לשאטל", "הסעה נדרשת", "הסעה", "שאטל"], label: "Shuttle" },';
  }
  if (lines[i].includes('label: "Final Ticket Link"')) {
    lines[i] = '    { key: "לינק כרטיס סופי", altKeys: ["לינק כרטיס סופי", "קישור לכרטיס טיסה", "קישור לכרטיס", "כרטיס טיסה", "לינק לכרטיס"], label: "Final Ticket Link" },';
  }
}

fs.writeFileSync('src/Config.gs', lines.join('\n'), 'utf8');
console.log('done');
