const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

code = code.replace(
  'const GAS_API_URL = "https://script.google.com/macros/s/AKfycby1dsqYxPUX21OOFtrE0Q2ggJGdcquwwna4_0f3SOtpj800wRgdn_18BApye05Ohmu3/exec";',
  'const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzI7N3LgV7iQW4HK83zkqa2At4INhy1Mbgc2yePl2o7Jg-Q1KjEoBcJxB3n_0_XR2haog/exec";'
);

fs.writeFileSync('main.js', code);
console.log("Updated main.js with PROD API URL");
