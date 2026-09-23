const fs = require('fs');
let js = fs.readFileSync('src/app.js', 'utf8');

// 1. Update switchCategoryTab
js = js.replace(`const tabs = ['schedule', 'flights', 'hotels', 'directory', 'artists'];`, `const tabs = ['admin', 'schedule', 'flights', 'hotels', 'directory', 'artists'];`);

// 2. Show tab if admin
const loginSuccessSearch = `currentGuestEmail = response.guestInfo.email;`;
const loginSuccessReplace = `currentGuestEmail = response.guestInfo.email;
      
      if (response.guestInfo.isAdmin) {
        document.getElementById("tab-admin").style.display = "block";
      }
`;
js = js.replace(loginSuccessSearch, loginSuccessReplace);

fs.writeFileSync('src/app.js', js);
console.log('Done app.js');
