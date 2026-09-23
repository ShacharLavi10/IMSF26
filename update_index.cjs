const fs = require("fs");
let html = fs.readFileSync("src/Index.html", "utf8");

const tabHTML = `<button id="tab-admin" class="tab-btn" onclick="switchCategoryTab('admin')" role="tab" aria-selected="false" style="display: none; background: #ffebee; color: #c62828; font-weight: bold;">Production</button>\n          <button id="tab-schedule"`;

html = html.replace(`<button id="tab-schedule"`, tabHTML);

const cardHTML = `<!-- ADMIN CARD -->
      <div id="admin-card" class="category-card" style="display: none;">
        <div class="card-header">
          <h2>Production Dashboard</h2>
        </div>
        <div id="admin-dashboard-container" class="admin-dashboard">
           <p>Loading production data...</p>
        </div>
      </div>

      <!-- SCHEDULE CARD -->`;

html = html.replace(`<!-- SCHEDULE CARD -->`, cardHTML);

fs.writeFileSync("src/Index.html", html);
console.log("Done");
