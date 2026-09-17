const fs = require('fs');
let code = fs.readFileSync('src/PortalBackend.gs', 'utf8');

const inject = `
function getSheetNames() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheets().map(s => s.getName());
}
`;

code += inject;
fs.writeFileSync('src/PortalBackend.gs', code);
console.log("Added getSheetNames");
