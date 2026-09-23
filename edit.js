const fs = require('fs');
let content = fs.readFileSync('src/PortalBackend.gs', 'utf8');
content = content.replace('const firstName = String(getColVal(CONFIG.FIRST_NAME_COL) || "");', 'const isAdmin = String(getColVal("?????") || "").trim() === "???? ?????";\n    const firstName = String(getColVal(CONFIG.FIRST_NAME_COL) || "");');
content = content.replace('guestInfo: { email: cleanEmail, firstName: firstName, lastName: lastName, rowIndex: rowIndex, bio: bioText },', 'guestInfo: { email: cleanEmail, firstName: firstName, lastName: lastName, rowIndex: rowIndex, bio: bioText, isAdmin: isAdmin },');
fs.writeFileSync('src/PortalBackend.gs', content);
console.log('Done modifying PortalBackend.gs');
