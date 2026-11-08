const fs = require('fs');
let code = fs.readFileSync('src/PortalBackend.gs', 'utf8');

code = code.replace(
  /try \{\s*trimmed = LanguageApp\.translate\(trimmed, '', 'en'\);\s*\} catch\(e\) \{\}/g,
  ''
);

fs.writeFileSync('src/PortalBackend.gs', code);
console.log("Done");
