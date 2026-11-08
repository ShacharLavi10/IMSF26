const fs = require('fs');
let code = fs.readFileSync('src/PortalBackend.gs', 'utf8');

// 1. Pass masterData to fetchAllGuestsDirectory
code = code.replace(
  'fetchAllGuestsDirectory(masterSheet, MAPPINGS.GUESTS_DIRECTORY)',
  'fetchAllGuestsDirectory(masterData, MAPPINGS.GUESTS_DIRECTORY)'
);

code = code.replace(
  'function fetchAllGuestsDirectory(masterSheet, mappingArray)',
  'function fetchAllGuestsDirectory(masterData, mappingArray)'
);

code = code.replace(
  'if (!masterSheet) return [];\r\n  try {\r\n    const data = masterSheet.getDataRange().getValues();',
  'if (!masterData || masterData.length < 2) return [];\n  try {\n    const data = masterData;'
);

code = code.replace(
  'if (!masterSheet) return [];\n  try {\n    const data = masterSheet.getDataRange().getValues();',
  'if (!masterData || masterData.length < 2) return [];\n  try {\n    const data = masterData;'
);

// 2. Remove LanguageApp.translate
const tryCatchRegex = /try \{\s*let translated = LanguageApp\.translate[\s\S]*?\} catch\(e\) \{\s*\/\/[^\n]*\n\s*missingItemsArray = rawMissingText\.split\(','\)\.map\(item => item\.trim\(\)\)\.filter\(item => item\.length > 0\);\s*\}/;
code = code.replace(tryCatchRegex, "missingItemsArray = rawMissingText.split(',').map(item => item.trim()).filter(item => item.length > 0);");

// 3. Add scheduleData to the return object
const returnObjRegex = /hotelTelAvivData: hotelTelAvivData,\s*allGuestsDirectory: allGuestsDirectory\s*\};/;
code = code.replace(returnObjRegex, 'hotelTelAvivData: hotelTelAvivData,\n      allGuestsDirectory: allGuestsDirectory,\n      scheduleData: scheduleData\n    };');

fs.writeFileSync('src/PortalBackend.gs', code);
console.log("Done");
