const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Remove the age check and background refresh
html = html.replace(/const lastFetch = localStorage\.getItem\('schedule_last_fetch'\);[\s\S]*?fetchSchedule\(true, false\);\s*\}\s*\}/, '');

// Remove the fetchSchedule function definition
const fetchFuncRegex = /function fetchSchedule\(\) \{[\s\S]*?\.getScheduleData\(\);\s*\}/;
html = html.replace(fetchFuncRegex, '');

fs.writeFileSync('index.html', html);
console.log("Removed fetchSchedule");
