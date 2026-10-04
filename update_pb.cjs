const fs = require('fs');
let pb = fs.readFileSync('src/PortalBackend.gs', 'utf8');

const oldLogic = `    let flightsSheet = ss.getSheetByName(CONFIG.FLIGHTS_SHEET) || ss.getSheetByName("טיסות - שיקוף") || ss.getSheetByName("טבלת טיסות - שיקוף");
    const flightsData = fetchMappedData(flightsSheet, cleanEmail, MAPPINGS.FLIGHTS);`;

const newLogic = `    let flightsSheet1 = ss.getSheetByName("טיסות - שיקוף");
    let flightsSheet2 = ss.getSheetByName(CONFIG.FLIGHTS_SHEET) || ss.getSheetByName("טבלת טיסות - שיקוף");
    
    let flightsData1 = flightsSheet1 ? fetchMappedData(flightsSheet1, cleanEmail, MAPPINGS.FLIGHTS) : [];
    let flightsData2 = flightsSheet2 ? fetchMappedData(flightsSheet2, cleanEmail, MAPPINGS.FLIGHTS) : [];
    
    let flightsDataMap = {};
    flightsData1.forEach(item => flightsDataMap[item.label] = item.value);
    flightsData2.forEach(item => flightsDataMap[item.label] = item.value);
    
    const flightsData = Object.keys(flightsDataMap).map(label => ({ label: label, value: flightsDataMap[label] }));`;

if (pb.includes(oldLogic)) {
  pb = pb.replace(oldLogic, newLogic);
  fs.writeFileSync('src/PortalBackend.gs', pb, 'utf8');
  console.log('Fixed PortalBackend.gs');
} else {
  console.log('Could not find oldLogic in PortalBackend.gs');
}
