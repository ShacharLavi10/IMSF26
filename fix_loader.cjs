const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Fix loader hiding in onLoginSuccess
const oldCode = `        if (response.scheduleData) {
          scheduleDataCache = response.scheduleData;
          const loader = document.getElementById('schedule-loader-container');
          if (loader) loader.style.display = 'none';
          renderScheduleTabs();
        }`;
        
const newCode = `        if (response.scheduleData) {
          scheduleDataCache = response.scheduleData;
          const loader = document.getElementById('schedule-loader-container');
          if (loader) loader.style.display = 'none';
          renderScheduleTabs();
        } else {
          const loader = document.getElementById('schedule-loader-container');
          if (loader) loader.style.display = 'none';
          document.getElementById('schedule-container').innerHTML = '<p class="empty-state">Schedule will be published here.</p>';
        }`;

if (html.includes(oldCode)) {
  html = html.replace(oldCode, newCode);
  fs.writeFileSync('index.html', html);
  console.log("Fixed index.html loader logic");
} else {
  console.log("Could not find exact block to replace");
}
