const fs = require('fs');

let configStr = fs.readFileSync('src/Config.gs', 'utf8');

const newFlights = `  FLIGHTS: [
    { key: "תאריך נחיתה", altKeys: ["תאריך נחיתה", "תאריך הגעה", "הגעה לישראל", "תאריך חזרה"], label: "Arrival Date" },
    { key: "שעת נחיתה", altKeys: ["שעת נחיתה", "שעת הגעה", "שעת נחיתה משוערת", "שעת נחיתה בנתב\\"ג", "שעת נחיתה בנתבג"], label: "Arrival Time" },
    { key: "מספר טיסה נחיתה", altKeys: ["מספר טיסה נחיתה", "מספר טיסת נחיתה", "מספר טיסת הגעה", "מספר טיסה הגעה", "טיסת נחיתה"], label: "Arrival Flight" },
    { key: "חברת תעופה נחיתה", altKeys: ["חברת תעופה נחיתה", "חברת תעופה הגעה"], label: "Arrival Airline" },
    { key: "ארץ מוצא", altKeys: ["ממדינה", "מארץ", "מאיפה", "עיר מוצא", "ארץ מוצא", "מדינת מוצא", "יעד הגעה", "מאיפה?"], label: "Origin / From" },
    { key: "תאריך המראה", altKeys: ["תאריך המראה", "תאריך עזיבה", "תאריך יציאה", "חזרה מישראל"], label: "Departure Date" },
    { key: "שעת המראה", altKeys: ["שעת המראה", "שעת עזיבה", "שעת יציאה", "שעת המראה משוערת", "שעת המראה מנתב\\"ג"], label: "Departure Time" },
    { key: "מספר טיסה המראה", altKeys: ["מספר טיסה המראה", "מספר טיסת המראה", "מספר טיסת עזיבה", "טיסת המראה"], label: "Departure Flight" },
    { key: "חברת תעופה המראה", altKeys: ["חברת תעופה המראה", "חברת תעופה עזיבה"], label: "Departure Airline" },
    { key: "יעד חזרה", altKeys: ["לאיפה", "מדינת חזרה", "לאן", "יעד חזרה"], label: "Destination / To" },
    { key: "שיוך לשאטל", altKeys: ["שיוך לשאטל", "הסעה נדרשת", "הסעה", "שאטל"], label: "Shuttle" },
    { key: "לינק כרטיס סופי", altKeys: ["לינק כרטיס סופי", "קישור לכרטיס טיסה", "קישור לכרטיס", "כרטיס טיסה", "לינק לכרטיס"], label: "Final Ticket Link" }
  ],`;

configStr = configStr.replace(/FLIGHTS:\s*\[[\s\S]*?\],\s*HOTELS:/, newFlights + '\n  HOTELS:');

fs.writeFileSync('src/Config.gs', configStr, 'utf8');
console.log('Fixed Config.gs');
