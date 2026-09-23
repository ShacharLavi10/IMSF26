const fs = require('fs');
let content = fs.readFileSync('src/PortalBackend.gs', 'utf8');

// Find fetchAllGuestsDirectory function
const funcStart = content.indexOf('function fetchAllGuestsDirectory(');
const searchKeyIndex = content.indexOf('if (guestObj["First Name"] || guestObj["Last Name"]) guestsList.push(guestObj);', funcStart);

if (funcStart !== -1 && searchKeyIndex !== -1) {
    const replaceStr = 'if (guestObj["Role / Title"] !== "???? ?????" && (guestObj["First Name"] || guestObj["Last Name"])) guestsList.push(guestObj);';
    content = content.substring(0, searchKeyIndex) + replaceStr + content.substring(searchKeyIndex + 'if (guestObj["First Name"] || guestObj["Last Name"]) guestsList.push(guestObj);'.length);
    fs.writeFileSync('src/PortalBackend.gs', content);
    console.log('Successfully filtered allGuestsDirectory.');
} else {
    console.log('Could not find search string in PortalBackend.gs');
}
