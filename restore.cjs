const fs = require('fs');
let code = fs.readFileSync('src/PortalBackend.gs', 'utf8');

// Restore translate in getGuestPortalData
const missingReplace = "missingItemsArray = rawMissingText.split(',').map(item => item.trim()).filter(item => item.length > 0);";
const missingRestore = `try {
        let translated = LanguageApp.translate(rawMissingText, 'he', 'en');
        missingItemsArray = translated.split(',').map(item => item.trim()).filter(item => item.length > 0);
      } catch(e) {
        missingItemsArray = rawMissingText.split(',').map(item => item.trim()).filter(item => item.length > 0);
      }`;
code = code.replace(missingReplace, missingRestore);

// Restore translate in getLiveUpdates
code = code.replace(
  /let trimmed = part\.trim\(\);\s*if \(trimmed\) \{\s*updates\.push\(\{/g,
  `let trimmed = part.trim();
                  if (trimmed) {
                    try {
                      trimmed = LanguageApp.translate(trimmed, '', 'en');
                    } catch(e) {}
                    
                    updates.push({`
);

fs.writeFileSync('src/PortalBackend.gs', code);
console.log("Restored translation");
