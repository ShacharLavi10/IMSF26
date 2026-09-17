const fs = require('fs');
let f = fs.readFileSync('main.js', 'utf8');
f = f.replace(/const GAS_API_URL = .*/, 'const GAS_API_URL = "https://script.google.com/macros/s/AKfycby1dsqYxPUX21OOFtrE0Q2ggJGdcquwwna4_0f3SOtpj800wRgdn_18BApye05Ohmu3/exec";');
fs.writeFileSync('main.js', f);
