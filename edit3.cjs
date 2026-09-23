const fs = require('fs');
let content = fs.readFileSync('src/Index.html', 'utf8');

const tabHtml = '<button id="tab-admin" class="tab-btn" onclick="switchCategoryTab(\\'admin\\')" role="tab" aria-selected="false" style="display: none; background: #ffebee; color: #c62828; font-weight: bold;">Production</button>\n          <button id="tab-schedule"';

content = content.replace('<button id="tab-schedule"', tabHtml.replace(\\'\\\\\\'\\', \\'\\'\\'));

const adminCardHtml = '<!-- ADMIN CARD -->\n      <div id="admin-card" class="category-card" style="display: none;">\n        <div class="card-header">\n          <h2>Production Dashboard</h2>\n        </div>\n        <div id="admin-dashboard-container" class="admin-dashboard">\n           <p>Loading production data...</p>\n        </div>\n      </div>\n';

content = content.replace('<!-- SCHEDULE CARD -->', adminCardHtml + '      <!-- SCHEDULE CARD -->');

fs.writeFileSync('src/Index.html', content);
console.log('Added admin tab and card to Index.html');
