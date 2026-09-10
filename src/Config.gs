/**
 * Exposure Festival 2026 - Global Configuration & Mappings
 */

const SCRIPT_IDS = {
  PRODUCTION: "1wFP1kbXUC-7dpdlghPGDPcv2AKtX0ZusEpTpkBIw6w4raDyikZkdvj3z",
  SANDBOX: "1Yy2p2pJifKLOqd-UEHW8KKpazlVUpBcy6oUezhvDZYTDZeKekesi0FkW"
};

const ENVIRONMENTS = {
  PRODUCTION: {
    ANAT_SPREADSHEET_ID: "1UDzPjGWdvjJ1yOQHmORY-itX0yr52BMOkSrdac3t95M",
    PASSPORT_FOLDER_ID: "1gHSfIH1175u09sQEtp5gOSI_oNF6WrDUqUnxUPT4umwKNM-J0dxeNLI3qYQBqcevujCWq6rI",
    PHOTO_FOLDER_ID: "1ia1t0xqowQbYKjsYQl9PRy396dDNr7fXbKXzr20suy9waDJEcxMcvYDtb7w3J_d3Q_b8w6c9"
  },
  SANDBOX: {
    ANAT_SPREADSHEET_ID: "1mrKQ-10d1wLSjY3pjPyDO6dY8UZ9k-IiePXOOWTYBZY",
    PASSPORT_FOLDER_ID: "1loqPR_oRFxvrznzYGrsaNqhTJbtbe8lr",
    PHOTO_FOLDER_ID: "1-eKETDgCwA0tTennT6egrpfROpLeGzse"
  }
};

// Identify current environment dynamically
const CURRENT_SCRIPT_ID = ScriptApp.getScriptId();
const IS_PROD = (CURRENT_SCRIPT_ID === SCRIPT_IDS.PRODUCTION);
const ACTIVE_ENV = IS_PROD ? ENVIRONMENTS.PRODUCTION : ENVIRONMENTS.SANDBOX;

const CONFIG = {
  ANAT_SPREADSHEET_ID: ACTIVE_ENV.ANAT_SPREADSHEET_ID,
  MASTER_SHEET: "אורחים",
  FLIGHTS_SHEET: "טיסות - שיקוף",
  JERUSALEM_SHEET: "מלונות ירושלים",
  TELAVIV_SHEET: "מלונות תל אביב",
  ANAT_SHEET_NAME: "עדכוני טיסות",
  EMAIL_COL: "מייל אורח",
  FIRST_NAME_COL: "שם פרטי",
  LAST_NAME_COL: "שם משפחה",
  CHECKBOXES: {
    WELCOME_EMAIL: "נשלח מייל WELCOME?",
    FORM_FLIGHTS: "התקבל טופס טיסות?",
    FORM_HOTEL: "התקבל טופס אירוח?",
    BIO: "יש ביוגרפיה מלאה?",
    PASSPORT: "יש תמונת דרכון?",
    PHOTO: "יש תמונה אישית?",
    GENERAL_MISSING: "חסר משהו כללי?",
    APPROVAL_FLIGHTS: "אישור טיסות", // עמודה עבור אישור הצגת לשונית טיסות
    APPROVAL_HOTELS: "אישור מלונות", // עמודה עבור אישור הצגת לשונית מלונות
    APPROVAL_DIRECTORY: "אישור משלחת" // עמודה עבור אישור הצגת לשונית משלחת
  },
  GENERAL_MISSING_TEXT_COL: "מה חסר כללי?",
  BIO_DRAFT_COL: "ביוגרפיה טיוטה מהאתר",
  GENERAL_MISSING_ANSWERS_COL: "השלמת פרטים כללי",
  FORMS: {
    FLIGHTS: "https://forms.gle/kXCwSXuP3hWHztyh9",
    HOTEL: "https://forms.gle/afpZdvuMFrrXJ6VJ9"
  },
  PASSPORT_FOLDER_ID: ACTIVE_ENV.PASSPORT_FOLDER_ID,
  PHOTO_FOLDER_ID: ACTIVE_ENV.PHOTO_FOLDER_ID,
  ARTISTS_SPREADSHEET_ID: "13YI3oIHCt2OfIC3K3HyS54u_RrJ-Hii3NZedM3OtqvQ"
};

const MAPPINGS = {
  FLIGHTS: [
    { key: "תאריך נחיתה", altKeys: ["תאריך נחיתה", "תאריך הגעה"], label: "Arrival Date" },
    { key: "מאיפה?", altKeys: ["מאיפה?", "מאיפה"], label: "Origin / From" },
    { key: "תאריך המראה", altKeys: ["תאריך המראה", "תאריך יציאה"], label: "Departure Date" },
    { key: "לאן?", altKeys: ["לאן?", "לאן"], label: "Destination / To" },
    { key: "לינק כרטיס סופי", altKeys: ["לינק כרטיס סופי", "לינק לכרטיס", "כרטיס סופי", "לינק כרטיס"], label: "Final Ticket Link" }
  ],
  HOTELS: [
    { key: "כמות לילות", label: "Nights Count" },
    { key: "תאריך הגעה", label: "Arrival Date" },
    { key: "שעת הגעה משוערת", label: "Est. Arrival Time" },
    { key: "תאריך יציאה", label: "Departure Date" },
    { key: "סוג חדר", label: "Room Type" },
    { key: "סה\"כ לילות", label: "Total Nights" }
  ],
  GUESTS_DIRECTORY: [
    { key: "שם פרטי", altKeys: ["שם פרטי"], label: "First Name" },
    { key: "שם משפחה", altKeys: ["שם משפחה"], label: "Last Name" },
    { key: "מדינה", altKeys: ["מדינה"], label: "Country" },
    { key: "מייל אורח", altKeys: ["מייל אורח", "מייל", "email"], label: "Email" },
    { key: "שם חברה", altKeys: ["שם חברה"], label: "Company / Organization" },
    { key: "תפקיד", altKeys: ["תפקיד"], label: "Role / Title" },
    { key: "ביוגרפיה אנגלית", altKeys: ["ביוגרפיה אנגלית"], label: "Biography" },
    { key: "ז'אנר", altKeys: ["ז'אנר"], label: "Genre / Style" },
    { key: "טלפון", altKeys: ["טלפון"], label: "Phone" },
    { key: "לינק לאתר", altKeys: ["לינק לאתר"], label: "Website" },
    { key: "לינק לתמונה אישית", altKeys: ["לינק לתמונה אישית"], label: "Photo" }
  ]
};
