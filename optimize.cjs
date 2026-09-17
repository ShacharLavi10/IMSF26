const fs = require('fs');
let code = fs.readFileSync('src/PortalBackend.gs', 'utf8');

// Optimization 1: Pass masterData to fetchAllGuestsDirectory
code = code.replace(
  'const allGuestsDirectory = fetchAllGuestsDirectory(masterSheet, MAPPINGS.GUESTS_DIRECTORY);',
  'const allGuestsDirectory = fetchAllGuestsDirectory(masterData, MAPPINGS.GUESTS_DIRECTORY);'
);

code = code.replace(
  'function fetchAllGuestsDirectory(masterSheet, mappingArray) {',
  'function fetchAllGuestsDirectory(masterData, mappingArray) {'
);

code = code.replace(
  /if \(\!masterSheet\) return \[\];\s*try \{\s*const data = masterSheet\.getDataRange\(\)\.getValues\(\);/,
  'if (!masterData || masterData.length < 2) return [];\n  try {\n    const data = masterData;'
);

// Optimization 2: Remove LanguageApp.translate from getGuestPortalData
code = code.replace(
  /try \{\s*let translated = LanguageApp\.translate[\s\S]*?\} catch\(e\) \{\s*\/\/[^\n]*\n\s*missingItemsArray = rawMissingText\.split\(','\)\.map\(item => item\.trim\(\)\)\.filter\(item => item\.length > 0\);\s*\}/,
  'missingItemsArray = rawMissingText.split(\',\').map(item => item.trim()).filter(item => item.length > 0);'
);

// Optimization 3: Add scheduleData to return object!
code = code.replace(
  /hotelTelAvivData: hotelTelAvivData,\n\s*allGuestsDirectory: allGuestsDirectory\n\s*\};/g,
  'hotelTelAvivData: hotelTelAvivData,\n        allGuestsDirectory: allGuestsDirectory,\n        scheduleData: scheduleData\n      };'
);

fs.writeFileSync('src/PortalBackend.gs', code);
