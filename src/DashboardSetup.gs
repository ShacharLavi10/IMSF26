/**
 * Setup script for Production Dashboard
 */

function setupProductionDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let dashSheet = ss.getSheetByName('דשבורד הפקה');
  
  // If it exists, clear it, else create it
  if (dashSheet) {
    dashSheet.clear();
  } else {
    dashSheet = ss.insertSheet('דשבורד הפקה', 0); // Put it as the first sheet
  }
  
  dashSheet.setRightToLeft(true);
  
  // Basic Styling
  dashSheet.getRange("A:Z").setFontFamily("Arial").setVerticalAlignment("middle");
  
  // Helper to set headers
  const setHeader = (range, title, color) => {
    const r = dashSheet.getRange(range);
    r.setValue(title);
    r.setBackground(color);
    r.setFontColor("white");
    r.setFontWeight("bold");
    r.setFontSize(14);
    r.setHorizontalAlignment("center");
  };
  
  // Helper to set sub headers
  const setSubHeader = (range, title) => {
    const r = dashSheet.getRange(range);
    r.setValue(title);
    r.setBackground("#f3f3f3");
    r.setFontWeight("bold");
    r.setHorizontalAlignment("right");
  };

  // --- SECTION 1: GENERAL INFO (Columns A-C) ---
  dashSheet.setColumnWidth(1, 200);
  dashSheet.setColumnWidth(2, 120);
  dashSheet.setColumnWidth(3, 200);

  setHeader("A1:C1", "1. סטטוס אורחים (General Info)", "#4a86e8");
  
  setSubHeader("A3", "סה\"כ אורחים במערכת:");
  dashSheet.getRange("B3").setFormula("=COUNTA('אורחים'!A2:A)-COUNTBLANK('אורחים'!A2:A)");
  dashSheet.getRange("B3").setHorizontalAlignment("center").setFontWeight("bold");
  
  setSubHeader("A5", "טופס אירוח:");
  dashSheet.getRange("B5").setFormula("=COUNTIF('אורחים'!N2:N, TRUE)");
  dashSheet.getRange("C5").setValue("השלימו");
  dashSheet.getRange("B6").setFormula("=COUNTIF('אורחים'!N2:N, FALSE)");
  dashSheet.getRange("C6").setValue("חסר");

  // Dropdown for missing details
  setSubHeader("A8", "בדיקת חוסרים:");
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(["חסר טופס אירוח", "חסר תמונת דרכון", "חסרה תמונה אישית", "חסרה ביוגרפיה"]).build();
  dashSheet.getRange("B8").setDataValidation(rule).setValue("חסר טופס אירוח").setBackground("#fff2cc");
  
  // Dynamic list based on dropdown
  dashSheet.getRange("A9").setValue("רשימה שמית (דינמית):").setFontWeight("bold");
  dashSheet.getRange("A10").setFormula(
    `=IF(B8="חסר טופס אירוח", FILTER('אורחים'!A2:B, 'אורחים'!N2:N=FALSE), ` +
    `IF(B8="חסר תמונת דרכון", FILTER('אורחים'!A2:B, 'אורחים'!R2:R=FALSE), ` +
    `IF(B8="חסרה תמונה אישית", FILTER('אורחים'!A2:B, 'אורחים'!Q2:Q=FALSE), ` +
    `IF(B8="חסרה ביוגרפיה", FILTER('אורחים'!A2:B, 'אורחים'!P2:P=FALSE), ""))))`
  );

  // --- SECTION 2: FLIGHTS INFO (Columns E-G) ---
  dashSheet.setColumnWidth(5, 200);
  dashSheet.setColumnWidth(6, 120);
  dashSheet.setColumnWidth(7, 200);

  setHeader("E1:G1", "2. טיסות (Flights Info)", "#38761d");
  
  setSubHeader("E3", "טופס טיסות:");
  dashSheet.getRange("F3").setFormula("=COUNTIF('אורחים'!O2:O, TRUE)");
  dashSheet.getRange("G3").setValue("השלימו");
  dashSheet.getRange("F4").setFormula("=COUNTIF('אורחים'!O2:O, FALSE)");
  dashSheet.getRange("G4").setValue("חסר");

  setSubHeader("E6", "סטטוס הזמנות טיסה:");
  const ruleFlights = SpreadsheetApp.newDataValidation().requireValueInList(["חסר טופס טיסות", "ממתינים להצעה", "טרם אישרו כרטיס", "מחכים לכרטיס סופי"]).build();
  dashSheet.getRange("F6").setDataValidation(ruleFlights).setValue("ממתינים להצעה").setBackground("#fff2cc");
  
  const anatUrlId = ACTIVE_ENV.ANAT_SPREADSHEET_ID; // From Config
  dashSheet.getRange("E7").setValue("רשימה שמית (דינמית):").setFontWeight("bold");
  dashSheet.getRange("E8").setFormula(
    `=IF(F6="חסר טופס טיסות", FILTER('אורחים'!A2:B, 'אורחים'!O2:O=FALSE), ` +
    `IF(F6="ממתינים להצעה", FILTER('אורחים'!A2:B, IMPORTRANGE("${anatUrlId}", "'עדכוני טיסות'!M2:M")=TRUE, IMPORTRANGE("${anatUrlId}", "'עדכוני טיסות'!N2:N")=FALSE), ` +
    `IF(F6="טרם אישרו כרטיס", FILTER('אורחים'!A2:B, IMPORTRANGE("${anatUrlId}", "'עדכוני טיסות'!N2:N")=TRUE, IMPORTRANGE("${anatUrlId}", "'עדכוני טיסות'!R2:R")=FALSE), ` +
    `IF(F6="מחכים לכרטיס סופי", FILTER('אורחים'!A2:B, IMPORTRANGE("${anatUrlId}", "'עדכוני טיסות'!R2:R")=TRUE, IMPORTRANGE("${anatUrlId}", "'עדכוני טיסות'!S2:S")=FALSE), ""))))`
  );

  setSubHeader("E20", "עלות משוערת סה\"כ ($):");
  dashSheet.getRange("F20").setFormula(`=SUM(IMPORTRANGE("${anatUrlId}", "'עדכוני טיסות'!O2:O"))`);
  setSubHeader("E21", "עלות סופית סה\"כ ($):");
  dashSheet.getRange("F21").setFormula(`=SUM(IMPORTRANGE("${anatUrlId}", "'עדכוני טיסות'!X2:X"))`);
  setSubHeader("E22", "השתתפות אורחים ($):");
  dashSheet.getRange("F22").setFormula(`=SUM(IMPORTRANGE("${anatUrlId}", "'עדכוני טיסות'!AD2:AD"))`);


  // --- SECTION 3: HOTELS INFO (Columns I-K) ---
  dashSheet.setColumnWidth(9, 200);
  dashSheet.setColumnWidth(10, 120);
  dashSheet.setColumnWidth(11, 200);

  setHeader("I1:K1", "3. מלונות (Hotels Info)", "#cc0000");

  setSubHeader("I3", "סה\"כ לילות ירושלים:");
  dashSheet.getRange("J3").setFormula("=SUM('מלונות ירושלים'!I2:I)");
  setSubHeader("I4", "סה\"כ לילות ת\"א:");
  dashSheet.getRange("J4").setFormula("=SUM('מלונות תל אביב'!I2:I)");

  setSubHeader("I6", "סוגי חדרים (ירושלים):");
  dashSheet.getRange("J6").setFormula("=COUNTIF('מלונות ירושלים'!H2:H, \"*Single*\")");
  dashSheet.getRange("K6").setValue("Single");
  dashSheet.getRange("J7").setFormula("=COUNTIF('מלונות ירושלים'!H2:H, \"*Double*\")");
  dashSheet.getRange("K7").setValue("Double");

  setSubHeader("I9", "עלות חדרים הפקה (י-ם):");
  dashSheet.getRange("J9").setFormula("=SUM('מלונות ירושלים'!K2:K)");
  setSubHeader("I10", "עלות חדרים אורח (י-ם):");
  dashSheet.getRange("J10").setFormula("=SUM('מלונות ירושלים'!M2:M)");

  setSubHeader("I12", "עלות חדרים הפקה (ת\"א):");
  dashSheet.getRange("J12").setFormula("=SUM('מלונות תל אביב'!K2:K)");
  setSubHeader("I13", "עלות חדרים אורח (ת\"א):");
  dashSheet.getRange("J13").setFormula("=SUM('מלונות תל אביב'!M2:M)");


  // --- SECTION 4: FESTIVAL TIME (Columns M-O) ---
  dashSheet.setColumnWidth(13, 200);
  dashSheet.setColumnWidth(14, 120);
  dashSheet.setColumnWidth(15, 200);

  setHeader("M1:O1", "4. במהלך הפסטיבל (RSVP)", "#e69138");
  
  setSubHeader("M3", "אישורי הגעה לאירוע VIP:");
  dashSheet.getRange("N3").setValue("בקרוב");
  dashSheet.getRange("M4").setValue("(הכנה לחיבור מסך RSVP בפורטל)").setFontStyle("italic").setFontColor("gray");

  setSubHeader("M7", "אישורי הסעות יומיים:");
  dashSheet.getRange("N7").setValue("בקרוב");
}
